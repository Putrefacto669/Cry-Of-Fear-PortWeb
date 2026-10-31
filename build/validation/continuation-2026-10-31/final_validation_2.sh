set -eu
source /root/emsdk/emsdk_env.sh >/dev/null 2>&1
export PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
export COF_AUDIT_OUTPUT="$PWD/build/validation/continuation-2026-10-31/ambient-fixed-2"
node /root/cof-audits/continuation-20261031/ambient_persistence.mjs http://127.0.0.1:8099/ > build/validation/continuation-2026-10-31/ambient-fixed-2.out 2>&1
export COF_AUDIT_OUTPUT="$PWD/build/validation/continuation-2026-10-31/trigger-fixed-3"
node /root/cof-audits/continuation-20261031/trigger_persistence.mjs http://127.0.0.1:8099/ > build/validation/continuation-2026-10-31/trigger-fixed-3.out 2>&1
export COF_AUDIT_OUTPUT="$PWD/build/validation/continuation-2026-10-31/natural-fixed-2"
node /root/cof-audits/continuation-20261031/fixed-run/padlock_progression.mjs http://127.0.0.1:8099/ > build/validation/continuation-2026-10-31/natural-fixed-2.out 2>&1
unset COF_AUDIT_OUTPUT
tr -d '\r' < build/validation/continuation-2026-10-31/regressions_final.sh | bash
