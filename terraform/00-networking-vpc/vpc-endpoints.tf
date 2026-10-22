variable "environment" {
  type        = string
}

variable "vpc_id" {
  type        = string
}

variable "private_subnet_ids" {
  type        = list(string)
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
# VPC Endpoints — PrivateLink para não sair da rede AWS
# =============================================================================

# S3
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  subnet_ids        = var.private_subnet_ids
  tags              = merge(local.common_tags, { Name = "${var.environment}-vpce-s3" })
}

# DynamoDB
resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.dynamodb"
  vpc_endpoint_type = "Gateway"
  subnet_ids        = var.private_subnet_ids
  tags              = merge(local.common_tags, { Name = "${var.environment}-vpce-dynamodb" })
}

# Secrets Manager
resource "aws_vpc_endpoint" "secretsmanager" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.secretsmanager"
  vpc_endpoint_type = "Interface"
  subnet_ids        = var.private_subnet_ids
  private_dns_enabled = true
  security_group_ids  = [aws_security_group.vpce.id]
  tags                = merge(local.common_tags, { Name = "${var.environment}-vpce-secretsmanager" })
}

# KMS
resource "aws_vpc_endpoint" "kms" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.kms"
  vpc_endpoint_type = "Interface"
  subnet_ids        = var.private_subnet_ids
  private_dns_enabled = true
  security_group_ids  = [aws_security_group.vpce.id]
  tags                = merge(local.common_tags, { Name = "${var.environment}-vpce-kms" })
}

# SQS
resource "aws_vpc_endpoint" "sqs" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.sqs"
  vpc_endpoint_type = "Interface"
  subnet_ids        = var.private_subnet_ids
  private_dns_enabled = true
  security_group_ids  = [aws_security_group.vpce.id]
  tags                = merge(local.common_tags, { Name = "${var.environment}-vpce-sqs" })
}

# CloudWatch Logs
resource "aws_vpc_endpoint" "cloudwatch_logs" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.logs"
  vpc_endpoint_type = "Interface"
  subnet_ids        = var.private_subnet_ids
  private_dns_enabled = true
  security_group_ids  = [aws_security_group.vpce.id]
  tags                = merge(local.common_tags, { Name = "${var.environment}-vpce-cloudwatch-logs" })
}

# CloudWatch Monitoring
resource "aws_vpc_endpoint" "cloudwatch_monitoring" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.monitoring"
  vpc_endpoint_type = "Interface"
  subnet_ids        = var.private_subnet_ids
  private_dns_enabled = true
  security_group_ids  = [aws_security_group.vpce.id]
  tags                = merge(local.common_tags, { Name = "${var.environment}-vpce-cloudwatch-monitoring" })
}

# ECR
resource "aws_vpc_endpoint" "ecr_api" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.ecr.api"
  vpc_endpoint_type = "Interface"
  subnet_ids        = var.private_subnet_ids
  private_dns_enabled = true
  security_group_ids  = [aws_security_group.vpce.id]
  tags                = merge(local.common_tags, { Name = "${var.environment}-vpce-ecr-api" })
}

resource "aws_vpc_endpoint" "ecr_dkr" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.ecr.dkr"
  vpc_endpoint_type = "Interface"
  subnet_ids        = var.private_subnet_ids
  private_dns_enabled = true
  security_group_ids  = [aws_security_group.vpce.id]
  tags                = merge(local.common_tags, { Name = "${var.environment}-vpce-ecr-dkr" })
}

# Cognito (Identity)
resource "aws_vpc_endpoint" "cognito_identity" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.cognito-identity"
  vpc_endpoint_type = "Interface"
  subnet_ids        = var.private_subnet_ids
  private_dns_enabled = true
  security_group_ids  = [aws_security_group.vpce.id]
  tags                = merge(local.common_tags, { Name = "${var.environment}-vpce-cognito-identity" })
}

resource "aws_vpc_endpoint" "cognito_idp" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.cognito-idp"
  vpc_endpoint_type = "Interface"
  subnet_ids        = var.private_subnet_ids
  private_dns_enabled = true
  security_group_ids  = [aws_security_group.vpce.id]
  tags                = merge(local.common_tags, { Name = "${var.environment}-vpce-cognito-idp" })
}

# Security Group para VPC Endpoints (apenas tráfego interno da VPC)
resource "aws_security_group" "vpce" {
  name        = "${var.environment}-porto-bank-crm-vpce-sg"
  description = "Security group para VPC Endpoints (PrivateLink)"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, { Name = "${var.environment}-vpce-sg" })
}

output "vpc_endpoint_ids" {
  value = {
    s3                = aws_vpc_endpoint.s3.id
    dynamodb          = aws_vpc_endpoint.dynamodb.id
    secretsmanager    = aws_vpc_endpoint.secretsmanager.id
    kms               = aws_vpc_endpoint.kms.id
    sqs               = aws_vpc_endpoint.sqs.id
    cloudwatch_logs   = aws_vpc_endpoint.cloudwatch_logs.id
    cloudwatch_monitoring = aws_vpc_endpoint.cloudwatch_monitoring.id
    ecr_api           = aws_vpc_endpoint.ecr_api.id
    ecr_dkr           = aws_vpc_endpoint.ecr_dkr.id
    cognito_identity  = aws_vpc_endpoint.cognito_identity.id
    cognito_idp       = aws_vpc_endpoint.cognito_idp.id
  }
}
