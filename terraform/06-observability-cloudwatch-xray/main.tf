terraform {
  backend "s3" {
    bucket         = "porto-bank-crm-terraform-state"
    key            = "porto-bank-crm/06-observability-cloudwatch-xray/terraform.tfstate"
    region         = "sa-east-1"
    dynamodb_table = "porto-bank-crm-terraform-lock"
    encrypt        = true
  }
}

variable "environment" {
  description = "Nome do ambiente"
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
# CloudWatch Log Group — Auditoria (5 anos, S3 Object Lock)
# =============================================================================
resource "aws_cloudwatch_log_group" "audit" {
  name              = "/aws/audit/${var.environment}/porto-bank-crm"
  retention_in_days = 1825
  tags = merge(local.common_tags, { Name = "${var.environment}-cw-audit" })
}

# =============================================================================
# CloudWatch Alarms
# =============================================================================
resource "aws_cloudwatch_metric_alarm" "api_high_latency" {
  alarm_name          = "${var.environment}-porto-bank-crm-api-high-latency"
  alarm_description   = "Latência p95 da API acima de 200ms"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 3
  threshold           = 0.2
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  tags = merge(local.common_tags, { Name = "${var.environment}-cw-alarm-api-latency" })
}

resource "aws_cloudwatch_metric_alarm" "dlq_messages" {
  alarm_name          = "${var.environment}-porto-bank-crm-dlq-messages"
  alarm_description   = "Mensagens na DLQ indicam falha de processamento"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  tags = merge(local.common_tags, { Name = "${var.environment}-cw-alarm-dlq" })
}

resource "aws_cloudwatch_metric_alarm" "ecs_cpu" {
  alarm_name          = "${var.environment}-porto-bank-crm-ecs-cpu-high"
  alarm_description   = "CPU do ECS acima de 70%"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 3
  threshold           = 70
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  tags = merge(local.common_tags, { Name = "${var.environment}-cw-alarm-ecs-cpu" })
}

# =============================================================================
# X-Ray Group
# =============================================================================
resource "aws_xray_group" "main" {
  group_name = "${var.environment}-porto-bank-crm-traces"
  tags = merge(local.common_tags, { Name = "${var.environment}-xray-group" })
}

output "audit_log_group_name" { value = aws_cloudwatch_log_group.audit.name }
