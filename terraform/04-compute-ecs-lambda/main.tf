terraform {
  backend "s3" {
    bucket         = "porto-bank-crm-terraform-state"
    key            = "porto-bank-crm/04-compute-ecs-lambda/terraform.tfstate"
    region         = "sa-east-1"
    dynamodb_table = "porto-bank-crm-terraform-lock"
    encrypt        = true
  }
}

variable "environment" {
  description = "Nome do ambiente"
  type        = string
}

variable "vpc_id" {
  description = "ID da VPC"
  type        = string
}

variable "private_subnet_ids" {
  description = "IDs das subnets privadas"
  type        = list(string)
}

variable "ecs_task_role_arn" {
  description = "ARN da IAM role para ECS tasks"
  type        = string
}

variable "ecs_execution_role_arn" {
  description = "ARN da IAM execution role para ECS"
  type        = string
}

variable "api_container_image" {
  description = "Imagem do container da API"
  type        = string
}

variable "worker_container_image" {
  description = "Imagem do container do worker"
  type        = string
}

variable "desired_count" {
  description = "Quantidade desejada de tasks da API"
  type        = number
  default     = 2
}

variable "max_count" {
  description = "Quantidade máxima de tasks da API"
  type        = number
  default     = 10
}

variable "min_count" {
  description = "Quantidade mínima de tasks da API"
  type        = number
  default     = 1
}

locals {
  common_tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    Project     = "porto-bank-crm"
    Compliance  = "BACEN-4893/LGPD"
  }
}

# =============================================================================
# ECS Cluster
# =============================================================================
resource "aws_ecs_cluster" "main" {
  name = "${var.environment}-porto-bank-crm-cluster"
  tags = merge(local.common_tags, { Name = "${var.environment}-ecs-cluster" })
}

# =============================================================================
# Security Group para ECS
# =============================================================================
resource "aws_security_group" "ecs" {
  name        = "${var.environment}-porto-bank-crm-ecs-sg"
  description = "Acesso aos containers ECS apenas do ALB e subnets privados"
  vpc_id      = var.vpc_id
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }
  tags = merge(local.common_tags, { Name = "${var.environment}-ecs-sg" })
}

# =============================================================================
# CloudWatch Log Group
# =============================================================================
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.environment}/porto-bank-crm"
  retention_in_days = 90
  tags = merge(local.common_tags, { Name = "${var.environment}-cw-log-group" })
}

# =============================================================================
# Task Definition — API
# =============================================================================
resource "aws_ecs_task_definition" "api" {
  family                   = "${var.environment}-porto-bank-crm-api"
  cpu                      = "1024"
  memory                   = "2048"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  execution_role_arn       = var.ecs_execution_role_arn
  task_role_arn            = var.ecs_task_role_arn
  container_definitions = jsonencode([
    {
      name      = "api"
      image     = var.api_container_image
      portMappings = [{
        containerPort = 3000
        hostPort      = 3000
        protocol      = "tcp"
      }]
      essential = true
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "api"
        }
      }
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "AWS_REGION", value = var.region }
      ]
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/api/v1/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 40
      }
    }
  ])
  tags = merge(local.common_tags, { Name = "${var.environment}-ecs-task-def-api" })
}

# =============================================================================
# ECS Service — API (com ALB target group anexado externamente)
# =============================================================================
variable "api_target_group_arn" {
  description = "ARN do target group do ALB para a API"
  type        = string
}

resource "aws_ecs_service" "api" {
  name            = "${var.environment}-porto-bank-crm-api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancers {
    target_group_arn = var.api_target_group_arn
    container_name   = "api"
    container_port   = 3000
  }

  deployment_controller {
    type = "CODE_DEPLOY"
  }

  tags = merge(local.common_tags, { Name = "${var.environment}-ecs-service-api" })
}

# =============================================================================
# Auto Scaling — CPU
# =============================================================================
resource "aws_appautoscaling_target" "api" {
  service_namespace  = "ecs"
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  min_capacity       = var.min_count
  max_capacity       = var.max_count
}

resource "aws_appautoscaling_policy" "api_cpu" {
  name               = "${var.environment}-porto-bank-crm-api-cpu-scaling"
  service_namespace  = "ecs"
  resource_id        = aws_appautoscaling_target.api.resource_id
  scalable_dimension = "ecs:service:DesiredCount"
  policy_type        = "TargetTrackingScaling"

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
    scale_out_cooldown  = 60
    scale_in_cooldown   = 300
  }
}

# =============================================================================
# Auto Scaling — Memory
# =============================================================================
resource "aws_appautoscaling_policy" "api_memory" {
  name               = "${var.environment}-porto-bank-crm-api-memory-scaling"
  service_namespace  = "ecs"
  resource_id        = aws_appautoscaling_target.api.resource_id
  scalable_dimension = "ecs:service:DesiredCount"
  policy_type        = "TargetTrackingScaling"

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value = 80.0
    scale_out_cooldown  = 60
    scale_in_cooldown   = 300
  }
}

output "ecs_cluster_name" { value = aws_ecs_cluster.main.name }
output "api_service_name" { value = aws_ecs_service.api.name }
