"""Verify the frozen candidate and preserve the final validation inventory (private assets stay in WSL)."""
import hashlib,json,re,shutil,subprocess
from pathlib import Path

out=Path(__file__).parent
repo=out.parents[2]
proof=json.loads((out/'candidate.json').read_text())
candidate=Path(proof['candidate'])
manifest=json.loads(re.search(r'=\s*(\{[\s\S]*\});',(candidate/'sw-manifest.js').read_text())[1])
for path,digest in manifest['files'].items():
    assert hashlib.sha256((candidate/path).read_bytes()).hexdigest()[:12]==digest,path
results={}
for name in ('clock-backwards','fog','hud','clothes-chromium','clothes-firefox','grey','linear-fog'):
    value=json.loads((out/name/'result.json').read_text())
    assert value['passed'],name
    assert not value.get('errors'),name
    for module,digest in value.get('modules',{}).items():
        assert proof['modules'][module]==digest,(name,module)
    results[name]={'passed':True,'browser':value.get('browser')}
suite=json.loads((out/'suite-provenance.json').read_text())
assert len(suite['suites'])==18 and suite['all18ContractsUnchanged']
assert all(row['exitCode']==0 for row in suite['suites'].values())
assert 'Ran 11 tests' in (out/'maps-final.log').read_text()
assert (out/'maps-final.log').read_text().strip().endswith('OK')
assert (out/'lightmaps-cof-unittest.log').read_text().strip().endswith('OK')
source={name:hashlib.sha256((repo/name).read_bytes()).hexdigest()==digest for name,digest in proof['sourceFingerprints'].items()}
assert all(ok for name,ok in source.items() if name!='CLAUDE.md'),source
flash=Path('/root/cof-audits/claude-launcher/flash-fiel-154708')
if flash.exists() and not (out/'flashlight-existing').exists():
    shutil.copytree(flash,out/'flashlight-existing',ignore=shutil.ignore_patterns('*.sav','*.hl1','*.hl2','*.hl3'))
    shutil.copy2(str(flash)+'.log',out/'flashlight-existing.log')
result={'manifest':manifest['version'],'allManifestFilesValid':True,'resourceCount':len(manifest['files']),
        'existingSuite':{'passed':18,'failed':0,'contractsUnchanged':True},'complements':results,
        'bspContracts':{'passed':11,'skipped':0},'cofLightingFixtures':11,'sourceUnchanged':source,
        'headAtClosure':subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip(),
        'distributionNote':'Concurrent Claude work updated/committed dist; Codex did not write dist or run Git mutations.'}
(out/'final-summary.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
