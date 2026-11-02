"""Record resource availability in authorized staging without copying its bytes."""
import hashlib
import json
from pathlib import Path

root = Path('/root/cof-audits/audit-D3Kl5uly/stage')
output = Path(__file__).with_name('resource-availability.json')
assert not output.exists(), output
inventory = json.loads(Path(__file__).with_name('map-inventory.json').read_text())
expected = {'models/developer_commentary.mdl', 'models/items/w_nightvision.mdl',
            'models/costumes/Folded_HLC.mdl', 'sprites/cof_glock_mag.spr',
            'sprites/cof_glock_mag_icon.spr', 'sprites/cof_mag_cross.spr'}
for row in inventory['maps']:
    for entity in row['extras']:
        if entity.get('noise'):
            expected.add('sound/' + entity['noise'])
files = list(root.rglob('*'))
result = []
for name in sorted(expected):
    suffix = '/cryoffear/' + name.lower()
    matches = [f for f in files if f.is_file() and f.as_posix().lower().endswith(suffix)]
    result.append({'resource': name, 'present': bool(matches), 'matches': [
        {'path': str(f.relative_to(root)), 'bytes': f.stat().st_size,
         'sha256': hashlib.sha256(f.read_bytes()).hexdigest()} for f in matches]})
output.write_text(json.dumps(result, indent=2) + '\n')
print(f'Recorded {len(result)} expected resource paths; {sum(r["present"] for r in result)} present')
