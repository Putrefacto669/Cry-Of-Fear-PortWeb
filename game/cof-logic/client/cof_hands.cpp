// The original client draws a second studio viewmodel, mirrored about its local Y axis.
#include "hud.h"
#include "cl_util.h"
#include "parsemsg.h"
#include "com_model.h"
#include "cl_entity.h"
#include "studio.h"
#include "r_studioint.h"
#include "triangleapi.h"
#include "StudioModelRenderer.h"
#include "GameStudioModelRenderer.h"
#include <math.h>
#include <string.h>
#include <vector>
extern engine_studio_api_t IEngineStudio;
extern CGameStudioModelRenderer g_StudioRenderer;
static int g_on,g_sequence,g_body,g_serial=-1,g_kind;
static float g_start;
static bool g_drawing;
static unsigned g_draws,g_mirrors,g_maskedVertices,g_maskedView;
static cvar_t *g_armMask,*g_extraView;
// Final camera of this frame (pparams->vieworg / viewangles after V_CalcNormalRefdef),
// and the bobbing view model transform it replaces on the dual weapon (kept for the phone).
static float g_viewOrg[3],g_viewAngles[3],g_bobOrg[3],g_bobAngles[3];
static bool g_viewValid,g_bobValid;
struct HandMeshBackup { short *commands; std::vector<short> original; };
static std::vector<HandMeshBackup> g_meshBackups;
// Read-only HUD layout query: this port currently supports a phone in the left hand.
bool CoF_ClientHandsGlockDual(){return g_on && g_kind==2;}
static int HandsMessage(const char*,int size,void *data)
{
 BEGIN_READ(data,size);int on=READ_BYTE(),seq=READ_BYTE(),body=READ_BYTE(),kind=READ_BYTE();
 union {int i;float f;} age;age.i=READ_LONG();int serial=READ_LONG();
 if(!g_on || serial!=g_serial || seq!=g_sequence)g_start=gEngfuncs.GetClientTime()-age.f;
 g_on=on!=0;g_sequence=seq;g_body=body;g_kind=kind;g_serial=serial;return 1;
}
static void HandsStatus()
{
 cl_entity_t *view=gEngfuncs.GetViewModel();
 gEngfuncs.Con_Printf("COF/HANDSCLIENT on=%d right=%d phoneSeq=%d body=%d serial=%d age=%g draws=%u mirrors=%u masked=%u maskedview=%u viewseq=%d viewmodel=%s\n",g_on,g_kind,g_sequence,g_body,g_serial,gEngfuncs.GetClientTime()-g_start,g_draws,g_mirrors,g_maskedVertices,g_maskedView,
  view?view->curstate.sequence:-1,view && view->model?view->model->name:"none");
}
// Ladders (hl.dll CCoFLadderManager): the server sends the animated camera model's index
// ("AttachCam" in the original, 0 detaches). client.dll 1008cee0 takes, while drawing that
// entity, its attachments: origin = attachment 0 (the "eye" bone), angles from attachment 1 - 0
// with the pitch negated, roll = pitch of attachment 3 - 0; 100af790 then uses them as the view.
// Xash recomputes the attachments while drawing (after V_CalcRefdef), so like the original they
// are captured during the draw of the camera entity and give the view of the next frame.
static int g_ladderCam;

