import gzip,hashlib,json,os,re,shutil,subprocess,sys
from pathlib import Path
repo=Path(__file__).resolve().parents[3];private=Path('/root/cof-audits/visual-clothes-20261107')
before=private/sys.argv[1];candidate=private/sys.argv[2]
assert before.parent==private and candidate.parent==private and not candidate.exists()
shutil.copytree(before,candidate,copy_function=os.link)
def replace(name,body):
    p=candidate/name;temporary=p.with_name(p.name+'.new');temporary.write_bytes(body);temporary.replace(p)
for name in ['postfx.js','hud.js','extras.js','loader.js','launcher.js','sw.js']:
    replace(name,(repo/'platform/web'/name).read_bytes())
replace('index.html',(repo/'platform/web/index.html').read_bytes().replace(b'__SOURCE_URL__',b'https://github.com/Putrefacto669/Cry-Of-Fear-PortWeb'))
for shader in (repo/'platform/web/shaders').glob('*.glsl'):replace('shaders/'+shader.name,shader.read_bytes())
for asset in (repo/'platform/web').iterdir():
    if asset.is_file() and (asset.suffix=='.xml' or (asset.suffix=='.html' and asset.name!='index.html')):
        if (candidate/asset.name).exists():replace(asset.name,asset.read_bytes())
        else:(candidate/asset.name).write_bytes(asset.read_bytes())
for n,source in {'client.wasm':'cl_dll/client_emscripten_wasm32.wasm','server.wasm':'dlls/hl_emscripten_wasm32.wasm'}.items():
    shutil.copy2(private/'build/game'/source,private/'stage/lib'/n)
for name in ['packs/engine.js','packs/engine.data','packs/engine.data.gz']:(candidate/name).unlink()
subprocess.run(['/root/emsdk/upstream/emscripten/tools/file_packager',str(candidate/'packs/engine.data'),'--preload',str(private/'stage/lib')+'@/lib','--js-output='+str(candidate/'packs/engine.js'),'--no-node'],check=True)
old=json.loads(re.search(r'=\s*(\{[\s\S]*\});',(before/'sw-manifest.js').read_text())[1]);files={};gz={}
for p in sorted(candidate.rglob('*')):
    name=p.relative_to(candidate).as_posix()
    if not p.is_file() or name in ['sw.js','sw-manifest.js','Jugar.bat','serve.py'] or name.endswith('.gz'):continue
    data=p.read_bytes();rev=hashlib.sha256(data).hexdigest()[:12];files[name]=rev
    if name.endswith(('.wasm','.data')):
        if old['files'].get(name)==rev and name in old['gz'] and (candidate/(name+'.gz')).exists():
            assert gzip.decompress((candidate/(name+'.gz')).read_bytes())==data;gz[name]=old['gz'][name]
        else:
            packed=gzip.compress(data,9,mtime=0)
            if len(packed)<.9*len(data):replace(name+'.gz',packed) if (candidate/(name+'.gz')).exists() else (candidate/(name+'.gz')).write_bytes(packed);gz[name]={'size':len(data),'gzSize':len(packed)}
version=hashlib.sha256(json.dumps(files,sort_keys=True).encode()).hexdigest()[:12]
manifest={'version':version,'coi':old['coi'],'precache':[f for f in files if not f.endswith(('.wasm','.data','.mp3')) and f!='xash3d.html'],'files':files,'gz':gz}
replace('sw-manifest.js',('self.COF_MANIFEST = '+json.dumps(manifest,indent=1)+';\n').encode())
replace('sw.js',(repo/'platform/web/sw.js').read_bytes().replace(b'__COF_SW_VERSION__',version.encode()))
modules={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (private/'stage/lib').iterdir()}
proof={'manifest':version,'modules':modules,'changedResources':[n for n,sha in files.items() if old['files'].get(n)!=sha]}
(repo/'build/validation/visual-clothes-2026-11-07'/f'{candidate.name}.json').write_text(json.dumps(proof,indent=2))
print(json.dumps(proof))
