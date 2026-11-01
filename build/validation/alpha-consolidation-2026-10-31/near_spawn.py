from pathlib import Path
import struct,re,json,math
root=Path('/root/cof-audits/audit-D3Kl5uly/stage')
for i in [3,5]:
 name=f'c_apartment{i}';b=next(root.rglob(name+'.bsp')).read_bytes();o,n=struct.unpack_from('<ii',b,4)
 entities=[dict(re.findall(r'"([^"\n]*)"\s+"([^"\n]*)"',s)) for s in re.findall(r'\{([^}]+)\}',b[o:o+n].decode('latin1'))]
 start=next(e for e in entities if e.get('classname')=='info_player_start');pos=[float(v) for v in start['origin'].split()]
 near=[]
 for e in entities:
  if e.get('classname','').startswith('monster_') and 'origin' in e:
   d=math.dist(pos,[float(v) for v in e['origin'].split()])
   near.append((round(d,1),e))
 print(name,json.dumps(sorted(near,key=lambda x:x[0])[:7],indent=2))
