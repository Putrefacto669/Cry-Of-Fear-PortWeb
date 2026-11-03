from pathlib import Path
import re,sys,json,collections
r=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web');sys.path.insert(0,str(r/'tools'))
from stage_map import read_entities
p=r/'build/validation/phone-singleplayer-2026-11-02';data=json.loads((p/'story-weapon-priorities.json').read_text());original=Path('/mnt/c/Program Files (x86)/Steam/steamapps/common/Cry of Fear/cryoffear');stats={}
for name in data['maps']:
 for e in read_entities(original/'maps'/f'{name}.bsp'):
  for ammo in sorted(set(re.findall(r'\bammo_[a-zA-Z0-9_]+\b',' '.join(e.values())))):
   s=stats.setdefault(ammo,{'maps':[],'entities':0});s['entities']+=1
   if name not in s['maps']:s['maps'].append(name)
o=p/'story-ammunition.json';assert not o.exists();o.write_text(json.dumps(stats,indent=2));print([(k,len(v['maps']),v['entities']) for k,v in sorted(stats.items(),key=lambda x:-len(x[1]['maps']))]);print({w:v['maps'] for w,v in data['weapons'].items() if w in ['weapon_glock','weapon_shotgun','weapon_rifle','weapon_m16','weapon_p345','weapon_vp70','weapon_g43','weapon_tmp','weapon_lantern']})