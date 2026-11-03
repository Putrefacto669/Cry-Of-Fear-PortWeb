from pathlib import Path
import hashlib,json,re
r=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web');s=Path('/root/cof-audits/dual-20261102/dist-phone-sp-predict');d=r/'dist';out=r/'build/validation/publication-2026-11-02/plan.json';assert not out.exists()
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
changes=[]
for p in sorted(s.rglob('*')):
 if not p.is_file():continue
 rel=p.relative_to(s).as_posix();q=d/rel
 if not q.exists() or h(p)!=h(q):changes.append({'file':rel,'bytes':p.stat().st_size,'before':h(q) if q.exists() else None,'after':h(p)})
large=[{'file':p.relative_to(s).as_posix(),'bytes':p.stat().st_size} for p in s.rglob('*') if p.is_file() and p.stat().st_size>=100*1024**2]
out.write_text(json.dumps({'source':str(s),'changes':changes,'large':large},indent=2));print(json.dumps({'changes':[(x['file'],x['bytes']) for x in changes],'large':large},indent=2))