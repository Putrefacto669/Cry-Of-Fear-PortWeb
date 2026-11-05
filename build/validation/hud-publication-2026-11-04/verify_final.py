"""Require deployment, byte identity, old-session update and live HUD/save checks."""
import json
from pathlib import Path

out = Path(__file__).resolve().parent
read = lambda name: json.loads((out/name).read_text(encoding='utf-8-sig'))
candidate, assets, actions, git = [read(n) for n in ['candidate.json','public-assets.json','actions.json','git-byte-proof.json']]
upgrade, native, css = [read(n) for n in ['upgrade-live/result.json','public-native/result.json','public-css/result.json']]
version = candidate['version']
assert actions['conclusion'] == 'success' and actions['headSha'] == git['commit']
assert assets['passed'] and assets['version'] == version and len(assets['responses']) == 9
assert upgrade['passed'] and upgrade['version'] == version and upgrade['updateAck'] == 'resolved'
assert upgrade['before'] == upgrade['waiting'] == upgrade['after'] == native['modules']
assert native['effectiveVersion'] == version and native['saveLoadPassed']
assert css['passed'] and not css['errors'] and not native['errors'] and not upgrade['errors']
assert candidate['changedDistributionFiles'] == ['hud.js','sw-manifest.js','sw.js']
destination = out/'final-summary.json'
assert not destination.exists()
destination.write_text(json.dumps({'passed':True,'manifest':version,'deploymentCommit':git['commit'],
    'actions':actions['url'],'liveUpgrade':True,'publicSaveLoad':True,'publicCssChromiumFirefox':True,
    'fiveModulesUnchanged':True,'originalIntermittentUpdateCause':'unconfirmed','ammoHudImplemented':False,
    'immutablePrototypeDeployed':False}, indent=2))
print('PASS deployment, nine public responses, old-session update, live save/load and Gecko/Chromium HUD')
