from pathlib import Path
import subprocess,re
p=Path('/root/cof-audits/audit-D3Kl5uly/game/hlsdk-portable/dlls/cbase.cpp');s=p.read_text();Path('build/validation/continuation-2026-10-31/cbase-before-customize.cpp.txt').write_text(s)
needle='\tEntvarsKeyvalue( VARS( pentKeyvalue ), pkvd );';assert s.count(needle)==1
insert='''\t// env_customize uses these keys as target overrides, including explicit 0
\t// and -1 (leave unchanged), rather than as its own drawable entvars.
\tif( ( ( pkvd->szClassName && FStrEq( pkvd->szClassName, "env_customize" )) ||
\t\tFClassnameIs( VARS( pentKeyvalue ), "env_customize" )) &&
\t\t( FStrEq( pkvd->szKeyName, "body" ) || FStrEq( pkvd->szKeyName, "skin" )))
\t{
\t\tCBaseEntity *custom = (CBaseEntity *)GET_PRIVATE( pentKeyvalue );
\t\tif( custom )
\t\t{
\t\t\tcustom->KeyValue( pkvd );
\t\t\tif( pkvd->fHandled ) return;
\t\t}
\t}

'''
s=s.replace(needle,insert+needle,1);p.write_text(s)
p=Path('patches/hlsdk/0001-root.patch');s=p.read_text();f='dlls/cbase.cpp';d=subprocess.check_output(['git','-C','/root/cof-audits/audit-D3Kl5uly/game/hlsdk-portable','diff','--',f],text=True);pat=r'diff --git a/'+re.escape(f)+r' b/'+re.escape(f)+r'\n[\s\S]*?(?=diff --git |\Z)';assert len(re.findall(pat,s))==1;p.write_text(re.sub(pat,lambda _:d,s))
