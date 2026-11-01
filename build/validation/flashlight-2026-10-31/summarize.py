import json,statistics,re
from pathlib import Path
r=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web/build/validation/flashlight-2026-10-31')
cases=['claude-wall90','index-wall90','view-wall90','index-wall90-delay160','view-wall90-delay160','view-overbright0','view-repeat']
out={}
for name in cases:
 p=r/name/'result.json'
 if not p.exists():continue
 d=json.loads(p.read_text(encoding='utf-8-sig'))
 def pose(s):
  m=re.search(r'org \(\s*([^)]+)\).*?ang \(\s*([^)]+)\)',s,re.S)
  return [float(v) for group in m.groups() for v in group.split()]
 base=pose(d['wallOff']['pose'])
 for key in ['wallSpot','noDynamic','dynamicAgain','wallOffAgain']:
  assert max(abs(a-b) for a,b in zip(base,pose(d[key]['pose'])))<.001,(name,key)
  assert d[key]['glError']==0
 assert not d['errors']
 out[name]={key:round(d[key]['center']['mean'],6) for key in ['wallOff','wallSpot','noDynamic','dynamicAgain','wallOffAgain']}
 out[name]['gain']=round(out[name]['wallSpot']-out[name]['wallOff'],6)
 out[name]['pose']=base
 if 'frameIntervals' in d['wallSpot']:
  out[name]['median_mainloop_ms']=round(statistics.median(d['wallSpot']['frameIntervals']),3)
 if 'restoredOn' in d:
  out[name]['restoredOn']=round(d['restoredOn']['center']['mean'],6)
  assert abs(out[name]['restoredOn']-out[name]['wallSpot'])<1
 assert abs(out[name]['noDynamic']-out[name]['wallOff'])<1
 assert abs(out[name]['wallOffAgain']-out[name]['wallOff'])<1
assert abs(out['claude-wall90']['gain'])<1
assert out['index-wall90']['gain']>5
assert out['index-wall90-delay160']['gain']==0
assert out['view-wall90-delay160']['gain']>5
assert out['view-wall90-delay160']['median_mainloop_ms']>160
(r/'graphics-summary.json').write_text(json.dumps(out,indent=2))
print(json.dumps(out,indent=2))
