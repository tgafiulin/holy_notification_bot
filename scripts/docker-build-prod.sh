#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

IMAGE="${BOT_IMAGE:-holy-notification-bot:latest}"

echo "Building ${IMAGE} (linux/amd64)..."
docker build --platform linux/amd64 -t "${IMAGE}" .

echo "Done. Push: BOT_IMAGE=${IMAGE} npm run docker:push"
echo "Or save:  BOT_IMAGE=${IMAGE} npm run docker:save"
