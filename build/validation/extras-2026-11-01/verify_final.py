from pathlib import Path
import json,hashlib,re
p=Path(__file__).resolve().parent
def read(s):return json.loads((p/s).read_text())
main=read('extras-final-isolated-runtime/result.json');assert main['passed'] and len(main['commentaries'])==22 and not main['errors']
assert main['clothesRestored'] and main['nightRestored'] and main['screen']['fullscreen']=='MAIN' and main['screen']['lock'] is None
assert main['postfx']['settings']['nightvision'] and main['postfx']['stats']['msPerFrame']>0
cold=read('persistence-cold/result.json');assert cold['passed'] and not cold['errors'];assert 'nightState=101 ' in cold['coldPending'] and 'nightState=1 ' in cold['coldAfter']
callbacks=read('extended-final/callback_behavior/result.json');assert callbacks['passed'] and callbacks['warningCount']==0 and callbacks['checked']==39 and callbacks['coldChecked']==39 and callbacks['animated']==5
voice=read('extended-final/voice_mix_probe/result.json');assert voice['passed'] and not voice['errors']
interactions=read('interactions-cooldown/result.json');assert interactions['passed'] and not interactions['errors'] and interactions['hrtf'] is False
assert 'origin=-312.0,480.0,177.0' in interactions['afterReload']
assert read('extended-final/use_surface/result.json')['passed']
for r in read('extended-final/persistence/results.json'):assert r['warningCount']==0 and not r['errors'] and r['result']=='OBSERVED'
factory=read('factories-first/result.json');assert len(factory['rows'])==11
for r in factory['rows']:assert set(r['missing'])=={'info_texlights'} and not r['errors']
assert read('start-warning-comparison.json')['classDifference']=={}
for s in ('test_entity_maps','test_envpos_maps','test_padlock_maps'):
 text=(p/f'regressions-final/{s}.log').read_text();assert re.search(r'\bOK\s*$',text),s
summary=(p/'regressions-final.log').read_text();assert summary.count(' PASS')==18 and 'FAIL' not in summary
assert 'OK' in (p/'contracts-final.log').read_text()
source=read('source-verification.json');assert not source['principalDistChanged']
for k,v in interactions['modules'].items():assert source['packagedModules'][k]==v
logs={str(f.relative_to(p)):hashlib.sha256(f.read_bytes()).hexdigest() for f in (p/'regressions-final').glob('*.log')}
result={'status':'verified-core-with-open-limitations','completeNativeEquivalence':False,'fullCampaignOrLongSessionCertified':False,'privateManifest':source['privateManifest'],'head':source['head'],'browser':main['chromium'],'commentaryInstancesPlayed':22,'originalRecordingsVerified':21,'missingModelsRecovered':2,'browserRegressionsPassed':14,'previousBspContractsPassed':9,'extrasBspContractsPassed':2,'pointerLockRegressionPassed':True,'coldPendingNightvisionPassed':True,'callbacksRestored':39,'callbacksRestoredCold':39,'apartment1WarningsAt3And20Seconds':0,'startHistoricalWarnings':50,'startWarningClassDifference':{},'remaining':['native NV VGUI overlay / native view impulse','custom hoodie 12 / native profile import','forced-weapon and overlapping commentary edge cases','8-pack accumulated-runtime performance and fullscreen click investigation','optional phone punch and ammo HUD'],'modules':source['packagedModules'],'principalDistChanged':False,'commitsOrPublicationPerformed':False,'regressionLogHashes':logs}
assert not (p/'verification-final.json').exists();(p/'verification-final.json').write_text(json.dumps(result,indent=2));print('PASS verified core; native equivalence and accumulated-runtime performance remain explicitly unverified')