from pathlib import Path
import subprocess,re
p=Path('/root/cof-audits/audit-D3Kl5uly/game/hlsdk-portable/dlls/player.cpp');s=p.read_text();Path('build/validation/continuation-2026-10-31/player-before.cpp.txt').write_text(s)
s=s.replace('#include "extdll.h"','#include "extdll.h"\n#include <float.h>',1)
start=s.index('\t\t\t// Coincident usable brushes');end=s.index('\n\t\t\t{\n\t\t\t\t// only if the item',start)
s=s[:start]+'''\t\t\t// Coincident surfaces can differ by one float rounding step after
\t\t\t// normalization. Resolve only that near-tie by the first actual hit.
\t\t\tBOOL preferObject = flDot > flMaxDot;
\t\t\tif( pClosest && fabs( flDot - flMaxDot ) <= 2.0f * FLT_EPSILON )
\t\t\t{
\t\t\t\tTraceResult useTrace;
\t\t\t\tVector eyes = pev->origin + pev->view_ofs;
\t\t\t\tUTIL_TraceLine( eyes, eyes + gpGlobals->v_forward * PLAYER_SEARCH_RADIUS, dont_ignore_monsters, edict(), &useTrace );
\t\t\t\tif( useTrace.pHit == pObject->edict() ) preferObject = TRUE;
\t\t\t\telse if( useTrace.pHit == pClosest->edict() ) preferObject = FALSE;
\t\t\t}
\t\t\tif( preferObject )'''+s[end:];p.write_text(s)
p=Path('patches/hlsdk/0001-root.patch');s=p.read_text();f='dlls/player.cpp';d=subprocess.check_output(['git','-C','/root/cof-audits/audit-D3Kl5uly/game/hlsdk-portable','diff','--',f],text=True);pattern=r'diff --git a/'+re.escape(f)+r' b/'+re.escape(f)+r'\n[\s\S]*?(?=diff --git |\Z)';assert len(re.findall(pattern,s))==1;p.write_text(re.sub(pattern,lambda _:d,s))
# Add an unmodified native checkpoint before the first padlock interaction.
p=Path('/root/cof-audits/continuation-20261031/fixed-run/padlock_progression.mjs');s=p.read_text();s=s.replace('map:"c_start2",source:"normal-input traversal"','map:await page.evaluate(()=>CoFCurrentMap()),source:"normal-input traversal"')
s=s.replace('await turn(270);await command("cof_useaim !player");await use();','await turn(270);await checkpoint("natural_gate",{});await command("cof_useaim !player");await use();',1);p.write_text(s);Path('build/validation/continuation-2026-10-31/fixed_progression_3.mjs').write_text(s)
