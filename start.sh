#!/bin/sh
set -eu

export APP_HOSTNAME="${APP_HOSTNAME:-0.0.0.0}"
export APP_PORT="${APP_PORT:-3000}"

if [ ! -f ".next/standalone/server.js" ]; then
  echo "[start] missing .next/standalone/server.js; build artifacts must be packaged before deploy" >&2
  exit 1
fi

node - <<'NODE'
const { readFileSync, writeFileSync } = require("node:fs");
const file = ".next/standalone/server.js";
const current = readFileSync(file, "utf8");
const next = current
  .replace(/process\.env\.HOSTNAME/g, "process.env.APP_HOSTNAME")
  .replace(/process\.env\.PORT/g, "process.env.APP_PORT");
if (next !== current) {
  writeFileSync(file, next);
}
NODE

exec node .next/standalone/server.js
