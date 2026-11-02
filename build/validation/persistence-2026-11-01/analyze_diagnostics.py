from pathlib import Path
import json,re,collections,sys
root=Path(__file__).parent
for p in sorted((root/(sys.argv[1] if len(sys.argv)>1 else 'diagnostic')).glob('at-*/result.json')):
 r=json.loads(p.read_text());parse=lambda s:[dict(re.findall(r'(\w+)=(.*?)(?= \w+=|$)',l)) for l in s.splitlines()]
 names=collections.defaultdict(set)
 for d in parse(r['before']):
  if 'raw' in d:names[d['raw']].add(d['name'])
 rows=parse(r['save']);groups=collections.Counter()
 for d in rows:
  if 'field' in d:groups[(d['class'],d['section'],d['field'],','.join(sorted(names[d['raw']])) or '?')]+=1
 print(p.parent.name,'warnings',r['warningCount'])
 for key,count in groups.items():print(count,*key)
 before={d['id']:d for d in parse(r['before']) if 'id'in d};after={d['id']:d for d in parse(r['afterLoad']) if 'id'in d}
 lost=[]
 for id,b in before.items():
  candidates=[a for a in after.values() if (a['class'],a['target'],a['model'])==(b['class'],b['target'],b['model'])]
  if not candidates:continue
  pos=lambda v:[float(x) for x in v['origin'].split(',')]
  a=min(candidates,key=lambda a:sum((x-y)**2 for x,y in zip(pos(a),pos(b))))
  for fn in ('think','touch','use','blocked'):
   if b[fn]!='0:0' and a[fn]=='0:0':lost.append({'id':id,'class':b['class'],'target':b['target'],'model':b['model'],'field':fn,'names':sorted(names[b[fn]])})
 (p.parent/'lost-callbacks.json').write_text(json.dumps(lost,indent=2))
 print('LOST',len(lost),collections.Counter((d['class'],d['field']) for d in lost))


