#!/usr/bin/env bash
# Build the VIEWDBG engine into dist-diag, then run envpos with Codex's old c_start packs
set -eu
export COF_WORK=/root/cof-audits/audit-D3Kl5uly; W=$COF_WORK
S=/mnt/c/Users/josue/AppData/Local/Temp/claude/C--Users-josue/c2c79a05-c4b9-45e7-9a8b-0ec4623056ec/scratchpad
REPO="/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web"
MAPS="c_game_menu1 c_intro c_nightmare c_start c_start2 c_apartment1 c_apartment2 c_apartment3 c_apartment4 c_apartment5 c_apartmentsick"
python3 $S/viewdbg.py apply
cd "$REPO"
bash tools/wsl/build_engine.sh > $W/diag-engine.log 2>&1 || { grep -E "error" $W/diag-engine.log | head; exit 1; }
rm -rf $W/dist-diag
COF_DIST=$W/dist-diag bash tools/wsl/package.sh $MAPS 2>&1 | grep -E "dist listo"
for f in packs/map_c_start.data packs/map_c_start.js packs/map_c_start2.data packs/map_c_start2.js; do cp $W/dist/$f $W/dist-diag/$f; done
bash $S/envpos_run.sh $W/dist-diag diag-viewdbg | grep -E "exit=|Error:" | head -2
