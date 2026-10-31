set -eu
source /root/emsdk/emsdk_env.sh >/dev/null 2>&1
export PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
export COF_SCENE_FIXTURE="$PWD/build/validation/continuation-2026-10-31/natural-fixed-return-end/operations/gate-snapshot"
export COF_AUDIT_OUTPUT="$PWD/build/validation/continuation-2026-10-31/scene-fixed-1"
node /root/cof-audits/continuation-20261031/c_start_scene_persistence.mjs http://127.0.0.1:8099/ > build/validation/continuation-2026-10-31/scene-fixed-1.out 2>&1
cp tools/e2e/use_surface.mjs /root/cof-audits/continuation-20261031/
export COF_USE_FIXTURE="$PWD/build/validation/continuation-2026-10-31/natural-fixed-3/checkpoints/natural_gate"
export COF_AUDIT_OUTPUT="$PWD/build/validation/continuation-2026-10-31/use-surface-fixed"
node /root/cof-audits/continuation-20261031/use_surface.mjs http://127.0.0.1:8099/ > build/validation/continuation-2026-10-31/use-surface-fixed.out 2>&1
export COF_AUDIT_OUTPUT="$PWD/build/validation/continuation-2026-10-31/scene-fixed-2"
node /root/cof-audits/continuation-20261031/c_start_scene_persistence.mjs http://127.0.0.1:8099/ > build/validation/continuation-2026-10-31/scene-fixed-2.out 2>&1
