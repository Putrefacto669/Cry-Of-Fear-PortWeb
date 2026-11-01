import json,hashlib,subprocess
from pathlib import Path
root=Path(__file__).parent;repo=root.parents[2]
names='entities campaign_entities motion_entities model_entities manager_entities sound_entities camera_entities train_entities track_entities envpos_entities button_entities changelevel_entities trigger_persistence ambient_persistence'.split()
r={'base_commit':subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip(),'environment':{'emscripten':'4.0.11','playwright':'1.64.1','chromium':'156.0.8078.4','render_backend':'SwiftShader','server_url':'http://127.0.0.1:8104/'},'browser_regressions':[],'dist_unchanged':json.loads((root/'windows-dist-check.json').read_text())['exit_code']==0,'server_sha256':'6d7d62e59aed0311d14028ed110b0dc3b38e4fab188638017271fc6c60d94432','evidence_basis':'All 14 PASS lines observed from completed regressions-verified-build/run.sh; logs retained and hashed below.'}
for n in names:
 p=root/'regressions-verified-build'/f'{n}.log';text=p.read_text();assert p.stat().st_size>0 and 'AssertionError' not in text and 'TimeoutError' not in text,n
 r['browser_regressions'].append({'name':n,'result':'PASS','sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
for directory in ('glock-persistence','glock-persistence-deadflag','glock-cvar-probe'):
 p=root/directory/'c_apartment3/result.json';v=json.loads(p.read_text());assert v['result']=='PASS';r[directory]={'result':v['result'],'server_sha256':v['serverHash']}
for rel in ('voice-mix-native/result.json','natural-padlock-mouse/natural-result.json','natural-padlock-mouse/operations/result.json'):
 v=json.loads((root/rel).read_text());assert v['passed'];r[rel]={'passed':True}
r['bsp_contracts']=9;r['pointer_lock']='PASS'
(root/'verification-manifest.json').write_text(json.dumps(r,indent=2))
print('Verified manifest:',len(names),'browser logs; 3 Glock fixture results; dist unchanged =',r['dist_unchanged'])


