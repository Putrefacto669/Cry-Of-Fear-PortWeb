"""Summarize preserved evidence; a pending update never counts as success."""
import gzip
import json
from pathlib import Path
import sys

root = Path(sys.argv[1])
rows = []
for result in sorted(root.glob('*/result.json')):
    d = json.loads(result.read_text())
    events_path = result.parent / 'events.jsonl'
    events = [json.loads(s) for s in events_path.read_text().splitlines()] if events_path.exists() else []
    calls = [e['time'] for e in events if e.get('name') == 'update-dispatched']
    start = d.get('callEpoch') or (min(calls) if calls else None)
    row = {'run': result.parent.name, 'browser': d.get('browser', {}).get('product'),
           'phases': d.get('phases'), 'complete': d.get('complete'), 'state': d.get('state'),
           'failure': d.get('failure'), 'traceError': d.get('traceError'),
           'errors': d.get('errors'),
           'modulesUnchanged': d.get('modulesBefore') == d.get('modulesAfter') if d.get('modulesAfter') else None}
    net = result.parent / 'netlog.json.gz'
    if net.exists() and start:
        n = json.loads(gzip.decompress(net.read_bytes()))
        types = {v: k for k, v in n['constants']['logEventTypes'].items()}
        offset = int(n['constants']['timeTickOffset'])
        hits = [e for e in n['events'] if offset + int(e['time']) >= start
                and e.get('params', {}).get('url') == 'http://127.0.0.1:8133/game/sw.js']
        row['scriptNetlogEventsAfterCall'] = [
            {'event': types.get(e['type']), 'delayMs': offset + int(e['time']) - start} for e in hits]
    trace = result.parent / 'chromium-trace.json.gz'
    if trace.exists():
        t = json.loads(gzip.decompress(trace.read_bytes()))['traceEvents']
        row['traceEventCount'] = len(t)
        row['registerJobTasks'] = [e for e in t if 'service_worker_register_job.cc' in str(e.get('args', {}))]
    rows.append(row)
saves = None
create, reopen = [root / name / 'result.json' for name in ['profile-create', 'profile-reopen']]
if create.exists() and reopen.exists():
    a, b = [json.loads(p.read_text()) for p in [create, reopen]]
    saves = {'acrossReopenIdentical': a['savesAfter'] == b['savesBefore'] == b['savesAfter'],
             'sha256': b['savesAfter']}
output = root / 'analysis.json'
assert not output.exists(), 'Preserve prior analyses; choose a new output directory'
output.write_text(json.dumps({'cause': 'unconfirmed', 'allUpdateConditionsStable': False,
                             'runs': rows, 'savePersistence': saves}, indent=2) + '\n')
print(json.dumps({'runs': len(rows), 'savePersistence': saves}))
