// Original CoF Glock presentation, driven by the existing CurWeapon/AmmoX state.
// Read-only UI: no ammo, reload, damage or inventory mutation.
#include "hud.h"
#include "cl_util.h"
#include "ammohistory.h"
#include <math.h>

static int g_weapon, g_clip, g_rounds, g_units, g_visible;
static int g_mag=-1, g_icon=-1, g_cross=-1;
static unsigned g_draws;
static float g_lastDraw;
extern bool CoF_ClientHandsGlockDual();

static void AmmoStatus()
{
 int visible=g_visible && !(gHUD.m_iHideHUDDisplay&0x0d) && !gHUD.m_fPlayerDead &&
  gHUD.m_pCvarDraw && gHUD.m_pCvarDraw->value && gEngfuncs.GetClientTime()-g_lastDraw<0.2f;
 gEngfuncs.Con_Printf("COF/AMMOCLIENT weapon=%d clip=%d reserveRounds=%d fullUnits=%d capacity=15 visible=%d hide=%d draws=%u mag=%d icon=%d cross=%d dualPhone=%d\n",
  g_weapon,g_clip,g_rounds,g_units,visible,gHUD.m_iHideHUDDisplay,g_draws,g_mag,g_icon,g_cross,CoF_ClientHandsGlockDual()?1:0);
}
void CoF_ClientAmmoInit()
{
 gEngfuncs.pfnAddCommand("cof_ammo_render",AmmoStatus);
}
void CoF_ClientAmmoReset()
{
 g_weapon=g_clip=g_rounds=g_units=g_visible=0;g_draws=0;g_lastDraw=-100;
 g_mag=g_icon=g_cross=-1;
}
static void Sprite(int index,int frame,int x,int y)
{
 SPR_Set(gHUD.GetSprite(index),255,255,255);
 SPR_DrawHoles(frame,x,y,&gHUD.GetSpriteRect(index));
}
// Called before the stock HEV guard. -1 leaves non-CoF presentation untouched.
int CoF_DrawAmmo(WEAPON *weapon,float time,float &fade)
{
 g_weapon=weapon?weapon->iId:0;g_visible=0;
 if(!weapon || weapon->iId!=17){g_clip=-1;g_rounds=g_units=0;return -1;} // only the implemented CoF Glock
 g_clip=weapon->iClip;g_rounds=gWR.CountAmmo(weapon->iAmmoType);
 if(g_rounds<0)g_rounds=0;
 // Original WpnInfo: READ_BYTE weapon, READ_BYTE maxClip, READ_SHORT reserve.
 // Original client 1001b610 / weapon 3 uses reserve/maxClip, not reserve as a mag count.
 g_units=g_rounds/15;
 if((gHUD.m_iHideHUDDisplay&0x0d) || gHUD.m_fPlayerDead || g_clip<0 || g_clip>15)return 1;
 if(g_mag<0)g_mag=gHUD.GetSpriteIndex("cof_glock_mag");
 if(g_icon<0)g_icon=gHUD.GetSpriteIndex("cof_glock_mag_icon");
 if(g_cross<0)g_cross=gHUD.GetSpriteIndex("cof_mag_cross");
 int number=gHUD.m_HUD_number_0;
 if(g_mag<0 || g_icon<0 || g_cross<0 || number<0)return 1; // never draw a substitute HUD
 wrect_t mag=gHUD.GetSpriteRect(g_mag),icon=gHUD.GetSpriteRect(g_icon);
 wrect_t digit=gHUD.GetSpriteRect(number);
 int dw=digit.right-digit.left,mw=mag.right-mag.left,mh=mag.bottom-mag.top;
 if(dw<=0 || mw<=0 || mh<=0)return 1;
 // Original single-weapon CHudAmmo::Draw 100177c0. Cast after the 1.1 computation.
 int x=ScreenWidth+dw/2-dw*8;
 bool dual=CoF_ClientHandsGlockDual();
 if(dual)x+=(int)(mw*1.5); // original dual right-hand column with a non-firearm on the left
 int y=ScreenHeight-(int)(mh*1.1)-mh/6;
 Sprite(g_mag,g_clip,x,y);
 Sprite(g_icon,0,x,ScreenHeight-(icon.bottom-icon.top));
 int iconY=ScreenHeight-(icon.bottom-icon.top);
 // The number has its own right-aligned three-digit field, using CoF's digit sheet.
 int numberX=(int)(ScreenWidth+dw/2-dw*8+mw*1.1);
 int numberY=ScreenHeight-gHUD.m_iFontHeight-gHUD.m_iFontHeight/2;
 int crossX=numberX+dw/4+dw/10;
 if(dual){numberX=x+mw;numberY=iconY;crossX=x+mw;}
 Sprite(g_cross,0,crossX,iconY);
 int alpha=(int)(fade>170?fade:170);
 if(fade>0)fade-=(float)gHUD.m_flTimeDelta*20;
 gHUD.DrawHudNumber(numberX,numberY,DHN_DRAWZERO|DHN_3DIGITS,g_units,alpha,alpha,alpha);
 g_visible=1;g_lastDraw=time;++g_draws;
 return 1;
}
