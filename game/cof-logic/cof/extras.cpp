// Reconstructed from the read-only CCoFDevCommentary/CCoFHoodie/CCoFClothesMenu/CNightVision contracts.
// The profile belongs to this browser's /rwdir; it never reads or writes Steam's scriptsettings.dat.
#include "extdll.h"
#include "util.h"
#include "cbase.h"
#include "player.h"
#include "weapons.h"
#include "saverestore.h"
#include "shake.h"
#include "cof_player.h"
#include "cof_extras.h"
#include <stdio.h>
#include <stdlib.h>

static const unsigned COMMENTARY_UNLOCK = 0x400000;
static const unsigned NIGHTVISION_UNLOCK = 0x1000000;
static unsigned g_unlocks;
static bool g_commentaryDucked;
static float g_commentaryVolume;
static cof_extra_player_t g_extras[33];
static float g_syncTime[33];
static cvar_t commentaryOption = {"dev_commentary", "0", FCVAR_ARCHIVE};
static int gmsgCoFExtras;
void CoF_LinkExtrasMessages(){if(!gmsgCoFExtras)gmsgCoFExtras=REG_USER_MSG("CoFExtras",2);}
static const char *profilePath = "/rwdir/cryoffear/cof_extras_profile.cfg";
cof_extra_player_t &CoF_ExtrasPrimaryState(){return g_extras[1];}

cof_extra_player_t *CoF_ExtrasPlayer(CBaseEntity *p)
{
 return p && p->IsPlayer() && p->entindex()>0 && p->entindex()<33 ? &g_extras[p->entindex()] : NULL;
}
static void ProfileWrite()
{
#ifdef __EMSCRIPTEN__
 FILE *file = fopen("/rwdir/cryoffear/cof_extras_profile.tmp", "wb");
 if(!file) { ALERT(at_error,"COF/EXTRAS profile write failed\n"); return; }
 fprintf(file,"COF_EXTRAS 1 %u\n",g_unlocks);
 if(fclose(file) || rename("/rwdir/cryoffear/cof_extras_profile.tmp",profilePath))
  ALERT(at_error,"COF/EXTRAS profile replace failed\n");
 else CoF_HudPrint("COF/HUD EXTRASPROFILE %u\n",g_unlocks);
#endif
}
void CoF_RegisterExtras()
{
 CVAR_REGISTER(&commentaryOption);
 g_unlocks=0;
#ifdef __EMSCRIPTEN__
 FILE *file=fopen(profilePath,"rb");
 if(file) { unsigned value; if(fscanf(file,"COF_EXTRAS 1 %u",&value)==1)g_unlocks=value; fclose(file); }
#endif
}
static void Grant(unsigned bits)
{
 if((g_unlocks & bits)!=bits) {g_unlocks|=bits;ProfileWrite();}
}
void CoF_ExtrasSpawn(CBasePlayer *player)
{
 cof_extra_player_t *s=CoF_ExtrasPlayer(player); if(s) {memset(s,0,sizeof(*s));g_syncTime[player->entindex()]=0;}
}
void CoF_ExtrasRestored() {
 memset(g_syncTime,0,sizeof(g_syncTime));
 if(g_commentaryDucked){CVAR_SET_FLOAT("volume",g_commentaryVolume);g_commentaryDucked=false;}
}

