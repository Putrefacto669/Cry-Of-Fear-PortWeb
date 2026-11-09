set -e
CLEAN=/root/cof-audits/clean-20261108
SP=/mnt/c/Users/josue/AppData/Local/Temp/claude/5ca423ac58aab436/c2c79a05-c4b9-45e7-9a8b-0ec4623056ec/scratchpad
python3 $SP/patch_modellight.py $CLEAN/engine/xash3d-fwgs
export COF_WORK=$CLEAN
cd "/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web"
bash tools/wsl/build_engine.sh build > $CLEAN/engine-ml.log 2>&1 || { grep -E "error|Error" $CLEAN/engine-ml.log | head -30; exit 1; }
grep -c warning $CLEAN/engine-ml.log || true
grep -E "gl_studio.c.*warning|gl2_shim.c.*warning" $CLEAN/engine-ml.log | head
sha256sum $CLEAN/build/engine/ref/gl/libref_gles3compat.wasm $CLEAN/build/engine/engine/xash3d.wasm | cut -c1-16
