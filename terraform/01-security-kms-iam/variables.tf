variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }

locals {
  common_tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    Project     = "deskcomm-crm"
    Compliance  = "BACEN-4893/LGPD"
  }
}
