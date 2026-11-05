import hashlib,json,os,re,shutil,sys
from pathlib import Path
repo=Path(__file__).resolve().parents[3]
candidate=Path('/root/cof-audits/ammo-hud-20261104/candidate-v3')
assert not candidate.exists()
shutil.copytree('/root/cof-audits/ammo-hud-20261104/candidate-v2',candidate,copy_function=os.link)
for name in ['launcher.js','sw.js']:
    p=candidate/name;p.unlink();p.write_bytes((repo/'platform/web'/name).read_bytes())
(candidate/'sw-manifest.js').unlink()
shell=(repo/'tools/wsl/package.sh').read_text()
code=re.search(r'python3 - "\$DIST" "\$\{COF_SW_COI:-0\}" "\$\{COF_SW_GZ:-1\}" <<\x27EOF\x27\n(.*?)\nEOF',shell,re.S)[1]
sys.argv=['package manifest hook',str(candidate),'0','1']
exec(compile(code,'actual package manifest hook','exec'))
manifest=json.loads(re.search(r'=\s*(\{[\s\S]*\});',(candidate/'sw-manifest.js').read_text())[1])
print('Candidate v3',manifest['version'])
