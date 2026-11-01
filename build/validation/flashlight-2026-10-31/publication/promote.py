from pathlib import Path
import hashlib,json,shutil
repo=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web')
src=Path('/root/cof-audits/flashlight-20261031/dist-view').resolve()
dst=(repo/'dist').resolve()
assert dst.parent==repo.resolve() and dst.name=='dist'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
changed=[]
for p in sorted(src.rglob('*')):
 if not p.is_file():continue
 rel=p.relative_to(src);q=(dst/rel).resolve()
 assert q.is_relative_to(dst)
 before=sha(q) if q.exists() else None
 after=sha(p)
 if before!=after:
  changed.append({'file':rel.as_posix(),'before':before,'after':after,'bytes':p.stat().st_size})
  q.parent.mkdir(parents=True,exist_ok=True)
  shutil.copy2(p,q)
 assert sha(q)==after
out=repo/'build/validation/flashlight-2026-10-31/publication/promotion.json'
out.write_text(json.dumps({'source':str(src),'destination':str(dst),'changes':changed},indent=2))
print(json.dumps(changed,indent=2))
