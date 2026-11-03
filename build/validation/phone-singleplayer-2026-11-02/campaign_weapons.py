from pathlib import Path
import sys,re,json,collections
r=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web');sys.path.insert(0,str(r/'tools'))
from stage_map import read_entities
original=Path('/mnt/c/Program Files (x86)/Steam/steamapps/common/Cry of Fear/cryoffear');rows=[];weapons={};definitions={}
for p in sorted((original/'inventoryitems/weapons').glob('*.txt')):
 s=p.read_text(errors='replace');pairs=dict(re.findall(r'"([^"\n]+)"\s+"([^"\n]*)"',s));definitions[p.stem]=pairs
for p in sorted((original/'maps').glob('c_*.bsp')):
 entities=read_entities(p);refs=[];edges=[]
 for e in entities:
  ws=sorted(set(re.findall(r'\bweapon_[a-zA-Z0-9_]+\b',' '.join(e.values()))))
  for w in ws:
   row={'weapon':w,'classname':e.get('classname',''),'name':e.get('targetname',''),'target':e.get('target',''),'fields':{k:v for k,v in e.items() if w in v},'spawnflags':e.get('spawnflags','')};refs.append(row);weapons.setdefault(w,{'maps':[],'entities':0});weapons[w]['entities']+=1
   if p.stem not in weapons[w]['maps']:weapons[w]['maps'].append(p.stem)
  if 'changelevel' in e.get('classname',''):
   edges.append({k:v for k,v in e.items() if k in ['classname','targetname','target','map','landmark','message']})
 rows.append({'map':p.stem,'weapons':refs,'transitions':edges,'camera_spots':sum(e.get('classname')=='camera_spot_trigger' for e in entities)})
p=r/'build/validation/phone-singleplayer-2026-11-02/campaign-weapons.json';assert not p.exists();p.write_text(json.dumps({'maps':rows,'summary':weapons,'definitions':definitions},indent=2));print('Maps',len(rows));print([(w,len(v['maps']),v['entities']) for w,v in sorted(weapons.items(),key=lambda x:-len(x[1]['maps']))]);print(definitions)