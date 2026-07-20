#!/usr/bin/env bash
# OPTIONAL: creates a security group + a single EC2 instance via the AWS CLI.
# Only run this if you don't already have an EC2 instance to deploy to -
# it creates real, billed AWS resources (an EC2 instance + its EBS volume)
# that keep costing money until you terminate them yourself.
#
# Requires: AWS CLI installed and configured (`aws configure`) with
# permissions to create security groups and EC2 instances, plus an existing
# EC2 key pair in the target region.
#
# Usage:
#   AWS_REGION=ap-southeast-1 KEY_NAME=my-keypair CONFIRM=yes ./deploy/provision_ec2.sh
set -euo pipefail

: "${CONFIRM:?Re-run with CONFIRM=yes to acknowledge this creates billed AWS resources}"
[ "$CONFIRM" = "yes" ] || { echo "CONFIRM must be exactly 'yes'"; exit 1; }

AWS_REGION="${AWS_REGION:?Set AWS_REGION, e.g. ap-southeast-1}"
KEY_NAME="${KEY_NAME:?Set KEY_NAME to an existing EC2 key pair name in that region}"
INSTANCE_TYPE="${INSTANCE_TYPE:-t3.small}"
SG_NAME="${SG_NAME:-workshop-workflow-designer-sg}"
VOLUME_SIZE_GB="${VOLUME_SIZE_GB:-20}"

echo "==> Looking up latest Ubuntu 22.04 LTS AMI in $AWS_REGION"
AMI_ID=$(aws ec2 describe-images \
  --owners 099720109477 \
  --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
            "Name=state,Values=available" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --region "$AWS_REGION" --output text)
echo "    AMI: $AMI_ID"

VPC_ID=$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true \
  --region "$AWS_REGION" --query 'Vpcs[0].VpcId' --output text)

echo "==> Creating/reusing security group ($SG_NAME) allowing SSH/HTTP/HTTPS"
SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=$SG_NAME" "Name=vpc-id,Values=$VPC_ID" \
  --region "$AWS_REGION" --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || true)
if [ -z "$SG_ID" ] || [ "$SG_ID" = "None" ]; then
  SG_ID=$(aws ec2 create-security-group \
    --group-name "$SG_NAME" --description "AI Workflow Designer workshop app" \
    --vpc-id "$VPC_ID" --region "$AWS_REGION" --query 'GroupId' --output text)
  for PORT in 22 80 443; do
    aws ec2 authorize-security-group-ingress \
      --group-id "$SG_ID" --protocol tcp --port "$PORT" --cidr 0.0.0.0/0 \
      --region "$AWS_REGION" >/dev/null
  done
fi
echo "    Security group: $SG_ID"

echo "==> Launching EC2 instance ($INSTANCE_TYPE)"
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id "$AMI_ID" \
  --instance-type "$INSTANCE_TYPE" \
  --key-name "$KEY_NAME" \
  --security-group-ids "$SG_ID" \
  --count 1 \
  --block-device-mappings "DeviceName=/dev/sda1,Ebs={VolumeSize=$VOLUME_SIZE_GB,VolumeType=gp3}" \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=workshop-workflow-designer}]' \
  --region "$AWS_REGION" \
  --query 'Instances[0].InstanceId' --output text)

echo "==> Waiting for instance $INSTANCE_ID to enter 'running' state..."
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$AWS_REGION"

PUBLIC_IP=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" --region "$AWS_REGION" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

cat <<EOF

==> Instance ready
    Instance ID: $INSTANCE_ID
    Public IP:   $PUBLIC_IP

Next steps:
  1. ssh -i <your-key>.pem ubuntu@$PUBLIC_IP 'bash -s' < deploy/bootstrap_ec2.sh
  2. EC2_HOST=$PUBLIC_IP EC2_USER=ubuntu SSH_KEY=<your-key>.pem ./deploy/deploy.sh

Remember: this instance (and its EBS volume) keeps billing until you run:
  aws ec2 terminate-instances --instance-ids $INSTANCE_ID --region $AWS_REGION
EOF