class CCoFDevCommentary : public CBaseEntity
{
public:
 void Spawn(); void Precache(); void Think(); void KeyValue(KeyValueData*);
 int ObjectCaps() {return (CBaseEntity::ObjectCaps() & FCAP_ACROSS_TRANSITION)|FCAP_IMPULSE_USE;}
 void Use(CBaseEntity*,CBaseEntity*,USE_TYPE,float);
 int Save(CSave&); int Restore(CRestore&);
 static TYPEDESCRIPTION m_SaveData[];
 void Finish(); void Send();
 EHANDLE m_hListener;
 float m_flStart,m_flEnd,m_flVolume,m_flNextSend,m_flDuration;
 BOOL m_bNotarget;
};
LINK_ENTITY_TO_CLASS(cof_developer_commentary,CCoFDevCommentary)
TYPEDESCRIPTION CCoFDevCommentary::m_SaveData[]={
 DEFINE_FIELD(CCoFDevCommentary,m_hListener,FIELD_EHANDLE),
 DEFINE_FIELD(CCoFDevCommentary,m_flDuration,FIELD_FLOAT),
 DEFINE_FIELD(CCoFDevCommentary,m_flStart,FIELD_TIME), DEFINE_FIELD(CCoFDevCommentary,m_flEnd,FIELD_TIME),
 DEFINE_FIELD(CCoFDevCommentary,m_flVolume,FIELD_FLOAT), DEFINE_FIELD(CCoFDevCommentary,m_bNotarget,FIELD_BOOLEAN)
};
IMPLEMENT_SAVERESTORE(CCoFDevCommentary,CBaseEntity)
static CCoFDevCommentary *ActiveComment(CBaseEntity *player)
{
 CBaseEntity *entity=NULL;
 while((entity=UTIL_FindEntityByClassname(entity,"cof_developer_commentary")))
  if(((CCoFDevCommentary*)entity)->m_hListener==player)return (CCoFDevCommentary*)entity;
 return NULL;
}
bool CoF_ExtrasBlocksDamage(CBasePlayer *player) {return ActiveComment(player)!=NULL;}
void CCoFDevCommentary::KeyValue(KeyValueData *kv)
{
 if(FStrEq(kv->szKeyName,"fuser2")){m_flDuration=atof(kv->szValue);pev->fuser2=m_flDuration;kv->fHandled=TRUE;}
 else CBaseEntity::KeyValue(kv);
}
void CCoFDevCommentary::Precache()
{
 if(FStringNull(pev->model))pev->model=ALLOC_STRING("models/developer_commentary.mdl");
 PRECACHE_MODEL((char*)STRING(pev->model));
}
void CCoFDevCommentary::Spawn()
{
 Precache(); SET_MODEL(edict(),STRING(pev->model));
 pev->solid=SOLID_NOT; pev->movetype=MOVETYPE_NONE;
 UTIL_SetSize(pev,Vector(-13,-13,0),Vector(13,13,19));
 pev->nextthink=gpGlobals->time+0.1f;
}
void CCoFDevCommentary::Send()
{
 if(!m_hListener)return;
 CoF_HudPrint("COF/HUD COMMENTARY %d %g %g %d %s %s\n",entindex(),
  Q_max(0.0f,gpGlobals->time-m_flStart),Q_max(0.0f,m_flEnd-gpGlobals->time),pev->iuser1,
  STRING(pev->noise),FStringNull(pev->message)?"-":STRING(pev->message));
 m_flNextSend=gpGlobals->time+2;
}
void CCoFDevCommentary::Use(CBaseEntity *activator,CBaseEntity*,USE_TYPE,float)
{
 if(!activator || !activator->IsPlayer() || FStringNull(pev->noise))return;
 CCoFDevCommentary *previous=ActiveComment(activator);
 if(previous)return; // the active commentary interface owns Enter until completion
 m_hListener=activator; m_bNotarget=FBitSet(activator->pev->flags,FL_NOTARGET);
 activator->pev->flags|=FL_NOTARGET;
 m_flVolume=CVAR_GET_FLOAT("volume"); CVAR_SET_FLOAT("volume",m_flVolume*0.25f);
 g_commentaryVolume=m_flVolume;g_commentaryDucked=true;
 m_flStart=gpGlobals->time; m_flEnd=gpGlobals->time+m_flDuration;
 Send(); pev->nextthink=gpGlobals->time+0.1f;
}
void CCoFDevCommentary::Finish()
{
 CBaseEntity *listener=m_hListener;
 if(!listener)return;
 if(!m_bNotarget)listener->pev->flags&=~FL_NOTARGET;
 CVAR_SET_FLOAT("volume",m_flVolume);
 g_commentaryDucked=false;
 CoF_HudPrint("COF/HUD COMMENTARYSTOP %d\n",entindex());
 m_hListener=NULL; m_flStart=m_flEnd=0;
}
void CCoFDevCommentary::Think()
{
 if(!(pev->spawnflags & 1) && (!commentaryOption.value || !(g_unlocks & COMMENTARY_UNLOCK)))
 {Finish();UTIL_Remove(this);return;}
 if(m_hListener && (gpGlobals->time>=m_flEnd || !m_hListener->IsAlive()))Finish();
 if(m_hListener && !g_commentaryDucked){g_commentaryVolume=m_flVolume;g_commentaryDucked=true;CVAR_SET_FLOAT("volume",m_flVolume*0.25f);}
 if(m_hListener && gpGlobals->time>=m_flNextSend)Send();
 pev->nextthink=gpGlobals->time+0.1f;
}

