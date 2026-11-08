import json,re,shutil,sys,hashlib
from pathlib import Path,PurePosixPath
repo=Path(__file__).resolve().parents[3];sys.path.insert(0,str(repo/'tools'))
from stage_map import copy_set,shared_extras_set,boot_set
private=Path('/root/cof-audits/visual-clothes-20261107');baseline=private/'baseline';stage=private/'stage';assert not stage.exists();stage.mkdir()
def unpack(name,destination,prefix):
    text=(baseline/'packs'/f'{name}.js').read_bytes()
    metadata=json.loads(re.search(rb'loadPackage\((\{"files":.*?\})\);',text,re.S)[1])
    data=(baseline/'packs'/f'{name}.data').read_bytes()
    for f in metadata['files']:
        rel=PurePosixPath(f['filename']).relative_to(prefix)
        p=destination/str(rel);p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data[f['start']:f['end']])
lib=private/'published-lib';unpack('engine',lib,'/lib')
unpack('boot',stage/'boot','/rodir');unpack('extras',stage/'shared_extras','/rodir')
maps=json.loads((baseline/'packs/maps.json').read_text())
for name in maps:unpack('map_'+name,stage/'maps'/name,'/rodir')
shutil.copytree(baseline/'mp3',stage/'mp3')
game=Path('/mnt/c/Program Files (x86)/Steam/steamapps/common/Cry of Fear/cryoffear')
menu={'gfx/vgui/menu/unlockables.TGA','gfx/vgui/menu/unlockables_mo.TGA'}
assert menu<=boot_set(game)
copy_set(game,menu,stage/'boot');copy_set(game,shared_extras_set(game),stage/'shared_extras')
build=private/'build'
for target,source in {
 'engine/engine/xash3d.html':baseline/'xash3d.html','engine/engine/xash3d.js':baseline/'xash3d.js','engine/engine/xash3d.wasm':baseline/'xash3d.wasm',
 'engine/filesystem/filesystem_stdio.wasm':lib/'filesystem_stdio.wasm','engine/ref/gl/libref_gles3compat.wasm':lib/'libref_gles3compat.wasm',
 'engine/3rdparty/mainui/libmenu.wasm':lib/'menu.wasm','engine/3rdparty/extras/extras.pk3':stage/'boot/valve/extras.pk3'}.items():
    p=build/target;p.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,p)
proof={'originalModules':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in lib.iterdir()},'maps':maps,'originalModelsAddedToSharedPack':['models/cutscene/simon_clothes.mdl'],'originalBSPsUnmodified':True}
(repo/'build/validation/visual-clothes-2026-11-07/package-inputs.json').write_text(json.dumps(proof,indent=2))
print('Prepared private staging and retained published engine/renderer/filesystem/menu')
