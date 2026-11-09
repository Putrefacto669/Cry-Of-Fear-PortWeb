#!/usr/bin/env python3
# Cry of Fear studio lighting, second experimental correction after Codex's review of 7d2f04e9649f:
#  1. the light trace rejects on startsolid (pmtrace_t +4, read at 1005bf99) and fraction < 1
#  2. the flashlight's cone is tested against the model's box before it takes a slot (10084e40/10084b30)
#  3. the -666/-665 exception is for the viewmodel, whose flashlight sits -13 forward / +5 right (100678d0)
#  4. additive meshes keep the x2 combine on texture x colour (no doubled colour with scale 1)
#  5. corona_ draws its random offset per emitted vertex
# Applied on top of patch_modellight.py + patch_studio2.py, to the tree given as argv[1].
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


# --- gl_rsurf.c: the spotlight from any apex, and its frustum against a box ----------------------
patch("gl_rsurf.c", """// for models (gl_studio.c): the strength of the spotlight at a point, and its tint there
float R_CofSpotFactor( const vec3_t point, vec3_t color )
{
	vec3_t d;
	VectorSubtract( point, RI.rvp.vieworigin, d );
	float k = R_SpotAt( d, RI.vforward, RI.vright, RI.vup, 700.0f, R_SpotTan(), color );
	VectorScale( color, k, color );
	return k;
}
""", """// for models (gl_studio.c): the strength of the spotlight at a point, and its tint there
float R_CofSpotFactorFrom( const vec3_t apex, const vec3_t point, vec3_t color )
{
	vec3_t d;
	VectorSubtract( point, apex, d );
	float k = R_SpotAt( d, RI.vforward, RI.vright, RI.vup, 700.0f, R_SpotTan(), color );
	VectorScale( color, k, color );
	return k;
}

float R_CofSpotFactor( const vec3_t point, vec3_t color )
{
	return R_CofSpotFactorFrom( RI.rvp.vieworigin, point, color );
}

// whether the spotlight's volume from 'apex' (the frustum of R_SpotAt: 1 to 700 units ahead) can reach the
// box: the original tests the cone's volume against the model's box before the light takes one of the
// model's 4 slots (client.dll 10084e40 builds it, 10084b30 tests it). Rejects a box that lies entirely
// outside one of the six planes, like a frustum cull.
qboolean R_CofSpotTouchesBox( const vec3_t apex, const vec3_t mins, const vec3_t maxs )
{
	const float tanh = R_SpotTan();
	vec3_t normals[6];
	float dists[6];

	VectorCopy( RI.vforward, normals[0] ); dists[0] = DotProduct( RI.vforward, apex ) + 1.0f;
	VectorNegate( RI.vforward, normals[1] ); dists[1] = -( DotProduct( RI.vforward, apex ) + 700.0f );
	for( int side = 0; side < 4; side++ )
	{
		const float *axis = side < 2 ? RI.vright : RI.vup;
		const float sign = ( side & 1 ) ? 1.0f : -1.0f;
		for( int k = 0; k < 3; k++ )
			normals[2 + side][k] = RI.vforward[k] * tanh + sign * axis[k];
		dists[2 + side] = DotProduct( normals[2 + side], apex );
	}

	for( int p = 0; p < 6; p++ )
	{
		qboolean inside = false;
		for( int c = 0; c < 8 && !inside; c++ )
		{
			vec3_t corner = { ( c & 1 ) ? maxs[0] : mins[0], ( c & 2 ) ? maxs[1] : mins[1], ( c & 4 ) ? maxs[2] : mins[2] };
			inside = DotProduct( normals[p], corner ) >= dists[p];
		}
		if( !inside )
			return false;
	}
	return true;
}
""")
patch("gl_local.h", "float R_CofSpotFactor( const vec3_t point, vec3_t color );\n",
      "float R_CofSpotFactor( const vec3_t point, vec3_t color );\n"
      "float R_CofSpotFactorFrom( const vec3_t apex, const vec3_t point, vec3_t color );\n"
      "qboolean R_CofSpotTouchesBox( const vec3_t apex, const vec3_t mins, const vec3_t maxs );\n")

# --- statistics -----------------------------------------------------------------------------------
patch("gl_studio.c", "\tstruct { int calls, hits, has61, sky, fx, fullbright, lights, far, hidden; vec3_t ambient, diffuse, lightvec; } last;",
      "\tstruct { int calls, hits, has61, sky, fx, fullbright, lights, far, hidden, cone; vec3_t ambient, diffuse, lightvec; } last;")
