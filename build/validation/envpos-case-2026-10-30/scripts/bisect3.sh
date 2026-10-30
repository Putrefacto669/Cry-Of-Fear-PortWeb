#!/usr/bin/env bash
A=/root/cof-audits/audit-D3Kl5uly/dist; N=/root/cof-audits/audit-D3Kl5uly/dist-next
H=/root/cof-envpos/hybrid3; rm -rf $H; mkdir -p $H
cp -al $N $H/next-oldstart
for f in packs/map_c_start.data packs/map_c_start.js packs/map_c_start2.data packs/map_c_start2.js; do rm -f $H/next-oldstart/$f; cp $A/$f $H/next-oldstart/$f; done
bash /mnt/c/Users/josue/AppData/Local/Temp/claude/C--Users-josue/c2c79a05-c4b9-45e7-9a8b-0ec4623056ec/scratchpad/envpos_run.sh $H/next-oldstart hyb3-next-oldstart | grep -E "exit=|Error:|test.mjs:[0-9]+" | head -3
