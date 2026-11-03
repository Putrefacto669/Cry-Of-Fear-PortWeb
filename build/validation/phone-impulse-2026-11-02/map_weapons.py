from pathlib import Path
import sys,json,collections
r=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web');sys.path.insert(0,str(r/'tools'))
from stage_map import read_entities
out=r/'build/validation/phone-impulse-2026-11-02/map-weapons.json';assert not out.exists()
rows=[]
for p in sorted(Path('/root/cof-audits/extras-20261101/stage').glob('maps/*/cryoffear/maps/*.bsp')):
 es=read_entities(p);found=[e for e in es if e.get('classname','').startswith('weapon_') or e.get('classname')=='cof_itemspawn']
 rows.append({'map':p.stem,'weapons':found})
out.write_text(json.dumps(rows,indent=2));print([(r['map'],dict(collections.Counter(e['classname'] for e in r['weapons']))) for r in rows])