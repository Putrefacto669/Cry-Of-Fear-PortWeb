from pathlib import Path
r=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web')
p=r/'game/cof-logic/client/cof_extras.cpp';s=p.read_text().replace('static int g_costume,g_night,g_lit;','static int g_costume,g_night,g_lit,g_lastVisible=-1;')
s=s.replace('g_costume=g_night=g_lit=0;','g_costume=g_night=g_lit=0;g_lastVisible=-1;')
s=s.replace(' bool active=g_night && !(gHUD.m_iHideHUDDisplay & HIDEHUD_HEALTH);',' bool active=g_night && !(gHUD.m_iHideHUDDisplay & HIDEHUD_HEALTH);\n if(g_lastVisible!=(int)active){g_lastVisible=(int)active;gEngfuncs.Con_Printf("COF/HUD NIGHTVISION %d\\n",active?1:0);}')
p.write_text(s)
p=r/'platform/web/postfx.js';s=p.read_text().replace('gl.uniform1f(loc.uGrey, settings.grey);','// Native client.dll gl_grayscale override while nightvision is visible: 0.6.\n    gl.uniform1f(loc.uGrey, settings.nightvision ? 0.6 : settings.grey);');p.write_text(s)
p=r/'platform/web/extras.js';s=p.read_text().replace('onMap() { stopCommentary();','onMap() { window.CoFPostFX?.set({ nightvision: false }); stopCommentary();');s=s.replace("if (command === 'EXTRAS')", "if (command === 'NIGHTVISION') window.CoFPostFX?.set({ nightvision: args[0] === '1' });\n      else if (command === 'EXTRAS')");p.write_text(s)