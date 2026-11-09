SP=/mnt/c/Users/josue/AppData/Local/Temp/claude/5ca423ac58aab436/c2c79a05-c4b9-45e7-9a8b-0ec4623056ec/scratchpad
T=/root/cof-audits/claude-render2-20261109
REPO="/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web"
CX=/mnt/c/Users/josue/cof-audits/review-7d2f04e9649f
E=/root/cof-audits/browser-1.64.1/e2e/claude
export PATH=/root/emsdk/node/24.19.0_64bit/bin:$PATH PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
RH=$(sha256sum $T/build/engine/ref/gl/libref_gles3compat.wasm | cut -d' ' -f1); echo "renderer $RH"
cp $CX/tools/e2e/studio_fullbright_review.mjs $CX/tools/e2e/studio_runtime_contract.mjs "$REPO/tools/e2e/pointer_lock.mjs" $E/
cd /root/cof-audits/browser-1.64.1
echo "--- codex fullbright review"; timeout 900 node $E/studio_fullbright_review.mjs http://127.0.0.1:8094/ $T/codex-fullbright-$(date +%H%M%S) $T/candidate.json > $T/codex-fullbright.log 2>&1; echo "exit $?"; tail -3 $T/codex-fullbright.log
echo "--- codex studio runtime contract"; timeout 900 node $E/studio_runtime_contract.mjs http://127.0.0.1:8094/ $T/codex-runtime-$(date +%H%M%S) $T/candidate.json > $T/codex-runtime.log 2>&1; echo "exit $?"; tail -3 $T/codex-runtime.log
echo "--- pointer lock"; node $E/pointer_lock.mjs "$REPO/platform/web/loader.js" 2>&1 | tail -1
sed "s#http://127.0.0.1:8091/#http://127.0.0.1:8094/#; s#claude-launcher/clock-#claude-render2-20261109/clock-#" $SP/run_clock.sh > $SP/rc2.sh
sed "s#^export COF_EXPECT_RENDERER=.*#export COF_EXPECT_RENDERER=$RH#; s#http://127.0.0.1:8091/#http://127.0.0.1:8094/#; s#claude-launcher/e2e-#claude-render2-20261109/e2e-#" $SP/run_fog.sh > $SP/rf2.sh
sed "s#claude-launcher/flash-#claude-render2-20261109/flash-#" $SP/run_flash.sh > $SP/rfl2.sh
bash $SP/rc2.sh render2; bash $SP/rf2.sh; bash $SP/rfl2.sh render2 http://127.0.0.1:8094/
sed -e 's#8093#8094#; s#claude-render-20261108/measure-#claude-render2-20261109/measure-#' $SP/run_render.sh > $SP/run_render2.sh
echo "--- phone fullbright"; COF_WEAPONS=weapon_mobile "COF_TOGGLE=cof_fullbrighttextures 0.5 0" bash $SP/run_render2.sh c_apartment1 | grep -o "OUT .*"
echo "--- flashlight on viewmodel"; COF_WEAPONS=weapon_mobile,weapon_switchblade COF_PRE=flashlight "COF_TOGGLE=r_dynamic 1 0" bash $SP/run_render2.sh c_apartment1 | grep -o "OUT .*"
sed "s#claude-launcher/regressions-#claude-render2-20261109/regressions-#" $SP/regressions_claude.py > $SP/rr2.py
/usr/bin/python3 $SP/rr2.py http://127.0.0.1:8094/ 780fe1662f90
