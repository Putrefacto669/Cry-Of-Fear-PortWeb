"""Assert new evidence and retain a compact, reproducible verification manifest."""
import hashlib
import json
import re
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parent
repo = root.parents[2]
target = root / 'verification-manifest.json'
assert not target.exists(), target
read = lambda p: json.loads((root / p).read_text())
server = '07e7ef5cb6df07708b5c3c15abb7fd18e6a3bcb17d60efb5ad0e6605c2d37ee1'
baseline = read('baseline/result.json')
assert any(r['ui']['fx']['flashlight'] for r in baseline['results'])
repeat = read('controls-repeat/result.json')
assert repeat['modules']['/lib/server.wasm'] == server
assert not repeat['errors']
for result in repeat['results']:
    assert not result['ui']['fx']['flashlight']
    assert result['phone'] is not None
    assert result['pixels']['glError'] == 0
hud = read('hud-equipped-camera/result.json')
assert not hud['errors']
by_name = {r['name']: r for r in hud['rows']}
for name in ('apartment-knife', 'inventory-open', 'inventory-closed', 'paused', 'restored-knife',
             'native-changelevel-apartment2', 'sw-second-visit'):
    row = by_name[name]
    assert row['controlled'] and row['loading'] == 'off', name
    assert len(row['bars']) == 2
    assert all(b['opacity'] == 1 and b['width'] > 0 and b['height'] > 0 for b in row['bars']), name
assert all(b['opacity'] == 0 for b in by_name['apartment-camera']['bars'])
assert by_name['native-changelevel-apartment2']['map'] == 'c_apartment2'
inventory = read('map-inventory.json')['maps']
runtime = {r['map']: r for r in read('runtime-inventory/result.json')['rows']}
assert len(inventory) == len(runtime) == 11
for row in inventory:
    assert row['factory_gaps'] == runtime[row['map']]['missing'], row['map']
    assert not runtime[row['map']]['errors']
resources = read('resource-availability.json')
recordings = [r for r in resources if r['resource'].startswith('sound/commentary/')]
assert len(recordings) == 21 and not any(r['present'] for r in recordings)
lighting = read('lighting/results.json')
assert [r['map'] for r in lighting if r['result'] == 'FAILED'] == ['c_apartment3']
lighting = [r for r in lighting if r['map'] != 'c_apartment3'] + read('lighting-apartment3-combat/results.json')
measurements = []
for row in sorted(lighting, key=lambda r: r['map']):
    assert row['result'] == 'MEASURED' and row['serverHash'] == server and not row['errors']
    assert abs(row['beforeSave']['mean'] - row['afterLoad']['mean']) < 1
    for profile in row['profiles']:
        assert profile['gain'] > 0
        assert abs(profile['disabled']['mean'] - profile['off']['mean']) < 1
    measurements.append({'map': row['map'], 'yaw': row['selectedYaw'], 'profiles': [
        {'overbright': p['overbright'], 'off': p['off']['mean'], 'on': p['on']['mean'],
         'gain': p['gain'], 'negativeControlError': p['disabled']['mean'] - p['off']['mean']}
        for p in row['profiles']]})
persistence = read('persistence/results.json')
assert [r['seconds'] for r in persistence] == [3, 20]
for row in persistence:
    assert row['result'] == 'OBSERVED' and row['warningCount'] == 0 and row['serverHash'] == server
behavior = read('callback-behavior/result.json')
assert behavior['passed'] and behavior['checked'] == behavior['coldChecked'] == 39
assert behavior['animated'] == 5 and behavior['ammoCollected'] and behavior['spawned'] == 1
assert behavior['transitionMap'] == 'c_apartment2'
zoom = read('zoom/result.json')
assert len(zoom) == 2 and all(r['zoom'] and r['unzoom'] and r['reusedOriginalConfiguration'] for r in zoom)
regressions = {}
for log in sorted((root / 'regressions').glob('*.log')):
    last = log.read_text().strip().splitlines()[-1]
    assert last.startswith('OK'), (log.name, last)
    regressions[log.stem] = {'last': last, 'sha256': hashlib.sha256(log.read_bytes()).hexdigest()}
assert len(regressions) == 18  # 14 browsers, 3 BSP suites (9 contracts), Pointer Lock.
subprocess.run(['git', 'diff', '--quiet', 'HEAD', '--', 'dist'], cwd=repo, check=True)
head = subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'], cwd=repo, text=True).strip()
manifest = {'head': head, 'server': server, 'modulesActuallyMounted': repeat['modules'],
            'distUnchanged': True, 'originalRightClickIssueResolved': False,
            'independentKeyFFilterFixed': True, 'originalExtrasImplemented': False,
            'regressions': regressions, 'lighting': measurements,
            'runtimeMaps': len(runtime), 'missingCommentaryRecordings': len(recordings),
            'sameSessionCallbacks': behavior['checked'], 'coldCallbacks': behavior['coldChecked'],
            'animationCount': behavior['animated'], 'warningsAt3And20': [r['warningCount'] for r in persistence],
            'preservedLightingFailure': 'lighting/c_apartment3: attacker perturbed aiming; repeated after normal combat'}
target.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
print('PASS all final evidence; right-click symptom and original extras remain explicitly unresolved')
