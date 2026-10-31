source /root/emsdk/emsdk_env.sh >/dev/null 2>&1
export PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
export COF_AUDIT_OUTPUT="$PWD/build/validation/continuation-2026-10-31/trigger-save-baseline"
node /root/cof-audits/continuation-20261031/trigger_probe.mjs > build/validation/continuation-2026-10-31/trigger-probe.out 2>&1
