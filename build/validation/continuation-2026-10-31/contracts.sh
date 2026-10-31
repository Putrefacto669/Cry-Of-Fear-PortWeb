set -eu
source /root/emsdk/emsdk_env.sh >/dev/null 2>&1
export COF_STAGE=/root/cof-audits/audit-D3Kl5uly/stage
OUT=build/validation/continuation-2026-10-31
node tools/e2e/pointer_lock.mjs > "$OUT/pointer-lock.log" 2>&1
python3 -B tools/e2e/test_entity_maps.py > "$OUT/bsp-entities.log" 2>&1
python3 -B tools/e2e/test_envpos_maps.py > "$OUT/bsp-envpos.log" 2>&1
python3 -B tools/e2e/test_padlock_maps.py > "$OUT/bsp-padlock.log" 2>&1
sha256sum /root/cof-audits/audit-D3Kl5uly/build/game/dlls/server.wasm /root/cof-audits/audit-D3Kl5uly/build/game/cl_dll/client.wasm /root/cof-audits/audit-D3Kl5uly/build/engine/ref/gl/libref_gles3compat.wasm > "$OUT/built-modules.sha256"
