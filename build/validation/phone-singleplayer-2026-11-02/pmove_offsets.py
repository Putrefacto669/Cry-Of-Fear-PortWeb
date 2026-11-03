from pathlib import Path
import re,ctypes,json
s=Path('/root/cof-audits/audit-D3Kl5uly/game/hlsdk-portable/pm_shared/pm_defs.h').read_text().split('typedef struct playermove_s')[1].split('// world state')[0]
s=re.sub(r'//[^\n]*','',s);fields=[]
for typ,decl in re.findall(r'\b(int|qboolean|float|vec3_t|char)\s+([^;{}]+);',s):
 for part in decl.split(','):
  m=re.fullmatch(r'\s*(\w+)\s*(?:\[(\d+)\])?\s*',part)
  if not m:raise ValueError(part)
  name,count=m.groups();t={'float':ctypes.c_float,'vec3_t':ctypes.c_float*3,'char':ctypes.c_char}.get(typ,ctypes.c_int32);fields.append((name,t*int(count) if count else t))
class P(ctypes.Structure):_fields_=fields
out={n:hex(getattr(P,n).offset) for n,t in fields};assert out['vuser3']=='0x234' and out['dead']=='0xd0' and out['frametime']=='0x10';out['prefixSize']=hex(ctypes.sizeof(P));p=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web/build/validation/phone-singleplayer-2026-11-02/pmove-prefix-offsets.json');assert not p.exists();p.write_text(json.dumps(out,indent=2));print(out)