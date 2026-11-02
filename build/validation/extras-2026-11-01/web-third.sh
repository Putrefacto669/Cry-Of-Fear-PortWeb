set -euo pipefail
TASK=/root/cof-audits/extras-20261101
REPO='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
# Preserve the previously tested private package; share only immutable heavy binaries/data.
cp -al "$TASK/dist-second" "$TASK/dist-third"
cp --remove-destination "$REPO/platform/web/extras.js" "$TASK/dist-third/extras.js"
# Regenerate the private manifest after the web-only fix, never the repository dist.
python3 - "$TASK/dist-third" <<'PY'
import sys,json,hashlib
from pathlib import Path
p=Path(sys.argv[1]);f=p/'sw-manifest.js';m=json.loads(f.read_text().split(' = ',1)[1].rstrip(';\n'))
m['files']['extras.js']=hashlib.sha256((p/'extras.js').read_bytes()).hexdigest()[:12]
m['version']=hashlib.sha256(json.dumps(m['files'],sort_keys=True).encode()).hexdigest()[:12]
f.unlink();f.write_text('self.COF_MANIFEST = '+json.dumps(m,indent=1)+';\n')
print('Private manifest',m['version'])
PY