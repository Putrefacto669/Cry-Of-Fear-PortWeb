#!/usr/bin/env bash
# build_gl.sh <shimfix mode> <dist name>: patch the shim, build the engine, package into a separate dist
set -eu
export COF_WORK=/root/cof-audits/audit-D3Kl5uly; W=$COF_WORK
S=/mnt/c/Users/josue/AppData/Local/Temp/claude/C--Users-josue/c2c79a05-c4b9-45e7-9a8b-0ec4623056ec/scratchpad/glerr
REPO="/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web"
MAPS="c_game_menu1 c_intro c_nightmare c_start c_start2 c_apartment1 c_apartment2 c_apartment3 c_apartment4 c_apartment5 c_apartmentsick"
python3 $S/shimfix.py $1
cd "$REPO"
bash tools/wsl/build_engine.sh > $W/$2-engine.log 2>&1 || { grep -E "error" $W/$2-engine.log | head -20; exit 1; }
grep -E "gl2_shim.*(warning|error)" $W/$2-engine.log | head || true
rm -rf $W/$2
COF_DIST=$W/$2 bash tools/wsl/package.sh $MAPS 2>&1 | grep -E "dist listo"
