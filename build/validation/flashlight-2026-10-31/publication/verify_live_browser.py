from pathlib import Path
import json
r=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web/build/validation/flashlight-2026-10-31')
d=json.loads((r/'publication/live-browser/result.json').read_text())
expected=json.loads((r/'module-hashes-view.json').read_text())['view']
assert d['serviceWorkerControlled'] is True
assert d['playwright']=='1.64.1' and d['chromium']=='156.0.8078.4'
assert not d['errors']
for name,digest in d['loadedModules'].items():assert digest==expected[name],name
assert d['wallSpot']['center']['mean']>d['wallOff']['center']['mean']+5
assert abs(d['noDynamic']['center']['mean']-d['wallOff']['center']['mean'])<1
assert abs(d['restoredOn']['center']['mean']-d['wallSpot']['center']['mean'])<1
result={'url':d['base'],'service_worker_controlled':True,'loaded_modules':d['loadedModules'],'wall_off':d['wallOff']['center']['mean'],'wall_on':d['wallSpot']['center']['mean'],'after_restore':d['restoredOn']['center']['mean'],'javascript_errors':d['errors'],'result':'PASS','scope':'Fresh online browser with Service Worker; does not certify offline or upgrade from an existing cache'}
(r/'publication/live-browser-verified.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
