terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  default = "ap-south-1"
}

variable "key_name" {
  description = "Name of an existing EC2 key pair to attach for SSH access"
  type        = string
}

variable "my_ip" {
  description = "Your IP in CIDR form, e.g. 1.2.3.4/32"
  type        = string
}

variable "instance_type" {
  default = "m7i-flex.large"
}

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "minikube_host" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.instance_type
  key_name               = var.key_name
  vpc_security_group_ids = [aws_security_group.minikube_sg.id]

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  user_data = file("${path.module}/bootstrap.sh")

  tags = {
    Name = "devops-challenge-minikube"
  }
}

output "instance_public_ip" {
  value = aws_instance.minikube_host.public_ip
}

output "ssh_command" {
  value = "ssh -i <your-key>.pem ec2-user@${aws_instance.minikube_host.public_ip}"
}
