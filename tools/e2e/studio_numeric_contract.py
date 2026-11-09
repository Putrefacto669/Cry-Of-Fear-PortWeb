"""Compile candidate functions unchanged; compare independent analytic fixtures from original disassembly."""
import argparse,json,re,subprocess,tempfile
from pathlib import Path

p=argparse.ArgumentParser()
p.add_argument('source',type=Path,help='Frozen source/ directory')
p.add_argument('output',type=Path)
a=p.parse_args()
assert not a.output.exists()
a.output.mkdir(parents=True)
def extract(path,name):
    text=path.read_text()
    m=re.search(r'^(?:static )?(?:float|void) '+name+r'\([^;]+?\)\s*(?://[^\n]*)?\s*\{',text,re.M)
    assert m,name
    opening=text.index('{',m.start());depth=0
    for i in range(opening,len(text)):
        depth+=(text[i]=='{')-(text[i]=='}')
        if not depth:return text[m.start():i+1]
    raise AssertionError(name)
prefix=r'''
#include <stdio.h>
#include <math.h>
#include <string.h>
typedef float vec3_t[3];
typedef struct {float value;} cvar_t;
cvar_t gl_cof_gamma={1},gl_cof_contrast={1},gl_cof_brightness={0},gl_cof_lambert={2};
#define Q_min(a,b) ((a)<(b)?(a):(b))
#define Q_max(a,b) ((a)>(b)?(a):(b))
#define FBitSet(a,b) ((a)&(b))
#define STUDIO_NF_FLATSHADE 1
#define STUDIO_NF_FULLBRIGHT 4
#define STUDIO_NF_ADDITIVE 32
#define VectorSet(v,a,b,c) do {(v)[0]=(a);(v)[1]=(b);(v)[2]=(c);}while(0)
#define VectorMA(a,b,c,d) do {for(int k=0;k<3;k++)(d)[k]=(a)[k]+(b)*(c)[k];}while(0)
#define VectorAdd(a,b,d) do {for(int k=0;k<3;k++)(d)[k]=(a)[k]+(b)[k];}while(0)
#define VectorScale(a,b,d) do {for(int k=0;k<3;k++)(d)[k]=(a)[k]*(b);}while(0)
#define DotProduct(a,b) ((a)[0]*(b)[0]+(a)[1]*(b)[1]+(a)[2]*(b)[2])
struct {vec3_t ambient,diffuse,lightvec,blightvec[2];int numlights;vec3_t wlightdir[4],wlightcolor[4],blightdir[4][2],blightcolor[4][2];} g_cofmodel;
static int failed;
static void check(const char *name, float got,float expected){
 int ok=fabsf(got-expected)<0.00001f;failed+=!ok;
 printf("%s|%.9g|%.9g|%d\n",name,got,expected,ok);
}
'''
suffix=r'''
int main(void){
 vec3_t out,n={0,0,-1};g_cofmodel.lightvec[2]=1;
 for(int k=0;k<3;k++){g_cofmodel.ambient[k]=.1f;g_cofmodel.diffuse[k]=.4f;}
 R_CofModelLighting(out,-1,0,n);check("normal opposite light",out[0],.5f);
 n[2]=0;R_CofModelLighting(out,-1,0,n);check("normal tangent lambert2",out[0],.3f);
 n[2]=1;R_CofModelLighting(out,-1,0,n);check("normal parallel light",out[0],.1f);
 R_CofModelLighting(out,-1,1,n);check("flatshade ambient plus .8 diffuse",out[0],.42f);
 R_CofModelLighting(out,-1,4,n);check("fullbright vertex",out[0],1);
 g_cofmodel.numlights=1;g_cofmodel.wlightdir[0][2]=-1;g_cofmodel.wlightcolor[0][0]=.2f;
 R_CofModelLighting(out,-1,0,n);check("dynamic light normal facing",out[0],.3f);
 R_CofModelLighting(out,-1,1,n);check("flatshade excludes dynamic",out[0],.42f);
 g_cofmodel.numlights=0;g_cofmodel.ambient[0]=2;g_cofmodel.ambient[1]=1;g_cofmodel.ambient[2]=.5f;
 memset(g_cofmodel.diffuse,0,sizeof(g_cofmodel.diffuse));
 R_CofModelLighting(out,-1,0,n);check("saturation red",out[0],1);check("saturation green ratio",out[1],.5f);check("saturation blue ratio",out[2],.25f);
 check("gamma identity",R_CofCurve(.25f),.25f);
 gl_cof_gamma.value=2;check("original gamma2 exponent",R_CofCurve(.5f),.25f);
 gl_cof_gamma.value=.5f;check("original gammahalf exponent",R_CofCurve(.25f),.5f);
 gl_cof_gamma.value=2;gl_cof_contrast.value=1.5f;gl_cof_brightness.value=.01f;
 check("gamma before contrast brightness",R_CofCurve(.5f),.385f);
 return failed?1:0;
}
'''
source=prefix+extract(a.source/'ref/gl/gl_rsurf.c','R_CofCurve')+'\n'+extract(a.source/'ref/gl/gl_studio.c','R_CofModelLighting')+suffix
with tempfile.TemporaryDirectory() as tmp:
    c=Path(tmp)/'contract.c';exe=Path(tmp)/'contract';c.write_text(source)
    subprocess.run(['cc','-std=c99',str(c),'-lm','-o',str(exe)],check=True)
    run=subprocess.run([str(exe)],capture_output=True,text=True)
rows=[]
for line in run.stdout.splitlines():
    name,got,expected,ok=line.split('|');rows.append({'name':name,'actual':float(got),'expected':float(expected),'passed':bool(int(ok))})
result={'reference':'Ghidra client.dll 10068d70; gamma 100595f0 (XMM0=x, XMM1=gamma at 10059627); values are derived, not native framebuffer captures',
        'rows':rows,'passed':run.returncode==0,'failed':sum(not r['passed'] for r in rows)}
(a.output/'result.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
raise SystemExit(run.returncode)
