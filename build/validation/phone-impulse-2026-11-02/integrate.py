from pathlib import Path
p=Path('/root/cof-audits/audit-D3Kl5uly/game/hlsdk-portable/cl_dll/view.cpp');s=p.read_text();a='\tV_DropPunchAngle( pparams->frametime, (float *)&g_ev_punchangle );';assert a in s
s=s.replace(a,a+'\n\tCoF_ClientPhonePunchView(pparams->viewangles,pparams->frametime);')
s=s.replace('vec3_t g_ev_punchangle;','vec3_t g_ev_punchangle;\nvoid CoF_ClientPhonePunchView(float *,float);');p.write_text(s)