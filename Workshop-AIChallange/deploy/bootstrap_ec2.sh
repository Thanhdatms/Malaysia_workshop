#!/usr/bin/env bash
# Run ONCE on a fresh Ubuntu 22.04/24.04 EC2 instance to prepare it for
# hosting the workshop app (installs Docker + the Compose plugin only -
# no other services, since Postgres runs in a container on this same box).
#
# Usage (from your machine):
#   ssh -i <key>.pem ubuntu@<EC2_PUBLIC_IP> 'bash -s' < deploy/bootstrap_ec2.sh
# or, after copying it over:
#   ssh -i <key>.pem ubuntu@<EC2_PUBLIC_IP>
#   bash bootstrap_ec2.sh
set -euo pipefail

echo "==> Updating base packages"
sudo apt-get update -y
sudo apt-get upgrade -y

echo "==> Installing Docker Engine + Compose plugin"
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "==> Enabling Docker and adding $USER to the docker group"
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"

echo "==> Opening firewall for SSH/HTTP/HTTPS (if ufw is present)"
if command -v ufw >/dev/null 2>&1; then
  sudo ufw allow OpenSSH
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw --force enable
fi

mkdir -p ~/app

cat <<'EOF'

Bootstrap complete.

IMPORTANT: log out and back in (or reboot) so your docker group membership
takes effect before running docker commands without sudo.

Next steps:
  1. From your machine, run deploy/deploy.sh to sync the project here and
     bring the stack up, OR manually copy the repo into ~/app.
  2. Copy .env.production.example to ~/app/.env on this server and fill in
     real secrets (POSTGRES_PASSWORD, ADMIN_TOKEN, DEEPSEEK_API_KEY) before
     the first `docker compose up`.
EOF