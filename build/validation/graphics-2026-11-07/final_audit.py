"""Read-only release separation, source/asset integrity and actual test outcomes."""
import ast,gzip,hashlib,json,re,subprocess,sys
from pathlib import Path
repo=Path(__file__).resolve().parents[3];out=Path(__file__).parent;work=Path('/root/cof-audits/graphics-20261107')
output=out/(sys.argv[1] if len(sys.argv)>1 else 'final-audit.json')
windows_input=out/(sys.argv[2] if len(sys.argv)>2 else 'windows-check.json')
assert output.resolve().parent==out.resolve() and not output.exists(),'Preserve previous verification results'
proof=json.loads((out/'candidate-linear-fog.json').read_text());candidate=Path(proof['path'])
manifest=json.loads(re.search(r'=\s*(\{[\s\S]*\});',(candidate/'sw-manifest.js').read_text())[1]);sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert proof['manifest']==manifest['version']=='66cf767ece53'
for name,rev in manifest['files'].items():assert sha(candidate/name)[:12]==rev,name
for name in manifest['gz']:assert gzip.decompress((candidate/(name+'.gz')).read_bytes())==(candidate/name).read_bytes()
prior=Path('/root/cof-audits/visual-clothes-20261107/candidate-release')
preserved=['xash3d.js','xash3d.wasm','packs/boot.data','packs/extras.data']+[p.relative_to(candidate).as_posix() for p in (candidate/'packs').glob('map_*.data')]
for name in preserved:assert sha(candidate/name)==sha(prior/name),name
original=Path('/mnt/c/Program Files (x86)/Steam/steamapps/common/Cry of Fear/cryoffear')
baseline=json.loads((repo/'build/validation/visual-clothes-2026-11-07/baseline.json').read_text());dlls={n:sha(original/'cl_dlls'/n) for n in baseline['originalDLLs']};assert dlls==baseline['originalDLLs']
coverage=json.loads((out/'material-coverage-final.json').read_text())
for name,row in coverage['maps'].items():assert sha(original/'maps'/f'{name}.bsp')==row['bspSHA256']
sys.path.insert(0,str(repo/'tools'));from stage_map import read_entities
entities=read_entities(original/'maps/c_start.bsp');assert sum(e.get('targetname')=='multiscene1' for e in entities)==4
checks={}
for name in ['grey-weights-compiled','linear-fog-compiled','fog-entities-800','scenes-before-800','scenes-candidate-800','scenes-linear-800','postfx-state','hud-css','noise','clothes-final-chromium','clothes-final-firefox-repeat','voice-repeat']:
 r=json.loads((out/name/'result.json').read_text());assert r['passed'],name;checks[name]='PASS'
for name in ['scenes-before-800','scenes-candidate-800','scenes-linear-800']:
 r=json.loads((out/name/'result.json').read_text());assert len(r['scenes'])==6
 for scene in r['scenes']:
  for frame in scene['snapshots']:assert frame['canvas']==[800,600]
gray=json.loads((out/'regressions/summary.json').read_text());linear=json.loads((out/'regressions-linear/summary.json').read_text());assert len(gray)==18 and all(r['exitCode']==0 for r in gray);assert len(linear)==18
failed=[r['suite'] for r in linear if r['exitCode']];assert failed==['voice_mix_probe'];assert json.loads((out/'voice-repeat/result.json').read_text())['passed']
runtime=json.loads((out/'fog-entities-800/result.json').read_text())['modules']
for name,value in runtime.items():assert value==proof['modules'][name]
engine=work/'engine/xash3d-fwgs';patch=repo/'patches/xash3d/0004-root.patch';assert patch.name.split('-',1)[1]=='root.patch'
subprocess.run(['git','-C',str(engine),'apply','--reverse','--check',str(patch)],check=True)
node='/root/emsdk/node/24.19.0_64bit/bin/node'
for name in ['grey_weights.mjs','linear_fog.mjs','fog_entities.mjs','visual_scenes.mjs','clothes_release.mjs']:subprocess.run([node,'--check',str(repo/'tools/e2e'/name)],check=True)
for p in [repo/'tools/audit_graphics.py']+list(out.glob('*.py')):ast.parse(p.read_text(encoding='utf-8-sig'))
windows=json.loads(windows_input.read_text(encoding='utf-8-sig'));assert not windows['distDiff'] and windows['sourceCheck']==0
result={'manifest':manifest['version'],'verifiedResources':len(manifest['files']),'verifiedGzip':len(manifest['gz']),'preservedEngineAndDataFiles':preserved,'originalDLLs':dlls,'originalBSPsIdentical':5,'multiscene1':4,'checks':checks,'grayRegressions':{'firstRunPassed':18},'linearRegressions':{'firstRunPassed':17,'firstRunFailed':failed,'voiceRepeat':'PASS'},'startupIntermittenceCause':'unknown, failures retained','runtimeModules':runtime,'windowsGit':windows,'patchAppliesToCompiledSource':True,'nativeMatchedScenePairs':False}
output.write_text(json.dumps(result,indent=2));print('PASS integrity and documented test outcomes; initial startup failures remain recorded, not resolved')
