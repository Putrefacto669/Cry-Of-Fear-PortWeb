from pathlib import Path
import struct,re,json
root=Path('/root/cof-audits/audit-D3Kl5uly/stage')
p=next(p for p in root.rglob('c_start2.bsp') if p.is_file());b=p.read_bytes();o,n=struct.unpack_from('<ii',b,4);es=[dict(re.findall(r'"([^"\n]*)"\s+"([^"\n]*)"',s)) for s in re.findall(r'\{([^}]+)\}',b[o:o+n].decode('latin1'))];mo,mn=struct.unpack_from('<ii',b,4+14*8);point=(1672.5,-1568,-860);rows=[]
for e in es:
 model=e.get('model','')
 if not model.startswith('*'):continue
 bounds=struct.unpack_from('<6f',b,mo+int(model[1:])*64)
 origin=[float(v) for v in e.get('origin','0 0 0').split()];lo=[bounds[i]+origin[i] for i in range(3)];hi=[bounds[i+3]+origin[i] for i in range(3)]
 distance=sum(max(lo[i]-point[i],0,point[i]-hi[i])**2 for i in range(3))**.5
 if distance<200:rows.append({'entity':e,'mins':lo,'maxs':hi,'distance':distance})
print(json.dumps(rows,indent=2))
