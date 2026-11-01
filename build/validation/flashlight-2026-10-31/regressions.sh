set -eu
repo='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
work=/root/cof-audits/flashlight-20261031
export PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
export PATH=/root/emsdk/node/24.19.0_64bit/bin:$PATH
export COF_STAGE=/root/cof-audits/audit-D3Kl5uly/stage
for test in test_entity_maps test_envpos_maps test_padlock_maps; do
 python3 -B "$repo/tools/e2e/$test.py" > "$repo/build/validation/flashlight-2026-10-31/$test.log" 2>&1
 echo "$test PASS"
done
node "$repo/tools/e2e/pointer_lock.mjs" > "$repo/build/validation/flashlight-2026-10-31/pointer_lock.log" 2>&1
echo 'pointer_lock PASS'
for test in entities campaign_entities motion_entities model_entities manager_entities sound_entities camera_entities train_entities track_entities envpos_entities button_entities changelevel_entities trigger_persistence ambient_persistence; do
 cp "$repo/tools/e2e/$test.mjs" "$work/"
 if node "$work/$test.mjs" http://127.0.0.1:8097/ > "$repo/build/validation/flashlight-2026-10-31/$test.log" 2>&1; then echo "$test PASS"; else echo "$test FAIL"; fi
done
