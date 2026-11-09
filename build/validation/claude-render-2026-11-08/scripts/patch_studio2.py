#!/usr/bin/env python3
# Cry of Fear studio lighting, second step: fullbright textures by name and the original's choice of
# dynamic lights. Applied on top of patch_modellight.py, to the tree given as argv[1].
import sys
from pathlib import Path

X = Path(sys.argv[1]) / "ref/gl"


def patch(name, old, new):
    p = X / name
    s = p.read_text()
    if s.count(new) == 1 and s.count(old) == 0:
        print(f"{name}: ya aplicado")
        return
    if s.count(old) != 1:
        sys.exit(f"{name}: ancla encontrada {s.count(old)} veces: {old[:70]!r}")
    p.write_text(s.replace(old, new))
    print(f"{name}: ok")


patch("gl_opengl.c", 'CVAR_DEFINE( r_cof_brightvalue, "brightvalue", "1", 0, "Cry of Fear ambient light of models with renderfx 100" );\n',
      'CVAR_DEFINE( r_cof_brightvalue, "brightvalue", "1", 0, "Cry of Fear ambient light of models with renderfx 100" );\n'
      'CVAR_DEFINE_AUTO( cof_fullbrighttextures, "0.5", 0, "Cry of Fear colour of model textures named *fullbright* (0 = lit)" );\n')
patch("gl_opengl.c", "\tgEngfuncs.Cvar_RegisterVariable( &r_cof_brightvalue );\n",
      "\tgEngfuncs.Cvar_RegisterVariable( &r_cof_brightvalue );\n\tgEngfuncs.Cvar_RegisterVariable( &cof_fullbrighttextures );\n")
patch("gl_local.h", "extern convar_t\tr_cof_brightvalue;\n",
      "extern convar_t\tr_cof_brightvalue;\nextern convar_t\tcof_fullbrighttextures;\n")

# --- statistics -----------------------------------------------------------------------------------
patch("gl_studio.c", "\tstruct { int calls, hits, has61, sky, fx; vec3_t ambient, diffuse, lightvec; } last;",
      "\tstruct { int calls, hits, has61, sky, fx, fullbright, lights, far, hidden; vec3_t ambient, diffuse, lightvec; } last;")
patch("gl_studio.c", """	gEngfuncs.Con_Printf( "cof_model_light active=%d calls=%d hits=%d has61=%d sky=%d fx=%d ambient=%.3f,%.3f,%.3f diffuse=%.3f,%.3f,%.3f lightvec=%.2f,%.2f,%.2f\\n",
		g_cofmodel.active, g_cofmodel.last.calls, g_cofmodel.last.hits, g_cofmodel.last.has61, g_cofmodel.last.sky, g_cofmodel.last.fx,""",
      """	gEngfuncs.Con_Printf( "cof_model_light active=%d calls=%d hits=%d has61=%d sky=%d fx=%d fullbright=%d lights=%d far=%d hidden=%d ambient=%.3f,%.3f,%.3f diffuse=%.3f,%.3f,%.3f lightvec=%.2f,%.2f,%.2f\\n",
		g_cofmodel.active, g_cofmodel.last.calls, g_cofmodel.last.hits, g_cofmodel.last.has61, g_cofmodel.last.sky, g_cofmodel.last.fx,
		g_cofmodel.last.fullbright, g_cofmodel.last.lights, g_cofmodel.last.far, g_cofmodel.last.hidden,""")

