#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/worker"

COLLECTOR="${SCRAPER_STUDIO_COLLECTOR_ID:-c_msygw29h15ak5olz7j}"
export SCRAPER_STUDIO_COLLECTOR_ID="$COLLECTOR"

# Seed local Miniflare KV so the dashboard has data before wrangler dev starts.
npx wrangler kv key put --binding=RADAR_KV latest --path "$ROOT/data/latest.json" --local >/dev/null
npx wrangler kv key put --binding=RADAR_KV events '[]' --local >/dev/null

echo "Start OK: local RADAR_KV seeded (collector ${COLLECTOR})"
