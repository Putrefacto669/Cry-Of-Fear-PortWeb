import struct,json,pathlib
p=pathlib.Path('/root/cof-web/stage/maps/c_start2/cryoffear/maps/c_start2.bsp').read_bytes();off,size=struct.unpack_from('<ii',p,4+14*8);es=json.load(open('build/validation/padlock/c_start2-entities.json'))
for e in es:
 m=e.get('model','')
 if m.startswith('*'):
  v=struct.unpack_from('<9f7i',p,off+64*int(m[1:]));mn=v[:3];mx=v[3:6]
  if e['classname'] in ['inter_door','func_door','func_door_rotating','func_breakable']:print(e['classname'],e.get('targetname',''),m,mn,mx,e.get('lockedby',''),e.get('target',''))