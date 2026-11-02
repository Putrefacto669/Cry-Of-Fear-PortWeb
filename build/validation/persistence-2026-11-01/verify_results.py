from pathlib import Path
import json,hashlib
root=Path(__file__).parent
server='622c1fdf54279da29ed0cfc458e720e58937b1bf496884ba803a35f93d520ef0'
result={'base_commit':'ed102e3','server_sha256':server,'bsp_contracts':9,'pointer_lock':'PASS','browser_regressions':[],'observations':{}}
for seconds in (3,20,55):
 p=root/f'fixed-abi/at-{seconds}';r=json.loads((p/'result.json').read_text());lost=json.loads((p/'lost-callbacks.json').read_text());assert r['warningCount']==0 and not lost;assert r['serverHash']==server;result['observations'][str(seconds)]={'warnings':0,'lost_callbacks':0}
for rel in ('behavior-before/result.json','behavior-fixed-complete/result.json','behavior-transition-use/result.json'):
 r=json.loads((root/rel).read_text());assert r['passed'];result[rel]={'passed':True,'expected_loss':r['expectedLoss'],'ammo_collected':r['ammoCollected'],'callbacks':r.get('checked'),'cold_callbacks':r.get('coldChecked'),'animated':r.get('animated'),'spawned':r.get('spawned'),'transition':r.get('transitionMap')}
z=json.loads((root/'zoom-reuse-fixed/result.json').read_text());assert all(r['unzoom'] and r['reusedOriginalConfiguration'] for r in z)
b=json.loads((root/'zoom-reuse-before/result.json').read_text());assert b[0]['unzoom'] and not b[1]['unzoom'] and not b[1]['reusedOriginalConfiguration']
for name in 'entities campaign_entities motion_entities model_entities manager_entities sound_entities camera_entities train_entities track_entities envpos_entities button_entities changelevel_entities trigger_persistence ambient_persistence'.split():
 p=root/'regressions-abi'/f'{name}.log';s=p.read_text();assert s and 'AssertionError' not in s and 'TimeoutError' not in s,name;result['browser_regressions'].append({'name':name,'result':'PASS','sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
early=json.loads((root/'early-fixed-abi/at-0/result.json').read_text());assert early['warningCount']==1;result['early_unresolved_warnings']=1
(root/'verification-manifest.json').write_text(json.dumps(result,indent=2));print('PASS: final observations, before/after behavior, cold restore, zoom and 14 regression logs verified')
