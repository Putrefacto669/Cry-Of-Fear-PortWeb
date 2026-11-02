set -euo pipefail
REPO='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
git -C /root/cof-audits/audit-D3Kl5uly/game/hlsdk-portable diff > "$REPO/patches/hlsdk/0001-root.patch"
COF_WORK=/root/cof-audits/audit-D3Kl5uly bash "$REPO/tools/wsl/build_game.sh" build
COF_WORK=/root/cof-audits/extras-20261101 COF_BUILD=/root/cof-audits/audit-D3Kl5uly/build COF_DIST=/root/cof-audits/extras-20261101/dist-second bash "$REPO/tools/wsl/package.sh" c_game_menu1 c_intro c_nightmare c_start c_start2 c_apartment1 c_apartment2 c_apartment3 c_apartment4 c_apartment5 c_apartmentsick