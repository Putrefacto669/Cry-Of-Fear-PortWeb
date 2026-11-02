set -euo pipefail
REPO='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
export COF_STAGE=/root/cof-audits/extras-20261101/stage
export COF_ORIGINAL='/mnt/c/Program Files (x86)/Steam/steamapps/common/Cry of Fear/cryoffear'
python3 -B "$REPO/tools/e2e/test_extras_maps.py"
python3 - "$REPO" <<'PY'
import sys,json
from pathlib import Path
r=Path(sys.argv[1]);sys.path.insert(0,str(r/'tools'));from stage_map import read_entities
s=Path('/root/cof-audits/extras-20261101/stage/maps')
rows=[dict(map=p.name,entity=e) for p in sorted(s.iterdir()) for e in read_entities(p/'cryoffear/maps'/f'{p.name}.bsp') if e.get('classname') in ('cof_developer_commentary','cof_hoodie','cof_clothesmenu','item_nightvision')]
(r/'build/validation/extras-2026-11-01/instances.json').write_text(json.dumps(rows,indent=2))
PY