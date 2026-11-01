from pathlib import Path
p=Path('/root/cof-audits/audit-D3Kl5uly/engine/xash3d-fwgs/ref/gl/gl_rsurf.c')
s=p.read_text();assert 'cookie=%dx%d bytes=%d lightmapMs' in s
p.write_text(s.replace('cookie=%dx%d bytes=%d lightmapMs','cookie=%dx%d bytes=%zu lightmapMs'))
