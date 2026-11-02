import json,subprocess
from pathlib import Path
p=Path('/root/cof-audits/audit-D3Kl5uly/build/game/compile_commands.json')
c=next(c for c in json.loads(p.read_text()) if c['file'].endswith('/util.cpp'))
a=[s for s in c['arguments'] if s not in ('-c','-MMD') and not s.startswith('-o')]+['-E','-dM']
r=subprocess.run(a,cwd=c['directory'],text=True,capture_output=True,check=True)
macros={line.split()[1]:' '.join(line.split()[2:]) for line in r.stdout.splitlines() if line.startswith('#define ')}
result={k:macros.get(k,'<undefined>') for k in ('GNUC','__GNUC__','__EMSCRIPTEN__','__SIZEOF_POINTER__')}
root=Path(__file__).parent;(root/'abi-preprocessor.json').write_text(json.dumps(result,indent=2));print(result)