patch("gl_studio.c", 'fullbright=%d lights=%d far=%d hidden=%d ambient=', 'fullbright=%d lights=%d far=%d hidden=%d cone=%d ambient=')
patch("gl_studio.c", "g_cofmodel.last.lights, g_cofmodel.last.far, g_cofmodel.last.hidden,",
      "g_cofmodel.last.lights, g_cofmodel.last.far, g_cofmodel.last.hidden, g_cofmodel.last.cone,")

# --- 1005bd90: selection -------------------------------------------------------------------------
patch("gl_studio.c", """	// FUN_1005bd90: the first 4 live lights, in order, that reach the model's origin and that a world-only
	// point trace from the origin to the light does not block; the player's own flashlight always lights
	// the player's model. R_StudioEntityLight already moved the lights to their entities and the
	// flashlight to the view (it skips everything with r_dynamic 0, and so does this).
	vec3_t origin;
	const dlight_t *picked[COF_MODEL_LIGHTS];
	Matrix3x4_OriginFromMatrix( g_studio.rotationmatrix, origin );""", """	// FUN_1005bd90: the first 4 live lights, in order, that reach the model's origin, whose cone (spotlights)
	// reaches the model's box, and that a world-only point trace from the origin to the light leaves clear
	// (not startsolid, fraction 1: 1005bf99 reads pmtrace_t +4). The player's flashlight (keys -666/-665
	// in the original) always lights the viewmodel. R_StudioEntityLight already moved the lights to their
	// entities and the flashlight to the view (it skips everything with r_dynamic 0, and so does this).
	vec3_t origin, absmin, absmax;
	const dlight_t *picked[COF_MODEL_LIGHTS];
	const qboolean viewmodel = ent == tr.viewent;
	Matrix3x4_OriginFromMatrix( g_studio.rotationmatrix, origin );
	VectorAdd( ent->origin, ent->curstate.mins, absmin );
	VectorAdd( ent->origin, ent->curstate.maxs, absmax );""")
patch("gl_studio.c", """		qboolean own = el->key == COF_SPOT_KEY && RP_LOCALCLIENT( ent );
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
			{""", """		qboolean own = el->key == COF_SPOT_KEY && viewmodel;
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
			if( el->key == COF_SPOT_KEY && !R_CofSpotTouchesBox( el->origin, absmin, absmax ))
			{
				g_cofmodel.last.cone++;
				continue;
			}
			pmtrace_t trace = gEngfuncs.CL_TraceLine( origin, el->origin, PM_WORLD_ONLY );
			if( trace.startsolid || trace.fraction < 1.0f )
			{""")
# per bone: the viewmodel's flashlight from -13 forward / +5 right
patch("gl_studio.c", """		const dlight_t *el = picked[l];
		vec3_t color = { R_CofCurve( el->color.r / 255.0f ) * 0.5f, R_CofCurve( el->color.g / 255.0f ) * 0.5f,
			R_CofCurve( el->color.b / 255.0f ) * 0.5f };
		float r2 = el->radius * el->radius;
""", """		const dlight_t *el = picked[l];
		vec3_t color = { R_CofCurve( el->color.r / 255.0f ) * 0.5f, R_CofCurve( el->color.g / 255.0f ) * 0.5f,
			R_CofCurve( el->color.b / 255.0f ) * 0.5f };
		float r2 = el->radius * el->radius;
		vec3_t lightorg;

		VectorCopy( el->origin, lightorg );
		if( el->key == COF_SPOT_KEY && viewmodel ) // 100678d0: -13 forward, +5 right of the viewmodel
		{
			VectorMA( lightorg, -13.0f, RI.vforward, lightorg );
			VectorMA( lightorg, 5.0f, RI.vright, lightorg );
		}
""")
patch("gl_studio.c", """			VectorSubtract( pos, el->origin, d );
			if( el->key == COF_SPOT_KEY )
				atten = R_CofSpotFactor( pos, tint ) > 0.0f ? 1.0f : 0.0f; // tint carries the cone""",
      """			VectorSubtract( pos, lightorg, d );
			if( el->key == COF_SPOT_KEY )
				atten = R_CofSpotFactorFrom( lightorg, pos, tint ) > 0.0f ? 1.0f : 0.0f; // tint carries the cone""")

