SP=/mnt/c/Users/josue/AppData/Local/Temp/claude/5ca423ac58aab436/c2c79a05-c4b9-45e7-9a8b-0ec4623056ec/scratchpad
T=/root/cof-audits/claude-render-20261108
REPO="/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web"
RH=$(sha256sum $T/build/engine/ref/gl/libref_gles3compat.wasm | cut -d' ' -f1); echo "renderer $RH"
cd "$REPO"; echo "--- unit lighting"; COF_WORK=$T python3 -B tools/e2e/test_cof_lighting.py 2>&1 | tail -2
echo "--- patches guard"; bash tools/wsl/test_patches_guard.sh
export PATH=/root/emsdk/node/24.19.0_64bit/bin:$PATH PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
cp tools/e2e/pointer_lock.mjs /root/cof-audits/browser-1.64.1/e2e/claude/; echo "--- pointer lock"; (cd /root/cof-audits/browser-1.64.1 && node e2e/claude/pointer_lock.mjs "$REPO/platform/web/loader.js" 2>&1 | tail -2)
sed "s#http://127.0.0.1:8091/#http://127.0.0.1:8093/#; s#claude-launcher/clock-#claude-render-20261108/clock-#" $SP/run_clock.sh > $SP/rc.sh
sed "s#^export COF_EXPECT_RENDERER=.*#export COF_EXPECT_RENDERER=$RH#; s#http://127.0.0.1:8091/#http://127.0.0.1:8093/#; s#claude-launcher/e2e-#claude-render-20261108/e2e-#" $SP/run_fog.sh > $SP/rf.sh
sed "s#claude-launcher/flash-#claude-render-20261108/flash-#" $SP/run_flash.sh > $SP/rfl.sh
bash $SP/rc.sh render; bash $SP/rf.sh; bash $SP/rfl.sh render http://127.0.0.1:8093/
sed "s#claude-launcher/regressions-#claude-render-20261108/regressions-#" $SP/regressions_claude.py > $SP/rr.py
/usr/bin/python3 $SP/rr.py http://127.0.0.1:8093/ 799a3b030e11
