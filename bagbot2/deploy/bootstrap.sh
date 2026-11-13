#!/usr/bin/env bash
# Run ON THE SERVER as root, after deploy/sync_to_server.sh has copied the code to /opt/bagbot2.
# Target: Ubuntu 22.04 or 24.04 (EC2 Ubuntu AMI or DigitalOcean droplet).
set -euo pipefail

APP_DIR=/opt/bagbot2
ENV_DIR=/etc/bagbot2
APP_USER=bagbot

[[ $EUID -eq 0 ]] || { echo "Run as root."; exit 1; }
[[ -f $APP_DIR/requirements.txt ]] || { echo "Code not found in $APP_DIR. Run sync_to_server.sh first."; exit 1; }

apt-get update -y
apt-get install -y python3 python3-venv python3-pip ufw

id -u "$APP_USER" &>/dev/null || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$APP_DIR/data" "$APP_DIR/logs" "$ENV_DIR"

[[ -d $APP_DIR/venv ]] || python3 -m venv "$APP_DIR/venv"
"$APP_DIR/venv/bin/pip" install -q --upgrade pip
"$APP_DIR/venv/bin/pip" install -q -r "$APP_DIR/requirements.txt"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# Non-secret defaults only. Add DASHBOARD_TOKEN and ALERT_WEBHOOK_URL by hand on the server.
if [[ ! -f $ENV_DIR/bagbot2.env ]]; then
  cat > "$ENV_DIR/bagbot2.env" <<EOF
BAGBOT_MODE=paper
BAGBOT_HOST=127.0.0.1
BAGBOT_PORT=8000
BAGBOT_SYMBOLS=SPY,AAPL,MSFT
BAGBOT_STATE_FILE=$APP_DIR/data/state.json
# DASHBOARD_TOKEN=
# ALERT_WEBHOOK_URL=
EOF
  chmod 600 "$ENV_DIR/bagbot2.env"
fi

install -m 644 "$APP_DIR/deploy/bagbot2.service" /etc/systemd/system/bagbot2.service
systemctl daemon-reload
systemctl enable bagbot2

# Firewall: SSH only. The dashboard stays on 127.0.0.1 and is reached through an SSH tunnel.
ufw allow OpenSSH
ufw default deny incoming
ufw --force enable

systemctl restart bagbot2
echo "BAGBOT2 is running. Next: sudo nano $ENV_DIR/bagbot2.env  (set DASHBOARD_TOKEN), then sudo systemctl restart bagbot2"
