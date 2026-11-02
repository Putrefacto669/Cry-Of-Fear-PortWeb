from pathlib import Path
import json,re,collections
root=Path(__file__).parent
r=json.loads((root/'diagnostic/at-1/result.json').read_text())
fields=lambda line:dict(re.findall(r'(\w+)=(.*?)(?= \w+=|$)',line))
names=collections.defaultdict(set);entities={}
for line in r['before'].splitlines():
 d=fields(line)
 if 'name' in d and 'raw' in d:names[d['raw']].add(d['name'].lstrip('&'))
 if 'id' in d:entities[d['id']]=d
rows={}
for line in r['save'].splitlines():
 if 'COF/SAVEFN' not in line:continue
 d=fields(line)
 if not d['class']:continue
 key=d['id'];row=rows.setdefault(key,{'id':int(key),'classname':d['class'],'targetname':d['target'],'model':d['model'],'origin':entities[key]['origin'],'callbacks':[]})
 row['callbacks'].append({'field':d['field'],'functions':sorted(names[d['raw']])})
assert len(rows)==27 and sum(len(r['callbacks']) for r in rows.values())==39
(root/'affected-entities.json').write_text(json.dumps(list(rows.values()),indent=2))
lines=['# Anexo: las 27 entidades y los 39 callbacks de c_apartment1','', 'Índices del proceso de diagnóstico anterior a la corrección. Los edicts cambian al restaurar: se correlacionaron classname, targetname/model y origen, no solo el índice. No es una lista de 39 entidades.','', '| Edict | Classname | Identidad y origen | Callbacks omitidos antes de corregir |','|---:|---|---|---|']
for row in sorted(rows.values(),key=lambda d:d['id']):
 ident=row['targetname'] or row['model'] or '(sin nombre)';callbacks='; '.join(c['field']+' → '+', '.join(c['functions']) for c in row['callbacks'])
 lines.append(f"| {row['id']} | {row['classname']} | `{ident}`, ({row['origin']}) | {callbacks} |")
(root/'AFECTADAS_C_APARTMENT1.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('27 entities, 39 callbacks; per-instance appendix generated')
