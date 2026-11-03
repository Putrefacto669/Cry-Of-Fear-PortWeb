from pathlib import Path
p=Path('/root/cof-audits/audit-D3Kl5uly/game/hlsdk-portable/cl_dll/entity.cpp');s=p.read_text();a='\tVectorCopy( ppcd->vuser3, pcd->vuser3 );';b='''#ifdef __EMSCRIPTEN__
 // SP vuser3 is authoritative movement state, not predicted ammo metadata.
 if(gEngfuncs.GetMaxClients()>1)
#endif
 VectorCopy( ppcd->vuser3, pcd->vuser3 );''';assert a in s;s=s.replace(a,b);p.write_text(s)