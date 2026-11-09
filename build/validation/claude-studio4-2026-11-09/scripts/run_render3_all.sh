SP=/mnt/c/Users/josue/AppData/Local/Temp/claude/5ca423ac58aab436/c2c79a05-c4b9-45e7-9a8b-0ec4623056ec/scratchpad
T=/root/cof-audits/claude-render3-20261109
REPO="/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web"
WT=/mnt/c/Users/josue/cof-audits/claude-persist-20261109
CX=/mnt/c/Users/josue/cof-audits/review-7d2f04e9649f
E=/root/cof-audits/browser-1.64.1/e2e/claude
export PATH=/root/emsdk/node/24.19.0_64bit/bin:$PATH PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
RH=$(sha256sum $T/build/engine/ref/gl/libref_gles3compat.wasm | cut -d' ' -f1); echo "renderer $RH"
cp $CX/tools/e2e/studio_fullbright_review.mjs $CX/tools/e2e/studio_runtime_contract.mjs "$REPO/tools/e2e/pointer_lock.mjs" $E/
cd /root/cof-audits/browser-1.64.1
echo "--- codex fullbright review"; timeout 900 node $E/studio_fullbright_review.mjs http://127.0.0.1:8096/ $T/codex-fullbright-$(date +%H%M%S) $T/candidate.json > $T/codex-fullbright.log 2>&1; echo "exit $?"; tail -1 $T/codex-fullbright.log
echo "--- codex studio runtime contract"; timeout 900 node $E/studio_runtime_contract.mjs http://127.0.0.1:8096/ $T/codex-runtime-$(date +%H%M%S) $T/candidate.json > $T/codex-runtime.log 2>&1; echo "exit $?"; tail -1 $T/codex-runtime.log
echo "--- pointer lock"; node $E/pointer_lock.mjs "$REPO/platform/web/loader.js" 2>&1 | tail -1
sed "s#http://127.0.0.1:8091/#http://127.0.0.1:8096/#; s#claude-launcher/clock-#claude-render3-20261109/clock-#" $SP/run_clock.sh > $SP/rc3.sh
sed "s#^export COF_EXPECT_RENDERER=.*#export COF_EXPECT_RENDERER=$RH#; s#http://127.0.0.1:8091/#http://127.0.0.1:8096/#; s#claude-launcher/e2e-#claude-render3-20261109/e2e-#" $SP/run_fog.sh > $SP/rf3.sh
sed "s#claude-launcher/flash-#claude-render3-20261109/flash-#" $SP/run_flash.sh > $SP/rfl3.sh
bash $SP/rc3.sh render3; bash $SP/rf3.sh; bash $SP/rfl3.sh render3 http://127.0.0.1:8096/
sed -e 's#8093#8096#; s#claude-render-20261108/measure-#claude-render3-20261109/measure-#' $SP/run_render.sh > $SP/run_render3.sh
echo "--- phone fullbright"; env COF_WEAPONS=weapon_mobile "COF_TOGGLE=cof_fullbrighttextures 0.5 0" bash $SP/run_render3.sh c_apartment1 | grep -o "OUT .*"
echo "--- flashlight on viewmodel"; env COF_WEAPONS=weapon_mobile,weapon_switchblade COF_PRE=flashlight "COF_TOGGLE=r_dynamic 1 0" bash $SP/run_render3.sh c_apartment1 | grep -o "OUT .*"
# corrected tests from the worktree, and Codex's negative control (no E: a 1-unit diagnostic move) that must fail
shim="import {chromium as __cofChromium} from 'playwright';const __cofLaunch=__cofChromium.launch.bind(__cofChromium);__cofChromium.launch=opts=>__cofLaunch({...opts,executablePath:'/root/cof-audits/browser-1.64.1/browsers/chromium-1248/chrome-linux64/chrome',args:['--mute-audio',...(opts?.args||[])]});"
for name in changelevel_entities extras_interactions; do { echo "$shim"; cat $WT/tools/e2e/$name.mjs; } > $E/$name-wt.mjs; done
{ echo "$shim"; sed "s#await p.keyboard.press('e',{delay:120});const pressed#await cmd('cof_goto 37 -155 164');const pressed#" $WT/tools/e2e/extras_interactions.mjs; } > $E/extras_interactions-negative.mjs
grep -c "cof_goto 37 -155 164" $E/extras_interactions-negative.mjs
for name in changelevel_entities-wt extras_interactions-wt extras_interactions-negative; do
  O=$T/wt-$name-$(date +%H%M%S); mkdir -p $O; (cd $O && COF_AUDIT_OUTPUT=$O/out timeout 900 node $E/$name.mjs http://127.0.0.1:8096/ $O/result > $O.log 2>&1); echo "$name exit $?"; grep -E "PASS|did not reach|Error" $O.log | head -2
done
sed "s#claude-launcher/regressions-#claude-render3-20261109/regressions-#" $SP/regressions_claude.py > $SP/rr3.py
/usr/bin/python3 $SP/rr3.py http://127.0.0.1:8096/ 83e1d1c25aaf
