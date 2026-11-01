"""Read-only inventory: metadata and entity properties, never copy game assets."""
from pathlib import Path
import re,struct,json,wave
repo=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web')
stage=Path('/root/cof-audits/audit-D3Kl5uly/stage')
original=Path('/mnt/c/Program Files (x86)/Steam/steamapps/common/Cry of Fear/cryoffear')
boot=stage/'boot/cryoffear'
result={'kind':'static audit; availability does not prove behavior or audibility','maps':{},'languages':{},'models':{}}
for p in sorted(stage.rglob('*.bsp')):
 if not p.is_file():continue
 b=p.read_bytes();o,n=struct.unpack_from('<ii',b,4)
 es=[dict(re.findall(r'"([^"\n]*)"\s+"([^"\n]*)"',s)) for s in re.findall(r'\{([^}]+)\}',b[o:o+n].decode('latin1'))]
 relevant=[e for e in es if e.get('classname','').startswith(('weapon_','ammo_')) or e.get('classname') in ('func_valve','cof_giveitems','item_key') or any(v in e.get('targetname','').lower() for v in ('videobutton','basementdoor')) or 'useunlock' in e]
 voices=[e for e in es if 'subtitles/' in e.get('message','').replace('\\','/')]
 result['maps'][p.stem]={'arsenal_and_requested_objects':relevant,'voices':voices,'transitions':[e for e in es if e.get('classname')=='trigger_changelevel']}
for lang in ('english','dutch','french','german','norwegian','spanish','swedish'):
 row={}
 for area in ('txtfiles','notes','gfx/vgui/introductions'):
  baseline=boot/area
  folder=baseline if lang=='english' else baseline/('' if area.endswith('introductions') else 'languages')/lang
  files=[p for p in folder.rglob('*') if p.is_file() and 'languages' not in p.relative_to(folder).parts and (lang!='english' or not any(v in p.relative_to(folder).parts for v in ('dutch','french','german','norwegian','spanish','swedish')))] if folder.exists() else []
  text=[p for p in files if p.suffix.lower()=='.txt'];utf8=0;legacy=0
  for p in text:
   try:p.read_bytes().decode('utf-8');utf8+=1
   except UnicodeDecodeError:legacy+=1
  row[area]={'files':len(files),'text_utf8':utf8,'text_non_utf8':legacy,'relative_names':[str(p.relative_to(folder)) for p in files]}
 result['languages'][lang]=row
for weapon in ('switchblade','glock','syringe','mobile','camera','axe','mp5','famas','booklaser'):
 row={}
 for kind in ('v','w'):
  rel=f'models/weapons/{weapon}/{kind}_{weapon}.mdl';p=original/rel
  if not p.exists():row[kind]={'path':rel,'exists':False};continue
  b=p.read_bytes();count,offset=struct.unpack_from('<ii',b,164)
  seq=[b[offset+i*176:offset+i*176+32].split(b'\0')[0].decode('latin1') for i in range(count)] if 0<count<1000 and offset+count*176<=len(b) else []
  row[kind]={'path':rel,'exists':True,'sequences':seq}
 result['models'][weapon]=row
out=repo/'build/validation/alpha-consolidation-2026-10-31/static-inventory.json'
out.write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding='utf-8')
print('Maps',len(result['maps']))
for l,row in result['languages'].items():print(l,[(k,v['files'],v['text_non_utf8']) for k,v in row.items()])


