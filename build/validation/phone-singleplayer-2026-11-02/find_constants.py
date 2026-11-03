from pathlib import Path
import struct,json
p=Path('/mnt/c/Program Files (x86)/Steam/steamapps/common/Cry of Fear/cryoffear/cl_dlls/hl.dll');b=p.read_bytes();pe=struct.unpack_from('<i',b,60)[0];n=struct.unpack_from('<H',b,pe+6)[0];opt=struct.unpack_from('<H',b,pe+20)[0];out={}
for val in [9.,20.,65.,89.,179.]:
 hits=[]
 for i in range(n):
  q=pe+24+opt+i*40;nm=b[q:q+8].rstrip(b'\0').decode();vs,va,sz,raw=struct.unpack_from('<4I',b,q+8)
  if nm not in ['.rdata','.data']:continue
  for o in range(raw,raw+sz-3,4):
   if struct.unpack_from('<f',b,o)[0]==val:hits.append(hex(0x10000000+va+o-raw))
 out[str(val)]=hits
print(out)
d=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web/build/validation/phone-singleplayer-2026-11-02/server-constant-addresses.json');assert not d.exists();d.write_text(json.dumps(out,indent=2))