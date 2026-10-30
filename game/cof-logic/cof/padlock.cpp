// Original four-wheel padlock contract: docs/PADLOCK.md.
#include "extdll.h"
#include "util.h"
#include "cbase.h"
#include "player.h"
#include "saverestore.h"
#include "shake.h"
#include "cof_player.h"

static int padlockMessage;
void CoF_PrecachePadlock() { if(!padlockMessage) padlockMessage=REG_USER_MSG("Padlock",1); }
static void PadlockUI(CBasePlayer *p,int open) {
 CoF_PrecachePadlock(); MESSAGE_BEGIN(MSG_ONE,padlockMessage,NULL,p->edict()); WRITE_BYTE(open); MESSAGE_END();
}
class CCofDoorPropView: public CBaseEntity {
public:
 void Precache() { PRECACHE_MODEL("models/null.mdl"); }
 void Spawn() { Precache(); SET_MODEL(edict(),"models/null.mdl"); pev->solid=SOLID_NOT; pev->movetype=MOVETYPE_NOCLIP; UTIL_SetSize(pev,Vector(-16,-16,-36),Vector(16,16,36)); UTIL_SetOrigin(pev,pev->origin); }
};
LINK_ENTITY_TO_CLASS(door_prop_view,CCofDoorPropView)

class CCofPadlock: public CBaseAnimating {
public:
 void Precache() { CoF_PrecachePadlock(); PRECACHE_MODEL("models/items/padlock.mdl"); PRECACHE_SOUND("items/padl_turn.wav"); PRECACHE_SOUND("items/padl_unlock.wav"); }
 void Spawn() { Precache(); SET_MODEL(edict(),"models/items/padlock.mdl"); UTIL_SetOrigin(pev,pev->origin); pev->solid=SOLID_NOT; pev->movetype=MOVETYPE_NONE; InitBoneControllers(); ResetSequenceInfo(); }
 void Use(CBaseEntity *a,CBaseEntity *,USE_TYPE,float);
 void Think();
 int Save(CSave &save); int Restore(CRestore &restore);
 void Sync(); void Close(); void Rotate(int wheel); void Check(); void Finished();
 static TYPEDESCRIPTION m_SaveData[];
 EHANDLE m_Player;
 int m_State; // idle, interacting, opening, solved
 int m_Angles[4];
 string_t m_Code,m_Viewmodel;
 int m_OldFlags;
 float m_Finish;
 BOOL m_Sync;
};
LINK_ENTITY_TO_CLASS(item_padlock,CCofPadlock)
TYPEDESCRIPTION CCofPadlock::m_SaveData[]={
 DEFINE_FIELD(CCofPadlock,m_Player,FIELD_EHANDLE), DEFINE_FIELD(CCofPadlock,m_State,FIELD_INTEGER),
 DEFINE_ARRAY(CCofPadlock,m_Angles,FIELD_INTEGER,4), DEFINE_FIELD(CCofPadlock,m_Code,FIELD_STRING),
 DEFINE_FIELD(CCofPadlock,m_Viewmodel,FIELD_STRING), DEFINE_FIELD(CCofPadlock,m_OldFlags,FIELD_INTEGER),
 DEFINE_FIELD(CCofPadlock,m_Finish,FIELD_TIME),
};
int CCofPadlock::Save(CSave &s) { if(!CBaseAnimating::Save(s)) return 0; return s.WriteFields("CCofPadlock",this,m_SaveData,ARRAYSIZE(m_SaveData)); }
int CCofPadlock::Restore(CRestore &r) {
 if(!CBaseAnimating::Restore(r)) return 0;
 if(!r.ReadFields("CCofPadlock",this,m_SaveData,ARRAYSIZE(m_SaveData))) return 0;
 m_Sync=TRUE;
 if(m_State==1||m_State==2) pev->nextthink=gpGlobals->time+.01f;
 return 1;
}
void CCofPadlock::Use(CBaseEntity *a,CBaseEntity *,USE_TYPE,float) {
 if(!a||!a->IsPlayer()||m_State>=2||m_Player) return;
 CBaseEntity *view=UTIL_FindEntityByTargetname(NULL,STRING(pev->message));
 if(!view) return;
 CBasePlayer *p=(CBasePlayer*)a;
 m_Player=p; m_State=1; m_Code=ALLOC_STRING(CoF_PadlockCode());
 m_OldFlags=p->pev->flags&(FL_FROZEN|FL_NOTARGET); m_Viewmodel=p->pev->viewmodel;
 for(int i=0;i<4;i++) { m_Angles[i]=0; SetBoneController(i,0); }
 pev->sequence=LookupSequence("idle"); pev->frame=0; ResetSequenceInfo();
 Sync(); pev->nextthink=gpGlobals->time+.05f;
}
void CCofPadlock::Sync() {
 CBasePlayer *p=(CBasePlayer*)(CBaseEntity*)m_Player;
 if(!p||m_State<1||m_State>2) return;
 CBaseEntity *view=UTIL_FindEntityByTargetname(NULL,STRING(pev->message));
 if(!view) { Close(); return; }
 p->pev->flags|=FL_FROZEN|FL_NOTARGET; p->pev->viewmodel=iStringNull;
 SET_VIEW(p->edict(),view->edict()); PadlockUI(p,1); m_Sync=FALSE;
}
void CCofPadlock::Close() {
 CBasePlayer *p=(CBasePlayer*)(CBaseEntity*)m_Player;
 if(p) { SET_VIEW(p->edict(),p->edict()); p->pev->flags=(p->pev->flags&~(FL_FROZEN|FL_NOTARGET))|m_OldFlags;
  p->pev->viewmodel=m_Viewmodel; PadlockUI(p,0); }
 m_Player=NULL;
 if(m_State==1) m_State=0;
 pev->nextthink=0;
}
void CCofPadlock::Rotate(int wheel) {
 if(m_State!=1||wheel<1||wheel>4) return;
 int i=wheel-1; m_Angles[i]=(m_Angles[i]+40)%360; SetBoneController(i,(float)m_Angles[i]);
 Check(); EMIT_SOUND(edict(),CHAN_BODY,"items/padl_turn.wav",1,ATTN_NORM);
}
void CCofPadlock::Check() {
 const char *code=STRING(m_Code); if(strlen(code)!=4) return;
 for(int i=0;i<4;i++) if(m_Angles[i]!=(code[i]=='1'?0:(10-(code[i]-'0'))*40)) return;
 m_State=2; pev->sequence=LookupSequence("open"); pev->frame=0; ResetSequenceInfo();
 m_Finish=gpGlobals->time+2; EMIT_SOUND(edict(),CHAN_VOICE,"items/padl_unlock.wav",1,ATTN_NORM);
 CBaseEntity *p=m_Player; if(p) UTIL_ScreenFade(p,g_vecZero,2,10,255,FFADE_OUT|FFADE_STAYOUT);
}
void CCofPadlock::Finished() {
 m_State=3; // Set before dispatch: targets may re-enter this entity.
 if(!FStringNull(pev->target)) FireTargets(STRING(pev->target),this,this,USE_TOGGLE,0);
 CBaseEntity *p=m_Player; if(p) UTIL_ScreenFade(p,g_vecZero,.5f,.1f,255,FFADE_IN);
 Close();
}
void CCofPadlock::Think() {
 if(m_Sync) Sync();
 if(m_State==1||m_State==2) {
  if(!m_Player) { m_State=0; pev->nextthink=0; return; }
  StudioFrameAdvance();
  if(m_State==2&&gpGlobals->time>=m_Finish) { Finished(); return; }
  pev->nextthink=gpGlobals->time+.05f;
 }
}
void CoF_PadlockSync(CBasePlayer *p) {
 CBaseEntity *e=NULL; BOOL found=FALSE;
 while((e=UTIL_FindEntityByClassname(e,"item_padlock"))) {
  CCofPadlock *pad=(CCofPadlock*)e;
  if((CBaseEntity*)pad->m_Player==p&&(pad->m_State==1||pad->m_State==2)) { pad->Sync(); found=TRUE; }
 }
 if(!found) PadlockUI(p,0);
}
bool CoF_PadlockCommand(CBasePlayer *p,const char *cmd) {
 BOOL rotate=FStrEq(cmd,"padlockrotate"),cancel=FStrEq(cmd,"padlockcancel");
 BOOL diagnostic=FStrEq(cmd,"cof_padlock")&&CVAR_GET_FLOAT("sv_cheats");
 if(!rotate&&!cancel&&!diagnostic) return false;
 CBaseEntity *e=NULL;
 while((e=UTIL_FindEntityByClassname(e,"item_padlock"))) {
  CCofPadlock *pad=(CCofPadlock*)e;
  if(diagnostic) ALERT(at_console,"COF/PADLOCK state=%d owner=%d angles=%d,%d,%d,%d sequence=%d remaining=%g\n",pad->m_State,(CBaseEntity*)pad->m_Player==p,pad->m_Angles[0],pad->m_Angles[1],pad->m_Angles[2],pad->m_Angles[3],pad->pev->sequence,pad->m_Finish-gpGlobals->time);
  else if((CBaseEntity*)pad->m_Player==p&&pad->m_State==1) {
   if(cancel) pad->Close(); else if(CMD_ARGC()==2) pad->Rotate(atoi(CMD_ARGV(1)));
  }
 }
 return true;
}
