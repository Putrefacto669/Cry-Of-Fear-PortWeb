from pathlib import Path
import json

root = Path(__file__).resolve().parent
load = lambda p: json.loads((root / p).read_text(encoding='utf-8-sig'))
local, live = load('local-browser/result.json'), load('live-browser/result.json')
deployment, assets = load('pages-deployment.json'), load('live-assets.json')
assert deployment['conclusion'] == 'success'
assert deployment['headSha'] == 'db413753de39abb18431ef794c430b460beeffd9'
assert assets['manifest'] == '2f88e7b98c18'
assert local['modules'] == live['modules']
expected = load('dist-verified.json')['modules']
for name, digest in live['modules'].items():
    assert expected[name] == digest, name
assert live['serviceWorkerControlled'] and not live['errors']
assert len(live['results']) == 8
for row in live['results']:
    assert not row['ui']['fx']['flashlight'] and row['pixels']['glError'] == 0
    assert len(row['ui']['bars']) == 2
    assert all(b['opacity'] == '1' and b['bounds']['width'] > 0 for b in row['ui']['bars'])
by = {r['name']: r for r in live['results']}
for first, second in [('phone-before', 'phone-after-right'),
                      ('phone-other-mode', 'phone-other-after-right'),
                      ('phone-other-after-right', 'phone-after-f')]:
    assert by[first]['phone'] == by[second]['phone']
assert by['knife-before']['phone']['light'] == 0
assert by['knife-after-f']['phone']['light'] == 1
assert by['knife-after-second-f']['phone']['light'] == 0
out = root / 'live-browser-verified.json'
assert not out.exists()
out.write_text(json.dumps({'passed': True, 'deployment': deployment['url'],
                           'buildCommit': deployment['headSha'], 'manifest': assets['manifest'],
                           'modules': live['modules'], 'serviceWorkerControlled': True,
                           'chromium': live['chromium'], 'jsErrors': live['errors'],
                           'controlsAndBars': 'PASS', 'rightClickOriginalSymptomResolved': False}, indent=2) + '\n')
print('PASS deployed build, public assets, actual mounted WASM, Service Worker, phone controls and bars')
