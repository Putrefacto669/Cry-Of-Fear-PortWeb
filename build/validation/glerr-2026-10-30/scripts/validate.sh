#!/usr/bin/env bash
S=/mnt/c/Users/josue/AppData/Local/Temp/claude/C--Users-josue/c2c79a05-c4b9-45e7-9a8b-0ec4623056ec/scratchpad
D=/root/cof-audits/audit-D3Kl5uly/dist-glfix
echo "##### walk: 11 X, screamer, c_start (dist-glfix)"
WALK_TEST=1 PORT=8102 bash $S/glerr/glquads_run.sh $D quads-walk-fix
echo "##### suite (dist-glfix)"
bash $S/suite_fix.sh $D
