set -euo pipefail
REPO='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
SDK=/root/cof-audits/audit-D3Kl5uly/game/hlsdk-portable
python3 -B "$REPO/tools/stage_map.py" '/mnt/c/Program Files (x86)/Steam/steamapps/common/Cry of Fear' --boot-only /root/cof-audits/extras-20261101/stage
git -C "$SDK" diff > "$REPO/patches/hlsdk/0001-root.patch"
COF_WORK=/root/cof-audits/audit-D3Kl5uly bash "$REPO/tools/wsl/build_game.sh" build