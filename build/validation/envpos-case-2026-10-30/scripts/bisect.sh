#!/usr/bin/env bash
# Hybrid dists: Codex's dist with one group of files taken from dist-next; run the envpos test on each
A=/root/cof-audits/audit-D3Kl5uly/dist; N=/root/cof-audits/audit-D3Kl5uly/dist-next
H=/root/cof-envpos/hybrid; rm -rf $H; mkdir -p $H
mk() { cp -al $A $H/$1; for f in "${@:2}"; do rm -f $H/$1/$f; cp $N/$f $H/$1/$f; done; }
mk engine packs/engine.data packs/engine.js
mk boot packs/boot.data packs/boot.js
maps=$(cd $N/packs && ls map_*.data map_*.js | sed 's#^#packs/#')
mk maps $maps
for h in engine boot maps; do
  echo "== hybrid $h"
  bash /mnt/c/Users/josue/AppData/Local/Temp/claude/C--Users-josue/c2c79a05-c4b9-45e7-9a8b-0ec4623056ec/scratchpad/envpos_run.sh $H/$h hyb-$h | head -3
done
