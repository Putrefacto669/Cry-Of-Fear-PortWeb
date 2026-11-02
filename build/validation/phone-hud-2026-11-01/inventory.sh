set -euo pipefail
REPO='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
python3 -B "$REPO/tools/e2e/map_compat_inventory.py" /root/cof-audits/audit-D3Kl5uly/stage /root/cof-audits/audit-D3Kl5uly/game/hlsdk-portable "$REPO" "$REPO/build/validation/phone-hud-2026-11-01/map-inventory.json"