from pathlib import Path
root=Path('/root/cof-audits/audit-D3Kl5uly/game/hlsdk-portable/dlls');out=Path('build/validation/continuation-2026-10-31')
p=root/'doors.cpp';s=p.read_text();(out/'doors-before.cpp.txt').write_text(s)
s=s.replace('\tBYTE m_bHealthValue;', '#ifdef __EMSCRIPTEN__\n int m_iCofCallbacks[4];\n#endif\n\tBYTE m_bHealthValue;',1)
s=s.replace('TYPEDESCRIPTION\tCBaseDoor::m_SaveData[] =\n{','TYPEDESCRIPTION\tCBaseDoor::m_SaveData[] =\n{\n#ifdef __EMSCRIPTEN__\n DEFINE_ARRAY(CBaseDoor,m_iCofCallbacks,FIELD_INTEGER,4),\n#endif',1)
s=s.replace('IMPLEMENT_SAVERESTORE( CBaseDoor, CBaseToggle )','''#ifdef __EMSCRIPTEN__
// DispatchSave calls this before translating the pusher's local clock.
void CoF_PrepareDoorSave(CBaseEntity *entity,int clock)
{
 static_cast<CBaseDoor *>(entity)->m_iCofCallbacks[3]=clock;
}
int CBaseDoor::Save(CSave &save)
{
 m_iCofCallbacks[0]=0;
 if(m_pfnThink==static_cast<void(CBaseEntity::*)(void)>(&CBaseDoor::DoorGoDown)) m_iCofCallbacks[0]=1;
 else if(m_pfnThink==static_cast<void(CBaseEntity::*)(void)>(&CBaseToggle::LinearMoveDone)) m_iCofCallbacks[0]=2;
 else if(m_pfnThink==static_cast<void(CBaseEntity::*)(void)>(&CBaseToggle::AngularMoveDone)) m_iCofCallbacks[0]=3;
 else if(m_pfnThink==&CBaseEntity::SUB_Remove) m_iCofCallbacks[0]=4;
 else if(m_pfnThink) {ALERT(at_error,"door: unknown Think on save\\n");return 0;}
 m_iCofCallbacks[1]=m_pfnTouch?1:0;
 if((m_pfnTouch&&m_pfnTouch!=static_cast<void(CBaseEntity::*)(CBaseEntity *)>(&CBaseDoor::DoorTouch))||m_pfnUse||m_pfnBlocked)
 {ALERT(at_error,"door: unknown callback on save\\n");return 0;}
 m_iCofCallbacks[2]=0;
 if(m_pfnCallWhenMoveDone==static_cast<void(CBaseToggle::*)(void)>(&CBaseDoor::DoorHitTop)) m_iCofCallbacks[2]=1;
 else if(m_pfnCallWhenMoveDone==static_cast<void(CBaseToggle::*)(void)>(&CBaseDoor::DoorHitBottom)) m_iCofCallbacks[2]=2;
 else if(m_pfnCallWhenMoveDone) {ALERT(at_error,"door: unknown MoveDone on save\\n");return 0;}
 auto think=m_pfnThink;auto touch=m_pfnTouch;auto done=m_pfnCallWhenMoveDone;
 m_pfnThink=NULL;m_pfnTouch=NULL;m_pfnCallWhenMoveDone=NULL;
 int status=CBaseToggle::Save(save);
 m_pfnThink=think;m_pfnTouch=touch;m_pfnCallWhenMoveDone=done;
 if(!status)return 0;
 return save.WriteFields("CBaseDoor",this,m_SaveData,ARRAYSIZE(m_SaveData));
}
int CBaseDoor::Restore(CRestore &restore)
{
 if(!CBaseToggle::Restore(restore)||!restore.ReadFields("CBaseDoor",this,m_SaveData,ARRAYSIZE(m_SaveData)))return 0;
 if(m_iCofCallbacks[0]<0||m_iCofCallbacks[0]>4||m_iCofCallbacks[1]<0||m_iCofCallbacks[1]>1||m_iCofCallbacks[2]<0||m_iCofCallbacks[2]>2||m_iCofCallbacks[3]<0||m_iCofCallbacks[3]>2)return 0;
 SetThink(NULL);SetTouch(NULL);SetMoveDone(NULL);
 switch(m_iCofCallbacks[0]) {
 case 1:SetThink(&CBaseDoor::DoorGoDown);break;
 case 2:SetThink(&CBaseToggle::LinearMoveDone);break;
 case 3:SetThink(&CBaseToggle::AngularMoveDone);break;
 case 4:SetThink(&CBaseEntity::SUB_Remove);break;
 }
 if(m_iCofCallbacks[1])SetTouch(&CBaseDoor::DoorTouch);
 if(m_iCofCallbacks[2]==1)SetMoveDone(&CBaseDoor::DoorHitTop);
 else if(m_iCofCallbacks[2]==2)SetMoveDone(&CBaseDoor::DoorHitBottom);
 if(m_iCofCallbacks[3])pev->nextthink=m_iCofCallbacks[3]==1?0:-1;
 return 1;
}
#else
IMPLEMENT_SAVERESTORE( CBaseDoor, CBaseToggle )
#endif''',1)
start=s.index('// Cry of Fear: the door of the padlock (chapter 1)');end=s.index('void CBaseDoor::Use',start);s=s[:start]+s[end:]
start=s.index('\tif( !g_cofDoorSceneDone');end=s.index('\t// if not ready to be used',start);s=s[:start]+s[end:];p.write_text(s)
p=root/'cbase.cpp';s=p.read_text();(out/'cbase-before.cpp.txt').write_text(s)
needle='        int buttonIdleThink=0;';assert needle in s
s=s.replace(needle,'''        int doorIdleThink=0;
        if(FClassnameIs(pEntity->pev,"func_door")||FClassnameIs(pEntity->pev,"func_door_rotating")) {
            extern void CoF_PrepareDoorSave(CBaseEntity *,int);
            doorIdleThink=pEntity->pev->nextthink==0?1:pEntity->pev->nextthink==-1?2:0;
            CoF_PrepareDoorSave(pEntity,doorIdleThink);
        }
'''+needle,1)
s=s.replace('            if(buttonIdleThink) pEntity->pev->nextthink=buttonIdleThink==1?0:-1;','            if(buttonIdleThink) pEntity->pev->nextthink=buttonIdleThink==1?0:-1;\n            if(doorIdleThink) pEntity->pev->nextthink=doorIdleThink==1?0:-1;',1);p.write_text(s)
