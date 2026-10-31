set -eu
source /root/emsdk/emsdk_env.sh >/dev/null 2>&1
export PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
export COF_PROGRESS_FIXTURE="$PWD/build/validation/continuation-2026-10-31/natural-fixed-3/checkpoints/natural_pc"
export COF_AUDIT_OUTPUT="$PWD/build/validation/continuation-2026-10-31/natural-fixed-resume-1"
node /root/cof-audits/continuation-20261031/fixed-run/progression_resume.mjs http://127.0.0.1:8099/ > build/validation/continuation-2026-10-31/natural-fixed-resume-1.out 2>&1
cp tools/e2e/use_surface.mjs /root/cof-audits/continuation-20261031/
export COF_USE_FIXTURE="$PWD/build/validation/continuation-2026-10-31/natural-fixed-3/checkpoints/natural_gate"
export COF_AUDIT_OUTPUT="$PWD/build/validation/continuation-2026-10-31/use-surface-fixed"
node /root/cof-audits/continuation-20261031/use_surface.mjs http://127.0.0.1:8099/ > build/validation/continuation-2026-10-31/use-surface-fixed.out 2>&1
unset COF_AUDIT_OUTPUT COF_USE_FIXTURE COF_PROGRESS_FIXTURE
tr -d '\r' < build/validation/continuation-2026-10-31/regressions_final.sh | bash
