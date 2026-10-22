terraform {
  backend "s3" {
    bucket         = "porto-bank-crm-terraform-state"
    key            = "porto-bank-crm/05-edge-waf-apigw/terraform.tfstate"
    region         = "sa-east-1"
    dynamodb_table = "porto-bank-crm-terraform-lock"
    encrypt        = true
  }
}

data "terraform_remote_state" "vpc" {
  backend = "s3"
  config = {
    bucket         = "porto-bank-crm-terraform-state"
    key            = "porto-bank-crm/00-networking-vpc/terraform.tfstate"
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
  default     = data.terraform_remote_state.vpc.outputs.vpc_id
}

variable "private_subnet_ids" {
  description = "IDs das subnets privadas"
  type        = list(string)
  default     = data.terraform_remote_state.vpc.outputs.private_subnet_ids
}

variable "public_subnet_ids" {
  description = "IDs das subnets públicas"
  type        = list(string)
  default     = data.terraform_remote_state.vpc.outputs.public_subnet_ids
}

variable "private_subnet_ids" {
  description = "IDs das subnets privadas"
  type        = list(string)
}

variable "acm_certificate_arn" {
  description = "ARN do certificado ACM para HTTPS"
  type        = string
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
# Application Load Balancer
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
  description = "ALB — apenas HTTPS 443"
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
  certificate_arn   = var.acm_certificate_arn

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

# =============================================================================
# S3 para logs do ALB
# =============================================================================
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
# WAF Web ACL
# =============================================================================
resource "aws_wafv2_web_acl" "main" {
  name        = "${var.environment}-porto-bank-crm-waf"
  description = "WAF para API do Porto Bank CRM"
  scope       = "REGIONAL"
  default_action { allow {} }

  rule {
    name     = "rate-limit"
    priority = 1
    action { block {} }
    statement {
      rate_based_statement {
        limit            = 100
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "PortoBankWaf"
    sampled_requests_enabled   = true
  }

  tags = merge(local.common_tags, { Name = "${var.environment}-waf" })
}

output "alb_dns_name" { value = aws_lb.api.dns_name }
output "target_group_arn" { value = aws_lb_target_group.api.arn }
