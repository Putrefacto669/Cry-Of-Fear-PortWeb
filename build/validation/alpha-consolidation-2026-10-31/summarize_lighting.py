import json,re,statistics
from pathlib import Path
r=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web/build/validation/alpha-consolidation-2026-10-31')
rows=[]
for p in sorted((r/'lighting-1').glob('*/result.json')):
 d=json.loads(p.read_text());row={'map':d['map'],'result':d['result'],'yaw':d.get('selectedYaw'),'profiles':[]}
 for v in d.get('profiles',[]):
  m=re.search(r'COF/SPOT .*?channels=(\d+) clipped=(\d+) requested=([\d.eE+-]+) retained=([\d.eE+-]+)',v['stats']);channels,clipped,requested,retained=map(float,m.groups())
  def cost(c):return {'cpu_ms_median':statistics.median(x['cpuMs'] for x in c),'cpu_ms_p95':sorted(x['cpuMs'] for x in c)[int(len(c)*.95)],'upload_bytes_mean':statistics.mean(x['uploadBytes'] for x in c),'upload_calls_mean':statistics.mean(x['uploadCalls'] for x in c),'upload_cpu_ms_mean':statistics.mean(x['uploadMs'] for x in c)}
  row['profiles'].append({'overbright':v['overbright'],'off':v['off']['mean'],'on':v['on']['mean'],'disabled':v['disabled']['mean'],'dark_fraction_off':v['off']['darkFraction'],'gain':v['gain'],'lost_lightmap_contribution_percent':100*(requested-retained)/requested if requested else None,'positive_channels':channels,'clipped_channels':clipped,'off_cost':cost(v['offCost']),'on_cost':cost(v['onCost'])})
 if 'beforeSave' in d:row['save_restore_delta']=d['afterLoad']['mean']-d['beforeSave']['mean']
 rows.append(row)
(r/'lighting-summary.json').write_text(json.dumps(rows,indent=2));print(json.dumps(rows,indent=2))
