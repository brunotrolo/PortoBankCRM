variable "environment" {
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
# ECR Repositories — Imagens Docker do Porto Bank CRM
# =============================================================================

resource "aws_ecr_repository" "api" {
  name                 = "${var.environment}-porto-bank-crm-api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = merge(local.common_tags, { Name = "${var.environment}-ecr-api" })
}

resource "aws_ecr_repository" "worker" {
  name                 = "${var.environment}-porto-bank-crm-worker"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = merge(local.common_tags, { Name = "${var.environment}-ecr-worker" })
}

resource "aws_ecr_repository" "frontend" {
  name                 = "${var.environment}-porto-bank-crm-frontend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = merge(local.common_tags, { Name = "${var.environment}-ecr-frontend" })
}

output "ecr_api_repository_url"    { value = aws_ecr_repository.api.repository_url }
output "ecr_worker_repository_url" { value = aws_ecr_repository.worker.repository_url }
output "ecr_frontend_repository_url" { value = aws_ecr_repository.frontend.repository_url }
