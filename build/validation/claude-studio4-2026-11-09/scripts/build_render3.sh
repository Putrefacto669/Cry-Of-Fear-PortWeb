set -e
T=/root/cof-audits/claude-render3-20261109
SP=/mnt/c/Users/josue/AppData/Local/Temp/claude/5ca423ac58aab436/c2c79a05-c4b9-45e7-9a8b-0ec4623056ec/scratchpad
python3 $SP/patch_studio4.py $T/engine/xash3d-fwgs
export COF_WORK=$T
cd "/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web"
[ -d $T/build/engine ] || { bash tools/wsl/build_engine.sh configure > $T/configure.log 2>&1; }
bash tools/wsl/build_engine.sh build > $T/engine.log 2>&1 || { grep -E " error" $T/engine.log | head -20; exit 1; }
grep -E "gl_studio.c.*warning" $T/engine.log | head
sha256sum $T/build/engine/ref/gl/libref_gles3compat.wasm $T/build/engine/engine/xash3d.wasm | cut -c1-16
