#!/usr/bin/env bash
# Syncs this project to an already-bootstrapped EC2 instance (see
# bootstrap_ec2.sh) and (re)builds/starts the docker-compose stack there.
# Safe to re-run for every redeploy - it rsyncs changed files only and
# does a `docker compose up -d --build`, which recreates just the "app"
# image/container; the "db" container and its volume are left alone so
# team data is never wiped by a redeploy.
#
# Usage:
#   EC2_HOST=1.2.3.4 EC2_USER=ubuntu SSH_KEY=~/keys/my-key.pem ./deploy/deploy.sh
set -euo pipefail

EC2_HOST="${EC2_HOST:?Set EC2_HOST to the instance's public IP or DNS name}"
EC2_USER="${EC2_USER:-ubuntu}"
SSH_KEY="${SSH_KEY:?Set SSH_KEY to the path of your .pem private key}"
REMOTE_DIR="${REMOTE_DIR:-app}"

SSH_CMD="ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Ensuring remote directory exists"
$SSH_CMD "$EC2_USER@$EC2_HOST" "mkdir -p $REMOTE_DIR"

echo "==> Syncing project files to $EC2_USER@$EC2_HOST:$REMOTE_DIR"
rsync -az --delete \
  --exclude 'frontend/node_modules' \
  --exclude 'frontend/dist' \
  --exclude 'backend/venv' \
  --exclude 'backend/data' \
  --exclude '__pycache__' \
  --exclude '.git' \
  --exclude '.env' \
  -e "$SSH_CMD" \
  "$REPO_ROOT"/ "$EC2_USER@$EC2_HOST:$REMOTE_DIR"/

echo "==> Checking for .env on the server"
$SSH_CMD "$EC2_USER@$EC2_HOST" "test -f $REMOTE_DIR/.env" || {
  echo "ERROR: $REMOTE_DIR/.env is missing on the server."
  echo "Copy .env.production.example there as '.env', fill in real secrets, then re-run this script."
  exit 1
}

echo "==> Building and starting containers on the server"
$SSH_CMD "$EC2_USER@$EC2_HOST" "cd $REMOTE_DIR && docker compose up -d --build"

echo "==> Recent app logs:"
$SSH_CMD "$EC2_USER@$EC2_HOST" "cd $REMOTE_DIR && docker compose logs --tail=40 app"

SITE_DOMAIN=$($SSH_CMD "$EC2_USER@$EC2_HOST" "grep -m1 '^SITE_DOMAIN=' $REMOTE_DIR/.env | cut -d= -f2-" || true)

cat <<EOF

Deployment complete.
EOF
if [ -n "$SITE_DOMAIN" ]; then
  cat <<EOF
  App:   https://$SITE_DOMAIN/
  Admin: https://$SITE_DOMAIN/admin
(Caddy needs a minute on first run to obtain the Let's Encrypt cert.)
EOF
else
  cat <<EOF
  App:   http://$EC2_HOST/
  Admin: http://$EC2_HOST/admin
EOF
fi
