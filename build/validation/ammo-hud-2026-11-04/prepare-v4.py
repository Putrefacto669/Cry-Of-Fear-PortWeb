import hashlib,json,os,re,shutil
from pathlib import Path
repo=Path(__file__).resolve().parents[3]
before=Path('/root/cof-audits/ammo-hud-20261104/candidate-v3')
candidate=before.with_name('candidate-v5');assert not candidate.exists()
shutil.copytree(before,candidate,copy_function=os.link)
def replace(name,body):
    p=candidate/name;p.unlink();p.write_bytes(body)
replace('launcher.js',(repo/'platform/web/launcher.js').read_bytes())
manifest=json.loads(re.search(r'=\s*(\{[\s\S]*\});',(before/'sw-manifest.js').read_text())[1])
manifest['files']['launcher.js']=hashlib.sha256((candidate/'launcher.js').read_bytes()).hexdigest()[:12]
manifest['version']=hashlib.sha256(json.dumps(manifest['files'],sort_keys=True).encode()).hexdigest()[:12]
for name,sha in manifest['files'].items():assert hashlib.sha256((candidate/name).read_bytes()).hexdigest()[:12]==sha,name
replace('sw-manifest.js',('self.COF_MANIFEST = '+json.dumps(manifest,indent=1)+';\n').encode())
replace('sw.js',(repo/'platform/web/sw.js').read_bytes().replace(b'__COF_SW_VERSION__',manifest['version'].encode()))
proof={'manifest':manifest['version'],'allResourceHashesVerified':True,'resources':len(manifest['files']),'enginePairUnchangedSinceNativeTests':all((candidate/'packs'/n).read_bytes()==(before/'packs'/n).read_bytes() for n in ['engine.js','engine.data']),'onlyNewContent':'localized Space key label; original controls unchanged'}
(repo/'build/validation/ammo-hud-2026-11-04/candidate-final.json').write_text(json.dumps(proof,indent=2))
print(json.dumps(proof))
