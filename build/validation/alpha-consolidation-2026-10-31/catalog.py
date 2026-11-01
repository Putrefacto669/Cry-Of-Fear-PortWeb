from pathlib import Path
import struct,re,json
root=Path('/root/cof-audits/audit-D3Kl5uly/stage')
rows={}
for i in range(1,6):
 name=f'c_apartment{i}';p=next(root.rglob(name+'.bsp'));b=p.read_bytes();o,n=struct.unpack_from('<ii',b,4)
 ents=[dict(re.findall(r'"([^"\n]*)"\s+"([^"\n]*)"',s)) for s in re.findall(r'\{([^}]+)\}',b[o:o+n].decode('latin1'))]
 rows[name]={'source':str(p),'spawns':[e for e in ents if e.get('classname')=='info_player_start'],'cameras':[e for e in ents if e.get('classname')=='trigger_camera'],'transitions':[e for e in ents if e.get('classname')=='trigger_changelevel'],'notes':[e for e in ents if 'note' in e.get('classname','')],'entities':len(ents)}
out=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web/build/validation/alpha-consolidation-2026-10-31/map-catalog.json');out.write_text(json.dumps(rows,indent=2))
for name,d in rows.items():print(name,'spawns',d['spawns'],'cameras',[(e.get('targetname'),e.get('wait')) for e in d['cameras']])
