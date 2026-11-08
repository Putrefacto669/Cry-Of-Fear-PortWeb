from pathlib import Path
import difflib,shutil,subprocess,sys
repo=Path(__file__).resolve().parents[3]
private=Path('/root/cof-audits/visual-clothes-20261107')
sdk=private/'game/hlsdk-portable';sdk.parent.mkdir(parents=True,exist_ok=True)
if '--repair-hook' not in sys.argv:
    assert not sdk.exists()
    subprocess.run(['git','clone','--quiet','--shared','--no-hardlinks','/root/cof-audits/ammo-hud-20261104/game/hlsdk-portable',str(sdk)],check=True)
    for name in ['0001-root.patch','0002-root.patch']:subprocess.run(['git','-C',str(sdk),'apply','--whitespace=nowarn',str(repo/'patches/hlsdk'/name)],check=True)
    shutil.copytree('/root/cof-audits/ammo-hud-20261104/game/hlsdk-portable/freevgui',sdk/'freevgui',dirs_exist_ok=True,ignore=shutil.ignore_patterns('.git'))
p=sdk/'cl_dll/hud_redraw.cpp';old=subprocess.check_output(['git','-C',str(sdk),'show','HEAD:cl_dll/hud_redraw.cpp']).decode()
new=old.replace('int CHud::Redraw( float flTime, int intermission )','extern void CoF_DrawOriginalNoise();\n\nint CHud::Redraw( float flTime, int intermission )')
prefix,redraw=new.split('int CHud::Redraw( float flTime, int intermission )',1)
redraw=redraw.replace('\t\tHUDLIST *pList = m_pHudList;','\t\tif(!intermission && !(m_iHideHUDDisplay & HIDEHUD_ALL))CoF_DrawOriginalNoise();\n\t\tHUDLIST *pList = m_pHudList;',1)
new=prefix+'int CHud::Redraw( float flTime, int intermission )'+redraw
assert new!=old;p.write_text(new)
patch='diff --git a/cl_dll/hud_redraw.cpp b/cl_dll/hud_redraw.cpp\n'+''.join(difflib.unified_diff(old.splitlines(True),new.splitlines(True),fromfile='a/cl_dll/hud_redraw.cpp',tofile='b/cl_dll/hud_redraw.cpp'))
(repo/'patches/hlsdk/0003-root.patch').write_text(patch)
subprocess.run(['git','-C',str(sdk),'apply','--reverse','--check',str(repo/'patches/hlsdk/0003-root.patch')],check=True)
print('Prepared isolated SDK and verified noise hook patch')
