"""Read-only audit of the served pack. Writes metadata, never extracted assets."""
import hashlib
import json
from pathlib import Path
import re
import struct
import sys

repo = Path(__file__).resolve().parents[3]
stage = Path(sys.argv[1])
pack = repo / 'dist/packs/map_c_start'
text = pack.with_suffix('.js').read_text()
match = re.search(r'loadPackage\((\{"files":.*?\})\)', text)
if not match:
    match = re.search(r'(\{"files":\s*\[.*?"remote_package_size"\s*:\s*\d+\s*\})', text)
metadata = json.loads(match[1])
data = pack.with_suffix('.data').read_bytes()
records = []
for entry in metadata['files']:
    name = entry['filename']
    if '/sound/subtitles/' not in name or not name.endswith('.wav'):
        continue
    payload = data[entry['start']:entry['end']]
    relative = name.split('/cryoffear/', 1)[1]
    original = (stage / 'maps/c_start/cryoffear' / relative).read_bytes()
    offset = 12
    fmt = None
    while offset + 8 <= len(payload):
        tag = payload[offset:offset+4]
        size = struct.unpack_from('<I', payload, offset+4)[0]
        if tag == b'fmt ':
            fmt = struct.unpack_from('<HHIIHH', payload, offset+8)
        offset += 8 + size + (size % 2)
    records.append(dict(path=name, bytes=len(payload), format=fmt,
                        sha256=hashlib.sha256(payload).hexdigest(),
                        matches_staging=payload == original))
assert len(records) == 9, records
assert all(r['matches_staging'] for r in records)
print(json.dumps(records, indent=2))
