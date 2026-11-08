"""Read-only links for the user's native-game observations; no progression simulation."""
import json,sys
from pathlib import Path
repo=Path(__file__).resolve().parents[3];sys.path.insert(0,str(repo/'tools'))
from stage_map import read_entities
game=Path('/mnt/c/Program Files (x86)/Steam/steamapps/common/Cry of Fear/cryoffear')
es=read_entities(game/'maps/c_nightmare.bsp');by={}
for e in es:
 if e.get('targetname'):by.setdefault(e['targetname'],[]).append(e)
def linked(e):
 names=[e[k] for k in ['target','target2','message','netname','killtarget','m_iszEntity'] if k in e]
 if e.get('classname')=='multi_manager':names.extend(k.split('#')[0] for k in e if k not in ['classname','origin','angles','targetname','spawnflags'])
 return [child for n in names for child in by.get(n,[])]
spots=[]
for e in es:
 if e.get('classname')!='camera_spot_trigger':continue
 level=[e];seen=set();graph=[]
 for depth in range(4):
  following=[]
  for node in level:
   key=json.dumps(node,sort_keys=True)
   if key in seen:continue
   seen.add(key);graph.append({'depth':depth,'entity':node});following.extend(linked(node))
  level=following
 spots.append(graph)
names=['c_start','c_apartment1','c_apartment2','c_apartment3','c_apartment4','c_apartment5','c_apartmentsick']
ladders={n:[e for e in read_entities(game/'maps'/f'{n}.bsp') if e.get('classname') in ['cof_ladder_manager','cof_ladder_manager_use']] for n in names}
rope={n:[e for e in read_entities(game/'maps'/f'{n}.bsp') if any('rope' in v.lower() for v in e.values())] for n in names}
result={'userObservedOriginal':True,'naturalWebProgressionNotTestedHere':True,'cameraSpotGraphs':spots,'ladderEntities':ladders,'ropeNameCandidates':rope,'bathroomMapNotIdentifiedFromDescription':True}
(Path(__file__).parent/'manual-reference-links-final.json').write_text(json.dumps(result,indent=2));print('Read',len(spots),'fixed camera spots;',sum(len(v) for v in ladders.values()),'ladder entities')
for graph in spots:
 print(graph[0]['entity'].get('targetname'),[(x['entity'].get('targetname'),x['entity'].get('classname'),x['entity'].get('model')) for x in graph[1:]])
