from pathlib import Path
import subprocess,re
p=Path('/root/cof-audits/audit-D3Kl5uly/game/hlsdk-portable/dlls/sound.cpp');s=p.read_text();Path('build/validation/continuation-2026-10-31/sound-before.cpp.txt').write_text(s)
needle='\tBOOL m_fLooping;\t// TRUE when the sound played will loop\n';assert needle in s
s=s.replace(needle,needle+'#ifdef __EMSCRIPTEN__\n int m_iCofCallbacks[2];\n#endif\n',1)
needle='TYPEDESCRIPTION\tCAmbientGeneric::m_SaveData[] =\n{';assert needle in s
s=s.replace(needle,needle+'\n#ifdef __EMSCRIPTEN__\n DEFINE_ARRAY(CAmbientGeneric,m_iCofCallbacks,FIELD_INTEGER,2),\n#endif',1)
s=s.replace('IMPLEMENT_SAVERESTORE( CAmbientGeneric, CBaseEntity )','''#ifdef __EMSCRIPTEN__
int CAmbientGeneric::Save(CSave &save)
{
 // FIELD_FUNCTION cannot name SIDE_MODULE member callbacks. Keep the original
 // modulation/state fields intact and save callback identities separately.
 m_iCofCallbacks[0]=0;
 if(m_pfnThink==static_cast<void(CBaseEntity::*)(void)>(&CAmbientGeneric::RampThink))m_iCofCallbacks[0]=1;
 else if(m_pfnThink==&CBaseEntity::SUB_Remove)m_iCofCallbacks[0]=2;
 else if(m_pfnThink){ALERT(at_error,"ambient_generic: unknown Think on save\\n");return 0;}
 m_iCofCallbacks[1]=m_pfnUse?1:0;
 if((m_pfnUse&&m_pfnUse!=static_cast<void(CBaseEntity::*)(CBaseEntity *,CBaseEntity *,USE_TYPE,float)>(&CAmbientGeneric::ToggleUse))||m_pfnTouch||m_pfnBlocked)
 {ALERT(at_error,"ambient_generic: unknown callback on save\\n");return 0;}
 auto think=m_pfnThink;auto use=m_pfnUse;
 m_pfnThink=NULL;m_pfnUse=NULL;
 int status=CBaseEntity::Save(save);
 m_pfnThink=think;m_pfnUse=use;
 if(!status)return 0;
 return save.WriteFields("CAmbientGeneric",this,m_SaveData,ARRAYSIZE(m_SaveData));
}
int CAmbientGeneric::Restore(CRestore &restore)
{
 if(!CBaseEntity::Restore(restore)||!restore.ReadFields("CAmbientGeneric",this,m_SaveData,ARRAYSIZE(m_SaveData)))return 0;
 if(m_iCofCallbacks[0]<0||m_iCofCallbacks[0]>2||m_iCofCallbacks[1]<0||m_iCofCallbacks[1]>1)return 0;
 SetThink(NULL);SetUse(NULL);
 if(m_iCofCallbacks[0]==1)SetThink(&CAmbientGeneric::RampThink);
 else if(m_iCofCallbacks[0]==2)SetThink(&CBaseEntity::SUB_Remove);
 if(m_iCofCallbacks[1])SetUse(&CAmbientGeneric::ToggleUse);
 return 1;
}
#else
IMPLEMENT_SAVERESTORE( CAmbientGeneric, CBaseEntity )
#endif''',1);p.write_text(s)
p=Path('patches/hlsdk/0001-root.patch');s=p.read_text();f='dlls/sound.cpp';d=subprocess.check_output(['git','-C','/root/cof-audits/audit-D3Kl5uly/game/hlsdk-portable','diff','--',f],text=True)
pattern=r'diff --git a/'+re.escape(f)+r' b/'+re.escape(f)+r'\n[\s\S]*?(?=diff --git |\Z)'
assert not re.search(pattern,s);p.write_text(s+d)
