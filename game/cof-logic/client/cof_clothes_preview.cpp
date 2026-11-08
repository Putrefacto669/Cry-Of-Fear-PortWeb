// Menu-only Simon preview. Reuses Studio, original clothes_1 animation and costume textures.
#include "hud.h"
#include "cl_util.h"
#include "parsemsg.h"
#include "cl_entity.h"
#include "com_model.h"
#include "studio.h"
#include "r_studioint.h"
#include "triangleapi.h"
#include "StudioModelRenderer.h"
#include "GameStudioModelRenderer.h"
#include <GLES3/gl3.h>
#include <string.h>
#include <math.h>

extern engine_studio_api_t IEngineStudio;
extern CGameStudioModelRenderer g_StudioRenderer;
extern bool CoF_SetStudioEntity(cl_entity_t *entity);
static bool g_open;
static unsigned g_draws,g_attempts;
static int g_sequence=-1;
static float g_started;
static GLuint g_target,g_color,g_depth;
static int g_width,g_height;
static const char *MODEL="models/cutscene/simon_clothes.mdl";
static int PreviewMessage(const char*,int size,void *data)
{
 BEGIN_READ(data,size);bool open=READ_BYTE()!=0;
 if(open&&!g_open){g_started=gEngfuncs.GetClientTime();g_draws=g_attempts=0;}
 if(!open&&g_open)gEngfuncs.Con_Printf("COF/HUD CLOTHESGPU 0 0 0\n");g_open=open;return 1;
}
static void Status(){gEngfuncs.Con_Printf("COF/CLOTHESPREVIEW open=%d draws=%u attempts=%u sequence=%d texture=%u size=%dx%d model=%s\n",g_open?1:0,g_draws,g_attempts,g_sequence,g_color,g_width,g_height,MODEL);}
void CoF_ClothesPreviewInit(){gEngfuncs.pfnHookUserMsg("CoFPreview",PreviewMessage);gEngfuncs.pfnAddCommand("cof_clothes_render",Status);}
void CoF_ClothesPreviewReset(){
 g_open=false;g_draws=g_attempts=0;g_sequence=-1;
 if(g_target)glDeleteFramebuffers(1,&g_target);if(g_color)glDeleteTextures(1,&g_color);if(g_depth)glDeleteRenderbuffers(1,&g_depth);
 g_target=g_color=g_depth=0;g_width=g_height=0;
}
static bool Target(int width,int height)
{
 if(width<1||height<1)return false;
 if(g_target&&g_width==width&&g_height==height)return true;
 GLint active,texture,renderbuffer,draw,read;
 glGetIntegerv(GL_ACTIVE_TEXTURE,&active);glActiveTexture(GL_TEXTURE0);glGetIntegerv(GL_TEXTURE_BINDING_2D,&texture);
 glGetIntegerv(GL_RENDERBUFFER_BINDING,&renderbuffer);glGetIntegerv(GL_DRAW_FRAMEBUFFER_BINDING,&draw);glGetIntegerv(GL_READ_FRAMEBUFFER_BINDING,&read);
 if(!g_target)glGenFramebuffers(1,&g_target);if(!g_color)glGenTextures(1,&g_color);if(!g_depth)glGenRenderbuffers(1,&g_depth);
 glBindTexture(GL_TEXTURE_2D,g_color);glTexImage2D(GL_TEXTURE_2D,0,GL_RGBA8,width,height,0,GL_RGBA,GL_UNSIGNED_BYTE,NULL);
 glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_MIN_FILTER,GL_LINEAR);glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_MAG_FILTER,GL_LINEAR);
 glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_WRAP_S,GL_CLAMP_TO_EDGE);glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_WRAP_T,GL_CLAMP_TO_EDGE);
 glBindRenderbuffer(GL_RENDERBUFFER,g_depth);glRenderbufferStorage(GL_RENDERBUFFER,GL_DEPTH_COMPONENT16,width,height);
 glBindFramebuffer(GL_FRAMEBUFFER,g_target);glFramebufferTexture2D(GL_FRAMEBUFFER,GL_COLOR_ATTACHMENT0,GL_TEXTURE_2D,g_color,0);glFramebufferRenderbuffer(GL_FRAMEBUFFER,GL_DEPTH_ATTACHMENT,GL_RENDERBUFFER,g_depth);
 bool complete=glCheckFramebufferStatus(GL_FRAMEBUFFER)==GL_FRAMEBUFFER_COMPLETE;
 glBindFramebuffer(GL_DRAW_FRAMEBUFFER,draw);glBindFramebuffer(GL_READ_FRAMEBUFFER,read);glBindRenderbuffer(GL_RENDERBUFFER,renderbuffer);
 glBindTexture(GL_TEXTURE_2D,texture);glActiveTexture(active);
 if(complete){g_width=width;g_height=height;}return complete;
}
void CoF_DrawClothesPreview()
{
 if(!g_open)return;
 ++g_attempts;
 int index=0;model_t *model=gEngfuncs.CL_LoadModel(MODEL,&index);if(!model)return;
 studiohdr_t *hdr=(studiohdr_t*)IEngineStudio.Mod_Extradata(model);if(!hdr)return;
 if(g_sequence<0){
  mstudioseqdesc_t *sequences=(mstudioseqdesc_t*)((byte*)hdr+hdr->seqindex);
  for(int i=0;i<hdr->numseq;++i)if(!strcmp(sequences[i].label,"clothes_1")){g_sequence=i;break;}
 }
 if(g_sequence<0)return; // no fabricated fallback pose
 vec3_t origin,up,right,forward;IEngineStudio.GetViewInfo(origin,up,right,forward);
 // Fit the original pose in the left panel using the current projection, including
 // scripted-camera FOV and aspect ratio; never move the actual player or camera.
 mstudioseqdesc_t *sequence=(mstudioseqdesc_t*)((byte*)hdr+hdr->seqindex)+g_sequence;
 float height=sequence->bbmax[2]-sequence->bbmin[2],center=(sequence->bbmax[2]+sequence->bbmin[2])*.5f;
 vec3_t point,pointUp,pointRight,screen,screenUp,screenRight;
 for(int i=0;i<3;++i){point[i]=origin[i]+forward[i]*128;pointUp[i]=point[i]+up[i];pointRight[i]=point[i]+right[i];}
 float distance=128,offset=-48;
 if(!gEngfuncs.pTriAPI->WorldToScreen(point,screen) && !gEngfuncs.pTriAPI->WorldToScreen(pointUp,screenUp) && !gEngfuncs.pTriAPI->WorldToScreen(pointRight,screenRight)){
  float sy=(float)fabs(screenUp[1]-screen[1]),sx=screenRight[0]-screen[0];
  if(height>0&&sy>0&&fabs(sx)>.000001){distance=128*sy*height/1.45f;offset=(-.4f-screen[0])/sx*(distance/128);}
 }
 cl_entity_t preview={};preview.model=model;
 for(int i=0;i<3;++i)preview.origin[i]=origin[i]+forward[i]*distance+right[i]*offset-up[i]*center;
 preview.angles[1]=(float)(atan2(forward[1],forward[0])*180/3.141592653589793)+180;
 VectorCopy(preview.origin,preview.curstate.origin);VectorCopy(preview.angles,preview.curstate.angles);
 preview.curstate.modelindex=index;preview.curstate.sequence=g_sequence;
 preview.curstate.animtime=g_started;preview.curstate.framerate=1;
 preview.curstate.renderamt=255;preview.curstate.effects=EF_FULLBRIGHT;
 preview.latched.prevsequence=g_sequence;preview.latched.prevanimtime=g_started;
 preview.latched.sequencetime=g_started-1;
 cl_entity_t *previous=IEngineStudio.GetCurrentEntity();
 GLint viewport[4];glGetIntegerv(GL_VIEWPORT,viewport);if(!Target(viewport[2],viewport[3]))return;
 if(!CoF_SetStudioEntity(&preview))return;
 // An RGBA UI target isolates the model from the menu's world depth, fog/grey
 // postprocessing and rain. Studio still draws the original bones/materials.
 GLfloat range[2],clearColor[4],clearDepth;GLint depthFunction,draw,read;GLboolean depthMask,colorMask[4];
 glGetFloatv(GL_DEPTH_RANGE,range);glGetIntegerv(GL_DEPTH_FUNC,&depthFunction);glGetBooleanv(GL_DEPTH_WRITEMASK,&depthMask);
 glGetFloatv(GL_COLOR_CLEAR_VALUE,clearColor);glGetFloatv(GL_DEPTH_CLEAR_VALUE,&clearDepth);glGetBooleanv(GL_COLOR_WRITEMASK,colorMask);
 glGetIntegerv(GL_DRAW_FRAMEBUFFER_BINDING,&draw);glGetIntegerv(GL_READ_FRAMEBUFFER_BINDING,&read);
 GLboolean depthTest=glIsEnabled(GL_DEPTH_TEST),scissor=glIsEnabled(GL_SCISSOR_TEST);
 glBindFramebuffer(GL_FRAMEBUFFER,g_target);glViewport(0,0,g_width,g_height);glDisable(GL_SCISSOR_TEST);
 glEnable(GL_DEPTH_TEST);glDepthMask(GL_TRUE);glDepthFunc(GL_LEQUAL);glDepthRangef(0,1);glColorMask(GL_TRUE,GL_TRUE,GL_TRUE,GL_TRUE);
 glClearColor(0,0,0,0);glClearDepthf(1);glClear(GL_COLOR_BUFFER_BIT|GL_DEPTH_BUFFER_BIT);
 if(g_StudioRenderer.StudioDrawModel(STUDIO_RENDER))++g_draws; // no animation events/gameplay callbacks
 glBindFramebuffer(GL_DRAW_FRAMEBUFFER,draw);glBindFramebuffer(GL_READ_FRAMEBUFFER,read);glViewport(viewport[0],viewport[1],viewport[2],viewport[3]);
 glClearColor(clearColor[0],clearColor[1],clearColor[2],clearColor[3]);glClearDepthf(clearDepth);glColorMask(colorMask[0],colorMask[1],colorMask[2],colorMask[3]);if(scissor)glEnable(GL_SCISSOR_TEST);
 glDepthRangef(range[0],range[1]);glDepthFunc(depthFunction);glDepthMask(depthMask);if(!depthTest)glDisable(GL_DEPTH_TEST);
 CoF_SetStudioEntity(previous);
 if(previous&&previous->model){IEngineStudio.StudioSetHeader(IEngineStudio.Mod_Extradata(previous->model));IEngineStudio.SetRenderModel(previous->model);}
 static GLuint sent;static int sentWidth,sentHeight;
 if(sent!=g_color||sentWidth!=g_width||sentHeight!=g_height||g_draws==1){gEngfuncs.Con_Printf("COF/HUD CLOTHESGPU %u %d %d\n",g_color,g_width,g_height);sent=g_color;sentWidth=g_width;sentHeight=g_height;}
}
