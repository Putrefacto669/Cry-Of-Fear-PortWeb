set -e
T=/root/cof-audits/claude-render-20261108; [ -e $T ] && { echo exists; exit 1; }
mkdir -p $T/engine $T/game; cp -a /root/cof-audits/audit-D3Kl5uly/engine/xash3d-fwgs $T/engine/; cp -a /root/cof-audits/audit-D3Kl5uly/game/hlsdk-portable $T/game/
cd "/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web"; COF_WORK=$T bash tools/wsl/patches.sh check
