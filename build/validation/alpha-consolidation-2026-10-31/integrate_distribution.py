from pathlib import Path
import json,shutil
repo=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web')
source=Path('/root/cof-audits/alpha-20261031/dist-glock')
for rel in json.loads((repo/'build/validation/alpha-consolidation-2026-10-31/distribution-changes.json').read_text()):
 shutil.copy2(source/rel,repo/'dist'/rel)
print('Copied validated distribution changes')
