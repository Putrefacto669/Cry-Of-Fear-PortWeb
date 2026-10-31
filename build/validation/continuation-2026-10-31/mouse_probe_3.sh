source /root/emsdk/emsdk_env.sh >/dev/null 2>&1
export PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
export COF_PROGRESS_FIXTURE="$PWD/build/validation/continuation-2026-10-31/natural-fixed-3/checkpoints/natural_pc"
export COF_AUDIT_OUTPUT="$PWD/build/validation/continuation-2026-10-31/mouse-probe-3"
node /root/cof-audits/continuation-20261031/fixed-run/mouse_probe.mjs http://127.0.0.1:8099/ > build/validation/continuation-2026-10-31/mouse-probe-3.out 2>&1
