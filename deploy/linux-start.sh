#!/usr/bin/env bash
set -euo pipefail

cd /home/telemed/TelemedDashboard
mkdir -p output
export NODE_ENV=production
npm start
