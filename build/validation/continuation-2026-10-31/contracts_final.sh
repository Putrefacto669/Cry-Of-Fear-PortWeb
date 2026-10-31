set -eu
source /root/emsdk/emsdk_env.sh >/dev/null 2>&1
export COF_STAGE=/root/cof-audits/audit-D3Kl5uly/stage
OUT=build/validation/continuation-2026-10-31
node tools/e2e/pointer_lock.mjs > "$OUT/pointer-lock-final.log" 2>&1
python3 -B tools/e2e/test_entity_maps.py > "$OUT/bsp-entities-final.log" 2>&1
python3 -B tools/e2e/test_envpos_maps.py > "$OUT/bsp-envpos-final.log" 2>&1
python3 -B tools/e2e/test_padlock_maps.py > "$OUT/bsp-padlock-final.log" 2>&1
node --check tools/e2e/padlock_entities.mjs
node --check tools/e2e/padlock_progression.mjs
node --check tools/e2e/use_surface.mjs
node --check tools/e2e/ambient_persistence.mjs
node --check tools/e2e/trigger_persistence.mjs
bash -n tools/wsl/test_entities.sh
