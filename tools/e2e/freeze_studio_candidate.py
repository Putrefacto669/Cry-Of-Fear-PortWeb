"""Freeze a private distribution and the reviewed renderer sources. Never writes dist/."""
import argparse,hashlib,json,re,shutil
from pathlib import Path

p=argparse.ArgumentParser()
p.add_argument('distribution',type=Path)
p.add_argument('engine',type=Path)
p.add_argument('output',type=Path)
a=p.parse_args()
assert not a.output.exists(),'Use a new evidence directory'
a.output.mkdir(parents=True)
shutil.copytree(a.distribution,a.output/'candidate')
manifest=json.loads(re.search(r'=\s*(\{[\s\S]*\});',(a.output/'candidate/sw-manifest.js').read_text())[1])
for name,digest in manifest['files'].items():
    assert hashlib.sha256((a.output/'candidate'/name).read_bytes()).hexdigest()[:len(digest)]==digest,name
metadata=json.loads(re.search(r'loadPackage\((\{"files"[\s\S]*?\})\);',(a.output/'candidate/packs/engine.js').read_text())[1])
data=(a.output/'candidate/packs/engine.data').read_bytes()
modules={Path(x['filename']).name:hashlib.sha256(data[x['start']:x['end']]).hexdigest() for x in metadata['files']}
sources={}
for name in ('ref/gl/gl_studio.c','ref/gl/gl_rsurf.c','ref/common/ref_light.c','ref/gl/gl2_shim/fragment.glsl.inc','ref/gl/gl2_shim/vertex.glsl.inc'):
    target=a.output/'source'/name
    target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(a.engine/name,target)
    sources[name]=hashlib.sha256(target.read_bytes()).hexdigest()
record={'manifest':manifest['version'],'modules':modules,'sources':sources,'originalDistribution':str(a.distribution),'originalEngine':str(a.engine),'note':'Source snapshot is a review input; compilation provenance is not inferred from comments.'}
(a.output/'candidate.json').write_text(json.dumps(record,indent=2))
print(json.dumps(record,indent=2))
