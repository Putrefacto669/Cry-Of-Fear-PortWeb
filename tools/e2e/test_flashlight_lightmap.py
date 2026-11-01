"""Exercise the actual renderer lightmap composition loop, without game assets."""
import os
from pathlib import Path
import subprocess
import tempfile

source = Path(os.environ['COF_WORK']) / 'engine/xash3d-fwgs/ref/gl/gl_rsurf.c'
s = source.read_text()
start = s.index('\tfor( int t = 0; t < tmax; t++ )', s.index('// add all the dynamic lights'))
opening = s.index('{', start)
depth = 0
for index in range(opening, len(s)):
 if s[index] == '{': depth += 1
 elif s[index] == '}':
  depth -= 1
  if depth == 0:
   end = index + 1
   break
else: raise AssertionError('Unbalanced renderer loop')
loop = s[start:end]
# The historical loop must fail the same fixture that accepts the corrected one.
before = loop.replace('\n\t\t\t// Keep the luxel index outside the channel loop: its t is brightness.\n\t\t\tconst float *spot = &r_spotlight[(s + t * smax) * 3];', '').replace('spot[i] * 255.0f', 'r_spotlight[(s + t * smax) * 3 + i] * 255.0f')
assert before != loop
prefix = '''
#include <stdio.h>
#include <math.h>
#include <string.h>
typedef unsigned int uint;
typedef unsigned char byte;
#define Q_min(a,b) ((a)<(b)?(a):(b))
#define Q_max(a,b) ((a)>(b)?(a):(b))
#define Q_rint(x) ((int)roundf(x))
static uint r_blocklights[3*2*3];
static float r_spotlight[3*1024*3];
static unsigned short lightgammatable[1024];
static void R_CofSpotObserve(int base, int addition) {} // Debug telemetry is orthogonal to pixel arithmetic.
static void compose(byte *dest, int r_spotused, int linear_gamma) {
int smax=3,tmax=2,stride=12,lightscale=256,turb=0;
float litwater_scale=1; int litwater_minlight=0;
'''
suffix = '''
}
int main(void) {
byte dest[24];
for(int i=0;i<1024;i++)lightgammatable[i]=i*3/4;
for(int base=0;base<=240;base+=240)for(int on=0;on<=1;on++)for(int gamma=0;gamma<=1;gamma++) {
for(int j=0;j<18;j++){r_blocklights[j]=base*256;r_spotlight[j]=(float)(j+1)/100;}
memset(dest,0,sizeof(dest));compose(dest,on,gamma);
for(int j=0;j<6;j++)for(int ch=0;ch<3;ch++) {
int expected=(gamma?base:base*3/4)+(on?(int)(r_spotlight[j*3+ch]*255+.5f):0);if(expected>255)expected=255;
if(dest[j*4+ch]!=expected){fprintf(stderr,"luxel=%d channel=%d got=%d expected=%d\\n",j,ch,dest[j*4+ch],expected);return 1;}
if(dest[j*4+3]!=255)return 2;
}
}
puts("PASS: per-luxel RGB, black/lit surfaces, light off/on, gamma paths, saturation, alpha");return 0;
}
'''
with tempfile.TemporaryDirectory() as tmp:
 for label, body, expected in [('before', before, 1), ('fixed', loop, 0)]:
  src=Path(tmp)/f'{label}.c';exe=Path(tmp)/label
  src.write_text(prefix+body+suffix)
  subprocess.run(['cc','-std=c99',str(src),'-lm','-o',str(exe)],check=True)
  result=subprocess.run([str(exe)],capture_output=True,text=True)
  print(label, result.returncode, result.stdout, result.stderr)
  assert result.returncode==expected
