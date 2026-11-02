from pathlib import Path
import re,json
root=Path(__file__).parent
rows={p.name:sorted({s.decode('ascii') for s in re.findall(rb'cof::[A-Za-z_0-9:]+',p.read_bytes())}) for p in (root/'behavior-fixed-complete/snapshot').iterdir() if p.is_file()}
assert any(rows.values());(root/'saved-symbols.json').write_text(json.dumps(rows,indent=2));print('Stable callback names found in save:',sorted(set(sum(rows.values(),[]))))
