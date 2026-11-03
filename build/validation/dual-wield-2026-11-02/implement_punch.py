from pathlib import Path
r=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web')
p=r/'game/cof-logic/cof/weapons_cof.cpp';s=p.read_text()
s=s.replace('#include "cof_player.h"','#include "cof_player.h"\n#include "saverestore.h"')
s=s.replace('static cvar_t cofGlockSkill[] = {','static cvar_t cofPunchSkill[] = {\n {"sk_cof_punch1","5"},{"sk_cof_punch2","5"},{"sk_cof_punch3","5"},{"sk_cof_punch4","5"}\n};\nstatic cvar_t cofWeaponDebug={"cof_weapon_debug","0",0};\nstatic cvar_t cofGlockSkill[] = {')
s=s.replace('void CoF_RegisterWeaponSkill( void )\n{','void CoF_RegisterWeaponSkill( void )\n{\n CVAR_REGISTER(&cofWeaponDebug);\n for(unsigned i=0;i<4;++i)CVAR_REGISTER(&cofPunchSkill[i]);')
# Only mobile declaration, after its class boundary.
pos=s.index('class CCofMobile :');a=s[:pos];b=s[pos:];b=b.replace('void PrimaryAttack( void );','void PrimaryAttack( void );\n void SecondaryAttack( void );',1);s=a+b
s=s.replace('MOBILE_FLASH_TO_SMS = 8, MOBILE_HOLSTER_FLASH = 9','MOBILE_FLASH_TO_SMS = 8, MOBILE_HOLSTER_FLASH = 9, MOBILE_PUNCH_SMS=10, MOBILE_PUNCH_FLASH=11')
s=s.replace('PRECACHE_SOUND( "weapons/mobile/mobile_sms.wav" );','PRECACHE_SOUND( "weapons/mobile/mobile_sms.wav" );\n PRECACHE_SOUND("weapons/mobile/punch_swing.wav");\n PRECACHE_SOUND("weapons/mobile/punch_smack.wav");')
needle='// a new message with the phone in the hand:'
i=s.index(needle)
new='''// MeleeHitThinkPunch (native 100e7af0): line, head hull, BSP corner refinement.
extern void FindHullIntersection(const Vector&,TraceResult&,float*,float*,edict_t*);
class CCofPunchHit : public CPointEntity
{
public:
 void Think(); int Save(CSave&);int Restore(CRestore&);static TYPEDESCRIPTION m_SaveData[];
 EHANDLE m_hPlayer;
};
LINK_ENTITY_TO_CLASS(cof_punch_hit,CCofPunchHit)
TYPEDESCRIPTION CCofPunchHit::m_SaveData[]={DEFINE_FIELD(CCofPunchHit,m_hPlayer,FIELD_EHANDLE)};
IMPLEMENT_SAVERESTORE(CCofPunchHit,CPointEntity)
void CCofPunchHit::Think()
{
 CBaseEntity *actor=m_hPlayer;
 if(actor && actor->IsPlayer() && actor->IsAlive()) {
  CBasePlayer *player=(CBasePlayer*)actor;
  UTIL_MakeVectors(player->pev->v_angle);
  Vector start=player->GetGunPosition(),end=start+gpGlobals->v_forward*32;
  TraceResult tr;UTIL_TraceLine(start,end,dont_ignore_monsters,player->edict(),&tr);
  if(tr.flFraction>=1) {
   UTIL_TraceHull(start,end,dont_ignore_monsters,head_hull,player->edict(),&tr);
   if(tr.flFraction<1) {
    CBaseEntity *hit=CBaseEntity::Instance(tr.pHit);
    if(!hit || hit->IsBSPModel()) {
     FindHullIntersection(start,tr,(float*)&VEC_DUCK_HULL_MIN,(float*)&VEC_DUCK_HULL_MAX,player->edict());
    }
   }
  }
  if(tr.flFraction<1) {
   CBaseEntity *hit=CBaseEntity::Instance(tr.pHit);
   int level=(int)CVAR_GET_FLOAT("skill");if(level<1)level=1;if(level>4)level=4;
   float damage=CVAR_GET_FLOAT(cofPunchSkill[level-1].name);
   ClearMultiDamage();if(hit)hit->TraceAttack(player->pev,damage,gpGlobals->v_forward,&tr,0x04001000);
   ApplyMultiDamage(player->pev,player->pev);
   if(!hit || hit->Classify()==CLASS_NONE || hit->Classify()==CLASS_MACHINE)
    UTIL_ScreenShake(player->pev->origin,2,0.25f,0.15f,2);
   EMIT_SOUND_DYN(player->edict(),CHAN_WEAPON,"weapons/mobile/punch_smack.wav",1,ATTN_NORM,0,100+RANDOM_LONG(-10,10));
   UTIL_ScreenShake(player->pev->origin,1,0.25f,0.1f,2);
   if(cofWeaponDebug.value)ALERT(at_console,"COF/PUNCH impact target=%s id=%d damage=%g hitgroup=%d time=%g\\n",hit?STRING(hit->pev->classname):"world",hit?hit->entindex():0,damage,tr.iHitgroup,gpGlobals->time);
  } else if(cofWeaponDebug.value)ALERT(at_console,"COF/PUNCH miss time=%g\\n",gpGlobals->time);
 }
 UTIL_Remove(this);
}
void CCofMobile::SecondaryAttack()
{
 if(m_flNextPrimaryAttack>0 || m_flNextSecondaryAttack>0 || m_fInReload)return;
 cof_phone_t *phone=CoF_Phone(m_pPlayer);
 Anim(phone && phone->flash?MOBILE_PUNCH_FLASH:MOBILE_PUNCH_SMS,1.0f);
 m_flNextPrimaryAttack=m_flNextSecondaryAttack=UTIL_WeaponTimeBase()+1.0f;
 CCofPunchHit *hit=(CCofPunchHit*)CBaseEntity::Create("cof_punch_hit",g_vecZero,g_vecZero,NULL);
 if(hit){hit->m_hPlayer=m_pPlayer;hit->pev->nextthink=gpGlobals->time+0.133f;}
 EMIT_SOUND(m_pPlayer->edict(),CHAN_AUTO,"weapons/mobile/punch_swing.wav",1,ATTN_NORM);
 if(cofWeaponDebug.value)ALERT(at_console,"COF/PUNCH begin seq=%d impact=%g now=%g\\n",m_pPlayer->pev->weaponanim,gpGlobals->time+0.133f,gpGlobals->time);
}

'''
s=s[:i]+new+s[i:];p.write_text(s)
p=r/'tools/e2e/phone_punch.mjs';s=p.read_text().replace("assert.match(r.during,/buttons=2048/);", "assert.match(r.before,/mode=1 /);");p.write_text(s)