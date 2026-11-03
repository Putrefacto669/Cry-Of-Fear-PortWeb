set -euo pipefail
R='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
T=/root/cof-audits/dual-20261102
D="$T/dist-hands-reload"
[ ! -e "$D" ]
cp -al /root/cof-audits/extras-20261101/dist-fifth "$D"
mkdir -p "$T/lib-hands-reload"
cp -a /root/cof-audits/extras-20261101/stage/lib/. "$T/lib-hands-reload/"
cp /root/cof-audits/audit-D3Kl5uly/build/game/dlls/hl_emscripten_wasm32.wasm "$T/lib-hands-reload/server.wasm"
cp /root/cof-audits/audit-D3Kl5uly/build/game/cl_dll/client_emscripten_wasm32.wasm "$T/lib-hands-reload/client.wasm"
cp --remove-destination "$R/platform/web/hud.js" "$D/hud.js"
rm "$D/packs/engine.data" "$D/packs/engine.js" "$D/packs/engine.data.gz"
source /root/emsdk/emsdk_env.sh >/dev/null 2>&1
"$EMSDK/upstream/emscripten/tools/file_packager" "$D/packs/engine.data" --preload "$T/lib-hands-reload@/lib" --js-output="$D/packs/engine.js" --no-node
python3 - "$D" <<'PY'
from pathlib import Path
import json,hashlib,gzip,sys
p=Path(sys.argv[1]);mfile=p/'sw-manifest.js';m=json.loads(mfile.read_text().split(' = ',1)[1].rstrip(';\n'))
for name in ('packs/engine.js','packs/engine.data','hud.js'):m['files'][name]=hashlib.sha256((p/name).read_bytes()).hexdigest()[:12]
b=(p/'packs/engine.data').read_bytes();g=gzip.compress(b,9,mtime=0);(p/'packs/engine.data.gz').write_bytes(g);m['gz']['packs/engine.data']={'size':len(b),'gzSize':len(g)}
m['version']=hashlib.sha256(json.dumps(m['files'],sort_keys=True).encode()).hexdigest()[:12];mfile.unlink();mfile.write_text('self.COF_MANIFEST = '+json.dumps(m,indent=1)+';\n')
print('private punch build',m['version'])
PY