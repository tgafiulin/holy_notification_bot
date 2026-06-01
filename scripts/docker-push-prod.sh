#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${BOT_IMAGE:-}" ]]; then
  echo "Set BOT_IMAGE, e.g. ghcr.io/username/holy-notification-bot:latest" >&2
  exit 1
fi

echo "Pushing ${BOT_IMAGE}..."
docker push "${BOT_IMAGE}"
