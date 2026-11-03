set -euo pipefail
R='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
T=/root/cof-audits/dual-20261102
cp "$R/tools/e2e/pages_update.mjs" "$T/"
PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers /root/emsdk/node/24.19.0_64bit/bin/node "$T/pages_update.mjs" https://putrefacto669.github.io/Cry-Of-Fear-PortWeb/ "$R/build/validation/publication-2026-11-02/cache-update" "$R/build/validation/publication-2026-11-02/deployed.signal"