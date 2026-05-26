#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
OUTPUT_DIR="${OUTPUT_DIR:-$ROOT_DIR/dist}"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/new-novels-guard.XXXXXX")"
COPY_DIR="$WORK_DIR/New_Novels"

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

mkdir -p "$OUTPUT_DIR" "$COPY_DIR"

echo "[guard-package] copy source"
tar \
  --exclude ".git" \
  --exclude ".next" \
  --exclude "node_modules" \
  --exclude "dist" \
  --exclude "coverage" \
  --exclude ".superpowers" \
  --exclude ".worktrees" \
  --exclude ".DS_Store" \
  -cf - -C "$ROOT_DIR" . | tar -xf - -C "$COPY_DIR"

cd "$COPY_DIR"
find . -name ".DS_Store" -delete

echo "[guard-package] install and build"
npm install
npm run build

echo "[guard-package] prepare standalone assets"
mkdir -p .next/standalone/.next
cp -R .next/static .next/standalone/.next/static
if [ -d public ]; then
  cp -R public .next/standalone/public
fi
rm -rf .next/cache .worktrees .superpowers
node - <<'NODE'
const { readFileSync, writeFileSync } = require("node:fs");
const file = ".next/standalone/server.js";
const current = readFileSync(file, "utf8");
writeFileSync(
  file,
  current
    .replace(/process\.env\.HOSTNAME/g, "process.env.APP_HOSTNAME")
    .replace(/process\.env\.PORT/g, "process.env.APP_PORT")
);
NODE

echo "[guard-package] zip"
ZIP_PATH="$OUTPUT_DIR/new-novels-guard.zip"
rm -f "$ZIP_PATH"
zip -qr "$ZIP_PATH" . \
  -x "node_modules/*" \
  -x ".git/*" \
  -x "coverage/*" \
  -x ".superpowers/*" \
  -x ".worktrees/*" \
  -x ".next/cache/*" \
  -x "docs/superpowers/*"

echo "[guard-package] wrote $ZIP_PATH"
