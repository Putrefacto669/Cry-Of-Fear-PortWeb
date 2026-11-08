"""Reconstruct contract fixtures from the exact frozen data packages, not a stale staging tree."""
import json,re
from pathlib import Path
work=Path('/root/cof-audits/codex-regressions-20261108');packs=work/'candidate/packs';stage=work/'stage';assert not stage.exists()
for script in packs.glob('*.js'):
 name=script.stem
 if name=='engine':continue
 match=re.search(r'loadPackage\((\{"files"[\s\S]*?\})\);',script.read_text())
 if not match:continue
 root=stage/('maps/'+name[4:] if name.startswith('map_') else 'shared_extras' if name=='extras' else name)
 body=script.with_suffix('.data').read_bytes()
 for entry in json.loads(match[1])['files']:
  relative=entry['filename'].removeprefix('/rodir/');assert not relative.startswith('/') and '..' not in Path(relative).parts
  p=root/relative;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(body[entry['start']:entry['end']])
print('Prepared stage from the frozen candidate packages')
