from pathlib import Path
import json,hashlib,re,subprocess
root=Path(__file__).resolve().parent;repo=root.parents[2];task=Path('/root/cof-audits/extras-20261101');dist=task/'dist-fifth'
sha=lambda b:hashlib.sha256(b).hexdigest()
original=json.loads((root/'installation-correct-paths.json').read_text());game=Path(original['root'])
for row in original['resources']:assert sha((game/row['resource']).read_bytes())==row['sha256']
for row in original['maps']:assert sha((game/'maps'/f"{row['map']}.bsp").read_bytes())==row['sha256']
for name,row in original['libraries'].items():assert sha((game/'cl_dlls'/name).read_bytes())==row['sha256']
meta=json.loads(re.search(r'loadPackage\((\{"files":.*?\})\);',(dist/'packs/engine.js').read_text()).group(1));data=(dist/'packs/engine.data').read_bytes();modules={}
for f in meta['files']:
 b=data[f['start']:f['end']];name=Path(f['filename']).name
 assert b==(task/'stage/lib'/name).read_bytes();modules[name]=sha(b)
mounted=json.loads((root/'extended-final/extras_interactions/result.json').read_text())['modules']
for k,v in mounted.items():assert modules[k]==v
compile=json.loads(Path('/root/cof-audits/audit-D3Kl5uly/build/game/compile_commands.json').read_text())
extras=[e['file'] for e in compile if e['file'].endswith('/extras.cpp') or e['file'].endswith('/cof_extras.cpp')]
assert len(extras)==2,extras
gitcmd=['/mnt/c/Program Files/Git/cmd/git.exe','-C',r'C:\Users\josue\OneDrive\Desktop\Cry Of Fear Web Alpha Version\Cry-Of-Fear-Port-Web']
subprocess.run(gitcmd+['diff','--exit-code','--','dist/'],cwd=repo,check=True,stdout=subprocess.PIPE)
assert not subprocess.check_output(gitcmd+['ls-files','--others','--exclude-standard','dist/'],cwd=repo,text=True).strip()
manifest=json.loads((dist/'sw-manifest.js').read_text().split(' = ',1)[1].rstrip(';\n'))
for f,v in manifest['files'].items():assert sha((dist/f).read_bytes())[:12]==v,f
result={'head':subprocess.check_output(gitcmd+['rev-parse','HEAD'],cwd=repo,text=True).strip(),'originalResourcesUnchanged':23,'originalMapsUnchanged':11,'originalLibrariesUnchanged':2,'packagedModules':modules,'mountedModules':mounted,'compileSources':extras,'privateDist':str(dist),'privateManifest':manifest['version'],'sharedPacks':json.loads((dist/'packs/shared.json').read_text()),'principalDistChanged':False}
assert not (root/'source-verification.json').exists();(root/'source-verification.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))