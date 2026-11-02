from pathlib import Path
repo=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web')
sdk=Path('/root/cof-audits/audit-D3Kl5uly/game/hlsdk-portable')
def edit(path,old,new,count=1):
 s=path.read_text(); assert s.count(old)==count,(str(path),s.count(old),old);path.write_text(s.replace(old,new))
edit(sdk/'dlls/game.cpp','extern void CoF_RegisterPersistenceCallbacks(void);','extern void CoF_RegisterPersistenceCallbacks(void);\nextern void CoF_RegisterExtras(void);')
edit(sdk/'dlls/game.cpp','\tCoF_RegisterPersistenceCallbacks();','\tCoF_RegisterPersistenceCallbacks();\n\tCoF_RegisterExtras();')
p=sdk/'dlls/player.cpp';s=p.read_text();needle='int CBasePlayer::TakeDamage( entvars_t *pevInflictor, entvars_t *pevAttacker, float flDamage, int bitsDamageType )\n{';assert needle in s;s=s.replace(needle,'extern bool CoF_ExtrasBlocksDamage(CBasePlayer *player);\n'+needle+'\n\tif (CoF_ExtrasBlocksDamage(this)) return 0;');p.write_text(s)
p=sdk/'cl_dll/StudioModelRenderer.cpp';s=p.read_text();s='extern void CoF_CostumeEnd();\n'+s
needle='\t\t\tIEngineStudio.StudioDrawPoints();';assert s.count(needle)==2
s=s.replace(needle,'\t\t\tCoF_CostumeBegin(m_pRenderModel, m_pStudioHeader);\n'+needle+'\n\t\t\tCoF_CostumeEnd();')
# model_t is declared after includes, so declare the typed hook before its first method.
pos=s.index('CStudioModelRenderer::');pos=s.rfind('\n',0,pos);s=s[:pos]+'\nextern void CoF_CostumeBegin(model_t *model, void *header);\n'+s[pos:];p.write_text(s)
edit(repo/'platform/web/index.html','  <script src="hud.js"></script>','  <script src="extras.js"></script>\n  <script src="hud.js"></script>')
edit(repo/'tools/wsl/package.sh','"$WEB/hud.js"','"$WEB/hud.js" "$WEB/extras.js"')
p=repo/'platform/web/hud.js';s=p.read_text()
s=s.replace('  const music = new Map();','  const music = new Map();\n  let commentaryPlaying = false;\n  const commentaryPaused = new Set();\n  window.CoFExtras?.setHooks({\n    begin() { commentaryPlaying = true; for (const audio of music.values()) { if (!audio.paused) commentaryPaused.add(audio); audio.pause(); } },\n    end() { commentaryPlaying = false; for (const audio of commentaryPaused) if ([...music.values()].includes(audio)) audio.play().catch(() => {}); commentaryPaused.clear(); }\n  });')
s=s.replace('    music.set(channel, audio);','    music.set(channel, audio);\n    if (commentaryPlaying) { commentaryPaused.add(audio); return; }')
s=s.replace('  const onMap = (name) => {','  const onMap = (name) => {\n    window.CoFExtras?.onMap();')
s=s.replace('    musicVolume = options.music;','    musicVolume = options.music;\n    window.CoFExtras?.setVolume(musicVolume);')
s=s.replace('  window.CoFHUD = {','  window.CoFHUD = {\n    resolvePath: resolveCi,')
s=s.replace('      const rest = line.trim().slice(cmd.length).trim();','      const rest = line.trim().slice(cmd.length).trim();\n      window.CoFExtras?.handle(cmd, args);')
p.write_text(s)