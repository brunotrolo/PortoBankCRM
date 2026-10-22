terraform {
  backend "s3" {
    bucket         = "porto-bank-crm-terraform-state"
    key            = "porto-bank-crm/02-data-aurora-dynamo-redis/terraform.tfstate"
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

variable "kms_key_id" {
  description = "ID da chave KMS"
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
# Aurora PostgreSQL Serverless v2
# =============================================================================
resource "aws_db_subnet_group" "main" {
  name       = "${var.environment}-porto-bank-crm-db-subnet"
  subnet_ids = var.private_subnet_ids
  tags = merge(local.common_tags, { Name = "${var.environment}-db-subnet" })
}

resource "aws_security_group" "rds" {
  name        = "${var.environment}-porto-bank-crm-rds-sg"
  description = "Acesso ao Aurora apenas dos subnets privados"
  vpc_id      = var.vpc_id
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = merge(local.common_tags, { Name = "${var.environment}-rds-sg" })
}

resource "aws_rds_cluster" "main" {
  cluster_identifier      = "${var.environment}-porto-bank-crm-aurora"
  engine                  = "aurora-postgresql"
  engine_mode             = "provisioned"
  engine_version          = "15.4"
  database_name           = "porto_bank_crm"
  master_username         = "admin"
  master_password         = var.db_master_password
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.rds.id]
  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 16
  }
  backup_retention_period = 35
  deletion_protection     = true
  storage_encrypted       = true
  kms_key_id              = var.kms_key_id
  tags = merge(local.common_tags, { Name = "${var.environment}-aurora" })
}

variable "db_master_password" {
  type        = string
  description = "Senha master do banco Aurora"
  sensitive   = true
}

# =============================================================================
# RDS Proxy
# =============================================================================
resource "aws_rds_db_proxy" "main" {
  name                  = "${var.environment}-porto-bank-crm-proxy"
  engine_family         = "POSTGRESQL"
  auth                  = [{
    auth_schema = "SECRETS",
    secret_arn  = aws_secretsmanager_secret.db_credentials.arn
  }]
  vpc_subnet_ids        = var.private_subnet_ids
  vpc_security_group_ids = [aws_security_group.rds.id]
  require_tls           = true
  idle_client_timeout   = 1800
  tags = merge(local.common_tags, { Name = "${var.environment}-rds-proxy" })
}

# =============================================================================
# DynamoDB single-table (sessões, estado de fila, idempotência)
# =============================================================================
resource "aws_dynamodb_table" "single_table" {
  name             = "${var.environment}-porto-bank-crm-single-table"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "PK"
  range_key        = "SK"
  attribute {
    name = "PK"
    type = "S"
  }
  attribute {
    name = "SK"
    type = "S"
  }
  stream_enabled  = true
  stream_view_type = "NEW_AND_OLD_IMAGES"
  tags = merge(local.common_tags, { Name = "${var.environment}-dynamodb-single-table" })
}

# =============================================================================
# ElastiCache Serverless Redis (Valkey)
# =============================================================================
resource "aws_security_group" "redis" {
  name        = "${var.environment}-porto-bank-crm-redis-sg"
  description = "Redis/Valkey — acesso apenas da VPC"
  vpc_id      = var.vpc_id
  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }
  tags = merge(local.common_tags, { Name = "${var.environment}-redis-sg" })
}

resource "aws_elasticache_serverless_cache" "redis" {
  name              = "${var.environment}-porto-bank-crm-redis"
  description       = "Cache, sessões, rate limit sliding window, idempotência"
  engine            = "VALKEY"
  major_engine_version = "7"
  client_type       = "valkey"
  tags = merge(local.common_tags, { Name = "${var.environment}-redis" })
}

# =============================================================================
# OpenSearch Serverless (busca RAG)
# =============================================================================
resource "aws_opensearch_serverless_collection" "search" {
  name     = "${var.environment}-porto-bank-crm-search"
  description = "Busca semântica RAG e full-text"
  tags = merge(local.common_tags, { Name = "${var.environment}-opensearch" })
}

output "aurora_endpoint" { value = aws_rds_cluster.main.endpoint }
output "dynamodb_table_name" { value = aws_dynamodb_table.single_table.name }
output "redis_endpoint" { value = aws_elasticache_serverless_cache.redis.endpoint_address }
