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
#include <string.h>
extern engine_studio_api_t IEngineStudio;
extern CGameStudioModelRenderer g_StudioRenderer;
static int g_on,g_sequence,g_body,g_serial=-1,g_kind;
static float g_start;
static bool g_drawing;
static unsigned g_draws,g_mirrors;
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
 gEngfuncs.Con_Printf("COF/HANDSCLIENT on=%d right=%d phoneSeq=%d body=%d serial=%d age=%g draws=%u mirrors=%u\n",g_on,g_kind,g_sequence,g_body,g_serial,gEngfuncs.GetClientTime()-g_start,g_draws,g_mirrors);
}
void CoF_ClientHandsInit()
{
 gEngfuncs.pfnHookUserMsg("CoFHands",HandsMessage);gEngfuncs.pfnAddCommand("cof_hands_render",HandsStatus);
}
void CoF_ClientHandsReset()
{
 g_on=0;g_serial=-1;g_drawing=false;g_draws=g_mirrors=0;
}
void CoF_HandsMirror(float (*matrix)[4])
{
 if(!g_drawing)return;
 for(int i=0;i<3;++i)matrix[i][1]=-matrix[i][1];
 ++g_mirrors;
}
void CoF_HandsBeforePoints(){if(g_drawing)gEngfuncs.pTriAPI->CullFace(TRI_NONE);}
void CoF_HandsAfterPoints(){if(g_drawing)gEngfuncs.pTriAPI->CullFace(TRI_FRONT);}
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
 *current=offhand;g_drawing=true;
 g_StudioRenderer.StudioDrawModel(flags&~STUDIO_EVENTS);
 g_drawing=false;++g_draws;*current=primary;
 IEngineStudio.StudioSetHeader(IEngineStudio.Mod_Extradata(primary.model));
 IEngineStudio.SetRenderModel(primary.model);
}
