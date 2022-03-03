# vim: foldmethod=indent et ts=2 sw=2:
# terraform {
#   backend "s3" {
#     bucket = "openreplay-inst-test-state"
#     key = "terraform"
#   }
# }
terraform {
  required_version = ">= 1.1.1"
}

provider "aws" {
  region = var.region
}

locals {
  eks_name = "eks-openreplay-${lower(var.environment)}"
}

data "aws_availability_zones" "available" {
  state = "available"
}

module "vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = "openreplay-vpc-${var.environment}"
  cidr = var.cidr

  azs = data.aws_availability_zones.available.names

  private_subnets = var.private_subnets
  public_subnets  = var.public_subnets
  database_subnets = var.database_subnets

  create_database_subnet_group       = true
  create_database_subnet_route_table = true

  enable_nat_gateway = true
  single_nat_gateway   = true
  enable_vpn_gateway = true
  enable_dns_hostnames = true
  enable_dns_support   = true

  enable_flow_log                      = true
  create_flow_log_cloudwatch_iam_role  = true
  create_flow_log_cloudwatch_log_group = true

  public_subnet_tags = {
    "kubernetes.io/cluster/${local.eks_name}" = "shared"
    "kubernetes.io/role/elb"              = 1
  }

  private_subnet_tags = {
    "kubernetes.io/cluster/${local.eks_name}" = "shared"
    "kubernetes.io/role/internal-elb"     = 1
  }

  tags = var.tags
}

module "database" {
  source = "./components/postgres"
  vpc_id = module.vpc.vpc_id
  vpc_cidr_block = module.vpc.vpc_cidr_block
  database_subnet_group = module.vpc.database_subnet_group
  region = var.region
  database_user_name = var.database_user_name
  database_user_password = var.database_user_password
}

module "efs" {
  source = "./components/efs"
  tags = var.tags
  subnet_id = module.vpc.private_subnets
  vpc_id = module.vpc.vpc_id
  vpc_cidr_block = module.vpc.vpc_cidr_block
  environment = var.environment
}

module "eks" {
  source = "./components/eks"
  vpc_id = module.vpc.vpc_id
  vpc_cidr_block = [var.cidr]
  private_subnets = module.vpc.private_subnets
  tags = var.tags
  region = var.region
  eks_name = local.eks_name
}

module "msk" {
  source = "./components/msk"
  number_of_broker_nodes = length(module.vpc.private_subnets)
  msk_client_subnets = module.vpc.private_subnets
  msk_vpc_id = module.vpc.vpc_id
  msk_vpc_cidr_block = module.vpc.vpc_cidr_block
  tags = var.tags
  environment = var.environment
}

module "s3" {
  for_each = var.s3_buckets
  source = "./components/s3"
  bucket_prefix = each.key
  bucket_acl = each.value
}

module "iam" {
  source = "./components/iam"
  environment = var.environment
  bucket_name = module.s3
}
