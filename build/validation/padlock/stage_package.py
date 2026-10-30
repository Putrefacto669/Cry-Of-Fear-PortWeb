from pathlib import Path
import shutil,subprocess,os
w=Path('/root/cof-audits/audit-D3Kl5uly');stage=w/'padlock-stage';original=Path('/mnt/c/Program Files (x86)/Steam/steamapps/common/Cry of Fear/cryoffear')
for sub in ['boot','maps/c_start','maps/c_start2']:
 shutil.copytree(Path('/root/cof-web/stage')/sub,stage/sub,dirs_exist_ok=True)
for rel in ['models/items/padlock.mdl','models/null.mdl','sound/items/padl_turn.wav','sound/items/padl_unlock.wav']:
 dst=stage/'maps/c_start/cryoffear'/rel;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(original/rel,dst)
dst=stage/'boot/cryoffear/gfx/vgui/puzzle/padlock_buttons.tga';dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(original/'gfx/vgui/puzzle/padlock_buttons.tga',dst)
for rel in ['models/items/generic_note.mdl','models/props/inomhusd/cafe_monitor.mdl']:
 dst=stage/'maps/c_start2/cryoffear'/rel;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(original/rel,dst)
pack=Path('/root/emsdk/upstream/emscripten/tools/file_packager')
for name,src,mount in [('boot',stage/'boot','/rodir'),('map_c_start',stage/'maps/c_start','/rodir'),('map_c_start2',stage/'maps/c_start2','/rodir')]:
 subprocess.run([str(pack),str(w/f'dist/packs/{name}.data'),'--preload',str(src)+'@'+mount,'--js-output='+str(w/f'dist/packs/{name}.js'),'--no-node'],check=True)
backup=Path('/root/cof-audits/padlock-baseline');backup.mkdir(exist_ok=True)
for name,src in [('server',w/'build/game/dlls/hl_emscripten_wasm32.wasm'),('client',w/'build/game/cl_dll/client_emscripten_wasm32.wasm')]:
 old=backup/(name+'.wasm')
 if not old.exists():shutil.copy2(w/f'lib/{name}.wasm',old)
 shutil.copy2(src,w/f'lib/{name}.wasm')
subprocess.run([str(pack),str(w/'dist/packs/engine.data'),'--preload',str(w/'lib')+'@/lib','--js-output='+str(w/'dist/packs/engine.js'),'--no-node'],check=True)
shutil.copy2('platform/web/hud.js',w/'dist/hud.js')
