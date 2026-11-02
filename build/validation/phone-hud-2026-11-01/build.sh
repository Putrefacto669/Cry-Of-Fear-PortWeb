set -euo pipefail
REPO='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
export COF_WORK=/root/cof-audits/audit-D3Kl5uly
OUT="$REPO/build/validation/phone-hud-2026-11-01"
bash "$REPO/tools/wsl/build_game.sh" build > "$OUT/build.log" 2>&1
COF_DIST=/root/cof-audits/phone-hud-20261101/dist-controls bash "$REPO/tools/wsl/package.sh" c_game_menu1 c_intro c_nightmare c_start c_start2 c_apartment1 c_apartment2 c_apartment3 c_apartment4 c_apartment5 c_apartmentsick > "$OUT/package.log" 2>&1
printf 'BUILD AND PACKAGE PASS\n'