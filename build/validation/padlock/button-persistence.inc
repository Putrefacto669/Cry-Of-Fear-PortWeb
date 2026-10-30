#ifdef __EMSCRIPTEN__
// Save stable SDK callback identities; SIDE_MODULE method addresses cannot be
// resolved by NAME_FOR_FUNCTION. Keep null/busy states and deadlines intact.
int CBaseButton::Save( CSave &save )
{
 typedef void (CBaseEntity::*ThinkFn)();
 typedef void (CBaseEntity::*TouchFn)(CBaseEntity *);
 typedef void (CBaseEntity::*UseFn)(CBaseEntity *,CBaseEntity *,USE_TYPE,float);
 typedef void (CBaseToggle::*MoveFn)();
 int think=-1, touch=-1, use=-1, move=-1;
 if(!m_pfnThink) think=0;
 else if(m_pfnThink==static_cast<ThinkFn>(&CBaseButton::ButtonSpark)) think=1;
 else if(m_pfnThink==static_cast<ThinkFn>(&CBaseButton::ButtonReturn)) think=2;
 else if(m_pfnThink==static_cast<ThinkFn>(&CBaseToggle::LinearMoveDone)) think=3;
 else if(m_pfnThink==static_cast<ThinkFn>(&CBaseToggle::AngularMoveDone)) think=4;
 else if(m_pfnThink==static_cast<ThinkFn>(&CBaseEntity::SUB_Remove)) think=5;
 else if(m_pfnThink==static_cast<ThinkFn>(&CBaseEntity::SUB_DoNothing)) think=6;
 if(!m_pfnTouch) touch=0;
 else if(m_pfnTouch==static_cast<TouchFn>(&CBaseButton::ButtonTouch)) touch=1;
 if(!m_pfnUse) use=0;
 else if(m_pfnUse==static_cast<UseFn>(&CBaseButton::ButtonUse)) use=1;
 if(!m_pfnCallWhenMoveDone) move=0;
 else if(m_pfnCallWhenMoveDone==static_cast<MoveFn>(&CBaseButton::TriggerAndWait)) move=1;
 else if(m_pfnCallWhenMoveDone==static_cast<MoveFn>(&CBaseButton::ButtonBackHome)) move=2;
 if(think<0||touch<0||use<0||move<0||m_pfnBlocked) {
  ALERT(at_error,"CoF button: unsupported save callback on %s\n",STRING(pev->classname)); return 0;
 }
 m_iCofButtonCallbacks[0]=think; m_iCofButtonCallbacks[1]=touch;
 m_iCofButtonCallbacks[2]=use; m_iCofButtonCallbacks[3]=move;
 auto savedThink=m_pfnThink; auto savedTouch=m_pfnTouch; auto savedUse=m_pfnUse;
 auto savedMove=m_pfnCallWhenMoveDone;
 m_pfnThink=NULL; m_pfnTouch=NULL; m_pfnUse=NULL; m_pfnCallWhenMoveDone=NULL;
 int status=CBaseToggle::Save(save);
 m_pfnThink=savedThink; m_pfnTouch=savedTouch; m_pfnUse=savedUse; m_pfnCallWhenMoveDone=savedMove;
 if(!status) return 0;
 return save.WriteFields("CBaseButton",this,m_SaveData,ARRAYSIZE(m_SaveData));
}
int CBaseButton::Restore( CRestore &restore )
{
 if(!CBaseToggle::Restore(restore)||!restore.ReadFields("CBaseButton",this,m_SaveData,ARRAYSIZE(m_SaveData))) return 0;
 SetThink(NULL); SetTouch(NULL); SetUse(NULL); SetMoveDone(NULL);
 switch(m_iCofButtonCallbacks[0]) {
 case 1: SetThink(&CBaseButton::ButtonSpark); break;
 case 2: SetThink(&CBaseButton::ButtonReturn); break;
 case 3: SetThink(&CBaseToggle::LinearMoveDone); break;
 case 4: SetThink(&CBaseToggle::AngularMoveDone); break;
 case 5: SetThink(&CBaseEntity::SUB_Remove); break;
 case 6: SetThink(&CBaseEntity::SUB_DoNothing); break;
 }
 if(m_iCofButtonCallbacks[1]==1) SetTouch(&CBaseButton::ButtonTouch);
 if(m_iCofButtonCallbacks[2]==1) SetUse(&CBaseButton::ButtonUse);
 if(m_iCofButtonCallbacks[3]==1) SetMoveDone(&CBaseButton::TriggerAndWait);
 if(m_iCofButtonCallbacks[3]==2) SetMoveDone(&CBaseButton::ButtonBackHome);
 return 1;
}
#else
IMPLEMENT_SAVERESTORE( CBaseButton, CBaseToggle )
#endif