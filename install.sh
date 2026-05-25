#!/bin/sh
set -eu

echo "[install] New Novels install start"
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

if [ -f ".next/standalone/server.js" ]; then
  echo "[install] standalone build artifacts found; skip dependency install"
else
  echo "[install] standalone build artifacts missing; installing runtime dependencies only"
  npm ci --omit=dev
fi

echo "[install] New Novels install complete"
