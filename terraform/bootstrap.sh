#!/bin/bash
set -e

dnf update -y
dnf install -y docker git conntrack libicu

systemctl start docker
systemctl enable docker
usermod -aG docker ec2-user

curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
rm -f kubectl

curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
install minikube-linux-amd64 /usr/local/bin/minikube
rm -f minikube-linux-amd64

echo "Bootstrap complete. SSH in as ec2-user and run: minikube start --driver=docker --cpus=2 --memory=6000mb" > /home/ec2-user/BOOTSTRAP_DONE.txt
chown ec2-user:ec2-user /home/ec2-user/BOOTSTRAP_DONE.txt
