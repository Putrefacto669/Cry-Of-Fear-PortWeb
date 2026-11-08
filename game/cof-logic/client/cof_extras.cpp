// Original costume material substitutions and the verified night-vision point light.
#include "hud.h"
#include "cl_util.h"
#include "parsemsg.h"
#include "cl_entity.h"
#include "com_model.h"
#include "r_efx.h"
#include "r_studioint.h"
#include "studio.h"
#include <stdio.h>
#include <string.h>
#include <ctype.h>
extern engine_studio_api_t IEngineStudio;
extern int CoF_LoadExtraTexture(const char *path);
static int g_costume,g_night,g_lit,g_lastVisible=-1;
static float g_room;
static int g_loaded[12][4];
static studiohdr_t *g_changed;
static int g_indices[256];
static unsigned g_draws,g_replacements;
static char g_lastModel[128];
static const int NIGHT_KEY=0x7C0E000;
static const char *hoodies[]={"","Leatherhoff/Leatherhoff","ModDB/ModDB","Hello_Kitty/Hello_Kitty","AoM/AoM",
 "Camo/Camo","HLC/HLC","Black_Metal/Black_Metal","Team_Psykskallar/Team_Psykskallar","Awesome/Awesome",
 "Sick_Simon/Sick_Simon","Twitcher/Twitcher"};
static int Texture(int part)
{
 if(!g_costume || g_costume>11)return 0;
 if(g_loaded[g_costume][part])return g_loaded[g_costume][part];
 const char *base=hoodies[g_costume],*suffix="Hoodie";
 if(part==1){suffix="Sleeve";if(g_costume==4||g_costume==7||g_costume==8||g_costume==9)base=hoodies[9];}
 if(part==2){suffix="Jeans";if(g_costume==2||g_costume==5||g_costume==6||g_costume==8)return 0;}
 if(part==3){suffix="Face";if(g_costume!=7&&g_costume!=10&&g_costume!=11)return 0;}
 char path[160];snprintf(path,sizeof(path),"models/costumes/%s_%s.tga",base,suffix);
 // Pack mounting canonicalizes directory case; the engine fixes the final filename.
 for(char *p=path;*p;++p)*p=(char)tolower((unsigned char)*p);
 return g_loaded[g_costume][part]=CoF_LoadExtraTexture(path);
}
static bool Contains(const char *name,const char *part)
{
 char lower[128];snprintf(lower,sizeof(lower),"%s",name);
 for(char *p=lower;*p;++p)*p=(char)tolower((unsigned char)*p);
 return strstr(lower,part)!=NULL;
}
void CoF_CostumeBegin(model_t *model,void *header)
{
 if(!g_costume||!model||!header||g_changed)return;
 // Simon/cinematic models and his first-person weapons; never recolor enemies.
 if(!Contains(model->name,"/v_")&&!Contains(model->name,"/player")&&!Contains(model->name,"/simon")&&!Contains(model->name,"unfolded_clothes"))return;
 studiohdr_t *hdr=(studiohdr_t*)header;
 if(!hdr->numtextures) {
  char path[128];snprintf(path,sizeof(path),"%s",model->name);size_t n=strlen(path);
  if(n<4||n+1>=sizeof(path))return;
  strcpy(path+n-4,"T.mdl");int index;
  model_t *textures=gEngfuncs.CL_LoadModel(path,&index);
  if(!textures)return;hdr=(studiohdr_t*)IEngineStudio.Mod_Extradata(textures);
 }
 if(!hdr||hdr->numtextures<=0||hdr->numtextures>256||hdr->textureindex<=0)return;
 mstudiotexture_t *textures=(mstudiotexture_t*)((byte*)hdr+hdr->textureindex);
 g_changed=hdr;g_draws++;snprintf(g_lastModel,sizeof(g_lastModel),"%s",model->name);
 for(int i=0;i<hdr->numtextures;++i) {
  g_indices[i]=textures[i].index;
  int part=-1;
  if(Contains(textures[i].name,"hoodie_grey")||Contains(textures[i].name,"hoodie_blood"))part=0;
  else if(Contains(textures[i].name,"sleeve"))part=1;
  else if(Contains(textures[i].name,"jeans")&&!Contains(textures[i].name,"jeanss"))part=2;
  else if(Contains(textures[i].name,"head_face"))part=3;
  if(part>=0){int replacement=Texture(part);if(replacement){textures[i].index=replacement;g_replacements++;}}
 }
}
void CoF_CostumeEnd()
{
 if(!g_changed)return;
 mstudiotexture_t *textures=(mstudiotexture_t*)((byte*)g_changed+g_changed->textureindex);
 for(int i=0;i<g_changed->numtextures;++i)textures[i].index=g_indices[i];
 g_changed=NULL;
}
static int ExtrasMessage(const char *name,int size,void *data)
{
 BEGIN_READ(data,size);int costume=READ_BYTE();g_costume=costume<=11?costume:0;g_night=READ_BYTE()!=0;return 1;
}
static void ExtrasStatus()
{
 gEngfuncs.Con_Printf("COF/EXTRASCLIENT costume=%d night=%d lit=%d draws=%u replacements=%u last=%s\n",g_costume,g_night,g_lit,g_draws,g_replacements,g_lastModel);
 gEngfuncs.Con_Printf("COF/EXTRASMATERIAL costume=%d hoodie=%d sleeve=%d jeans=%d face=%d\n",g_costume,g_loaded[g_costume][0],g_loaded[g_costume][1],g_loaded[g_costume][2],g_loaded[g_costume][3]);
}
void CoF_ClientExtrasInit()
{
 gEngfuncs.pfnHookUserMsg("CoFExtras",ExtrasMessage);
 gEngfuncs.pfnAddCommand("cof_extras_render",ExtrasStatus);
}
void CoF_ClientExtrasReset()
{
 g_costume=g_night=g_lit=0;g_lastVisible=-1;g_changed=NULL;g_draws=g_replacements=0;g_lastModel[0]=0;
 memset(g_loaded,0,sizeof(g_loaded));
}
void CoF_ClientExtrasView(const float *org,float dt)
{
 bool active=g_night && !(gHUD.m_iHideHUDDisplay & HIDEHUD_HEALTH);
 if(g_lastVisible!=(int)active){g_lastVisible=(int)active;gEngfuncs.Con_Printf("COF/HUD NIGHTVISION %d\n",active?1:0);}
 if(active) {
  dlight_t *light=gEngfuncs.pEfxAPI->CL_AllocDlight(NIGHT_KEY);
  if(light){VectorCopy(org,light->origin);light->radius=900;light->color.r=26;light->color.g=230;light->color.b=26;
   light->die=gEngfuncs.GetClientTime()+0.1f;light->decay=0;light->minlight=0;light->dark=false;}
  float room=gEngfuncs.pfnGetCvarFloat("room_type");if(!g_lit||room!=14)g_room=room;
  gEngfuncs.Cvar_SetValue("room_type",14);g_lit=1;
 } else if(g_lit) {
  dlight_t *light=gEngfuncs.pEfxAPI->CL_AllocDlight(NIGHT_KEY);if(light){light->radius=0;light->die=0;}
  gEngfuncs.Cvar_SetValue("room_type",g_room);g_lit=0;
 }
}
