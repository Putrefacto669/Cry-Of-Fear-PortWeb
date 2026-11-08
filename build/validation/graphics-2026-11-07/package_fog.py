"""Package changed client/renderer only; preserve the verified server and public distribution."""
import gzip,hashlib,json,os,re,shutil,subprocess
from pathlib import Path
repo=Path(__file__).resolve().parents[3];out=Path(__file__).parent
prior=Path('/root/cof-audits/visual-clothes-20261107/candidate-graphics-1')
work=Path('/root/cof-audits/graphics-20261107');target=work/'candidate-linear-fog';lib=work/'stage/lib'
assert not target.exists();shutil.copytree(prior,target,copy_function=os.link);lib.mkdir(parents=True,exist_ok=True)
for p in Path('/root/cof-audits/visual-clothes-20261107/stage/lib').iterdir():shutil.copy2(p,lib/p.name)
shutil.copy2(work/'build/game/cl_dll/client_emscripten_wasm32.wasm',lib/'client.wasm')
shutil.copy2(work/'build/engine/ref/gl/libref_gles3compat.wasm',lib/'libref_gles3compat.wasm')
modules={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in lib.iterdir()}
assert modules['server.wasm']=='91ca7418dcdcb520cd1479d77ca6646af79e455158c23f179661a1f46f7954f4'
def write(name,data):
 p=target/name;t=p.with_name(p.name+'.new');t.write_bytes(data);t.replace(p)
for n in ['packs/engine.js','packs/engine.data','packs/engine.data.gz']:(target/n).unlink()
subprocess.run(['/root/emsdk/upstream/emscripten/tools/file_packager',str(target/'packs/engine.data'),'--preload',str(lib)+'@/lib','--js-output='+str(target/'packs/engine.js'),'--no-node'],check=True)
write('packs/engine.data.gz',gzip.compress((target/'packs/engine.data').read_bytes(),9,mtime=0))
manifest=json.loads(re.search(r'=\s*(\{[\s\S]*\});',(prior/'sw-manifest.js').read_text())[1]);files=manifest['files']
for n in ['packs/engine.js','packs/engine.data']:files[n]=hashlib.sha256((target/n).read_bytes()).hexdigest()[:12]
manifest['gz']['packs/engine.data']={'size':(target/'packs/engine.data').stat().st_size,'gzSize':(target/'packs/engine.data.gz').stat().st_size}
manifest['version']=hashlib.sha256(json.dumps(files,sort_keys=True).encode()).hexdigest()[:12]
write('sw-manifest.js',('self.COF_MANIFEST = '+json.dumps(manifest,indent=1)+';\n').encode())
write('sw.js',(repo/'platform/web/sw.js').read_bytes().replace(b'__COF_SW_VERSION__',manifest['version'].encode()))
(out/'candidate-linear-fog.json').write_text(json.dumps({'manifest':manifest['version'],'modules':modules,'path':str(target)},indent=2));print(manifest['version'],modules)
