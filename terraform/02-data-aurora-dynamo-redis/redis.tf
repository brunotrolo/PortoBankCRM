variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }

locals {
  common_tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    Project     = "porto-bank-crm"
    Compliance  = "BACEN-4893/LGPD"
  }
}

# =============================================================================
# ElastiCache Serverless Redis (sessões, rate limit, idempotência)
# =============================================================================
resource "aws_elasticache_serverless_cache" "redis" {
  name              = "${var.environment}-porto-bank-crm-redis"
  description       = "Cache, sessões, rate limit sliding window, idempotência"
  engine            = "VALKEY" # compatível Redis 7
  major_engine_version = "7"
  client_type       = "valkey"
  tags = merge(local.common_tags, { Name = "${var.environment}-redis" })
}

# Security group para ElastiCache (apenas subnets privados da VPC)
resource "aws_security_group" "redis" {
  name        = "${var.environment}-porto-bank-crm-redis-sg"
  description = "Redis/Valkey - acesso apenas da VPC"
  vpc_id      = var.vpc_id
  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"] # TODO: restringir ao CIDR da VPC
  }
  tags = merge(local.common_tags, { Name = "${var.environment}-redis-sg" })
}

output "redis_endpoint" { value = aws_elasticache_serverless_cache.redis.endpoint_address }
