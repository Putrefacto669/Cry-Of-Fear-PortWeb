#!/usr/bin/env bash
# Published dist/ + only the modules that change (monotonic clock, linear fog, original grey),
# then the same manifest/sw.js step as tools/wsl/package.sh.
set -euo pipefail
REPO="/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web"
NEW=/root/cof-audits/claude-launcher/dist
OUT=/root/cof-audits/integ-20261109/merge
rm -rf "$OUT"; cp -a "$REPO/dist" "$OUT"
for f in packs/engine.data packs/engine.js; do
    cp "$NEW/$f" "$OUT/$f"
done
cp "$REPO/platform/web/sw.js" "$OUT/sw.js"   # template with __COF_SW_VERSION__
cp "$REPO/platform/web/hud.js" "$OUT/hud.js"   # rain off by default (Options toggle)
cp "$REPO/platform/web/loader.js" "$OUT/loader.js"   # pause menu owns the cursor
python3 - "$OUT" 0 1 <<'EOF'
import gzip, hashlib, json, sys
from pathlib import Path
dist, coi, use_gz = Path(sys.argv[1]), sys.argv[2] == "1", sys.argv[3] == "1"
for old in dist.rglob("*.gz"):
    old.unlink()
files, gz = {}, {}
for p in sorted(dist.rglob("*")):
    rel = p.relative_to(dist).as_posix()
    if not p.is_file() or rel in ("sw.js", "sw-manifest.js", "Jugar.bat", "serve.py"):
        continue
    data = p.read_bytes()
    files[rel] = hashlib.sha256(data).hexdigest()[:12]
    if use_gz and rel.endswith((".wasm", ".data")):
        packed = gzip.compress(data, 9, mtime=0)
        if len(packed) < 0.9 * len(data):
            Path(f"{p}.gz").write_bytes(packed)
            gz[rel] = {"size": len(data), "gzSize": len(packed)}
precache = [f for f in files if not f.endswith((".wasm", ".data", ".mp3")) and f != "xash3d.html"]
version = hashlib.sha256(json.dumps(files, sort_keys=True).encode()).hexdigest()[:12]
manifest = {"version": version, "coi": coi, "precache": precache, "files": files, "gz": gz}
(dist / "sw-manifest.js").write_text("self.COF_MANIFEST = " + json.dumps(manifest, indent=1) + ";\n")
worker = dist / "sw.js"
template = worker.read_bytes()
assert b"__COF_SW_VERSION__" in template, "missing SW release token"
worker.write_bytes(template.replace(b"__COF_SW_VERSION__", version.encode()))
print("manifest", version, len(files), "files", len(gz), "gz")
EOF
echo "--- cambios frente a lo publicado:"
rsync -an --delete --checksum --itemize-changes "$OUT/" "$REPO/dist/" | grep -v '^\.' || true
python3 - "$OUT" "$REPO/dist" /root/cof-audits/claude-render3-20261109/merge <<'PY'
import hashlib, json, re, sys
from pathlib import Path
def mods(d):
    d=Path(d); meta=json.loads(re.search(r'loadPackage\((\{"files"[\s\S]*?\})\);',(d/"packs/engine.js").read_text())[1]); data=(d/"packs/engine.data").read_bytes()
    return {Path(f["filename"]).name: hashlib.sha256(data[f["start"]:f["end"]]).hexdigest()[:16] for f in meta["files"]}
new,pub,s4=(mods(x) for x in sys.argv[1:4])
for k in new: print(f"{k:32} new={new[k]} published={'same' if pub.get(k)==new[k] else pub.get(k)} studio4={'same' if s4.get(k)==new[k] else s4.get(k)}")
PY
