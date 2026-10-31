from pathlib import Path
p=Path('/root/cof-audits/audit-D3Kl5uly/game/hlsdk-portable/dlls/triggers.cpp')
s=p.read_text();old='class CTriggerMultiple : public CBaseTrigger\n{\npublic:\n\tvoid Spawn( void );\n};'
new='''class CTriggerMultiple : public CBaseTrigger
{
public:
 void Spawn( void );
#ifdef __EMSCRIPTEN__
 int Save( CSave &save );
 int Restore( CRestore &restore );
 static TYPEDESCRIPTION m_SaveData[];
 int m_iCofCallbacks[2];
#endif
};

#ifdef __EMSCRIPTEN__
TYPEDESCRIPTION CTriggerMultiple::m_SaveData[] =
{
 DEFINE_ARRAY( CTriggerMultiple, m_iCofCallbacks, FIELD_INTEGER, 2 ),
};

int CTriggerMultiple::Save( CSave &save )
{
 // Preserve callback identity without FIELD_FUNCTION's unavailable WASM names.
 // Keep idle, reset-wait and pending removal distinct; never call Spawn on load.
 m_iCofCallbacks[0] = 0;
 if( m_pfnThink == static_cast<void (CBaseEntity::*)(void)>(&CBaseTrigger::MultiWaitOver) ) m_iCofCallbacks[0] = 1;
 else if( m_pfnThink == &CBaseEntity::SUB_Remove ) m_iCofCallbacks[0] = 2;
 else if( m_pfnThink ) { ALERT(at_error,"trigger_multiple: unknown Think on save\\n"); return 0; }
 m_iCofCallbacks[1] = m_pfnTouch ? 1 : 0;
 if( (m_pfnTouch && m_pfnTouch != static_cast<void (CBaseEntity::*)(CBaseEntity *)>(&CBaseTrigger::MultiTouch)) || m_pfnUse || m_pfnBlocked || m_pfnCallWhenMoveDone )
 { ALERT(at_error,"trigger_multiple: unknown callback on save\\n"); return 0; }
 auto think = m_pfnThink;
 auto touch = m_pfnTouch;
 m_pfnThink = NULL; m_pfnTouch = NULL;
 int status = CBaseTrigger::Save(save);
 m_pfnThink = think; m_pfnTouch = touch;
 if( !status ) return 0;
 return save.WriteFields("CTriggerMultiple",this,m_SaveData,ARRAYSIZE(m_SaveData));
}

int CTriggerMultiple::Restore( CRestore &restore )
{
 if( !CBaseTrigger::Restore(restore) || !restore.ReadFields("CTriggerMultiple",this,m_SaveData,ARRAYSIZE(m_SaveData)) ) return 0;
 if( m_iCofCallbacks[0] < 0 || m_iCofCallbacks[0] > 2 || m_iCofCallbacks[1] < 0 || m_iCofCallbacks[1] > 1 ) return 0;
 SetThink(NULL); SetTouch(NULL);
 if( m_iCofCallbacks[0] == 1 ) SetThink(&CBaseTrigger::MultiWaitOver);
 else if( m_iCofCallbacks[0] == 2 ) SetThink(&CBaseEntity::SUB_Remove);
 if( m_iCofCallbacks[1] ) SetTouch(&CBaseTrigger::MultiTouch);
 return 1;
}
#endif'''
assert old in s
backup=Path('build/validation/continuation-2026-10-31/triggers-before.cpp.txt');assert not backup.exists();backup.write_text(s)
p.write_text(s.replace(old,new,1))
