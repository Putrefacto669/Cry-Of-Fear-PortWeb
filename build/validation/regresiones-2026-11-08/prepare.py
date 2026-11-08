"""Freeze the current lightmap candidate and record exactly which sources are being verified."""
import hashlib,json,re,shutil
from pathlib import Path
repo=Path(__file__).resolve().parents[3];out=Path(__file__).parent
work=Path('/root/cof-audits/codex-regressions-20261108');source=Path('/root/cof-audits/claude-launcher/merge');candidate=work/'candidate'
assert not candidate.exists();work.mkdir(parents=True,exist_ok=True)
manifest=json.loads(re.search(r'=\s*(\{[\s\S]*\});',(source/'sw-manifest.js').read_text())[1]);assert manifest['version']=='61bebcaccb10'
shutil.copytree(source,candidate)
for name,rev in manifest['files'].items():assert hashlib.sha256((candidate/name).read_bytes()).hexdigest()[:12]==rev,name
metadata=json.loads(re.search(r'loadPackage\((\{"files"[\s\S]*?\})\);',(candidate/'packs/engine.js').read_text())[1])
data=(candidate/'packs/engine.data').read_bytes();modules={}
for item in metadata['files']:modules[Path(item['filename']).name]=hashlib.sha256(data[item['start']:item['end']]).hexdigest()
files=['CLAUDE.md','patches/xash3d/0001-root.patch','platform/web/hud.js','game/cof-logic/client/cof_client.cpp','platform/web/shaders/postfx.frag.glsl']
proof={'manifest':manifest['version'],'candidate':str(candidate),'modules':modules,'sourceFingerprints':{n:hashlib.sha256((repo/n).read_bytes()).hexdigest() for n in files},'distManifestBefore':hashlib.sha256((repo/'dist/sw-manifest.js').read_bytes()).hexdigest(),'existingRegressionRun':'/root/cof-audits/claude-launcher/regressions-153416'}
(out/'candidate.json').write_text(json.dumps(proof,indent=2));print(json.dumps(proof,indent=2))
node_modules=Path('/root/cof-audits/browser-1.64.1/node_modules');(work/'node_modules').symlink_to(node_modules,target_is_directory=True)
for n in ['clock_backwards','grey_weights','linear_fog','fog_entities','clothes_release','hud_css','clothes_menu','postfx_state']:
 shutil.copy2(repo/'tools/e2e'/f'{n}.mjs',work/f'{n}.mjs')
