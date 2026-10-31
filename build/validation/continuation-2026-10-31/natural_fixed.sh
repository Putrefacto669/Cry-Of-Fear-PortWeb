set -eu
source /root/emsdk/emsdk_env.sh >/dev/null 2>&1
export PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
export COF_AUDIT_OUTPUT="$PWD/build/validation/continuation-2026-10-31/natural-fixed-1"
node /root/cof-audits/continuation-20261031/fixed-run/padlock_progression.mjs http://127.0.0.1:8098/ > build/validation/continuation-2026-10-31/natural-fixed-1.out 2>&1