// The view relies on attachments from this draw, even when the previous
// attachment places the camera outside the new sequence's visibility bounds.
bool CoF_ActiveLadderCamera(const cl_entity_t *entity)
{
 return g_ladderCam && entity && entity->index == g_ladderCam && entity->model &&
        !strcmp(entity->model->name,"models/ladder_climb.mdl");
}
static float g_ladderOrg[3],g_ladderAngles[3],g_ladderAtt[4][3],g_ladderEntOrg[3];
static bool g_ladderAttValid;
static unsigned g_ladderViews,g_ladderCaptures,g_ladderSetups,g_ladderRecoveries;
static int LadderCamMessage(const char*,int size,void *data)
{
 BEGIN_READ(data,size);g_ladderCam=READ_SHORT();g_ladderAttValid=false;return 1;
}
static void LadderCapture()
{
 cl_entity_t *e=IEngineStudio.GetCurrentEntity();
 if(!g_ladderCam || !e || e->index!=g_ladderCam)return;
 for(int i=0;i<4;++i)for(int j=0;j<3;++j)g_ladderAtt[i][j]=e->attachment[i][j];
 for(int j=0;j<3;++j)g_ladderEntOrg[j]=e->origin[j];
 g_ladderAttValid=true;++g_ladderCaptures;
}
static void LadderAngles(const float *v,float *a)
{
 // VectorAngles of the original (pitch positive upwards, both in [0,360))
 if(v[1]==0 && v[0]==0){a[1]=0;a[0]=v[2]>0?90.0f:270.0f;a[2]=0;return;}
 float yaw=atan2f(v[1],v[0])*57.29577951f;if(yaw<0)yaw+=360;
 float pitch=atan2f(v[2],sqrtf(v[0]*v[0]+v[1]*v[1]))*57.29577951f;if(pitch<0)pitch+=360;
 a[0]=pitch;a[1]=yaw;a[2]=0;
}
void CoF_LadderView(float *org,float *angles)
{
 if(!g_ladderCam || !g_ladderAttValid)return; // the original also waits for a first draw (DAT_10542bb3)
 float f[3],r[3],a[3],ra[3];
 for(int i=0;i<3;++i){f[i]=g_ladderAtt[1][i]-g_ladderAtt[0][i];r[i]=g_ladderAtt[3][i]-g_ladderAtt[0][i];}
 if(f[0]==0 && f[1]==0 && f[2]==0)return;
 LadderAngles(f,a);LadderAngles(r,ra);
 // The captured attachments are one frame old. Between animations the server moves the camera by
 // 48 units at once: follow that move now (the attachments are rigid with the model), otherwise the
 // model ends up outside the stale view's frustum, is not drawn and the view stays behind.
 float shift[3]={0,0,0};
 cl_entity_t *e=gEngfuncs.GetEntityByIndex(g_ladderCam);
 if(e && e->model)for(int i=0;i<3;++i)shift[i]=e->origin[i]-g_ladderEntOrg[i];
 for(int i=0;i<3;++i)org[i]=g_ladderAtt[0][i]+shift[i];
 angles[0]=-a[0];angles[1]=a[1];angles[2]=ra[0];
 for(int i=0;i<3;++i){g_ladderOrg[i]=org[i];g_ladderAngles[i]=angles[i];}
 ++g_ladderViews;
}
static void LadderStatus()
{
 cl_entity_t *e=g_ladderCam?gEngfuncs.GetEntityByIndex(g_ladderCam):NULL;
 cl_entity_t *local=gEngfuncs.GetLocalPlayer();
 gEngfuncs.Con_Printf("COF/LADDERCLIENT cam=%d model=%s seq=%d views=%u captures=%u setups=%u recoveries=%u org=%g,%g,%g angles=%g,%g,%g entorg=%g,%g,%g msg=%d localmsg=%d att0=%g,%g,%g att1=%g,%g,%g\n",g_ladderCam,
  e && e->model?e->model->name:"none",e?e->curstate.sequence:-1,g_ladderViews,g_ladderCaptures,g_ladderSetups,g_ladderRecoveries,
  g_ladderOrg[0],g_ladderOrg[1],g_ladderOrg[2],g_ladderAngles[0],g_ladderAngles[1],g_ladderAngles[2],
  e?e->origin[0]:0,e?e->origin[1]:0,e?e->origin[2]:0,e?e->curstate.messagenum:-1,local?local->curstate.messagenum:-1,
  e?e->attachment[0][0]:0,e?e->attachment[0][1]:0,e?e->attachment[0][2]:0,e?e->attachment[1][0]:0,e?e->attachment[1][1]:0,e?e->attachment[1][2]:0);
}
void CoF_ClientHandsInit()
{
 gEngfuncs.pfnHookUserMsg("CoFAttachCam",LadderCamMessage);gEngfuncs.pfnAddCommand("cof_ladder_view",LadderStatus);
 g_armMask=gEngfuncs.pfnRegisterVariable("cof_dual_armmask","1",0);
 // Diagnostic A/B: 0 leaves the mirrored weapon on the bobbing view model transform.
 g_extraView=gEngfuncs.pfnRegisterVariable("cof_dual_extraview","1",0);
 gEngfuncs.pfnHookUserMsg("CoFHands",HandsMessage);gEngfuncs.pfnAddCommand("cof_hands_render",HandsStatus);
}
// Roles, from the original game (dual phone + Glock capture) and hl.dll 10031020: the
// weapon (+0x204: knife p2, Glock) is sent as the client's extra model (10038f40/10038f10
// feed the messages read by client.dll 10090780/10090670), drawn mirrored into the left
// hand; the phone (+0x200, the light source per 100e08b0) is the ordinary, unmirrored
// view model in the right hand. The port keeps the weapon as the engine view model and
// draws the phone itself, so the transforms are swapped here to match.
static bool DualWeaponView(cl_entity_t *e)
{
 return g_on && e && e==gEngfuncs.GetViewModel() && e->model &&
  ((g_kind==1 && !strcmp(e->model->name,"models/weapons/switchblade/v_switchblade.mdl")) ||
   (g_kind==2 && !strcmp(e->model->name,"models/weapons/glock/v_glock.mdl")));
}
// Called after V_CalcNormalRefdef with the final camera. client.dll 1008c7e0 (mode 3) puts
// the extra model at vieworg with angles (-pitch, yaw, roll) of viewangles (both stored by
// 100af790): none of the view model's bob, tilt, shake or height tweaks. The phone, as the
// ordinary view model, keeps that bobbing transform.
void CoF_HandsView(const float *org,const float *angles)
{
 VectorCopy(org,g_viewOrg);VectorCopy(angles,g_viewAngles);g_viewValid=true;
 cl_entity_t *view=gEngfuncs.GetViewModel();
 g_bobValid=false;
 if(!view || !DualWeaponView(view))return;
 VectorCopy(view->origin,g_bobOrg);VectorCopy(view->angles,g_bobAngles);g_bobValid=true;
 if(g_extraView && !g_extraView->value)return;
 vec3_t camera;camera[0]=-angles[0];camera[1]=angles[1];camera[2]=angles[2];
 VectorCopy(org,view->origin);VectorCopy(org,view->curstate.origin);VectorCopy(org,view->latched.prevorigin);
 VectorCopy(camera,view->angles);VectorCopy(camera,view->curstate.angles);VectorCopy(camera,view->latched.prevangles);
}
void CoF_ClientHandsReset()
{
 g_viewValid=g_bobValid=false;g_ladderCam=0;
 g_on=0;g_serial=-1;g_drawing=false;g_draws=g_mirrors=g_maskedVertices=g_maskedView=0;
}
// client.dll 1008c7e0 negates column Y of the extra model (DAT_1013e428 = -1.0): here the
// knife or Glock view model of a dual pair.
void CoF_HandsMirror(float (*matrix)[4])
{
 cl_entity_t *current=IEngineStudio.GetCurrentEntity();
 if(g_ladderCam && current && current->index==g_ladderCam)++g_ladderSetups; // diagnostic: draw requested
 if(g_drawing || !DualWeaponView(current))return;
 for(int i=0;i<3;++i)matrix[i][1]=-matrix[i][1];
 ++g_mirrors;
}
// client.dll 10065ef0, dual branch 10066e40: omit vertices whose bone name
// contains "l_" (r_ only with weapon 13), in the extra model and in the view
// model (ID 13, the flare, is the only r_ case: the Glock, ID 3, loses l_ too).
// Applied to the phone and to the knife or Glock view model. Filter only the transient command
// stream, then restore it after drawing: the MDL and single weapons stay intact.
static void MaskLeftArm()
{
 cl_entity_t *entity=IEngineStudio.GetCurrentEntity();
 if(!g_armMask || !g_armMask->value || !g_on || !entity || !entity->model)return;
 if(g_drawing) {
  if(strcmp(entity->model->name,"models/weapons/mobile/v_mobile.mdl"))return;
 } else if(!DualWeaponView(entity))return;
 studiohdr_t *header=(studiohdr_t*)IEngineStudio.Mod_Extradata(entity->model);
 if(!header)return;
 byte *base=(byte*)header;
 mstudiobone_t *bones=(mstudiobone_t*)(base+header->boneindex);
 mstudiobodyparts_t *parts=(mstudiobodyparts_t*)(base+header->bodypartindex);
 for(int part=0;part<header->numbodyparts;++part) {
  if(parts[part].base<=0 || parts[part].nummodels<=0)continue;
  int selected=(entity->curstate.body/parts[part].base)%parts[part].nummodels;
  if(selected<0)continue;
  mstudiomodel_t *model=(mstudiomodel_t*)(base+parts[part].modelindex)+selected;
  byte *vertexBones=base+model->vertinfoindex;
  mstudiomesh_t *meshes=(mstudiomesh_t*)(base+model->meshindex);
  for(int mesh=0;mesh<model->nummesh;++mesh) {
   short *start=(short*)(base+meshes[mesh].triindex),*read=start;
   std::vector<short> filtered;
   unsigned omitted=0;bool valid=true;
   while((byte*)(read+1)<=base+header->length && *read) {
    int signedCount=*read++,count=signedCount<0?-signedCount:signedCount;
    if((byte*)(read+4*count)>base+header->length){valid=false;break;}
    size_t mark=filtered.size();filtered.push_back(0);int kept=0;
    for(int vertex=0;vertex<count;++vertex,read+=4) {
     int index=read[0];
     if(index<0 || index>=model->numverts || vertexBones[index]>=header->numbones){valid=false;break;}
     if(strstr(bones[vertexBones[index]].name,"l_")){++omitted;continue;}
     filtered.insert(filtered.end(),read,read+4);++kept;
    }
    if(!valid)break;
    if(kept<3)filtered.resize(mark);
    else filtered[mark]=(short)(signedCount<0?-kept:kept);
   }
   if(!valid || (byte*)(read+1)>base+header->length || !omitted)continue;
   filtered.push_back(0);
   HandMeshBackup backup;backup.commands=start;backup.original.assign(start,read+1);
   g_meshBackups.push_back(backup);
   memcpy(start,&filtered[0],filtered.size()*sizeof(short));g_maskedVertices+=omitted;if(!g_drawing)g_maskedView+=omitted;
  }
 }
}
void CoF_HandsBeforePoints()
{
 LadderCapture();
 MaskLeftArm();
 // client.dll 1008c7e0 also disables culling (TriAPI CullFace(TRI_NONE)) for the mirrored model.
 if(!g_drawing && DualWeaponView(IEngineStudio.GetCurrentEntity()))gEngfuncs.pTriAPI->CullFace(TRI_NONE);
}
void CoF_HandsAfterPoints()
{
 for(size_t i=0;i<g_meshBackups.size();++i)
  memcpy(g_meshBackups[i].commands,&g_meshBackups[i].original[0],g_meshBackups[i].original.size()*sizeof(short));
 g_meshBackups.clear();
 if(!g_drawing && DualWeaponView(IEngineStudio.GetCurrentEntity()))gEngfuncs.pTriAPI->CullFace(TRI_FRONT);
}
void CoF_DrawOffhand(int flags)
{
 cl_entity_t *current=IEngineStudio.GetCurrentEntity();
 if(!g_on || g_drawing || !(flags&STUDIO_RENDER) || !current || current!=gEngfuncs.GetViewModel() || (gHUD.m_iHideHUDDisplay&HIDEHUD_HEALTH))return;
 int index=0;model_t *model=gEngfuncs.CL_LoadModel("models/weapons/mobile/v_mobile.mdl",&index);if(!model)return;
 cl_entity_t primary=*current;
 cl_entity_t offhand=primary;offhand.model=model;
 offhand.curstate.modelindex=index;offhand.curstate.sequence=g_sequence;offhand.curstate.frame=0;
 offhand.curstate.animtime=g_start;offhand.curstate.framerate=1;offhand.curstate.body=g_body;
 offhand.latched.prevsequence=g_sequence;offhand.latched.prevanimtime=g_start;offhand.latched.prevframe=0;
 offhand.latched.sequencetime=g_start-1;
 // The phone is the ordinary view model: it keeps the bobbing transform that
 // CoF_HandsView took away from the dual weapon.
 if(g_bobValid) {
  VectorCopy(g_bobOrg,offhand.origin);VectorCopy(g_bobOrg,offhand.curstate.origin);VectorCopy(g_bobOrg,offhand.latched.prevorigin);
  VectorCopy(g_bobAngles,offhand.angles);VectorCopy(g_bobAngles,offhand.curstate.angles);VectorCopy(g_bobAngles,offhand.latched.prevangles);
 }
 *current=offhand;g_drawing=true;
 g_StudioRenderer.StudioDrawModel(flags&~STUDIO_EVENTS);
 g_drawing=false;++g_draws;*current=primary;
 IEngineStudio.StudioSetHeader(IEngineStudio.Mod_Extradata(primary.model));
 IEngineStudio.SetRenderModel(primary.model);
}
