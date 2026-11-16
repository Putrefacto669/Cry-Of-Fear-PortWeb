# cand-bas2: published dist (b902da18e9f1) + map pack c_basement + server.wasm (phone calls, keypad4) + hud.js (phone panel)
set -euo pipefail
source /root/emsdk/emsdk_env.sh > /dev/null 2>&1
C=/root/cof-audits/audit-D3Kl5uly; T=/root/cof-audits/claude-campaign-20261115
W=/mnt/c/Users/josue/cof-audits/claude-campaign-20261115; GAME="/mnt/c/Program Files (x86)/Steam/steamapps/common/Cry of Fear"
mkdir -p $T
[ -d $T/stage ] || cp -a $C/stage $T/stage
cd $W
rm -rf $T/stage/maps/c_basement
python3 tools/stage_map.py "$GAME" c_basement $T/stage --texcomp $C/build/tools/texcomp 2>&1 | tail -8
echo "== boot/shared_extras unchanged vs canonical?"; diff -rq $C/stage/boot $T/stage/boot && echo boot-identical; diff -rq $C/stage/shared_extras $T/stage/shared_extras 2>/dev/null && echo extras-identical
# drop from the map whatever boot or shared_extras already provide (package.sh does the same)
python3 - $T/stage <<'PY'
import sys
from pathlib import Path
stage=Path(sys.argv[1]); boot={p.relative_to(stage/"boot").as_posix().lower() for p in (stage/"boot").rglob("*") if p.is_file()}
boot.update(p.relative_to(stage/"shared_extras").as_posix().lower() for p in (stage/"shared_extras").rglob("*") if p.is_file())
m=stage/"maps"/"c_basement"; n=0
for p in list(m.rglob("*")):
    if p.is_file() and p.relative_to(m).as_posix().lower() in boot: p.unlink(); n+=1
print("removed duplicates of boot:",n)
PY
du -sh $T/stage/maps/c_basement; find $T/stage/maps/c_basement -type f | wc -l
OUT=$T/cand-bas2; rm -rf $OUT; cp -a "$W/dist" $OUT
LIB=$T/stage-lib-bas2; rm -rf $LIB; cp -a /root/cof-audits/claude-nightmare-20261111/stage-lib-ld $LIB
cp $T/build/game/dlls/hl_emscripten_wasm32.wasm $LIB/server.wasm
sha256sum $LIB/*.wasm | cut -c1-16,66-
"$EMSDK/upstream/emscripten/tools/file_packager" $OUT/packs/engine.data --preload "$LIB@/lib" --js-output=$OUT/packs/engine.js --no-node > /dev/null
cp $W/platform/web/hud.js $OUT/hud.js
"$EMSDK/upstream/emscripten/tools/file_packager" $OUT/packs/map_c_basement.data --preload "$T/stage/maps/c_basement@/rodir" --js-output=$OUT/packs/map_c_basement.js --no-node > /dev/null
ls -la $OUT/packs/map_c_basement.*
mkdir -p $OUT/mp3; cp -n $T/stage/mp3/*.mp3 $OUT/mp3/ 2>/dev/null || true
python3 - $OUT <<'PY'
import gzip, hashlib, json, sys, re
from pathlib import Path
dist=Path(sys.argv[1]); mj=dist/"packs"/"maps.json"; maps=json.loads(mj.read_text())
if "c_basement" not in maps: maps.append("c_basement")
mj.write_text(json.dumps(maps)+"\n")
for old in dist.rglob("*.gz"): old.unlink()
files,gz={},{}
for p in sorted(dist.rglob("*")):
    rel=p.relative_to(dist).as_posix()
    if not p.is_file() or rel in ("sw.js","sw-manifest.js","Jugar.bat","serve.py"): continue
    data=p.read_bytes(); files[rel]=hashlib.sha256(data).hexdigest()[:12]
    if rel.endswith((".wasm",".data")):
        packed=gzip.compress(data,9,mtime=0)
        if len(packed)<0.9*len(data): Path(f"{p}.gz").write_bytes(packed); gz[rel]={"size":len(data),"gzSize":len(packed)}
precache=[f for f in files if not f.endswith((".wasm",".data",".mp3")) and f!="xash3d.html"]
version=hashlib.sha256(json.dumps(files,sort_keys=True).encode()).hexdigest()[:12]
(dist/"sw-manifest.js").write_text("self.COF_MANIFEST = "+json.dumps({"version":version,"coi":False,"precache":precache,"files":files,"gz":gz},indent=1)+";\n")
w=dist/"sw.js"; t=w.read_bytes(); t=re.sub(rb'sw-manifest\.js\?release=[0-9a-f_A-Z]+',b'sw-manifest.js?release='+version.encode(),t); w.write_bytes(t)
print("manifest",version,"maps",maps)
PY
