from pathlib import Path
import hashlib
import json
import sys

repo = Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web')
sys.path.insert(0, str(repo / 'tools'))
from stage_map import find_ci, read_entities

game = Path('/mnt/c/Program Files (x86)/Steam/steamapps/common/Cry of Fear/cryoffear')
stage = Path('/root/cof-audits/audit-D3Kl5uly/stage')
out = Path(__file__).with_name('installation-correct-paths.json')
assert not out.exists()
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
maps, recordings = [], set()
for bsp in sorted(stage.glob('maps/*/cryoffear/maps/*.bsp')):
    original = find_ci(game, 'maps/' + bsp.name)
    assert original and sha(original) == sha(bsp), bsp.stem
    es = read_entities(original)
    comments = [e for e in es if e.get('classname') == 'cof_developer_commentary']
    recordings.update('mp3/' + e['noise'] for e in comments)
    maps.append({'map': bsp.stem, 'sha256': sha(original), 'comments': len(comments)})
assert len(recordings) == 21 and sum(m['comments'] for m in maps) == 22
expected = sorted(recordings | {'models/developer_commentary.mdl', 'models/items/w_nightvision.mdl'})
resources = []
for name in expected:
    path = find_ci(game, name)
    resources.append({'resource': name, 'present': bool(path), 'bytes': path.stat().st_size if path else 0,
                      'sha256': sha(path) if path else None})
libraries = {}
for name in ('hl.dll', 'client.dll'):
    path = find_ci(game, 'cl_dlls/' + name)
    assert path
    libraries[name] = {'bytes': path.stat().st_size, 'sha256': sha(path),
                       'md5': hashlib.md5(path.read_bytes()).hexdigest()}
import re
for name in ('hl.dll', 'client.dll'):
    strings = [m.decode('ascii') for m in re.findall(rb'[\x20-\x7e]{5,}', find_ci(game, 'cl_dlls/' + name).read_bytes())]
    Path(__file__).with_name('native-strings-' + name + '.txt').write_text('\n'.join(
        s for s in strings if any(k in s.lower() for k in ('night', 'nvg', 'cloth', 'costume', 'comment', 'fmod', 'playmp3', 'stopmp3'))))
result = {'root': str(game), 'maps': maps, 'resources': resources, 'libraries': libraries}
out.write_text(json.dumps(result, indent=2) + '\n')
missing = [r['resource'] for r in resources if not r['present']]
assert not missing, missing
print('PASS original installation: 21 recordings, 2 models, 11 identical prepared BSPs; DLL hashes recorded')
