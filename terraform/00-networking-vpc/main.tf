terraform {
  required_version = ">= 1.9.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
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
  default     = "prod"
}

variable "region" {
  description = "Região AWS"
  type        = string
  default     = "sa-east-1"
}

variable "vpc_cidr" {
  description = "CIDR da VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "Quantidade de AZs"
  type        = number
  default     = 3
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
# VPC
# =============================================================================
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = merge(local.common_tags, { Name = "${var.environment}-vpc" })
}

# =============================================================================
# Subnets Públicas (ALB, NAT)
# =============================================================================
resource "aws_subnet" "public" {
  count             = var.az_count
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags = merge(local.common_tags, {
    Name = "${var.environment}-public-${count.index}"
    Type = "public"
  })
}

# =============================================================================
# Subnets Privadas (ECS, RDS, Redis)
# =============================================================================
resource "aws_subnet" "private" {
  count             = var.az_count
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 9, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags = merge(local.common_tags, {
    Name = "${var.environment}-private-${count.index}"
    Type = "private"
  })
}

data "aws_availability_zones" "available" {
  state = "available"
}

# =============================================================================
# Internet Gateway
# =============================================================================
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags = merge(local.common_tags, { Name = "${var.environment}-igw" })
}

# =============================================================================
# NAT Gateway (uma por AZ)
# =============================================================================
resource "aws_eip" "nat" {
  count = var.az_count
  domain = "vpc"
  tags = merge(local.common_tags, { Name = "${var.environment}-eip-nat-${count.index}" })
}

resource "aws_nat_gateway" "nat" {
  count             = var.az_count
  allocation_id     = aws_eip.nat[count.index].id
  subnet_id         = aws_subnet.public[count.index].id
  connectivity_type = "private"
  tags = merge(local.common_tags, { Name = "${var.environment}-nat-${count.index}" })
}

# =============================================================================
# Route Tables
# =============================================================================
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  tags = merge(local.common_tags, { Name = "${var.environment}-rt-public" })
}

resource "aws_route" "public_igw" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.igw.id
}

resource "aws_route_table_association" "public" {
  count          = var.az_count
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  count    = var.az_count
  vpc_id   = aws_vpc.main.id
  tags = merge(local.common_tags, { Name = "${var.environment}-rt-private-${count.index}" })
}

resource "aws_route" "private_nat" {
  count             = var.az_count
  route_table_id    = aws_route_table.private[count.index].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id    = aws_nat_gateway.nat[count.index].id
}

resource "aws_route_table_association" "private" {
  count          = var.az_count
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

output "vpc_id" { value = aws_vpc.main.id }
output "public_subnet_ids" { value = aws_subnet.public[*].id }
output "private_subnet_ids" { value = aws_subnet.private[*].id }

