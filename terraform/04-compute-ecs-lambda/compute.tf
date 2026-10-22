resource "aws_s3_bucket" "alb_logs" {
  bucket = "${var.environment}-porto-bank-crm-alb-logs"
  tags   = merge(local.common_tags, { Name = "${var.environment}-alb-logs" })
}

resource "aws_s3_bucket_policy" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "delivery.logs.amazonaws.com" }
      Action    = "s3:PutObject"
      Resource  = "${aws_s3_bucket.alb_logs.arn}/*"
    }]
  })
}

# =============================================================================
# ECS Cluster e Service de API (Auto Scaling)
# =============================================================================
resource "aws_ecs_cluster" "main" {
  name = "${var.environment}-porto-bank-crm-cluster"
  tags = merge(local.common_tags, { Name = "${var.environment}-ecs-cluster" })
}

resource "aws_security_group" "ecs" {
  name        = "${var.environment}-porto-bank-crm-ecs-sg"
  description = "Acesso aos containers ECS apenas do ALB e subnets privados"
  vpc_id      = var.vpc_id
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  tags = merge(local.common_tags, { Name = "${var.environment}-ecs-sg" })
}

resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.environment}/porto-bank-crm"
  retention_in_days = 90
  tags = merge(local.common_tags, { Name = "${var.environment}-cw-log-group" })
}

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
      portMappings = [{ containerPort = 3000, hostPort = 3000, protocol = "tcp" }]
      essential = true
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group" = aws_cloudwatch_log_group.ecs.name
          "awslogs-region" = var.region
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
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 3000
  }

  deployment_controller {
    type = "CODE_DEPLOY" # blue/green para zero downtime
  }

  tags = merge(local.common_tags, { Name = "${var.environment}-ecs-service-api" })
}

# =============================================================================
# Auto Scaling do ECS Service (CPU e memória)
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
