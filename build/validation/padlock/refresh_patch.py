import pathlib,re,subprocess
root=pathlib.Path.cwd()
for patch,repo,files in [('patches/hlsdk/0001-root.patch','/root/cof-audits/audit-D3Kl5uly/game/hlsdk-portable',['dlls/player.h','dlls/player.cpp','dlls/buttons.cpp','dlls/cbase.h','dlls/cbase.cpp','dlls/triggers.cpp']),('patches/xash3d/0001-root.patch','/root/cof-audits/audit-D3Kl5uly/engine/xash3d-fwgs',['ref/gl/gl_rmain.c'])]:
 p=root/patch;s=p.read_text()
 for f in files:
  d=subprocess.check_output(['git','-C',repo,'diff','--',f],text=True)
  pattern=r'diff --git a/'+re.escape(f)+r' b/'+re.escape(f)+r'\n[\s\S]*?(?=diff --git |\Z)'
  if not re.search(pattern,s): s+=d; continue
  s=re.sub(pattern,lambda _:d,s)
 p.write_text(s)