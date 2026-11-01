from pathlib import Path
import re,struct,json
root=Path('/root/cof-audits/audit-D3Kl5uly/stage');rows={}
for name in ('c_apartment3','c_apartment4'):
 p=next(p for p in root.rglob(name+'.bsp') if p.is_file());b=p.read_bytes();o,n=struct.unpack_from('<ii',b,4);es=[dict(re.findall(r'"([^"\n]*)"\s+"([^"\n]*)"',s)) for s in re.findall(r'\{([^}]+)\}',b[o:o+n].decode('latin1'))];rows[name]=[e for e in es if e.get('classname')!='worldspawn' and any(k in str(e).lower() for k in ('vide','basement','useunlock','valve'))]
print(json.dumps(rows,indent=2))
out=Path(__file__).parent/'object-contracts.json';out.write_text(json.dumps(rows,indent=2))

