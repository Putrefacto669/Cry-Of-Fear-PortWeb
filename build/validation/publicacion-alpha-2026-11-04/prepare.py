import gzip,hashlib,json,re,shutil
from pathlib import Path
repo=Path(__file__).resolve().parents[3]
private=Path('/root/cof-audits/publicacion-alpha-20261104')
candidate=Path('/root/cof-audits/ammo-hud-20261104/candidate-v5')
dist=repo/'dist'
manifest=json.loads(re.search(r'=\s*(\{[\s\S]*\});',(candidate/'sw-manifest.js').read_text())[1])
assert manifest['version']=='636f6f29424d'
for name,rev in manifest['files'].items():assert hashlib.sha256((candidate/name).read_bytes()).hexdigest()[:12]==rev,name
for name,meta in manifest['gz'].items():assert gzip.decompress((candidate/(name+'.gz')).read_bytes())==(candidate/name).read_bytes(),name
old={p.relative_to(dist).as_posix():p for p in dist.rglob('*') if p.is_file()}
new={p.relative_to(candidate).as_posix():p for p in candidate.rglob('*') if p.is_file()}
assert not old.keys()-new.keys()
changed=[n for n,p in new.items() if n not in old or p.read_bytes()!=old[n].read_bytes()]
allowed={'index.html','loader.js','launcher.js','sw.js','sw-manifest.js','packs/engine.js','packs/engine.data','packs/engine.data.gz'}
assert set(changed)==allowed,changed
backup=private/'previous-dist';backup.mkdir()
for name in changed:
    if name in old:
        b=backup/name;b.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(old[name],b)
    target=dist/name;target.parent.mkdir(parents=True,exist_ok=True)
    temporary=target.with_name(target.name+'.release-temporary');shutil.copy2(new[name],temporary);temporary.replace(target)
for name,p in new.items():assert (dist/name).read_bytes()==p.read_bytes(),name
proof={'manifest':manifest['version'],'resources':len(manifest['files']),'gzipVerified':len(manifest['gz']),'changed':sorted(changed),'allFilesEqualValidatedCandidate':True,'originalMapAndBootPackagesUnchanged':True,'sha256':{n:hashlib.sha256((dist/n).read_bytes()).hexdigest() for n in sorted(changed)}}
(repo/'build/validation/publicacion-alpha-2026-11-04/dist-proof.json').write_text(json.dumps(proof,indent=2))
print(json.dumps(proof,indent=2))
