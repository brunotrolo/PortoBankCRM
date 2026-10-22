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

data "terraform_remote_state" "security" {
  backend = "s3"
  config = {
    bucket         = "porto-bank-crm-terraform-state"
    key            = "porto-bank-crm/01-security-kms-iam/terraform.tfstate"
    region         = "sa-east-1"
    dynamodb_table = "porto-bank-crm-terraform-lock"
    encrypt        = true
  }
}

data "terraform_remote_state" "edge" {
  backend = "s3"
  config = {
    bucket         = "porto-bank-crm-terraform-state"
    key            = "porto-bank-crm/05-edge-waf-apigw/terraform.tfstate"
    region         = "sa-east-1"
    dynamodb_table = "porto-bank-crm-terraform-lock"
    encrypt        = true
  }
}

variable "environment" {
  type        = string
  default     = "prod"
}

variable "region" {
  type        = string
  default     = "sa-east-1"
}

variable "vpc_id" {
  type        = string
  default     = data.terraform_remote_state.vpc.outputs.vpc_id
}

variable "private_subnet_ids" {
  type        = list(string)
  default     = data.terraform_remote_state.vpc.outputs.private_subnet_ids
}

variable "public_subnet_ids" {
  type        = list(string)
  default     = data.terraform_remote_state.vpc.outputs.public_subnet_ids
}

variable "ecs_task_role_arn" {
  type        = string
  default     = data.terraform_remote_state.security.outputs.ecs_task_role_arn
}

variable "ecs_execution_role_arn" {
  type        = string
  default     = data.terraform_remote_state.security.outputs.ecs_execution_role_arn
}

variable "api_container_image" {
  type        = string
}

variable "worker_container_image" {
  type        = string
}

variable "desired_count" {
  type        = number
  default     = 2
}

variable "max_count" {
  type        = number
  default     = 10
}

variable "min_count" {
  type        = number
  default     = 1
}

variable "api_target_group_arn" {
  type        = string
  default     = data.terraform_remote_state.edge.outputs.target_group_arn
}

locals {
  common_tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    Project     = "porto-bank-crm"
    Compliance  = "BACEN-4893/LGPD"
  }
}
