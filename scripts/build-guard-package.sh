#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
PROJECT_NAME="$(basename "$ROOT_DIR")"
PARENT_DIR="$(dirname "$ROOT_DIR")"
OUTPUT_DIR="${OUTPUT_DIR:-$PARENT_DIR}"
COPY_DIR="${COPY_DIR:-$OUTPUT_DIR/${PROJECT_NAME}-guard}"

mkdir -p "$OUTPUT_DIR"
rm -rf "$COPY_DIR"
mkdir -p "$COPY_DIR"

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
if [ "$OUTPUT_DIR" = "$PARENT_DIR" ]; then
  ZIP_PATH="$OUTPUT_DIR/${PROJECT_NAME}-guard.zip"
fi
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
