import struct,re
from pathlib import Path
b=Path('/root/cof-audits/audit-D3Kl5uly/stage/maps/c_apartment1/cryoffear/maps/c_apartment1.bsp')
if not b.exists():
 b=next(Path('/root/cof-audits/audit-D3Kl5uly/stage').rglob('c_apartment1.bsp'))
d=b.read_bytes();o,n=struct.unpack_from('<ii',d,4)
for ent in re.findall(r'\{([^}]+)\}',d[o:o+n].decode('latin1')):
 if 'trigger_camera' in ent: print(ent)