patch("gl_studio.c", "\t\tqboolean cof_corona = false;\n", "")
patch("gl_studio.c", "\t\t\tcof_corona = Q_strstr( cof_texname, \"corona_\" ) != NULL;\n", "")

# --- additive meshes: x2 on texture x colour, like the original's combine -------------------------
patch("gl_studio.c", """	float brightest = Q_max( out[0], Q_max( out[1], out[2] ));
	if( brightest > 1.0f )
		VectorScale( out, 1.0f / brightest, out );

	// additive meshes are drawn without the x2: give them their doubled colour here
	if( FBitSet( flags, STUDIO_NF_ADDITIVE ))
		for( int k = 0; k < 3; k++ )
			out[k] = Q_min( out[k] * 2.0f, 1.0f );
}""", """	float brightest = Q_max( out[0], Q_max( out[1], out[2] ));
	if( brightest > 1.0f )
		VectorScale( out, 1.0f / brightest, out );
}""")
patch("gl_studio.c", """					float v = cof_fullbright + ( cof_corona ? gEngfuncs.COM_RandomFloat( -0.1f, 0.1f ) : 0.0f );
					if( FBitSet( g_nFaceFlags, STUDIO_NF_ADDITIVE )) // drawn without the x2
						v = Q_min( v * 2.0f, 1.0f );
					VectorSet( g_studio.lightvalues[k], v, v, v );""", """					const float v = cof_fullbright; // corona_: R_StudioSetColorArray, per emitted vertex
					VectorSet( g_studio.lightvalues[k], v, v, v );""")
patch("gl_studio.c", """		// Cry of Fear: texture x colour x 2 (R_CofModelLighting)
		if( g_cofmodel.active )
			pglTexEnvf( GL_TEXTURE_ENV, GL_RGB_SCALE_ARB, FBitSet( g_nFaceFlags, STUDIO_NF_FULLBRIGHT|STUDIO_NF_ADDITIVE ) ? 1.0f : 2.0f );
""", """		// Cry of Fear: texture x colour x 2 (R_CofModelLighting), additive meshes too; corona_ flickers per vertex
		if( g_cofmodel.active )
		{
			const char *texname = ptexture[pskinref[pmesh->skinref]].name;
			pglTexEnvf( GL_TEXTURE_ENV, GL_RGB_SCALE_ARB, FBitSet( g_nFaceFlags, STUDIO_NF_FULLBRIGHT ) ? 1.0f : 2.0f );
			g_cof_corona_mesh = cof_fullbrighttextures.value != 0.0f && Q_strstr( texname, "fullbright" ) && Q_strstr( texname, "corona_" );
		}
""")
patch("gl_studio.c", """		if( g_cofmodel.active )
			pglTexEnvf( GL_TEXTURE_ENV, GL_RGB_SCALE_ARB, 1.0f );
""", """		if( g_cofmodel.active )
		{
			pglTexEnvf( GL_TEXTURE_ENV, GL_RGB_SCALE_ARB, 1.0f );
			g_cof_corona_mesh = false;
		}
""")
patch("gl_studio.c", """static void R_StudioSetColorArray( short *ptricmds, vec3_t *pstudionorms, byte *color )
{
	float	*lv = (float *)g_studio.lightvalues[ptricmds[1]];

	color[3] = tr.blend * 255;
	R_LightLambert( g_studio.lightpos[ptricmds[0]], pstudionorms[ptricmds[1]], lv, color );
}""", """// Cry of Fear (10065ef0): a corona_ fullbright texture adds -0.1..+0.1 to each emitted vertex
static qboolean g_cof_corona_mesh;

static void R_StudioSetColorArray( short *ptricmds, vec3_t *pstudionorms, byte *color )
{
	float	*lv = (float *)g_studio.lightvalues[ptricmds[1]];
	vec3_t	corona;

	if( g_cof_corona_mesh )
	{
		const float r = gEngfuncs.COM_RandomFloat( -0.1f, 0.1f );
		for( int k = 0; k < 3; k++ )
			corona[k] = bound( 0.0f, lv[k] + r, 1.0f );
		lv = corona;
	}

	color[3] = tr.blend * 255;
	R_LightLambert( g_studio.lightpos[ptricmds[0]], pstudionorms[ptricmds[1]], lv, color );
}""")
