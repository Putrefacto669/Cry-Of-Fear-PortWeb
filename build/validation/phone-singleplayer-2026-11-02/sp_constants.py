from pathlib import Path
import struct,json
p=Path('/mnt/c/Program Files (x86)/Steam/steamapps/common/Cry of Fear/cryoffear/cl_dlls/hl.dll');b=p.read_bytes();pe=struct.unpack_from('<i',b,60)[0];n=struct.unpack_from('<H',b,pe+6)[0];opt=struct.unpack_from('<H',b,pe+20)[0];out={}
for address in [0x101a1d94,0x101a1de0,0x101a1f74,0x101a1f7c,0x101a1380]:
 for i in range(n):
  q=pe+24+opt+i*40;vs,va,sz,raw=struct.unpack_from('<4I',b,q+8);rva=address-0x10000000
  if va<=rva<va+sz:
   o=raw+rva-va;out[hex(address)]={'text':b[o:o+24].split(b'\0')[0].decode('ascii',errors='replace'),'float':struct.unpack_from('<f',b,o)[0],'double':struct.unpack_from('<d',b,o)[0]}
d=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web/build/validation/phone-singleplayer-2026-11-02/sp-constants.json');assert not d.exists();d.write_text(json.dumps(out,indent=2));print(out)