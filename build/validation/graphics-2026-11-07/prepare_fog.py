"""Isolated renderer source and additive patch. Does not modify the reference build."""
from pathlib import Path
import difflib,shutil
repo=Path(__file__).resolve().parents[3];work=Path('/root/cof-audits/graphics-20261107')
base=Path('/root/cof-audits/audit-D3Kl5uly/engine/xash3d-fwgs');engine=work/'engine/xash3d-fwgs'
assert not engine.exists();engine.parent.mkdir(parents=True,exist_ok=True)
shutil.copytree(base,engine,symlinks=True,ignore=shutil.ignore_patterns('.git','.lock*','__pycache__'))
paths=['ref/gl/gl2_shim/gl2_shim.c','ref/gl/gl2_shim/vertex.glsl.inc','ref/gl/gl2_shim/fragment.glsl.inc']
old={n:(engine/n).read_text() for n in paths};s=old[paths[0]]
def replace(a,b):
 global s
 assert s.count(a)==1,(a,s.count(a));s=s.replace(a,b)
replace('\tGLint ufog;','\tGLint ufog;\n\tGLint ufogParams;\n\tGLint uModelView;')
replace('\tGLfloat fog[4]; // color + density','\tGLfloat fog[4]; // color + density\n\tGLfloat fogParams[4]; // start, end, linear enabled, reserved')
replace('\tif( !pglBindBufferARB )','\tgl2wrap.fogParams[1] = 1.0f; // OpenGL default GL_FOG_END\n\n\tif( !pglBindBufferARB )')
replace('\tprog->ufog   = pglGetUniformLocationARB( glprog, "uFog" );','\tprog->ufog   = pglGetUniformLocationARB( glprog, "uFog" );\n\tprog->ufogParams = pglGetUniformLocationARB( glprog, "uFogParams" );\n\tprog->uModelView = pglGetUniformLocationARB( glprog, "uModelView" );')
replace('\t\t\t\tpglUniform4fvARB( prog->ufog, 1, gl2wrap.fog );','\t\t\t\tpglUniform4fvARB( prog->ufog, 1, gl2wrap.fog );\n\t\t\tif( prog->ufogParams >= 0 )\n\t\t\t\tpglUniform4fvARB( prog->ufogParams, 1, gl2wrap.fogParams );')
replace('\t\tpglUniformMatrix4fvARB( prog->uMVP, 1, false, (void *)gl2wrap_matrix.mvp );','\t\tpglUniformMatrix4fvARB( prog->uMVP, 1, false, (void *)gl2wrap_matrix.mvp );\n\t\tif( prog->uModelView >= 0 )\n\t\t\tpglUniformMatrix4fvARB( prog->uModelView, 1, false, (void *)gl2wrap_matrix.mv );')
start=s.index('static void APIENTRY GL2_Fogf(');end=s.index('static qboolean GL2_SkipEnable',start)
s=s[:start]+'''// CoF client 10093bc0 uses GL_LINEAR with explicit eye-space start/end.
// Preserve the previous exponential path for other engine fog modes.
static void APIENTRY GL2_Fogf( GLenum param, GLfloat val )
{
 switch( param )
 {
 case GL_FOG_DENSITY: gl2wrap.fog[3] = val; break;
 case GL_FOG_START: gl2wrap.fogParams[0] = val; break;
 case GL_FOG_END: gl2wrap.fogParams[1] = val; break;
 case GL_FOG_MODE: gl2wrap.fogParams[2] = (GLenum)val == GL_LINEAR; break;
 default: return;
 }
 gl2wrap.uchanged = GL_TRUE;
}

static void APIENTRY GL2_Fogfv( GLenum param, const GLfloat *val )
{
 if( param == GL_FOG_COLOR )
 {
  gl2wrap.fog[0] = val[0]; gl2wrap.fog[1] = val[1]; gl2wrap.fog[2] = val[2];
  gl2wrap.uchanged = GL_TRUE;
 }
 else GL2_Fogf( param, val[0] );
}

'''+s[end:]
replace('static void APIENTRY GL2_Fogi(GLenum pname, GLint param)\n{\n}','static void APIENTRY GL2_Fogi(GLenum pname, GLint param)\n{\n\tGL2_Fogf( pname, (GLfloat)param );\n}')
(engine/paths[0]).write_text(s)
# Precision qualifiers are valid for GLES shaders; desktop GLSL uses none.
precision='"#ifdef GL_ES\\n"\n"#define FOG_PREC highp\\n"\n"#else\\n"\n"#define FOG_PREC\\n"\n"#endif\\n"\n'
s=old[paths[1]];needle='"uniform mat4 uMVP;\\n"';assert needle in s
s=s.replace(needle,precision+'"#if FEAT_FOG\\n"\n"uniform mat4 uModelView;\\n"\n"out FOG_PREC float vFogDistance;\\n"\n"#endif\\n"\n'+needle)
needle='"gl_Position = uMVP * vec4(inPosition,1.0);\\n"';assert needle in s
s=s.replace(needle,needle+'\n"#if FEAT_FOG\\n"\n"vFogDistance = abs((uModelView * vec4(inPosition,1.0)).z);\\n"\n"#endif\\n"')
(engine/paths[1]).write_text(s)
s=old[paths[2]];needle='"uniform PREC vec4 uFog;\\n"';assert needle in s
s=s.replace(needle,precision+needle+'\n"uniform FOG_PREC vec4 uFogParams;\\n"\n"in FOG_PREC float vFogDistance;\\n"')
needle='"float fogRate = clamp(exp(-uFog.w * fogDist), 0.0, 1.0);\\n"';assert needle in s
s=s.replace(needle,needle+'\n"if(uFogParams.z > 0.5)\\n"\n"fogRate = clamp((uFogParams.y - vFogDistance) / max(uFogParams.y - uFogParams.x, 0.000001), 0.0, 1.0);\\n"')
(engine/paths[2]).write_text(s)
patch=''
for name in paths:
 new=(engine/name).read_text();patch+='diff --git a/'+name+' b/'+name+'\n'+''.join(difflib.unified_diff(old[name].splitlines(True),new.splitlines(True),fromfile='a/'+name,tofile='b/'+name))
(repo/'patches/xash3d/0004-root.patch').write_text(patch)
sdk=work/'game/hlsdk-portable';sdk.parent.mkdir(parents=True,exist_ok=True)
shutil.copytree('/root/cof-audits/visual-clothes-20261107/game/hlsdk-portable',sdk,symlinks=True,ignore=shutil.ignore_patterns('.git','.lock*','__pycache__'))
print('Prepared isolated engine/SDK and linear fog patch')
