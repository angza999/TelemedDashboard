#!/usr/bin/env bash
set -euo pipefail

echo "Service:"
systemctl status telemed-dashboard --no-pager || true

echo
echo "Port 4300:"
ss -ltnp 2>/dev/null | grep ':4300' || true
