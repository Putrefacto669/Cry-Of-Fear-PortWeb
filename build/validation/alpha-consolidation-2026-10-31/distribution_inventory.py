from pathlib import Path
import hashlib,json
src=Path('/root/cof-audits/alpha-20261031/dist-glock')
out=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web/build/validation/alpha-consolidation-2026-10-31/distribution-files.json')
out.write_text(json.dumps({str(p.relative_to(src)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(src.rglob('*')) if p.is_file()},indent=2))
