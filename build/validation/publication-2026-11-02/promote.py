"""Promote the exact validated build authorized by the user; retain existing files."""
from pathlib import Path
import hashlib,json,re,gzip,shutil
repo=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web');source=Path('/root/cof-audits/dual-20261102/dist-phone-sp-predict').resolve();dest=(repo/'dist').resolve();root=Path(__file__).resolve().parent
assert dest.parent==repo.resolve() and not (root/'promotion.json').exists()
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
m=json.loads(re.search(r'=\s*(\{.*\});',(source/'sw-manifest.js').read_text(),re.S)[1]);assert m['version']=='03fd8c160749'
meta=json.loads(re.search(r'loadPackage\((\{"files":.*?\})\);',(source/'packs/engine.js').read_text())[1]);data=(source/'packs/engine.data').read_bytes();modules={e['filename']:hashlib.sha256(data[e['start']:e['end']]).hexdigest() for e in meta['files']}
expected={'/lib/server.wasm':'c2d9d984a416e6a8552f1a75939c065c0bd983263b0d8206e60c5f5d9e6a69a5','/lib/client.wasm':'fac7e66382a9915f33534030eab35ab0c8a9e846304e0200000bb300f8cde585'}
for k,v in expected.items():assert modules[k]==v
for p in source.glob('packs/*.js'):
 s=p.read_text();assert not re.search(r'"filename":\s*"[^"\n]*\.dll"',s,re.I),p
files=[];changes=[]
for p in sorted(source.rglob('*')):
 if not p.is_file():continue
 rel=p.relative_to(source);target=(dest/rel).resolve();assert target.is_relative_to(dest)
 row={'file':rel.as_posix(),'bytes':p.stat().st_size,'before':sha(target) if target.exists() else None,'after':sha(p)};files.append(row)
 if row['before']!=row['after']:changes.append(row)
for row in changes:
 target=dest/row['file'];target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source/row['file'],target)
for row in files:assert sha(dest/row['file'])==row['after'],row['file']
for p in dest.rglob('*.gz'):
 raw=p.with_suffix('');assert raw.is_file() and gzip.decompress(p.read_bytes())==raw.read_bytes(),p
for name,rev in m['files'].items():assert sha(dest/name).startswith(rev),name
for name in ['loader.js','hud.js','postfx.js','extras.js']:
 assert (repo/'platform/web'/name).read_bytes()==(dest/name).read_bytes(),name
assert (repo/'platform/web/index.html').read_bytes().replace(b'__SOURCE_URL__',b'https://github.com/Putrefacto669/Cry-Of-Fear-PortWeb')==(dest/'index.html').read_bytes()
initial=json.loads((root/'plan.json').read_text())['changes']
(root/'promotion.json').write_text(json.dumps({'manifest':m['version'],'modules':modules,'source':str(source),'destination':str(dest),'changes':initial,'changedInVerificationPass':len(changes),'filesVerified':len(files),'manifestFilesVerified':len(m['files']),'gzipVerified':True,'frontendMatchesSource':True},indent=2))
print('PASS promoted',len(changes),'files; verified',len(files),'files, manifest and gzip pairs')