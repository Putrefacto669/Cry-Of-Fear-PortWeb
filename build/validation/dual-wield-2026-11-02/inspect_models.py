from pathlib import Path
import struct,json,hashlib
stage=Path('/root/cof-audits/extras-20261101/stage/boot/cryoffear/models/weapons')
out={}
for name in ['mobile','glock','switchblade']:
 p=stage/name/f'v_{name}.mdl';b=p.read_bytes();n,o=struct.unpack_from('<ii',b,164);nb,ob=struct.unpack_from('<ii',b,204)
 seq=[]
 for i in range(n):
  q=o+i*176;seq.append({'id':i,'name':b[q:q+32].split(b'\0')[0].decode(),'fps':struct.unpack_from('<f',b,q+32)[0],'frames':struct.unpack_from('<i',b,q+56)[0]})
 bodies=[]
 for i in range(nb):
  q=ob+i*76;nm,base,om=struct.unpack_from('<iii',b,q+64);bodies.append({'name':b[q:q+64].split(b'\0')[0].decode(),'base':base,'models':[b[om+j*112:om+j*112+64].split(b'\0')[0].decode() for j in range(nm)]})
 out[name]={'sha256':hashlib.sha256(b).hexdigest(),'sequences':seq,'bodyparts':bodies}
p=Path('/mnt/c/Program Files (x86)/Steam/steamapps/common/Cry of Fear/cryoffear/cl_dlls/client.dll');b=p.read_bytes();pe=struct.unpack_from('<i',b,60)[0];n=struct.unpack_from('<H',b,pe+6)[0];opt=struct.unpack_from('<H',b,pe+20)[0];rva=0x13e428
for i in range(n):
 q=pe+24+opt+i*40;vs,va,sz,raw=struct.unpack_from('<4I',b,q+8)
 if va<=rva<va+sz:out['nativeMirrorScale']=struct.unpack_from('<f',b,raw+rva-va)[0]
dest=Path(__file__).with_name('model-contracts.json');assert not dest.exists();dest.write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))