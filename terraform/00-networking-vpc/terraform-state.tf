variable "environment" {
  type        = string
  default     = "prod"
}

variable "region" {
  type        = string
  default     = "sa-east-1"
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
# Bucket S3 para estado do Terraform (com versionamento e bloqueio público)
# =============================================================================
resource "aws_s3_bucket" "terraform_state" {
  bucket = "${var.environment}-porto-bank-crm-terraform-state"
  tags   = merge(local.common_tags, { Name = "${var.environment}-terraform-state" })

  versioning {
    enabled = true
  }

  lifecycle_rule {
    id      = "expire-old-versions"
    enabled = true

    noncurrent_version_expiration {
      days = 30
    }
  }

  # Bloquear acesso público
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# =============================================================================
# Tabela DynamoDB para lock do estado do Terraform
# =============================================================================
resource "aws_dynamodb_table" "terraform_lock" {
  name         = "${var.environment}-porto-bank-crm-terraform-lock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = merge(local.common_tags, { Name = "${var.environment}-terraform-lock" })
}

output "terraform_state_bucket" { value = aws_s3_bucket.terraform_state.id }
output "terraform_lock_table"   { value = aws_dynamodb_table.terraform_lock.id }
