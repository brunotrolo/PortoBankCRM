# =============================================================================
# PORTO BANK CRM — Terraform Bootstrap
# Cria o bucket S3 e a tabela DynamoDB para armazenar o estado remoto do Terraform.
#
# Este arquivo deve ser aplicado ANTES de qualquer outra camada, pois o backend
# remoto depende desses recursos.
#
# Uso:
#   cd terraform
#   terraform init -backend-config="key=porto-bank-crm/bootstrap/terraform.tfstate"
#   terraform apply -target=aws_s3_bucket.terraform_state -target=aws_dynamodb_table.terraform_lock
#   # Depois, altere o backend de cada camada para usar o bucket criado
#   terraform init
#   terraform apply
# =============================================================================

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

# Bucket S3 para estado do Terraform
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

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Tabela DynamoDB para lock do estado do Terraform
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
