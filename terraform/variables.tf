# =============================================================================
# Porto Bank CRM — Terraform Variáveis (raiz)
# =============================================================================
terraform {
  required_version = ">= 1.9.0"
  backend "local" {}
}

variable "environment" {
  type        = string
  default     = "prod"
  description = "Nome do ambiente"
}

variable "region" {
  type        = string
  default     = "sa-east-1"
  description = "Região AWS"
}

variable "vpc_cidr" {
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  type        = number
  default     = 3
}

variable "acm_certificate_arn" {
  type        = string
  description = "ARN do certificado ACM para HTTPS"
}

variable "db_master_password" {
  type        = string
  description = "Senha master do banco Aurora"
  sensitive   = true
}

variable "api_container_image" {
  type        = string
  description = "Imagem do container da API"
}

variable "worker_container_image" {
  type        = string
  description = "Imagem do container do worker"
}
