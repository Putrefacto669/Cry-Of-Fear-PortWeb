"""Audit private CAS and summarize measured transfers, storage, reuse and sampled RSS."""
import argparse
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('site', type=Path)
parser.add_argument('evidence', type=Path)
parser.add_argument('--run', required=True)
parser.add_argument('--http', default='http.jsonl')
args = parser.parse_args()
out = args.evidence / 'measurements.json'
assert not out.exists(), 'Preserve earlier analysis'
catalog = json.loads((args.site / 'catalog.json').read_bytes())
graphs = []
manifest_dir = args.evidence / 'manifests'
manifest_dir.mkdir(exist_ok=True)
for release in catalog:
    raw = (args.site / release['url'].lstrip('/') / 'release.json').read_bytes()
    assert hashlib.sha256(raw).hexdigest() == release['releaseId']
    target = manifest_dir / (release['releaseId'] + '.json')
    assert not target.exists()
    target.write_bytes(raw)
    graphs.append(json.loads(raw))
objects = {}
for graph in graphs:
    for entry in graph['resources'].values():
        objects[entry['object']] = entry['wireBytes']
for sha, size in objects.items():
    data = (args.site / 'objects/sha256' / sha).read_bytes()
    assert len(data) == size and hashlib.sha256(data).hexdigest() == sha
sets = [{e['object'] for e in graph['resources'].values()} for graph in graphs]
shared = sets[0] & sets[1]
stages = [json.loads(s) for s in (args.evidence / args.run / 'stages.jsonl').read_text().splitlines()]
http = [json.loads(s) for s in (args.evidence / args.http).read_text().splitlines()]
rss = [json.loads(s) for s in (args.evidence / args.run / 'rss.jsonl').read_text().splitlines()]
result = json.loads((args.evidence / args.run / 'result.json').read_bytes())
start = min(e['time'] for e in stages)
http = [e for e in http if e['time']*1000 >= start]


def period(first, last, pass_last=False):
    a = next(e['time'] for e in stages if e['stage'] == first)
    b = next(e['time'] for e in stages if e['stage'] == last or pass_last and e.get('name') == last)
    requests = [e for e in http if a <= e['time']*1000 <= b and e.get('path', '').startswith('/objects/')]
    samples = [e['rssSumBytes'] for e in rss if a <= e['time']*1000 <= b]
    return {'elapsedMs': b-a, 'objectResponseBytes': sum(e.get('bytes', 0) for e in requests),
            'objectResponses': len(requests), 'sampledRssSumPeakBytes': max(samples, default=None)}


measure = {'casIntegrity': True, 'releaseCount': len(graphs), 'uniqueObjects': len(objects),
           'uniqueWireBytes': sum(objects.values()), 'sharedObjects': len(shared),
           'sharedWireBytes': sum(objects[s] for s in shared),
           'separateCopiesWireBytes': sum(sum(objects[s] for s in group) for group in sets),
           'initialPrepare': {'elapsedMs': result['initialPreparedMs'],
              'verifiedWireBytes': sum(m['wireBytes'] for m in result['initial']['metrics'] if not m['hit']),
              'payloadBufferPeakBytes': max(m['payloadBufferBytes'] for m in result['initial']['metrics']),
              'storageEstimate': result['initial']['storage']},
           'initialThroughRuntime': period('old-initial-start', 'old mounts exact five modules', True),
           'newPreparationWithOldOpen': period('prepare-new-with-old-open', 'two independent worker scopes', True),
           'secondMap': period('second-map-download', 'second map downloaded and mounted from pinned graph', True),
           'newPreparationReuseEvents': sum(m['hit'] for m in result['newPrepared']['metrics']),
           'newPreparationNetworkObjects': sum(not m['hit'] for m in result['newPrepared']['metrics']),
           'browserRssSumPeakBytes': result['rssSumPeakBytes'],
           'browserRssSamples': result['rssSampleCount'],
           'finalStorageEstimate': result['finalStorage'], 'browser': result['browser'],
           'passed': result.get('passed', False), 'checks': result['checks'],
           'limits': ['RSS summed across processes double-counts shared pages; 500 ms sampling can miss spikes',
                      'payloadBufferPeak counts wire+decoded payload only, not all allocator/copy overhead',
                      'HTTP bytes are response bodies, not protocol/TLS overhead; loopback no TLS',
                      'storage.estimate is browser approximation; software rendering desktop, not mobile']}
out.write_text(json.dumps(measure, indent=2)+'\n')
print(json.dumps(measure, indent=2))
