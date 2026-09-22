#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT/worker"
if [[ -f package-lock.json ]]; then
  npm ci --prefer-offline --no-audit --no-fund
else
  npm install --prefer-offline --no-audit --no-fund
fi

node --check "$ROOT/scripts/pipeline.js"
node --check "$ROOT/scripts/heal.js"
node --check "$ROOT/worker/index.js"

echo "Install OK: Node $(node --version), wrangler $(npx wrangler --version | head -1)"
