source /root/emsdk/emsdk_env.sh >/dev/null 2>&1
export PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
export COF_PADLOCK_FIXTURE="$PWD/build/validation/continuation-2026-10-31/operations-2/gate-snapshot"
export COF_AUDIT_OUTPUT="$PWD/build/validation/continuation-2026-10-31/scene-baseline-3"
node /root/cof-audits/continuation-20261031/scene_probe.mjs http://127.0.0.1:8096/ > build/validation/continuation-2026-10-31/scene-baseline-3.out 2>&1
