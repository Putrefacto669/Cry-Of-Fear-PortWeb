#!/usr/bin/env bash
# e2e_setup.sh - Instala Playwright + Chromium (sin interfaz) en WSL para tools/e2e/smoke.mjs.
#
# Usa el Node que ya trae emsdk. Se instala en ~/cof-web/e2e (fuera del repo).
set -euo pipefail

WORK="${COF_WORK:-$HOME/cof-web}"
NODE_BIN="$(ls -d "${EMSDK_DIR:-$HOME/emsdk}"/node/*/bin | tail -1)"
export PATH="$NODE_BIN:$PATH"

mkdir -p "$WORK/e2e"
cd "$WORK/e2e"
[ -f package.json ] || npm init -y > /dev/null
npm install --no-fund --no-audit playwright@1.56.1 > /dev/null
npx playwright install --with-deps chromium > /dev/null
echo "node $(node --version), $(npx playwright --version) en $WORK/e2e"
