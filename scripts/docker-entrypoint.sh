#!/bin/sh
set -e

# Hourly scheduled reminders (poll + DM in slot windows; missed-slot alerts).
(
  while true; do
    npm run reminder-once || echo "[entrypoint] reminder-once failed (exit $?)"
    sleep 3600
  done
) &

exec npm run bot
