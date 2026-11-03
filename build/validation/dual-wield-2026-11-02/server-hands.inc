// Two hands share the existing inventory weapons, ammo and reload state. No duplicate guns.
static int gmsgCoFHands;
static float g_handsSend[33];
static int g_handsVisible[33],g_handsSerial[33];
static int DualKind(CBasePlayer *p)
{
 cof_phone_t *s=CoF_Phone(p);if(!s || !s->dual || !p->m_pActiveItem)return 0;
 int selected=s->dualWeapon?s->dualWeapon:WEAPON_COF_SWITCHBLADE;
 const char *name=STRING(p->m_pActiveItem->pev->classname);
 if(selected==WEAPON_COF_SWITCHBLADE && FStrEq(name,"weapon_switchblade"))return 1;
 if(selected==WEAPON_COF_GLOCK && FStrEq(name,"weapon_glock"))return 2;
 return 0;
}
static CCofMobile *CarriedMobile(CBasePlayer *p)
{
 return (CCofMobile*)p->HasNamedPlayerItem("weapon_mobile");
}
static void HandAnimation(CBasePlayer *p,int seq)
{
 cof_phone_t *s=CoF_Phone(p);if(!s)return;
 s->dualSequence=seq;s->dualAnimTime=gpGlobals->time;++s->dualSerial;
}
bool CoF_RouteMobileAnimation(CBasePlayer *p,CBaseEntity *weapon,int seq)
{
 if(!p || !weapon || !DualKind(p) || !FClassnameIs(weapon->pev,"weapon_mobile"))return false;
 HandAnimation(p,seq);return true;
}
void CoF_DualCancel(CBasePlayer *p)
{
 cof_phone_t *s=CoF_Phone(p);if(!s)return;
 if(s->dual && !(p->m_pActiveItem && FClassnameIs(p->m_pActiveItem->pev,"weapon_mobile")))CoF_SetFlashlight(p,false);
 s->dual=0;s->dualWeapon=0;
}
bool CoF_DualSelect(CBasePlayer *p,const char *a,const char *b)
{
 const char *weapon=NULL;
 if(FStrEq(a,"weapon_mobile"))weapon=b;else if(FStrEq(b,"weapon_mobile"))weapon=a;
 if(!weapon || (!FStrEq(weapon,"weapon_switchblade") && !FStrEq(weapon,"weapon_glock"))) {
  CoF_CenterPrint("This combination is not available.");return false;
 }
 CCofMobile *mobile=CarriedMobile(p);CBasePlayerItem *right=p->HasNamedPlayerItem(weapon);
 if(!mobile || !right)return false;
 cof_phone_t *s=CoF_Phone(p);if(!s)return false;
 s->dual=1;s->dualWeapon=FStrEq(weapon,"weapon_glock")?WEAPON_COF_GLOCK:WEAPON_COF_SWITCHBLADE;
 if(p->m_pActiveItem!=right)p->SelectItem(weapon);else right->Deploy();
 HandAnimation(p,s->flash?MOBILE_DRAW_FLASH:MOBILE_DRAW_SMS);
 g_handsVisible[p->entindex()]=0; // a user-selected new pair starts both draw animations
 return p->m_pActiveItem==right;
}
bool CoF_DualPostFrame(CBasePlayer *p,CBasePlayerWeapon *weapon)
{
 if(!DualKind(p))return false;
 CCofMobile *mobile=CarriedMobile(p);if(!mobile)return false;
 int buttons=p->pev->button;
 // Both attacks are independent. The right mouse button operates the left phone,
 // never the knife's hand swap or a synthetic second copy of the pistol.
 if((buttons&IN_ATTACK2) && mobile->m_flNextPrimaryAttack<=0 && mobile->m_flNextSecondaryAttack<=0)
  mobile->PrimaryAttack();
 p->pev->button&=~IN_ATTACK2;
 weapon->CBasePlayerWeapon::ItemPostFrame();
 p->pev->button|=buttons&IN_ATTACK2;
 return true;
}
void CoF_DualFrame(CBasePlayer *p)
{
 int index=p->entindex();if(index<1 || index>32)return;
 if(!gmsgCoFHands)gmsgCoFHands=REG_USER_MSG("CoFHands",12);
 cof_phone_t *s=CoF_Phone(p);if(!s)return;
 int kind=DualKind(p);CCofMobile *mobile=CarriedMobile(p);if(!mobile)kind=0;
 if(kind) {
  if(g_handsVisible[index]!=kind)CoF_SetFlashlight(p,s->flash!=0);
  mobile->UpdatePhone();
  float duration=(s->dualSequence==MOBILE_DRAW_SMS||s->dualSequence==MOBILE_DRAW_FLASH)?0.5f:1.0f;
  if(s->dualSequence!=MOBILE_IDLE_SMS && s->dualSequence!=MOBILE_IDLE_FLASH && gpGlobals->time>=s->dualAnimTime+duration)
   HandAnimation(p,s->flash?MOBILE_IDLE_FLASH:MOBILE_IDLE_SMS);
 } else if(g_handsVisible[index] && !(p->m_pActiveItem && FClassnameIs(p->m_pActiveItem->pev,"weapon_mobile")))CoF_SetFlashlight(p,false);
 if(kind!=g_handsVisible[index] || s->dualSerial!=g_handsSerial[index] || gpGlobals->time>=g_handsSend[index] || g_handsSend[index]>gpGlobals->time+2) {
  union {float f;int i;} age;age.f=Q_max(0.0f,gpGlobals->time-s->dualAnimTime);
  MESSAGE_BEGIN(MSG_ONE,gmsgCoFHands,NULL,p->pev);
  WRITE_BYTE(kind!=0);WRITE_BYTE(s->dualSequence);WRITE_BYTE(s->message);WRITE_BYTE(kind);
  WRITE_LONG(age.i);WRITE_LONG(s->dualSerial);MESSAGE_END();
  if(cofWeaponDebug.value)ALERT(at_console,"COF/HANDS active=%d right=%d phoneSeq=%d serial=%d age=%g time=%g\n",kind!=0,kind,s->dualSequence,s->dualSerial,age.f,gpGlobals->time);
  g_handsSend[index]=gpGlobals->time+2;g_handsSerial[index]=s->dualSerial;
 }
 g_handsVisible[index]=kind;
}