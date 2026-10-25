#!/usr/bin/env bash
# e2e.sh - Ejecuta tools/e2e/smoke.mjs contra un dist servido (por defecto el local en :8080).
#
#   e2e.sh [url] [mapa]
#   e2e.sh https://cof-web.example.org/        (también sirve contra el despliegue real)
set -euo pipefail

WORK="${COF_WORK:-$HOME/cof-web}"
SRC="$(cd "$(dirname "$0")/.." && pwd)/e2e/smoke.mjs"
NODE_BIN="$(ls -d "${EMSDK_DIR:-$HOME/emsdk}"/node/*/bin | tail -1)"
export PATH="$NODE_BIN:$PATH"

[ -d "$WORK/e2e/node_modules/playwright" ] || { echo "falta Playwright: ejecuta e2e_setup.sh" >&2; exit 2; }
cp "$SRC" "$WORK/e2e/smoke.mjs" # junto a node_modules para que resuelva "playwright"
cd "$WORK/e2e"
node smoke.mjs "${1:-http://localhost:8080/}" "${2:-c_cof_forest1}"
