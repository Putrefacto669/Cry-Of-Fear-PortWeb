"""Update the private prototype default and regenerate its patch against the verified reference."""
from pathlib import Path
import difflib
repo=Path(__file__).resolve().parents[3]
base=Path('/root/cof-audits/audit-D3Kl5uly/engine/xash3d-fwgs')
engine=Path('/root/cof-audits/graphics-20261107/engine/xash3d-fwgs')
p=engine/'ref/gl/gl2_shim/gl2_shim.c';s=p.read_text();needle='\tif( !pglBindBufferARB )'
if 'OpenGL default GL_FOG_END' not in s:
 assert s.count(needle)==1;s=s.replace(needle,'\tgl2wrap.fogParams[1] = 1.0f; // OpenGL default GL_FOG_END\n\n'+needle);p.write_text(s)
patch=''
for name in ['ref/gl/gl2_shim/gl2_shim.c','ref/gl/gl2_shim/vertex.glsl.inc','ref/gl/gl2_shim/fragment.glsl.inc']:
 patch+='diff --git a/'+name+' b/'+name+'\n'+''.join(difflib.unified_diff((base/name).read_text().splitlines(True),(engine/name).read_text().splitlines(True),fromfile='a/'+name,tofile='b/'+name))
(repo/'patches/xash3d/0004-root.patch').write_text(patch)
