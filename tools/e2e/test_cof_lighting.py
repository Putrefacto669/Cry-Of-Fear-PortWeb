"""Run the actual CoF lightmap builder against independent RGB/lighting fixtures (no game assets)."""
import os,subprocess,tempfile
from pathlib import Path

import unittest

def run_contract():
    source=Path(os.environ['COF_WORK'])/'engine/xash3d-fwgs/ref/gl/gl_rsurf.c'
    text=source.read_text()
    def function(name):
     # R_CofCurve is shared with the model lighting (gl_studio.c) since 08/11, so it may not be static
     start=text.index('\nfloat R_CofCurve(')+1 if name=='R_CofCurve' and 'static float R_CofCurve(' not in text else text.index('static '+('float ' if name=='R_CofCurve' else 'void ')+name+'(')
     opening=text.index('{',start);depth=0
     for end in range(opening,len(text)):
      if text[end]=='{':depth+=1
      elif text[end]=='}':
       depth-=1
       if depth==0:return text[start:end+1]
     raise AssertionError('Unbalanced function '+name)
    
    prefix=r'''
    #include <stdio.h>
    #include <string.h>
    #include <math.h>
    typedef unsigned int uint;
    typedef unsigned char byte;
    typedef struct { byte r,g,b; } color24;
    typedef struct { byte styles[4]; color24 *samples; } msurface_t;
    typedef struct { float value; } cvar_t;
    #define MAXLIGHTMAPS 4
    #define Q_min(a,b) ((a)<(b)?(a):(b))
    #define Q_max(a,b) ((a)>(b)?(a):(b))
    #define bound(a,x,b) Q_min(Q_max(a,x),b)
    static cvar_t gl_cof_gamma={1},gl_cof_contrast={1},gl_cof_brightness={0},gl_overbright={1};
    static uint r_blocklights[12],g_lightstylevalue[256];
    static float r_spotlight[12];
    static int r_spotused;
    static void R_CofSpotObserve(int base,int addition) {}
    '''
    suffix=r'''
    static color24 samples[16];static msurface_t surface;static byte output[32];
    static void reset(void){
     memset(samples,0,sizeof(samples));memset(r_blocklights,0,sizeof(r_blocklights));
     memset(r_spotlight,0,sizeof(r_spotlight));memset(output,0xa5,sizeof(output));
     memset(surface.styles,255,sizeof(surface.styles));surface.samples=samples;r_spotused=0;
     for(int i=0;i<256;i++)g_lightstylevalue[i]=256;g_lightstylevalue[0]=264;g_lightstylevalue[63]=0;
     gl_cof_gamma.value=1;gl_cof_contrast.value=1;gl_cof_brightness.value=0;gl_overbright.value=1;
    }
    static void layer(int index,int style,int r,int g,int b){
     surface.styles[index]=style;for(int j=0;j<4;j++)samples[index*4+j]=(color24){r,g,b};
    }
    static void base(void){
     for(int i=0;i<4;i++)for(int m=0;m<4&&surface.styles[m]!=255;m++){
      color24 c=samples[m*4+i];uint v=g_lightstylevalue[surface.styles[m]];
      r_blocklights[i*3]+=c.r*v;r_blocklights[i*3+1]+=c.g*v;r_blocklights[i*3+2]+=c.b*v;
     }
    }
    static int check(const char *name,int r,int g,int b){
     R_CofBuildLightMap(&surface,output,16,2,2);
     for(int j=0;j<4;j++){
      int offset=j/2*16+j%2*4;int expected[4]={r,g,b,255};
      for(int c=0;c<4;c++)if(output[offset+c]!=expected[c]){
       fprintf(stderr,"%s luxel=%d channel=%d got=%d expected=%d\n",name,j,c,output[offset+c],expected[c]);return 1;
      }
     }
     for(int row=0;row<2;row++)for(int col=8;col<16;col++)if(output[row*16+col]!=0xa5)return 2;
     printf("PASS %s\n",name);return 0;
    }
    #define CHECK(name,r,g,b) do{int rc=check(name,r,g,b);if(rc)return rc;}while(0)
    int main(void){
     reset();layer(0,0,64,128,192);base();CHECK("ordinary static and padded stride",32,64,96);
     reset();layer(0,0,64,128,192);gl_overbright.value=0;base();CHECK("without x2 pass",64,128,192);
     reset();layer(0,0,64,128,192);g_lightstylevalue[0]=132;base();CHECK("animated ordinary lightstyle",16,32,48);
     reset();layer(0,0,200,200,200);layer(1,61,12,30,100);base();CHECK("ambient layer 61",12,30,100);
     reset();layer(0,0,99,99,99);layer(1,61,10,20,30);layer(2,63,127,127,254);layer(3,62,40,20,10);base();CHECK("directional flat path",50,40,40);
     reset();layer(0,0,99,99,99);layer(1,61,10,20,30);layer(2,63,127,127,0);layer(3,62,40,20,10);base();CHECK("negative direction clamps channels",0,0,20);
     reset();layer(0,61,200,100,50);gl_cof_contrast.value=2;base();CHECK("saturation preserves hue",255,128,64);
     reset();layer(0,0,0,0,0);gl_cof_brightness.value=10;base();CHECK("brightness upper clamp",38,38,38);
     reset();layer(0,0,64,128,192);base();for(int j=0;j<4;j++)for(int c=0;c<3;c++)r_blocklights[j*3+c]+=(c+1)*20*256;CHECK("dynamic light remains additive",42,84,126);
     reset();layer(0,0,64,128,192);base();r_spotused=1;for(int j=0;j<4;j++){r_spotlight[j*3]=.1f;r_spotlight[j*3+1]=.2f;r_spotlight[j*3+2]=.3f;}CHECK("flashlight x1 after x2 world combine",45,90,134);
     // Spatial indexing: a zero base makes each luxel's distinct red sample visible.
     reset();layer(0,0,0,0,0);base();r_spotused=1;for(int j=0;j<4;j++)r_spotlight[j*3]=(j+1)*.1f;
     R_CofBuildLightMap(&surface,output,16,2,2);int reds[4]={13,26,38,51};
     for(int j=0;j<4;j++)if(output[j/2*16+j%2*4]!=reds[j])return 3;
     puts("PASS spatial flashlight indexing");return 0;
    }
    '''
    with tempfile.TemporaryDirectory() as directory:
     file=Path(directory)/'contract.c';binary=Path(directory)/'contract'
     file.write_text(prefix+function('R_CofCurve')+'\n'+function('R_CofBuildLightMap')+suffix)
     subprocess.run(['cc','-std=c99',str(file),'-lm','-o',str(binary)],check=True)
     subprocess.run([str(binary)],check=True)

class CofLightingContract(unittest.TestCase):
    @unittest.skipUnless(os.environ.get('COF_WORK'), 'Set COF_WORK to the prepared engine checkout')
    def test_builder_fixtures(self):
        run_contract()

if __name__ == '__main__':
    unittest.main()
