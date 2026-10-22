terraform {
  backend "s3" {
    bucket         = "porto-bank-crm-terraform-state"
    key            = "porto-bank-crm/01-security-kms-iam/terraform.tfstate"
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

locals {
  common_tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    Project     = "porto-bank-crm"
    Compliance  = "BACEN-4893/LGPD"
  }
}

# =============================================================================
# KMS CMK com rotação anual
# =============================================================================
resource "aws_kms_key" "app" {
  description             = "CMK para Porto Bank CRM — envelope encryption field-level"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  tags = merge(local.common_tags, { Name = "${var.environment}-kms-app" })
}

resource "aws_kms_alias" "app" {
  name          = "alias/porto-bank-crm-app"
  target_key_id = aws_kms_key.app.id
}

# =============================================================================
# Secrets Manager — pepper para blind index + credenciais OAuth
# =============================================================================
resource "aws_secretsmanager_secret" "blind_index_pepper" {
  name        = "${var.environment}/porto-bank-crm/blind-index-pepper"
  description = "Pepper para blind index HMAC-SHA256 (CPF/telefone/email)"
  tags = merge(local.common_tags, { Name = "${var.environment}-blind-index-pepper" })
}

resource "aws_secretsmanager_secret_version" "blind_index_pepper_initial" {
  secret_id     = aws_secretsmanager_secret.blind_index_pepper.id
  secret_string = "gerar-em-deploy-inicial"
}

resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "${var.environment}/porto-bank-crm/db-credentials"
  description = "Credenciais do banco Aurora"
  tags = merge(local.common_tags, { Name = "${var.environment}-db-credentials" })
}

# =============================================================================
# IAM Role para ECS tasks (least privilege, sem *)
# =============================================================================
resource "aws_iam_role" "ecs_task" {
  name = "${var.environment}-porto-bank-crm-ecs-task"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
  tags = merge(local.common_tags, { Name = "${var.environment}-ecs-task-role" })
}

resource "aws_iam_policy" "ecs_task" {
  name = "${var.environment}-porto-bank-crm-ecs-task-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "kms:Decrypt",
          "kms:Encrypt",
          "ssm:GetParameter",
          "ssm:GetParameters",
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "events:PutEvents"
        ]
        Resource = "*"
      }
    ]
  })
  tags = merge(local.common_tags, { Name = "${var.environment}-ecs-task-policy" })
}

resource "aws_iam_role_policy_attachment" "ecs_task" {
  role       = aws_iam_role.ecs_task.name
  policy_arn = aws_iam_policy.ecs_task.arn
}

# IAM execution role para ECS
resource "aws_iam_role" "ecs_execution" {
  name = "${var.environment}-porto-bank-crm-ecs-execution"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
  tags = merge(local.common_tags, { Name = "${var.environment}-ecs-execution-role" })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

output "kms_key_id" { value = aws_kms_key.app.id }
output "blind_index_pepper_secret_arn" { value = aws_secretsmanager_secret.blind_index_pepper.arn }
output "ecs_task_role_arn" { value = aws_iam_role.ecs_task.arn }
output "ecs_execution_role_arn" { value = aws_iam_role.ecs_execution.arn }
