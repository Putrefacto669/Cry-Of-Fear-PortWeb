"""Unchanged regression contracts; private launch shim only mutes audio and fixes the browser binary."""
import json,os,shutil,subprocess,sys
from pathlib import Path
repo=Path(__file__).resolve().parents[3];private=Path('/root/cof-audits/visual-clothes-20261107')
root=repo/'build/validation/graphics-2026-11-07/regressions';assert not root.exists();root.mkdir()
names=['campaign_entities','manager_entities','sound_entities','camera_entities','train_entities','track_entities','envpos_entities','button_entities','changelevel_entities','trigger_persistence','ambient_persistence','callback_behavior','extras_persistence','extras_interactions','phone_singleplayer_punch','dual_hands','ammo_hud','voice_mix_probe']
env=dict(os.environ,PLAYWRIGHT_BROWSERS_PATH='/root/cof-audits/browser-1.64.1/browsers',COF_SW='1',COF_EXPECT_MANIFEST='40ee67758cbf',COF_EXPECT_SERVER='91ca7418dcdcb520cd1479d77ca6646af79e455158c23f179661a1f46f7954f4')
shim="import {chromium as __cofChromium} from 'playwright';const __cofLaunch=__cofChromium.launch.bind(__cofChromium);__cofChromium.launch=opts=>__cofLaunch({...opts,executablePath:'/root/cof-audits/browser-1.64.1/browsers/chromium-1248/chrome-linux64/chrome',args:['--mute-audio',...(opts?.args||[])]});\n"
summary=[]
for name in names:
    source=repo/'tools/e2e'/f'{name}.mjs';script=private/f'{name}-regression.mjs';script.write_text(shim+source.read_text())
    work=root/name;work.mkdir()
    with (root/f'{name}.log').open('w') as log:
        r=subprocess.run(['/root/emsdk/node/24.19.0_64bit/bin/node',str(script),sys.argv[1],str(work/'result')],cwd=work,stdout=log,stderr=subprocess.STDOUT,env=env)
    summary.append({'suite':name,'exitCode':r.returncode});(root/'summary.json').write_text(json.dumps(summary,indent=2));print(name,r.returncode,flush=True)
print('Regression results:',json.dumps(summary),flush=True)
sys.exit(1 if any(r['exitCode'] for r in summary) else 0)