# --- FUN_1005bd90: which dynamic lights ------------------------------------------------------------
patch("gl_studio.c", """	// the dynamic lights R_StudioEntityLight picked (it also placed the flashlight at the view)
	vec3_t origin;
	Matrix3x4_OriginFromMatrix( g_studio.rotationmatrix, origin );
	g_cofmodel.numlights = Q_min( g_studio.numlocallights, COF_MODEL_LIGHTS );
	for( int l = 0; l < g_cofmodel.numlights; l++ )
	{
		const dlight_t *el = g_studio.locallight[l];""", """	// FUN_1005bd90: the first 4 live lights, in order, that reach the model's origin and that a world-only
	// point trace from the origin to the light does not block; the player's own flashlight always lights
	// the player's model. R_StudioEntityLight already moved the lights to their entities and the
	// flashlight to the view (it skips everything with r_dynamic 0, and so does this).
	vec3_t origin;
	const dlight_t *picked[COF_MODEL_LIGHTS];
	Matrix3x4_OriginFromMatrix( g_studio.rotationmatrix, origin );
	g_cofmodel.numlights = 0;
	for( int lnum = 0; r_dynamic->value && lnum < MAX_ELIGHTS && g_cofmodel.numlights < COF_MODEL_LIGHTS; lnum++ )
	{
		dlight_t *el = &tr.elights[lnum];

		if( el->die < g_studio.time || el->radius <= 0.0f )
			continue;

		qboolean own = el->key == COF_SPOT_KEY && RP_LOCALCLIENT( ent );
		if( !own )
		{
			vec3_t d;
			VectorSubtract( origin, el->origin, d );
			// the flashlight's reach is its cone (R_CofSpotFactor, 700 units), not its elight radius
			if( el->key != COF_SPOT_KEY && DotProduct( d, d ) > el->radius * el->radius )
			{
				g_cofmodel.last.far++;
				continue;
			}
			pmtrace_t trace = gEngfuncs.CL_TraceLine( origin, el->origin, PM_WORLD_ONLY );
			if( trace.allsolid || trace.fraction < 1.0f )
			{
				g_cofmodel.last.hidden++;
				continue;
			}
		}
		picked[g_cofmodel.numlights++] = el;
	}
	g_cofmodel.last.lights += g_cofmodel.numlights;
	for( int l = 0; l < g_cofmodel.numlights; l++ )
	{
		const dlight_t *el = picked[l];""")

# --- 10065ef0: textures named *fullbright* (corona_ flickers) ------------------------------------
patch("gl_studio.c", """		g_nFaceFlags = ptexture[pskinref[pmesh[j].skinref]].flags | g_nForceFaceFlags;

		// fill in sortedmesh info""", """		g_nFaceFlags = ptexture[pskinref[pmesh[j].skinref]].flags | g_nForceFaceFlags;

		// Cry of Fear (10065ef0): a texture named *fullbright* (also fullbright_mess, the phone's screen) is
		// not lit: its colour is cof_fullbrighttextures (0.5, x2 when drawn); corona_ adds +-0.1 per vertex
		const char *cof_texname = ptexture[pskinref[pmesh[j].skinref]].name;
		float cof_fullbright = -1.0f;
		qboolean cof_corona = false;
		if( g_cofmodel.active && cof_fullbrighttextures.value != 0.0f && Q_strstr( cof_texname, "fullbright" ))
		{
			cof_fullbright = cof_fullbrighttextures.value;
			cof_corona = Q_strstr( cof_texname, "corona_" ) != NULL;
			g_cofmodel.last.fullbright++;
		}

		// fill in sortedmesh info""")

patch("gl_studio.c", """				float lv_tmp;
				if( g_cofmodel.active )
				{
					if( FBitSet( m_pStudioHeader->flags, STUDIO_HAS_BONEWEIGHTS ))""", """				float lv_tmp;
				if( cof_fullbright >= 0.0f )
				{
					float v = cof_fullbright + ( cof_corona ? gEngfuncs.COM_RandomFloat( -0.1f, 0.1f ) : 0.0f );
					if( FBitSet( g_nFaceFlags, STUDIO_NF_ADDITIVE )) // drawn without the x2
						v = Q_min( v * 2.0f, 1.0f );
					VectorSet( g_studio.lightvalues[k], v, v, v );
					if( FBitSet( g_nFaceFlags, STUDIO_NF_CHROME ))
						R_StudioSetupChrome( g_studio.chrome[k], *pnormbone, (float *)pstudionorms );
					continue;
				}
				if( g_cofmodel.active )
				{
					if( FBitSet( m_pStudioHeader->flags, STUDIO_HAS_BONEWEIGHTS ))""")
