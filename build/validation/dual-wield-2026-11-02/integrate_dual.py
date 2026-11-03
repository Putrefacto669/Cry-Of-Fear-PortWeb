from pathlib import Path
r=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web')
p=r/'game/cof-logic/cof/cof_player.h';s=p.read_text().replace('int dual;      // dual wielded with the knife: the light stays on in the other hand (CDualWeapon)','int dual;      // selected native-style pair: phone left, supported weapon right\n int dualWeapon; // port weapon id; old dual saves without this field mean switchblade\n int dualSequence,dualSerial;\n float dualAnimTime;')
s+='''\n// Independent hands for the implemented first-chapter phone pairs.
bool CoF_DualSelect(CBasePlayer*,const char*,const char*);
void CoF_DualCancel(CBasePlayer*);
void CoF_DualFrame(CBasePlayer*);
bool CoF_DualPostFrame(CBasePlayer*,class CBasePlayerWeapon*);
bool CoF_RouteMobileAnimation(CBasePlayer*,CBaseEntity*,int);
''';p.write_text(s)
p=r/'game/cof-logic/cof/player_cof.cpp';s=p.read_text();s=s.replace('static void CoF_Equip( CBasePlayer *pPlayer, const char *name )\n{','static void CoF_Equip( CBasePlayer *pPlayer, const char *name )\n{\n CoF_DualCancel(pPlayer);')
s=s.replace('CoF_ExtrasFrame(pPlayer);','CoF_ExtrasFrame(pPlayer);\n CoF_DualFrame(pPlayer);')
start=s.index('\t// DUAL WIELD in the bag:');end=s.index('\t// binds of the original config.cfg',start)
s=s[:start]+''' // DUAL WIELD validates ownership and never clears a working pair on an invalid request.
 else if(FStrEq(pcmd,"cof_dualwield") && CMD_ARGC()==3) {
  int a=atoi(CMD_ARGV(1)),b=atoi(CMD_ARGV(2));
  if(a>=0 && a<s->numItems && b>=0 && b<s->numItems && a!=b && CoF_DualSelect(pPlayer,s->names[a],s->names[b])) {
   s->invDirty=TRUE;CoF_HudPrint("COF/HUD DUALSELECT 1\\n");
  } else {CoF_HudPrint("COF/HUD DUALSELECT 0\\n");EMIT_SOUND(pPlayer->edict(),CHAN_ITEM,"inventory/inventory_no.wav",1,ATTN_NORM);}
 }
'''+s[end:]
s=s.replace('BOOL m_fMobileDual;','BOOL m_fMobileDual;\n int m_iDualWeapon,m_iDualSequence,m_iDualSerial;\n float m_flDualAnimTime;')
s=s.replace('DEFINE_FIELD( CCofPlayerState, m_fMobileDual, FIELD_BOOLEAN ),','DEFINE_FIELD( CCofPlayerState, m_fMobileDual, FIELD_BOOLEAN ),\n DEFINE_FIELD(CCofPlayerState,m_iDualWeapon,FIELD_INTEGER),\n DEFINE_FIELD(CCofPlayerState,m_iDualSequence,FIELD_INTEGER),\n DEFINE_FIELD(CCofPlayerState,m_iDualSerial,FIELD_INTEGER),\n DEFINE_FIELD(CCofPlayerState,m_flDualAnimTime,FIELD_TIME),')
s=s.replace('m_fMobileDual = s->phone.dual;','m_fMobileDual = s->phone.dual;\n m_iDualWeapon=s->phone.dualWeapon;m_iDualSequence=s->phone.dualSequence;m_iDualSerial=s->phone.dualSerial;m_flDualAnimTime=s->phone.dualAnimTime;')
s=s.replace('s->phone.dual = m_fMobileDual;','s->phone.dual = m_fMobileDual;\n s->phone.dualWeapon=m_iDualWeapon;s->phone.dualSequence=m_iDualSequence;s->phone.dualSerial=m_iDualSerial;s->phone.dualAnimTime=m_flDualAnimTime;')
p.write_text(s)
p=r/'game/cof-logic/cof/weapons_cof.cpp';s=p.read_text();s=s.replace('SendWeaponAnim( sequence, 0 );','if(!CoF_RouteMobileAnimation(m_pPlayer,this,sequence))SendWeaponAnim( sequence, 0 );',1)
s=s.replace('int m_iHand;  // 1: right, 2: left','void ItemPostFrame(){if(!CoF_DualPostFrame(m_pPlayer,this))CCofWeapon::ItemPostFrame();}\n int Save(CSave&);int Restore(CRestore&);static TYPEDESCRIPTION m_SaveData[];\n int m_iHand;  // 1: right, 2: left')
s=s.replace('LINK_ENTITY_TO_CLASS( weapon_switchblade, CCofSwitchblade )','LINK_ENTITY_TO_CLASS( weapon_switchblade, CCofSwitchblade )\nTYPEDESCRIPTION CCofSwitchblade::m_SaveData[]={DEFINE_FIELD(CCofSwitchblade,m_iHand,FIELD_INTEGER)};\nIMPLEMENT_SAVERESTORE(CCofSwitchblade,CCofWeapon)')
s=s.replace('CoF_SetFlashlight( m_pPlayer, true );','{m_iHand=1;CoF_SetFlashlight( m_pPlayer, phone->flash!=0 );}',1)
# Glock needs the same independent input routing; keep its shooting/reload logic.
s=s.replace('class CCofGlock : public CCofWeapon\n{\npublic:', 'class CCofGlock : public CCofWeapon\n{\npublic:\n void ItemPostFrame(){if(!CoF_DualPostFrame(m_pPlayer,this))CCofWeapon::ItemPostFrame();}')
s=s.replace('void LookAtMessage( void );','void LookAtMessage( void );\n void UpdatePhone();\n int Save(CSave&);int Restore(CRestore&);static TYPEDESCRIPTION m_SaveData[];')
s=s.replace('LINK_ENTITY_TO_CLASS( weapon_mobile, CCofMobile )','LINK_ENTITY_TO_CLASS( weapon_mobile, CCofMobile )\nTYPEDESCRIPTION CCofMobile::m_SaveData[]={DEFINE_FIELD(CCofMobile,m_flLightSwitch,FIELD_TIME)};\nIMPLEMENT_SAVERESTORE(CCofMobile,CCofWeapon)')
s=s.replace('void CCofMobile::ItemPostFrame( void )\n{','void CCofMobile::UpdatePhone()\n{').replace('\tCCofWeapon::ItemPostFrame();\n}\n\nvoid CCofMobile::WeaponIdle','}\nvoid CCofMobile::ItemPostFrame(){UpdatePhone();CCofWeapon::ItemPostFrame();}\n\nvoid CCofMobile::WeaponIdle')
p.write_text(s)
p=r/'platform/web/hud.js';s=p.read_text();s=s.replace('        case "BOSS":','        case "DUALSELECT":\n          bag.dualFrom = -1;closeMenu();\n          if(args[0] === "1" && bag.open)toggleBag(false);\n          break;\n        case "BOSS":',1)
s=s.replace('// COMBINE, DROP and DUAL WIELD are not in the port yet:', '// COMBINE and DROP are not in the port yet:');p.write_text(s)