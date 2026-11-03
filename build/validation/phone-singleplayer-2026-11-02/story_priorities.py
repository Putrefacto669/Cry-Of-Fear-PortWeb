from pathlib import Path
import json,re,collections
r=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web');d=r/'build/validation/phone-singleplayer-2026-11-02';data=json.loads((d/'campaign-weapons.json').read_text());maps={x['map']:x for x in data['maps']};seen=set();queue=['c_intro']
while queue:
 n=queue.pop(0)
 if n in seen or n.startswith('c_game_menu') or n not in maps:continue
 seen.add(n);queue +=[t['map'] for t in maps[n]['transitions'] if t.get('map')]
original=Path('/mnt/c/Program Files (x86)/Steam/steamapps/common/Cry of Fear/cryoffear');defs={}
for p in sorted((original/'inventoryitems/weapons').glob('*.txt')):
 kv=dict(re.findall(r'"([^"\n]+)"\s*\{\s*data\s*"([^"\n]*)"\s*\}',p.read_text(errors='replace'),re.S));defs[p.stem]={k:kv[k] for k in ['classname','nice_name','ammo_type','max_ammo','item_type'] if k in kv}
counts={}
for n in sorted(seen):
 for e in maps[n]['weapons']:
  w=e['weapon']
  if w not in defs:continue
  c=counts.setdefault(w,{'maps':[],'references':0,'classes':{}});c['references']+=1;c['classes'][e['classname']]=c['classes'].get(e['classname'],0)+1
  if n not in c['maps']:c['maps'].append(n)
o={'method':'Conservative static transition graph from c_intro, excluding menu nodes; includes branching routes, not observed play frequency','maps':sorted(seen),'weapons':counts,'definitions':defs};p=d/'story-weapon-priorities.json';assert not p.exists();p.write_text(json.dumps(o,indent=2));print('REACHABLE',len(seen),sorted(seen));print([(k,len(v['maps']),v['references'],defs[k].get('nice_name')) for k,v in sorted(counts.items(),key=lambda x:-len(x[1]['maps']))])