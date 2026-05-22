#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/home/telemed/TelemedDashboard"
SERVICE_NAME="telemed-dashboard"
SERVICE_FILE="$PROJECT_DIR/deploy/telemed-dashboard.service"

cd "$PROJECT_DIR"
mkdir -p output

if [ ! -f ".env" ]; then
  cp .env.production.example .env
  echo "Created .env from .env.production.example"
  echo "Please edit .env before production use, especially SESSION_SECRET and database defaults."
fi

npm install --omit=dev
sudo cp "$SERVICE_FILE" "/etc/systemd/system/$SERVICE_NAME.service"
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"
sudo systemctl status "$SERVICE_NAME" --no-pager
