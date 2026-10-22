variable "environment" { type = string }
variable "region" { type = string default "sa-east-1" }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "public_subnet_ids" { type = list(string) }
variable "ecs_task_role_arn" { type = string }
variable "ecs_execution_role_arn" { type = string }
variable "api_container_image" { type = string }
variable "worker_container_image" { type = string }
variable "desired_count" { type = number default 2 }
variable "max_count" { type = number default 10 }
variable "min_count" { type = number default 1 }

locals {
  common_tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    Project     = "porto-bank-crm"
    Compliance  = "BACEN-4893/LGPD"
  }
}

# =============================================================================
# Application Load Balancer (ALB) - Edge de entrada da API
# =============================================================================
resource "aws_lb" "api" {
  name               = "${var.environment}-porto-bank-crm-api-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids
  enable_deletion_protection = true
  idle_timeout       = 60
  access_logs {
    bucket  = aws_s3_bucket.alb_logs.bucket
    prefix  = "alb-logs"
    enabled = true
  }
  tags = merge(local.common_tags, { Name = "${var.environment}-api-alb" })
}

resource "aws_security_group" "alb" {
  name        = "${var.environment}-porto-bank-crm-alb-sg"
  description = "ALB - apenas HTTPS 443"
  vpc_id      = var.vpc_id
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = merge(local.common_tags, { Name = "${var.environment}-alb-sg" })
}

resource "aws_lb_target_group" "api" {
  name     = "${var.environment}-porto-bank-crm-api-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = var.vpc_id
  health_check {
    enabled             = true
    interval            = 30
    path                = "/api/v1/health"
    protocol            = "HTTP"
    matcher             = "200"
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
  tags = merge(local.common_tags, { Name = "${var.environment}-api-tg" })
}

resource "aws_lb_listener" "api" {
  load_balancer_arn = aws_lb.api.id
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-Res-2021-06"
  certificate_arn   = var.acm_certificate_arn # TODO: fornecer ARN do certificado ACM

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.id
  }
}

resource "aws_lb_listener_rule" "health" {
  listener_arn = aws_lb_listener.api.id
  priority     = 100

  action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      status_code  = "200"
      message_body = "healthy"
    }
  }

  condition {
    field  = "path-pattern"
    values = ["/health"]
  }
}

output "alb_dns_name" { value = aws_lb.api.dns_name }
output "target_group_arn" { value = aws_lb_target_group.api.arn }
