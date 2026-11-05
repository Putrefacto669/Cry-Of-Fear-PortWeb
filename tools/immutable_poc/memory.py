"""Sample sum of VmRSS of the private browser process tree (not unique physical RAM)."""
import json
from pathlib import Path
import sys
import time

profile, output = sys.argv[1:]
assert not Path(output).exists()
while True:
    processes = {}
    for p in Path('/proc').iterdir():
        if not p.name.isdigit():
            continue
        try:
            fields = dict(line.split(':', 1) for line in (p/'status').read_text().splitlines() if ':' in line)
            cmd = (p/'cmdline').read_bytes().replace(b'\0', b' ').decode(errors='replace')
            processes[int(p.name)] = (int(fields['PPid']), int(fields.get('VmRSS', '0 kB').split()[0])*1024, cmd)
        except (OSError, KeyError, ValueError):
            continue
    included = {pid for pid, (_, _, cmd) in processes.items()
                if '--user-data-dir=' + profile + ' ' in cmd}
    while True:
        expanded = included | {pid for pid, (parent, _, _) in processes.items() if parent in included}
        if expanded == included:
            break
        included = expanded
    if included:
        with Path(output).open('a') as f:
            f.write(json.dumps({'time': time.time(), 'rssSumBytes': sum(processes[p][1] for p in included),
                                'processes': len(included)})+'\n')
    time.sleep(.5)
