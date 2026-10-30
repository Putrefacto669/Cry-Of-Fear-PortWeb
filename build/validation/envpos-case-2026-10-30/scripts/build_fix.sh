#!/usr/bin/env bash
# Package the fix into dist-fix (game and engine already built with the diagnostic commands) and validate
set -eu
export COF_WORK=/root/cof-audits/audit-D3Kl5uly; W=$COF_WORK
S=/mnt/c/Users/josue/AppData/Local/Temp/claude/C--Users-josue/c2c79a05-c4b9-45e7-9a8b-0ec4623056ec/scratchpad
REPO="/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web"
MAPS="c_game_menu1 c_intro c_nightmare c_start c_start2 c_apartment1 c_apartment2 c_apartment3 c_apartment4 c_apartment5 c_apartmentsick"
cd "$REPO"
bash tools/wsl/build_game.sh > $W/fix-game.log 2>&1 || { grep -E "error" $W/fix-game.log | head; exit 1; }
rm -rf $W/dist-fix
COF_DIST=$W/dist-fix bash tools/wsl/package.sh $MAPS 2>&1 | grep -E "dist listo"
grep -c "canonicalPath" $W/dist-fix/loader.js
rm -rf $W/dist-fix-oldstart; cp -al $W/dist-fix $W/dist-fix-oldstart
for f in packs/map_c_start.data packs/map_c_start.js packs/map_c_start2.data packs/map_c_start2.js; do rm -f $W/dist-fix-oldstart/$f; cp $W/dist/$f $W/dist-fix-oldstart/$f; done
# the old c_start2 pack has to be loaded to show anything: same steps as the failing runs
echo "== case experiment (fix)"; MODES="control packcase control" bash $S/case_run.sh $W/dist-fix case-fix | grep -vE "^\s*$"
for i in 1 2; do echo "== envpos fix + old c_start packs, run $i"; bash $S/envpos_run.sh $W/dist-fix-oldstart fix-oldstart-$i | grep -E "exit=|Error:|OK map transition c_game_menu1" ; done
for i in 1 2 3; do echo "== envpos fix, run $i"; bash $S/envpos_run.sh $W/dist-fix fix-$i | grep -E "exit=|Error:|OK map transition c_game_menu1"; done
