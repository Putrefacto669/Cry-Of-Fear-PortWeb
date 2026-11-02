from pathlib import Path
import json,re,collections
p=Path(__file__).resolve().parent
def identify(text):
 last=None;rows=[]
 for line in text.splitlines():
  if 'COF/SAVEFN ' in line:
   m=re.search(r'id=(\d+) class=(.*?) target=(.*?) model=(.*?) section=(\S+) field=(\S+) raw=(\S+)',line)
   if m:last=dict(zip(('id','class','target','model','section','field','raw'),m.groups()))
  if 'Invalid function pointer in entity!' in line:rows.append(last)
 return {'count':len(rows),'classes':dict(collections.Counter(r['class'] if r else '?' for r in rows)),'affected':rows}
base=json.loads((p/'baseline-start-save/at-50/result.json').read_text())
current=json.loads((p/'persistence-cold/result.json').read_text())
a=identify(base['save']);b=identify(current['pendingSave'])
assert not any(r and r['class'] in ('cof_developer_commentary','cof_hoodie','cof_clothesmenu','item_nightvision') for r in b['affected'])
out={'publishedStart50':a,'extrasPending':b,'classDifference':dict(collections.Counter(b['classes'])-collections.Counter(a['classes']))}
(p/'start-warning-comparison.json').write_text(json.dumps(out,indent=2))
print('published',a['count'],a['classes']);print('extras',b['count'],b['classes']);print('difference',out['classDifference'])