from pathlib import Path
repo=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web')
p=repo/'game/cof-logic/cof/player_cof.cpp';s=p.read_text()
a='\tif( FStrEq( pcmd, "cof_face" ))'
assert s.count(a)==1
s=s.replace(a,'''\tif( FStrEq( pcmd, "cof_weapon_status" ))
\t{
\t\tCBasePlayerItem *item = pPlayer->m_pActiveItem;
\t\tCBasePlayerWeapon *weapon = item && item->GetWeaponPtr() ? (CBasePlayerWeapon *)item->GetWeaponPtr() : NULL;
\t\tint ammo = weapon ? weapon->m_iPrimaryAmmoType : -1;
\t\tALERT( at_console, "COF/WEAPON class=%s clip=%d ammo=%d primary=%g secondary=%g playernext=%g reload=%d buttons=%d health=%g\\n",
\t\t\titem ? STRING( item->pev->classname ) : "none", weapon ? weapon->m_iClip : -1,
\t\t\tammo >= 0 && ammo < MAX_AMMO_SLOTS ? pPlayer->m_rgAmmo[ammo] : -1,
\t\t\tweapon ? weapon->m_flNextPrimaryAttack : 0, weapon ? weapon->m_flNextSecondaryAttack : 0,
\t\t\tpPlayer->m_flNextAttack, weapon ? weapon->m_fInReload : 0, pPlayer->pev->button, pPlayer->pev->health );
\t\treturn true;
\t}
'''+a)
p.write_text(s)
p=Path('/root/cof-audits/audit-D3Kl5uly/engine/xash3d-fwgs/ref/gl/gl_rsurf.c');s=p.read_text()
s=s.replace('double requested, retained, base;','double requested, retained, base, lightmapMs, spotMs;')
s=s.replace('cookie=%dx%d bytes=%d\\n','cookie=%dx%d bytes=%d lightmapMs=%g spotMs=%g\\n')
s=s.replace('r_spotcookie ? r_spotcookie->size : 0 );','r_spotcookie ? r_spotcookie->size : 0, r_spotstats.lightmapMs, r_spotstats.spotMs );')
a='\tfloat tanh = R_SpotTan();';assert s.count(a)==1
s=s.replace(a,a+'\n\tdouble cof_spot_start = r_cofspot_debug && r_cofspot_debug->value ? gEngfuncs.pfnTime() : 0;')
a='\n}\nstatic mextrasurf_t';assert s.count(a)==1
s=s.replace(a,'\n\tif( cof_spot_start ) r_spotstats.spotMs += ( gEngfuncs.pfnTime() - cof_spot_start ) * 1000.0;'+a)
a='static void R_BuildLightMap( const msurface_t *surf, byte *restrict dest, int stride, qboolean dynamic )\n{';assert s.count(a)==1
s=s.replace(a,a+'''
 double cof_lightmap_start = r_cofspot_debug && r_cofspot_debug->value ? gEngfuncs.pfnTime() : 0;
 if( cof_lightmap_start && r_spotstats.frame != tr.framecount ) {
  memset( &r_spotstats, 0, sizeof( r_spotstats )); r_spotstats.frame = tr.framecount;
 }
''')
a='\n}\n\n/*\n=============\nR_DrawTriangleOutlines';assert s.count(a)==1
s=s.replace(a,'\n\tif( cof_lightmap_start ) r_spotstats.lightmapMs += ( gEngfuncs.pfnTime() - cof_lightmap_start ) * 1000.0;'+a)
p.write_text(s)
p=repo/'tools/e2e/test_flashlight_lightmap.py';s=p.read_text()
a="end = s.index('\\n}\\n', start)";assert a in s
s=s.replace(a,"""opening = s.index('{', start)
depth = 0
for index in range(opening, len(s)):
 if s[index] == '{': depth += 1
 elif s[index] == '}':
  depth -= 1
  if depth == 0:
   end = index + 1
   break
else: raise AssertionError('Unbalanced renderer loop')""")
p.write_text(s)
