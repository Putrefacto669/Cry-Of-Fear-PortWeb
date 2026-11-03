from pathlib import Path
import re,ctypes,json
s=Path('/root/cof-audits/audit-D3Kl5uly/game/hlsdk-portable/engine/progdefs.h').read_text().split('typedef struct entvars_s')[1].split('} entvars_t')[0]
s=re.sub(r'//[^\n]*','',s);fields=[]
for typ,name,count in re.findall(r'(string_t|int|float|byte|vec3_t|edict_t)\s*\*?\s*(\w+)\s*(?:\[(\d+)\])?\s*;',s):
 t={'float':ctypes.c_float,'byte':ctypes.c_ubyte,'vec3_t':ctypes.c_float*3}.get(typ,ctypes.c_int32)
 fields.append((name,t*int(count) if count else t))
class V(ctypes.Structure):_fields_=fields
print([(n,hex(getattr(V,n).offset)) for n,t in fields if n in ['punchangle','vuser1','vuser2','vuser3','vuser4','fuser1']]);print('size',ctypes.sizeof(V))