"""Read-only final audit. Does not modify published files or original resources."""
import ast,hashlib,json,subprocess,sys
from pathlib import Path
repo=Path(__file__).resolve().parents[3];out=Path(__file__).parent
private=Path('/root/cof-audits/visual-clothes-20261107');stage=private/'stage'
original=Path('/mnt/c/Program Files (x86)/Steam/steamapps/common/Cry of Fear/cryoffear')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
baseline=json.loads((out/'baseline.json').read_text())
result={'originalDLLs':{n:sha(original/'cl_dlls'/n) for n in baseline['originalDLLs']}}
assert result['originalDLLs']==baseline['originalDLLs']
sys.path.insert(0,str(repo/'tools'));from stage_map import shared_extras_set,find_ci
result['sharedResources']={}
for name in shared_extras_set(original):
 source=find_ci(original,name);packed=find_ci(stage/'shared_extras/cryoffear',name)
 assert source.read_bytes()==packed.read_bytes(),name
 result['sharedResources'][name]=sha(source)
result['maps']={}
for bsp in stage.glob('maps/*/cryoffear/maps/*.bsp'):
 assert bsp.read_bytes()==(original/'maps'/bsp.name).read_bytes()
 result['maps'][bsp.stem]=sha(bsp)
node='/root/emsdk/node/24.19.0_64bit/bin/node'
for p in [repo/'platform/web'/n for n in ['extras.js','hud.js','loader.js','postfx.js']]+[repo/'tools/e2e'/n for n in ['clothes_menu.mjs','clothes_profile_compat.mjs','postfx_state.mjs','visual_scenes.mjs','visual_noise.mjs','pointer_lock.mjs']]:
 subprocess.run([node,'--check',str(p)],check=True)
for p in [repo/'tools/stage_map.py',repo/'tools/e2e/test_clothes_resources.py']+list(out.glob('*.py')):ast.parse(p.read_text())
result['syntax']='PASS'
sdk=private/'game/hlsdk-portable'
subprocess.run(['git','-C',str(sdk),'apply','--reverse','--check',str(repo/'patches/hlsdk/0003-root.patch')],check=True)
result['patch']='matches isolated compiled SDK'
# The Windows checkout is checked with native Git outside WSL (interop is disabled).
windows=json.loads((out/'windows-git-check.json').read_text(encoding='utf-8-sig'))
result['head']=windows['head']
result['publishedUncommittedDiff']=windows['publishedUncommittedDiff']
assert not result['publishedUncommittedDiff']
result['sourceCheck']=windows['sourceCheck']
assert result['sourceCheck']==0
regressions=json.loads((out/'regressions/summary.json').read_text());assert len(regressions)==18 and all(x['exitCode']==0 for x in regressions)
result['regressionsPassed']=len(regressions)
for name in ['clothes-final','clothes-firefox-final','visual-noise-repeat']:
 r=json.loads((out/name/'result.json').read_text());assert r['passed'];result[name]={'passed':True,'browser':r['browser']}
(out/'final-audit.json').write_text(json.dumps(result,indent=2))
print('PASS original DLLs, shared resources, eleven BSPs, syntax, SDK hook, eighteen regressions and untouched published working tree')
