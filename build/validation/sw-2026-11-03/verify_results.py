"""Consolidate real evidence without converting unresolved diagnostics into PASS."""
import ast
import hashlib
import json
from pathlib import Path

here = Path(__file__).resolve().parent
repo = here.parents[2]
read = lambda name: json.loads((here/name/'result.json').read_text())
versions = json.loads((here/'fixture.json').read_text())
summary = {'versions': versions, 'originalTimeoutCause': 'unconfirmed', 'allUpdateConditionsStable': False}
summary['matrix'] = []
for n in range(1, 4):
    result = read(f'matrix-final-{n}')
    assert result['passed'] and len(result['checks']) == 10 and not result['errors']
    summary['matrix'].append({'run': n, 'checks': 10, 'passed': True})
game = read('game-final')
assert game['passed'] and not game['errors'] and len(game['checks']) == 10
assert game['candidateVersion'] == versions['fixed']['version']
assert game['nextVersion'] == versions['next']['version']
assert game['modules']['server.wasm'] == 'c2d9d984a416e6a8552f1a75939c065c0bd983263b0d8206e60c5f5d9e6a69a5'
assert game['modules']['client.wasm'] == 'fac7e66382a9915f33534030eab35ab0c8a9e846304e0200000bb300f8cde585'
summary['game'] = {'passed': True, 'checks': 10, 'modules': game['modules'], 'saveHash': game['save']}
summary['regressions'] = {}
for name in ('phone_singleplayer_punch', 'dual_hands', 'extras_persistence'):
    result = read('regressions-final/'+name)
    assert result['passed'] and not result['errors']
    assert result['deployment']['manifest'] == versions['fixed']['version']
    summary['regressions'][name] = {'passed': True, 'deployment': result['deployment']}
fresh = read('fresh-failure-final')
assert fresh['passed'] and fresh['recovered'] and not fresh['initial']['runtime'] and not fresh['errors']
summary['freshFailureRecovery'] = fresh
historical = read('historical-upgrade')
assert historical['passed'] and not historical['errors']
assert historical['beforeVersion'] == '2f88e7b98c18' and historical['afterVersion'] == '03fd8c160749'
summary['historicalAccept'] = {'passed': True, 'ack': historical['updateAck'], 'origin': 'http://127.0.0.1:8130/'}
summary['diagnostics'] = {}
for path in sorted(here.glob('*/result.json')):
    result = json.loads(path.read_text())
    if 'update' in result:
        summary['diagnostics'][path.parent.name] = {k: result[k] for k in ('mode', 'update', 'afterIntervention', 'afterMediaStop', 'registerAck', 'pendingRequests') if k in result}
cache = read('http-cache')
assert cache['passed']
summary['httpCache'] = cache
summary['sources'] = {}
private = Path('/root/cof-audits/sw-20261103/fixed')
for name in ('sw.js', 'loader.js'):
    data = (repo/'platform/web'/name).read_bytes()
    assert data == (private/name).read_bytes()
    summary['sources'][name] = hashlib.sha256(data).hexdigest()
for name in ('sw_fixture.py', 'sw_prepare.py'):
    ast.parse((repo/'tools/e2e'/name).read_text(), name)
(here/'summary.json').write_text(json.dumps(summary, indent=2))
print('PASS: evidence integrity; unresolved intermittent update explicitly retained')
