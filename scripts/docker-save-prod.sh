#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

IMAGE="${BOT_IMAGE:-holy-notification-bot:latest}"
OUT="${1:-bot-image.tar.gz}"

echo "Saving ${IMAGE} to ${OUT}..."
docker save "${IMAGE}" | gzip > "${OUT}"
echo "Upload: scp ${OUT} user@vps:/tmp/"
echo "Load:   ssh user@vps 'docker load -i /tmp/${OUT}'"
