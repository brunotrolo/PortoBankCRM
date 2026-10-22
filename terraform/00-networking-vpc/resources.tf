resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = merge(local.common_tags, { Name = "${var.environment}-vpc" })
}

resource "aws_subnet" "private" {
  count             = var.az_count
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags = merge(local.common_tags, {
    Name = "${var.environment}-private-${count.index}"
    Type = "private"
  })
}

resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 9, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags = merge(local.common_tags, {
    Name = "${var.environment}-public-${count.index}"
    Type = "public"
  })
}

data "aws_availability_zones" "available" { state = "available" }

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags = merge(local.common_tags, { Name = "${var.environment}-igw" })
}

resource "aws_nat_gateway" "nat" {
  count             = var.az_count
  allocation_id     = aws_eip.nat[count.index].id
  subnet_id         = aws_subnet.public[count.index].id
  connectivity_type = "private"
  tags = merge(local.common_tags, { Name = "${var.environment}-nat-${count.index}" })
}

resource "aws_eip" "nat" {
  count = var.az_count
  domain = "vpc"
  tags = merge(local.common_tags, { Name = "${var.environment}-eip-nat-${count.index}" })
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
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

output "vpc_id" { value = aws_vpc.main.id }
output "private_subnet_ids" { value = aws_subnet.private[*].id }
