set -eu
source /root/emsdk/emsdk_env.sh >/dev/null 2>&1
export PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
cp tools/e2e/trigger_persistence.mjs /root/cof-audits/continuation-20261031/
export COF_AUDIT_OUTPUT="$PWD/build/validation/continuation-2026-10-31/trigger-fixed-2"
node /root/cof-audits/continuation-20261031/trigger_persistence.mjs http://127.0.0.1:8098/ > build/validation/continuation-2026-10-31/trigger-fixed-2.out 2>&1
export COF_PADLOCK_FIXTURE="$PWD/build/validation/continuation-2026-10-31/natural-1/snapshot"
export COF_AUDIT_OUTPUT="$PWD/build/validation/continuation-2026-10-31/operations-2"
node /root/cof-audits/continuation-20261031/padlock_entities.mjs http://127.0.0.1:8096/ > build/validation/continuation-2026-10-31/operations-2.out 2>&1
