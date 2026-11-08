// CHudNoise 10030340: original snoise sprite, additive tiles and cl_noiseamount tint.
#include "hud.h"
#include "cl_util.h"
#include <stdint.h>
static cvar_t *g_noise,*g_amount;
static int g_sprite=-1,g_lastAlpha;
static unsigned g_draws,g_tiles;
static uint32_t g_random=0x434f4601u; // visual-only; never consume the gameplay RNG
static void Status(){gEngfuncs.Con_Printf("COF/VISUAL noise=%g amount=%g alpha=%d draws=%u tiles=%u sprite=%d\n",g_noise?g_noise->value:0,g_amount?g_amount->value:0,g_lastAlpha,g_draws,g_tiles,g_sprite);}
void CoF_VisualInit(){g_noise=gEngfuncs.pfnRegisterVariable("cl_noiseeffect","1",FCVAR_ARCHIVE);g_amount=gEngfuncs.pfnRegisterVariable("cl_noiseamount","0.5",FCVAR_ARCHIVE);gEngfuncs.pfnAddCommand("cof_visual_status",Status);}
void CoF_VisualReset(){g_sprite=-1;g_draws=g_tiles=0;g_lastAlpha=0;}
void CoF_DrawOriginalNoise()
{
 if(!g_noise || !g_amount || !g_noise->value)return;
 if(g_sprite<0)g_sprite=gHUD.GetSpriteIndex("snoise");if(g_sprite<0)return;
 HSPRITE sprite=gHUD.GetSprite(g_sprite);if(SPR_Frames(sprite)<20)return;
 wrect_t rect=gHUD.GetSpriteRect(g_sprite);int width=rect.right-rect.left,height=rect.bottom-rect.top;
 if(width<=0 || height<=0)return;
 int alpha=(int)(g_amount->value*255);if(alpha<0)alpha=0;if(alpha>255)alpha=255;g_lastAlpha=alpha;
 for(int y=0;y<ScreenHeight;y+=height)for(int x=0;x<ScreenWidth;x+=width){
  g_random^=g_random<<13;g_random^=g_random>>17;g_random^=g_random<<5;
  SPR_Set(sprite,alpha,alpha,alpha);SPR_DrawAdditive(1+g_random%19,x,y,&rect);++g_tiles;
 }
 ++g_draws;
}
