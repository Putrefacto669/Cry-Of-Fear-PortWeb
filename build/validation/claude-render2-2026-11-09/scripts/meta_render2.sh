T=/root/cof-audits/claude-render2-20261109
python3 - $T <<'PY'
import hashlib, json, re, sys
from pathlib import Path
t = Path(sys.argv[1]); d = t / "merge"
meta = json.loads(re.search(r'loadPackage\((\{"files"[\s\S]*?\})\);', (d / "packs/engine.js").read_text())[1])
data = (d / "packs/engine.data").read_bytes()
mods = {Path(f["filename"]).name: hashlib.sha256(data[f["start"]:f["end"]]).hexdigest() for f in meta["files"]}
man = re.search(r'"version": "([0-9a-f]+)"', (d / "sw-manifest.js").read_text())[1]
src = t / "engine/xash3d-fwgs"
sources = {p: hashlib.sha256((src / p).read_bytes()).hexdigest() for p in ["ref/gl/gl_studio.c", "ref/gl/gl_rsurf.c", "ref/common/ref_light.c", "ref/gl/gl2_shim/fragment.glsl.inc", "ref/gl/gl2_shim/vertex.glsl.inc"]}
out = {"manifest": man, "modules": mods, "sources": sources, "originalDistribution": str(d), "originalEngine": str(src),
       "note": "Second experimental correction (Claude) after Codex's review of 7d2f04e9649f."}
(t / "candidate.json").write_text(json.dumps(out, indent=2)); print(json.dumps(out, indent=1))
PY
