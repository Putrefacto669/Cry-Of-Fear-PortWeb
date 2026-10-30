#!/usr/bin/env bash
A=/root/cof-audits/audit-D3Kl5uly/dist; N=/root/cof-audits/audit-D3Kl5uly/dist-next
H=/root/cof-envpos/hybrid2; rm -rf $H; mkdir -p $H
mk() { cp -al $A $H/$1; for f in "${@:2}"; do rm -f $H/$1/$f; cp $N/$f $H/$1/$f; done; }
mk intro packs/map_c_intro.data packs/map_c_intro.js
mk start packs/map_c_start.data packs/map_c_start.js packs/map_c_start2.data packs/map_c_start2.js
for h in intro start; do
  echo "== hybrid $h"
  bash /mnt/c/Users/josue/AppData/Local/Temp/claude/C--Users-josue/c2c79a05-c4b9-45e7-9a8b-0ec4623056ec/scratchpad/envpos_run.sh $H/$h hyb2-$h | grep -E "exit=|Error:|test.mjs:[0-9]+" | head -3
done
