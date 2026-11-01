import json,statistics
from pathlib import Path
root=Path(__file__).parent
rows=[]
for i in range(1,6):
 p=root/('lighting-apartment3-local-combat' if i==3 else 'lighting-1')/f'c_apartment{i}'/'result.json'
 r=json.loads(p.read_text());row={'map':r['map'],'result':r['result'],'yaw':r.get('selectedYaw'),'profiles':[]}
 for v in r.get('profiles',[]):
  row['profiles'].append({'overbright':v['overbright'],'off':v['off']['mean'],'on':v['on']['mean'],'gain':v['gain']})
 row['save_mean_difference']=r.get('afterLoad',{}).get('mean',0)-r.get('beforeSave',{}).get('mean',0)
 rows.append(row)
(root/'measurement-summary.json').write_text(json.dumps(rows,indent=2))
for row in rows:print(row)
