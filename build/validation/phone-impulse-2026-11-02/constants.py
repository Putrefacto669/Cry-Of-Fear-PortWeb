from pathlib import Path
import struct,json,hashlib
base=Path('/mnt/c/Program Files (x86)/Steam/steamapps/common/Cry of Fear/cryoffear/cl_dlls');out={}
for name,adds in [('client.dll',[0x1013ef24,0x1013ef34,0x1013ef50,0x1013efb4,0x1013ef60,0x1013efbc,0x1013ef68,0x1013e3e0,0x1013ee30])]:
 b=(base/name).read_bytes();pe=struct.unpack_from('<i',b,60)[0];n=struct.unpack_from('<H',b,pe+6)[0];opt=struct.unpack_from('<H',b,pe+20)[0]
 for add in adds:
  for i in range(n):
   q=pe+24+opt+i*40;vs,va,sz,raw=struct.unpack_from('<4I',b,q+8);rva=add-0x10000000
   if va<=rva<va+sz:out[hex(add)]={'float':struct.unpack_from('<f',b,raw+rva-va)[0],'double':struct.unpack_from('<d',b,raw+rva-va)[0]}
 p=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web/build/validation/phone-impulse-2026-11-02/spring-constants.json');assert not p.exists();p.write_text(json.dumps(out,indent=2));print(out)