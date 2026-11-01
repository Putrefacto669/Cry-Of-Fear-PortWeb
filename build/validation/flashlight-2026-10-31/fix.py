from pathlib import Path
p=Path('/root/cof-audits/audit-D3Kl5uly/engine/xash3d-fwgs/ref/gl/gl_rsurf.c')
s=p.read_text(); old='\t\t\tbyte *restrict dst = &dest[(t * stride) + (s * 4)];'
assert s.count(old)==1
s=s.replace(old,old+'\n\t\t\t// Keep the luxel index outside the channel loop: its t is brightness.\n\t\t\tconst float *spot = &r_spotlight[(s + t * smax) * 3];')
old='r_spotlight[(s + t * smax) * 3 + i] * 255.0f'
assert s.count(old)==1
p.write_text(s.replace(old,'spot[i] * 255.0f'))
