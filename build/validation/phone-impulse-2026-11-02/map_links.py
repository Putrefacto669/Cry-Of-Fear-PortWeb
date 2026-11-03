from pathlib import Path
import sys,json,collections
r=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web');sys.path.insert(0,str(r/'tools'))
from stage_map import read_entities
out=r/'build/validation/phone-impulse-2026-11-02/map-weapon-links.json';assert not out.exists()
rows=[]
for p in sorted(Path('/root/cof-audits/extras-20261101/stage').glob('maps/*/cryoffear/maps/*.bsp')):
 es=read_entities(p);found=[e for e in es if any('weapon_' in v or 'inventoryitems/weapons/' in v for v in e.values())]
 rows.append({'map':p.stem,'entities':found})
out.write_text(json.dumps(rows,indent=2));print([(x['map'],len(x['entities'])) for x in rows]);print(sorted(set(v for x in rows for e in x['entities'] for v in e.values() if 'weapon_' in v or 'inventoryitems/weapons/' in v)))