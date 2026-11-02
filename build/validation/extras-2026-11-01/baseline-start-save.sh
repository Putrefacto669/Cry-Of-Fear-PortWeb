set -euo pipefail
REPO='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
TASK=/root/cof-audits/extras-20261101
python3 - "$REPO" "$TASK" <<'PY'
from pathlib import Path
import sys
r,t=map(Path,sys.argv[1:]);s=(r/'tools/e2e/entity_persistence_audit.mjs').read_text().replace('c_apartment1','c_start');(t/'baseline_start_save.mjs').write_text(s)
PY
export PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
COF_SAVE_TIMES=3,50 COF_CALLBACK_TRACE=1 /root/emsdk/node/24.19.0_64bit/bin/node "$TASK/baseline_start_save.mjs" http://127.0.0.1:8116/ "$REPO/build/validation/extras-2026-11-01/baseline-start-save"