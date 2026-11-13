#!/usr/bin/env bash
# Usage (from your machine):  ./deploy/sync_to_server.sh root@<server-ip>
# Copies CODE only. .env files, data, logs and the venv never leave your machine.
set -euo pipefail

TARGET=${1:?usage: sync_to_server.sh user@host}
ROOT=$(cd "$(dirname "$0")/.." && pwd)

rsync -az --delete \
  --exclude '.env' --exclude '.env.*' \
  --exclude 'data/' --exclude 'logs/' --exclude 'venv/' \
  --exclude '__pycache__/' --exclude '.pytest_cache/' --exclude '.git/' \
  "$ROOT"/ "$TARGET":/opt/bagbot2/

# On updates (after bootstrap has run once): refresh dependencies and restart.
ssh "$TARGET" 'if [ -d /opt/bagbot2/venv ]; then
  /opt/bagbot2/venv/bin/pip install -q -r /opt/bagbot2/requirements.txt &&
  systemctl restart bagbot2 && echo "service restarted"; fi'