static unsigned HoodieBit(int kind)
{
 if(kind>=0 && kind<=10)return 0x80u<<kind;
 if(kind>=11 && kind<=15)return 0x2000000u<<(kind-11);
 return 0;
}
class CCoFHoodie : public CBaseEntity
{
public:
 void Spawn() {
  if(FStringNull(pev->model))pev->model=ALLOC_STRING("models/costumes/hoodie.mdl");
  PRECACHE_MODEL((char*)STRING(pev->model));PRECACHE_SOUND("player/find_note.wav");
  SET_MODEL(edict(),STRING(pev->model));pev->movetype=MOVETYPE_NONE;pev->solid=SOLID_NOT;
  pev->origin.z+=1;UTIL_SetOrigin(pev,pev->origin);DROP_TO_FLOOR(edict());
  pev->nextthink=gpGlobals->time+0.2f;
 }
 int ObjectCaps(){return (CBaseEntity::ObjectCaps() & FCAP_ACROSS_TRANSITION)|FCAP_IMPULSE_USE;}
 void Think(){if(g_unlocks & HoodieBit(pev->iuser1))UTIL_Remove(this);}
 void Use(CBaseEntity *player,CBaseEntity*,USE_TYPE,float) {
  if(!player||!player->IsPlayer()||!player->IsAlive())return;
  static const char *names[]={"Leatherhoff suit","ModDB hoodie","Hello Kitty hoodie","AoM hoodie","Camouflage hoodie",
   "HLC hoodie","Black metal suit","Team Psykskallar hoodie","Fuck anime hoodie","Sick Simon hoodie","Twitcher suit"};
  unsigned bit=HoodieBit(pev->iuser1); if(!bit)return;
  Grant(bit);
  if(pev->iuser1<=10) {char text[128];snprintf(text,sizeof(text),"Unlocked costume: %s",names[pev->iuser1]);CoF_CenterPrint(text);}
  EMIT_SOUND(edict(),CHAN_ITEM,"player/find_note.wav",1,ATTN_NORM);
  UTIL_Remove(this);
 }
};
LINK_ENTITY_TO_CLASS(cof_hoodie,CCoFHoodie)

