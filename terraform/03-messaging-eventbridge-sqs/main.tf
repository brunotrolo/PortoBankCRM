terraform {
  backend "s3" {
    bucket         = "porto-bank-crm-terraform-state"
    key            = "porto-bank-crm/03-messaging-eventbridge-sqs/terraform.tfstate"
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

locals {
  common_tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    Project     = "porto-bank-crm"
    Compliance  = "BACEN-4893/LGPD"
  }
}

# =============================================================================
# EventBridge bus de negócio
# =============================================================================
resource "aws_eventbridge_event_bus" "business" {
  name = "${var.environment}-porto-bank-crm-business-events"
  tags = merge(local.common_tags, { Name = "${var.environment}-eventbridge-business" })
}

# =============================================================================
# SQS filas de processamento + DLQ
# =============================================================================
resource "aws_sqs_queue" "dlq" {
  name                     = "${var.environment}-porto-bank-crm-dlq"
  message_retention_seconds = 1209600
  tags = merge(local.common_tags, { Name = "${var.environment}-sqs-dlq" })
}

resource "aws_sqs_queue" "event_log_drain" {
  name                     = "${var.environment}-porto-bank-crm-event-log-drain"
  visibility_timeout_seconds = 300
  max_receive_count           = 3
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })
  tags = merge(local.common_tags, { Name = "${var.environment}-sqs-event-log-drain" })
}

resource "aws_sqs_queue" "ai_turn" {
  name                     = "${var.environment}-porto-bank-crm-ai-turn"
  visibility_timeout_seconds = 300
  max_receive_count           = 3
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })
  tags = merge(local.common_tags, { Name = "${var.environment}-sqs-ai-turn" })
}

resource "aws_sqs_queue" "lgpd" {
  name                     = "${var.environment}-porto-bank-crm-lgpd"
  visibility_timeout_seconds = 600
  max_receive_count           = 3
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })
  tags = merge(local.common_tags, { Name = "${var.environment}-sqs-lgpd" })
}

# =============================================================================
# Regras EventBridge roteando para filas
# =============================================================================
resource "aws_events_rule" "lead_stage_changed" {
  name        = "${var.environment}-porto-bank-crm-lead-stage-changed"
  event_bus_name = aws_eventbridge_event_bus.business.name
  event_pattern = jsonencode({
    source = ["porto-bank-crm.leads"]
    detail_type = ["Lead.StageChanged"]
  })
  tags = merge(local.common_tags, { Name = "${var.environment}-eb-lead-stage-changed" })
}

resource "aws_events_target" "lead_stage_changed_to_sqs" {
  rule      = aws_events_rule.lead_stage_changed.name
  event_bus_name = aws_eventbridge_event_bus.business.name
  arn       = aws_sqs_queue.event_log_drain.arn
}

output "event_bus_name" { value = aws_eventbridge_event_bus.business.name }
output "event_log_drain_queue_url" { value = aws_sqs_queue.event_log_drain.url }
output "ai_turn_queue_url" { value = aws_sqs_queue.ai_turn.url }
output "lgpd_queue_url" { value = aws_sqs_queue.lgpd.url }
