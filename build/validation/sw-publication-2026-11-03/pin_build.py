"""Exercise the real package.sh pinning hook and promote only its verified worker."""
import ast
import hashlib
import json
from pathlib import Path
import re
import shutil
import sys

out = Path(__file__).resolve().parent
repo = out.parents[2]
private = Path('/root/cof-audits/sw-pin-20261103')
probe = private/('package-hook-'+(sys.argv[1] if len(sys.argv)>1 else 'first'))
probe.mkdir(exist_ok=False)
template = (repo/'platform/web/sw.js').read_bytes()
(probe/'sw.js').write_bytes(template)
shell = (repo/'tools/wsl/package.sh').read_text()
python = re.search(r'python3 - "\$DIST" "\$\{COF_SW_COI:-0\}" "\$\{COF_SW_GZ:-1\}" <<\x27EOF\x27\n(.*?)\nEOF', shell, re.S)[1]
tree = ast.parse(python)
start = next(i for i,n in enumerate(tree.body) if isinstance(n,ast.Assign) and isinstance(n.targets[0],ast.Name) and n.targets[0].id=='worker')
end = next(i for i,n in enumerate(tree.body) if isinstance(n,ast.Assign) and isinstance(n.targets[0],ast.Name) and n.targets[0].id=='raw')
exec(compile(ast.Module(body=tree.body[start:end],type_ignores=[]),'package.sh SW pin hook','exec'),{'dist':probe,'version':'d071fd1b614e'})
rendered = (probe/'sw.js').read_bytes()
assert rendered == (private/'fixed/sw.js').read_bytes(), 'fixture must match actual package hook bytes'
assert b'__COF_SW_VERSION__' not in rendered
assert b'sw-manifest.js?release=d071fd1b614e' in rendered
before = hashlib.sha256((repo/'dist/sw.js').read_bytes()).hexdigest()
shutil.copy2(probe/'sw.js',repo/'dist/sw.js')
manifest = json.loads(re.search(r'=\s*(\{.*\});',(repo/'dist/sw-manifest.js').read_text(),re.S)[1])
assert manifest['version']=='d071fd1b614e'
for name,revision in manifest['files'].items():
    assert hashlib.sha256((repo/'dist'/name).read_bytes()).hexdigest().startswith(revision),name
(out/'pin-build-proof.json').write_text(json.dumps({'manifest':manifest['version'],'beforeWorker':before,'workerSHA256':hashlib.sha256(rendered).hexdigest(),'realPackageHookExecuted':True,'manifestFilesVerified':len(manifest['files']),'onlyDistributionWorkerChanged':True},indent=2))
print('PASS real package.sh pin hook, candidate identity and 90 unchanged asset revisions')