class CCoFClothesMenu : public CPointEntity
{
public:
 void Spawn(); void KeyValue(KeyValueData*); void Use(CBaseEntity*,CBaseEntity*,USE_TYPE,float); void Think();
 int Save(CSave&); int Restore(CRestore&); static TYPEDESCRIPTION m_SaveData[];
 void Send();
 string_t m_sCamera,m_sSimon; EHANDLE m_hPlayer; BOOL m_bOpen;
};
LINK_ENTITY_TO_CLASS(cof_clothesmenu,CCoFClothesMenu)
TYPEDESCRIPTION CCoFClothesMenu::m_SaveData[]={
 DEFINE_FIELD(CCoFClothesMenu,m_sCamera,FIELD_STRING),DEFINE_FIELD(CCoFClothesMenu,m_sSimon,FIELD_STRING),
 DEFINE_FIELD(CCoFClothesMenu,m_hPlayer,FIELD_EHANDLE),DEFINE_FIELD(CCoFClothesMenu,m_bOpen,FIELD_BOOLEAN)
};
IMPLEMENT_SAVERESTORE(CCoFClothesMenu,CPointEntity)
void CCoFClothesMenu::KeyValue(KeyValueData *kv)
{
 if(FStrEq(kv->szKeyName,"cameraent"))m_sCamera=ALLOC_STRING(kv->szValue);
 else if(FStrEq(kv->szKeyName,"simonent"))m_sSimon=ALLOC_STRING(kv->szValue);
 else {CPointEntity::KeyValue(kv);return;}kv->fHandled=TRUE;
}
void CCoFClothesMenu::Spawn()
{
 pev->solid=SOLID_NOT;pev->effects|=EF_NODRAW;pev->nextthink=gpGlobals->time+0.2f;
}
void CCoFClothesMenu::Send()
{
 cof_extra_player_t *s=CoF_ExtrasPlayer(m_hPlayer);
 if(s)CoF_HudPrint("COF/HUD CLOTHES %u %d %d\n",(g_unlocks>>7)&4095,s->costume,m_bOpen);
}
void CCoFClothesMenu::Use(CBaseEntity *player,CBaseEntity*,USE_TYPE,float value)
{
 if(!player||!player->IsPlayer())player=UTIL_FindEntityByClassname(NULL,"player");
 if(!player)return;
 m_hPlayer=player; m_bOpen=value==0;
 CBaseEntity *simon=UTIL_FindEntityByTargetname(NULL,STRING(m_sSimon));
 CBaseEntity *camera=UTIL_FindEntityByTargetname(NULL,STRING(m_sCamera));
 if(simon){simon->pev->rendermode=m_bOpen?kRenderNormal:kRenderTransTexture;simon->pev->renderamt=m_bOpen?255:0;}
 if(camera)camera->Use(player,this,m_bOpen?USE_ON:USE_OFF,m_bOpen?0:666);
 Send();pev->nextthink=gpGlobals->time+0.25f;
}
void CCoFClothesMenu::Think()
{
 if(!m_hPlayer) {
  CBaseEntity *simon=UTIL_FindEntityByTargetname(NULL,STRING(m_sSimon));
  if(simon){simon->pev->rendermode=kRenderTransTexture;simon->pev->renderamt=0;}
 } else if(m_bOpen)Send();
 pev->nextthink=gpGlobals->time+2;
}

class CNightVision : public CBaseEntity
{
public:
 void Spawn(){PRECACHE_MODEL("models/items/w_nightvision.mdl");PRECACHE_SOUND("weapons/item_get.wav");
  SET_MODEL(edict(),"models/items/w_nightvision.mdl");pev->movetype=MOVETYPE_TOSS;pev->solid=SOLID_TRIGGER;
  UTIL_SetSize(pev,Vector(-16,-16,0),Vector(16,16,16));pev->nextthink=gpGlobals->time+0.2f;}
 void Think(){if(!(g_unlocks & NIGHTVISION_UNLOCK))UTIL_Remove(this);}
 void Touch(CBaseEntity *player){
  cof_extra_player_t *s=CoF_ExtrasPlayer(player);
  if(!s || !(g_unlocks & NIGHTVISION_UNLOCK) || !(((CBasePlayer*)player)->m_afButtonPressed & IN_USE))return;
  s->nightOwned=TRUE;CoF_CenterPrint("You got the Nightvision");
  EMIT_SOUND(edict(),CHAN_ITEM,"weapons/item_get.wav",1,ATTN_NORM);
  if(!FStringNull(pev->target))FireTargets(STRING(pev->target),player,this,USE_TOGGLE,0);
  UTIL_Remove(this);
 }
};
LINK_ENTITY_TO_CLASS(item_nightvision,CNightVision)

