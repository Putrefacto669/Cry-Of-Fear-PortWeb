from pathlib import Path
repo=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web')
p=repo/'game/cof-logic/client/cof_client.cpp'
s=p.read_text(encoding='utf-8-sig')
s=s.replace('// CoF_ClientDrawTransparent from HUD_DrawTransparentTriangles.', '// CoF_ClientDrawTransparent from HUD_DrawTransparentTriangles.\n// V_CalcRefdef refreshes the flashlight before the renderer marks world surfaces.')
s=s.replace('static void Flashlight_Frame( float now, float dt )','static void Flashlight_Frame( float now, float dt, const float *vieworg, const float *viewangles )')
a='\tgEngfuncs.pEventAPI->EV_LocalPlayerViewheight( org );\n\tVectorAdd( org, player->origin, org );\n\tgEngfuncs.GetViewAngles( angles );'
assert s.count(a)==1
s=s.replace(a,'\tVectorCopy( vieworg, org );\n\tVectorCopy( viewangles, angles );')
a='\tFlashlight_Frame( now, dt );'
assert s.count(a)==1
s=s.replace(a,'')
s+='\n// Dynamic lights must exist before R_PushDlights/R_DrawWorld. Allocating them\n// in HUD_DrawNormalTriangles is too late, and a 0.1 s light expires between\n// frames below 10 FPS. Use the actual view, including scripted cameras.\nvoid CoF_ClientFlashlightView( const float *org, const float *angles, float dt )\n{\n\tFlashlight_Frame( gEngfuncs.GetClientTime(), dt, org, angles );\n}\n'
p.write_text(s)
p=Path('/root/cof-audits/audit-D3Kl5uly/game/hlsdk-portable/cl_dll/view.cpp')
s=p.read_text()
a='void DLLEXPORT V_CalcRefdef( struct ref_params_s *pparams )\n{'
assert s.count(a)==1
s=s.replace(a,'void CoF_ClientFlashlightView( const float *org, const float *angles, float dt );\n\n'+a)
a='\t\tV_CalcNormalRefdef( pparams );\n\t}\n/*'
assert s.count(a)==1
s=s.replace(a,'\t\tV_CalcNormalRefdef( pparams );\n\t}\n\tCoF_ClientFlashlightView( pparams->vieworg, pparams->viewangles, pparams->frametime );\n/*')
p.write_text(s)