static void NightFrame(CBasePlayer *player,cof_extra_player_t *s)
{
 if(s->nightState!=100 && s->nightState!=101) {
  if(s->nightWeapon && gpGlobals->time>s->nightTime) {
   CBasePlayerItem *item=(CBasePlayerItem*)(CBaseEntity*)s->nightWeapon;
   player->m_pActiveItem=item;item->Deploy();s->nightWeapon=NULL;
  }
  return;
 }
 if(player->m_pActiveItem) {
  CBasePlayerWeapon *weapon=(CBasePlayerWeapon*)player->m_pActiveItem->GetWeaponPtr();
  if(weapon && (weapon->m_fInReload || weapon->m_flNextPrimaryAttack>0 || weapon->m_flNextSecondaryAttack>0))return;
  if(player->m_flNextAttack>0)return;
  s->nightWeapon=player->m_pActiveItem;player->m_pActiveItem->Holster();
  // Player::Restore resets m_flNextAttack in CLIENT_WEAPONS builds. Keep the
  // outstanding holster duration as a FIELD_TIME deadline as well.
  s->nightTime=gpGlobals->time+Q_max(0.0f,player->m_flNextAttack);player->m_pActiveItem=NULL;
  return;
 }
 if(player->m_flNextAttack>0 || gpGlobals->time<s->nightTime)return;
 s->nightState=s->nightState==101?1:0;s->nightTime=gpGlobals->time+0.7f;
 EMIT_SOUND(player->edict(),CHAN_AUTO,s->nightState?"unlockables/nv_on.wav":"unlockables/nv_off.wav",1,ATTN_NORM);
 UTIL_ScreenFade(player,g_vecZero,0.5f,0.1f,255,s->nightState?FFADE_OUT:FFADE_IN);

 g_syncTime[player->entindex()]=0;
}
void CoF_ExtrasFrame(CBasePlayer *player)
{
 cof_extra_player_t *s=CoF_ExtrasPlayer(player);if(!s)return;
 if(g_commentaryDucked && !ActiveComment(player)){CVAR_SET_FLOAT("volume",g_commentaryVolume);g_commentaryDucked=false;}
 NightFrame(player,s);
 int index=player->entindex();
 if(g_syncTime[index]<=gpGlobals->time || g_syncTime[index]>gpGlobals->time+2) {
  CoF_HudPrint("COF/HUD EXTRAS %u %d %d %d\n",g_unlocks,s->costume,s->nightOwned,s->nightState==1);
  if(gmsgCoFExtras){MESSAGE_BEGIN(MSG_ONE,gmsgCoFExtras,NULL,player->pev);WRITE_BYTE(s->costume);WRITE_BYTE(s->nightState==1);MESSAGE_END();}
  g_syncTime[index]=gpGlobals->time+2;
 }
}
bool CoF_ExtrasCommand(CBasePlayer *player,const char *command)
{
 cof_extra_player_t *s=CoF_ExtrasPlayer(player);if(!s)return false;
 if(FStrEq(command,"cof_commentary_skip")){CCoFDevCommentary *c=ActiveComment(player);if(c)c->Finish();return true;}
 if(FStrEq(command,"closeclothes")) {
  CBaseEntity *entity=NULL;while((entity=UTIL_FindEntityByClassname(entity,"cof_clothesmenu")))
   if(((CCoFClothesMenu*)entity)->m_hPlayer==player)entity->Use(player,player,USE_OFF,1);
  return true;
 }
 if(FStrEq(command,"setclothes") && CMD_ARGC()>=2) {
  int selected=atoi(CMD_ARGV(1));
  CBaseEntity *entity=UTIL_FindEntityByClassname(NULL,"cof_clothesmenu");
  if(!entity || !((CCoFClothesMenu*)entity)->m_bOpen)return true;
  if(selected<0 || selected>11 || (selected && !(g_unlocks & (0x80u<<(selected-1)))))return true;
  s->costume=selected;g_syncTime[player->entindex()]=0;((CCoFClothesMenu*)entity)->Send();return true;
 }
 if(FStrEq(command,"flashlight") && s->nightOwned && (g_unlocks & NIGHTVISION_UNLOCK)) {
  if(gpGlobals->time>=s->nightTime && (s->nightState==0 || s->nightState==1))s->nightState=s->nightState?100:101;
  return true;
 }
 if(FStrEq(command,"cof_extras_unlock") && CVAR_GET_FLOAT("sv_cheats") && CMD_ARGC()==2) {
  Grant((unsigned)strtoul(CMD_ARGV(1),NULL,0));return true;
 }
 if(FStrEq(command,"cof_extras_status") && CVAR_GET_FLOAT("sv_cheats")) {
  ALERT(at_console,"COF/EXTRAS unlocks=%u costume=%d nightOwned=%d nightState=%d deadline=%g stored=%d commentary=%d\n",
   g_unlocks,s->costume,s->nightOwned,s->nightState,s->nightTime,s->nightWeapon?1:0,ActiveComment(player)?1:0);return true;
 }
 return false;
}
