#!/usr/bin/env python3
# Cry of Fear: studio model lighting of the original client renderer (Xash3D ref/gl + gl2_shim).
# Experimental: applied to the isolated tree given as argv[1] (engine/xash3d-fwgs).
import sys
from pathlib import Path

X = Path(sys.argv[1]) / "ref/gl"


def patch(name, old, new):
    p = X / name
    s = p.read_text()
    if new in s:
        print(f"{name}: ya aplicado")
        return
    if s.count(old) != 1:
        sys.exit(f"{name}: ancla encontrada {s.count(old)} veces: {old[:70]!r}")
    p.write_text(s.replace(old, new))
    print(f"{name}: ok")


# --- gl2_shim: GL_RGB_SCALE of the texture environment (the only TexEnv state it honours) -------
patch("gl2_shim/gl2_shim.c", "\tGLint ufogParams;\n\tGLint uModelView;",
      "\tGLint ufogParams;\n\tGLint urgbscale;\n\tGLint uModelView;")
patch("gl2_shim/gl2_shim.c", "\tGLfloat fogParams[4]; // start, end, linear enabled, reserved\n\tGLfloat alpharef;",
      "\tGLfloat fogParams[4]; // start, end, linear enabled, reserved\n"
      "\tGLfloat rgbscale; // GL_RGB_SCALE of the texture environment (Cry of Fear models: 2)\n\tGLfloat alpharef;")
patch("gl2_shim/gl2_shim.c", '\tprog->ufogParams = pglGetUniformLocationARB( glprog, "uFogParams" );\n',
      '\tprog->ufogParams = pglGetUniformLocationARB( glprog, "uFogParams" );\n'
      '\tprog->urgbscale = pglGetUniformLocationARB( glprog, "uRGBScale" );\n')
patch("gl2_shim/gl2_shim.c", """			if( prog->ufogParams >= 0 )
				pglUniform4fvARB( prog->ufogParams, 1, gl2wrap.fogParams );
			gl2wrap.uchanged = GL_FALSE;""", """			if( prog->ufogParams >= 0 )
				pglUniform4fvARB( prog->ufogParams, 1, gl2wrap.fogParams );
			if( prog->urgbscale >= 0 )
				pglUniform1fARB( prog->urgbscale, gl2wrap.rgbscale );
			gl2wrap.uchanged = GL_FALSE;""")
patch("gl2_shim/gl2_shim.c", "\tgl2wrap.color[0] = 1.f;\n\tgl2wrap.color[1] = 1.f;",
      "\tgl2wrap.rgbscale = 1.f;\n\tgl2wrap.color[0] = 1.f;\n\tgl2wrap.color[1] = 1.f;")
patch("gl2_shim/gl2_shim.c", """static void APIENTRY GL2_TexEnvi(GLenum target, GLenum pname, GLint param)
{
}

static void APIENTRY GL2_TexEnvf(GLenum target, GLenum pname, GLfloat param)
{
}""", """// Only GL_RGB_SCALE is emulated (Cry of Fear: models are texture x colour x 2, gl_studio.c);
// the combine modes stay MODULATE as before
static void APIENTRY GL2_TexEnvf(GLenum target, GLenum pname, GLfloat param)
{
	if( target == GL_TEXTURE_ENV && pname == GL_RGB_SCALE_ARB && gl2wrap.rgbscale != param )
	{
		gl2wrap.rgbscale = param;
		gl2wrap.uchanged = GL_TRUE;
	}
}

static void APIENTRY GL2_TexEnvi(GLenum target, GLenum pname, GLint param)
{
	GL2_TexEnvf( target, pname, (GLfloat)param );
}""")
patch("gl2_shim/gl2_shim.c", """	if( FBitSet( prog->flags, BIT( GL2_ATTR_TEXCOORD1 )) && prog->utex1 >= 0 )
		pglUniform1iARB( prog->utex1, 1 );
""", """	if( FBitSet( prog->flags, BIT( GL2_ATTR_TEXCOORD1 )) && prog->utex1 >= 0 )
		pglUniform1iARB( prog->utex1, 1 );
	if( prog->urgbscale >= 0 )
		pglUniform1fARB( prog->urgbscale, gl2wrap.rgbscale ); // never left at the GLSL default of 0
""")
patch("gl2_shim/fragment.glsl.inc", '"uniform PREC vec4 uColor;\\n"\n',
      '"uniform PREC vec4 uColor;\\n"\n"uniform PREC float uRGBScale;\\n"\n')
patch("gl2_shim/fragment.glsl.inc", '"#if FEAT_ALPHA_TEST\\n"\n"if(c.a <= uAlphaTest)\\n"',
      '"c.rgb = min(c.rgb * uRGBScale, vec3(1.0));\\n"\n"#if FEAT_ALPHA_TEST\\n"\n"if(c.a <= uAlphaTest)\\n"')

# --- cvars ---------------------------------------------------------------------------------------
patch("gl_opengl.c", 'CVAR_DEFINE( gl_cof_contrast, "gl_contrast", "1", 0, "Cry of Fear lightmap contrast (up to 2)" );\n',
      'CVAR_DEFINE( gl_cof_contrast, "gl_contrast", "1", 0, "Cry of Fear lightmap contrast (up to 2)" );\n'
      'CVAR_DEFINE_AUTO( r_cof_modellight, "1", 0, "light studio models like the Cry of Fear client (gl_studio.c)" );\n'
      'CVAR_DEFINE( gl_cof_lambert, "gl_lambert", "2", 0, "Cry of Fear model shading wrap (original default 2)" );\n'
      'CVAR_DEFINE( r_cof_brightvalue, "brightvalue", "1", 0, "Cry of Fear ambient light of models with renderfx 100" );\n')
patch("gl_opengl.c", "\tgEngfuncs.Cvar_RegisterVariable( &gl_cof_contrast );\n",
      "\tgEngfuncs.Cvar_RegisterVariable( &gl_cof_contrast );\n"
      "\tgEngfuncs.Cvar_RegisterVariable( &r_cof_modellight );\n"
      "\tgEngfuncs.Cvar_RegisterVariable( &gl_cof_lambert );\n"
      "\tgEngfuncs.Cvar_RegisterVariable( &r_cof_brightvalue );\n")
patch("gl_local.h", "extern convar_t\tgl_cof_contrast;\n",
      "extern convar_t\tgl_cof_contrast;\n"
      "extern convar_t\tr_cof_modellight;\n"
      "extern convar_t\tgl_cof_lambert;\n"
      "extern convar_t\tr_cof_brightvalue;\n")
patch("gl_local.h", "float R_CofSpotFactor( const vec3_t point, vec3_t color );\n",
      "float R_CofSpotFactor( const vec3_t point, vec3_t color );\n"
      "float R_CofCurve( float x );\n")
patch("gl_rsurf.c", "*/\nstatic float R_CofCurve( float x )\n", "*/\nfloat R_CofCurve( float x ) // also lights the models (gl_studio.c)\n")

# --- the model lighting --------------------------------------------------------------------------
patch("gl_studio.c", """/*
===============
R_StudioSetupLighting

===============
*/
static void R_StudioSetupLighting( alight_t *plight )
{""", r"""/*
===============
Cry of Fear model lighting

The original client draws studio models with its own renderer (gl_renderer 1 and gl_modelrenderer 1,
both on by default): it does not call the engine's StudioDynamicLight/EntityLight/SetupLighting
(client.dll FUN_1008c650) and lights the model itself.
  FUN_10065710/FUN_10065890: from the centre of the bbox, 256 units down (up with EF_INVLIGHT), the
      nearest luxel of the first world surface hit gives
        - with layer 61: ambient = a * k, diffuse = d * k, k = curve( s ) / s, s = 2 * ( a + d * z ),
          and the direction of layer 63 in world space (s * (r*2-1) + t * (g*2-1) + n * (b*2-1));
        - without it: ambient = curve( layer 0 ) * 0.5, no diffuse;
        - nothing hit: ambient = diffuse = curve( sv_skycolor / 255 ) * 0.25 from above.
  FUN_100678d0: renderfx 100 = brightvalue, renderfx 101-200 = ( renderfx - 100 ) / 100 of ambient,
      up to 4 dynamic lights: curve( colour ) * 0.5 with 1 - dist^2 / radius^2 at each bone.
  FUN_10068d70, per vertex: colour = ambient + diffuse, minus diffuse * ( cos + l - 1 ) / l when that is
      positive (l = gl_lambert, 2), plus the dynamic lights; scaled down by its brightest channel.
  FUN_100687d0: texture x colour x 2 (GL_COMBINE MODULATE, GL_RGB_SCALE 2), like the world.
curve() is the one of the world lightmaps (gl_rsurf.c R_CofCurve). No engine gamma table.
===============
*/
#define COF_MODEL_LIGHTS 4
static struct
{
	qboolean active;
	vec3_t ambient, diffuse;
	vec3_t lightvec;	// the direction the light travels, world space
	vec3_t blightvec[MAXSTUDIOBONES];
	int numlights;
	vec3_t wlightdir[COF_MODEL_LIGHTS], wlightcolor[COF_MODEL_LIGHTS];	// at the model origin
	vec3_t blightdir[COF_MODEL_LIGHTS][MAXSTUDIOBONES];	// from the light to the bone, bone space
	vec3_t blightcolor[COF_MODEL_LIGHTS][MAXSTUDIOBONES];	// colour x attenuation at the bone
	struct { int calls, hits, has61, sky, fx; vec3_t ambient, diffuse, lightvec; } last;
} g_cofmodel;

static qboolean R_CofModelLightPoint( model_t *model, mnode_t *node, const vec3_t start, const vec3_t end, float *out )
{
	if( !node || node->contents < 0 )
		return false;

	float front = PlaneDiff( start, node->plane );
	float back = PlaneDiff( end, node->plane );
	int side = front < 0;

	if(( back < 0 ) == side )
		return R_CofModelLightPoint( model, node_child( node, side, model ), start, end, out );

	vec3_t mid;
	VectorLerp( start, front / ( front - back ), end, mid );

	if( R_CofModelLightPoint( model, node_child( node, side, model ), start, mid, out ))
		return true;

	int first = node_firstsurface( node, model );
	int num = node_numsurfaces( node, model );

	for( int i = 0; i < num; i++ )
	{
		const msurface_t *surf = &model->surfaces[first + i];
		const mextrasurf_t *info = surf->info;

		if( FBitSet( surf->flags, SURF_DRAWSKY|SURF_DRAWTILED ) || !surf->samples )
			continue;

		int s = (int)( DotProduct( mid, info->lmvecs[0] ) + info->lmvecs[0][3] ) - (int)info->lightmapmins[0];
		int t = (int)( DotProduct( mid, info->lmvecs[1] ) + info->lmvecs[1][3] ) - (int)info->lightmapmins[1];

		if( s < 0 || t < 0 || s > info->lightextents[0] || t > info->lightextents[1] )
			continue;

		int sample_size = gEngfuncs.Mod_SampleSizeForFace( surf );
		int smax = ( info->lightextents[0] / sample_size ) + 1;
		int tmax = ( info->lightextents[1] / sample_size ) + 1;
		const color24 *lm = surf->samples + ( t / sample_size ) * smax + ( s / sample_size );
		vec3_t layer0 = { 0 }, ambient = { 0 }, diffuse = { 0 }, dir = { 0 };
		float z = 0.0f; // layer 61 without 63 reads a stale value in the original; never seen in CoF maps
		qboolean has61 = false;

		for( int map = 0; map < MAXLIGHTMAPS && surf->styles[map] != 255; map++, lm += smax * tmax )
		{
			vec3_t c = { lm->r / 255.0f, lm->g / 255.0f, lm->b / 255.0f };

			switch( surf->styles[map] )
			{
			case 0: VectorCopy( c, layer0 ); break;
			case 61: VectorCopy( c, ambient ); has61 = true; break;
			case 62: VectorCopy( c, diffuse ); break;
			case 63:
			{
				vec3_t sv, tv, nv;
				VectorNormalize2( surf->texinfo->vecs[0], sv );
				VectorNormalize2( surf->texinfo->vecs[1], tv );
				if( FBitSet( surf->flags, SURF_PLANEBACK ))
					VectorNegate( surf->plane->normal, nv );
				else VectorCopy( surf->plane->normal, nv );
				VectorClear( dir );
				VectorMA( dir, c[0] * 2.0f - 1.0f, sv, dir );
				VectorMA( dir, c[1] * 2.0f - 1.0f, tv, dir );
				z = c[2] * 2.0f - 1.0f;
				VectorMA( dir, z, nv, dir );
				break;
			}
			}
		}

		memset( out, 0, sizeof( float ) * 9 );
		if( !has61 )
		{
			for( int k = 0; k < 3; k++ )
				out[k] = R_CofCurve( layer0[k] ) * 0.5f;
		}
		else
		{
			for( int k = 0; k < 3; k++ )
			{
				float sum = 2.0f * ( ambient[k] + diffuse[k] * z );
				float scale = sum != 0.0f ? R_CofCurve( sum ) / sum : 0.0f;
				out[k] = ambient[k] * scale;
				out[3 + k] = diffuse[k] * scale;
			}
			VectorCopy( dir, &out[6] );
			g_cofmodel.last.has61++;
		}
		return true;
	}

	return R_CofModelLightPoint( model, node_child( node, !side, model ), mid, end, out );
}

static void R_CofModelSetupLighting( cl_entity_t *ent )
{
	model_t *world = WORLDMODEL;
	float light[9] = { 0 };
	vec3_t start, end;

	g_cofmodel.last.calls++;
	for( int k = 0; k < 3; k++ )
		start[k] = ent->origin[k] + ( ent->curstate.mins[k] + ent->curstate.maxs[k] ) * 0.5f;
	VectorCopy( start, end );
	end[2] += FBitSet( ent->curstate.effects, EF_INVLIGHT ) ? 256.0f : -256.0f;

	if( !world || !world->lightdata )
	{
		VectorSet( light, 0.5f, 0.5f, 0.5f );
	}
	else if( R_CofModelLightPoint( world, world->nodes, start, end, light ))
	{
		g_cofmodel.last.hits++;
	}
	else
	{
		const movevars_t *mv = gp_movevars;
		g_cofmodel.last.sky++;
		for( int k = 0; k < 3; k++ )
			light[k] = light[3 + k] = R_CofCurve( mv->skycolor[k] / 255.0f ) * 0.25f;
		VectorSet( &light[6], 0.0f, 0.0f, 1.0f );
	}

	VectorCopy( &light[0], g_cofmodel.ambient );
	VectorCopy( &light[3], g_cofmodel.diffuse );
	VectorNegate( &light[6], g_cofmodel.lightvec );

	// FUN_100678d0: the muzzle flashes, and ambient chosen by the mapper
	if( ent->model && ( !Q_stricmp( ent->model->name, "models/flash1.mdl" ) || !Q_stricmp( ent->model->name, "models/flash2.mdl" )))
		VectorSet( g_cofmodel.ambient, 0.15f, 0.15f, 0.15f );
	int fx = ent->curstate.renderfx;
	if( fx == 100 )
		VectorSet( g_cofmodel.ambient, r_cof_brightvalue.value, r_cof_brightvalue.value, r_cof_brightvalue.value );
	else if( fx > 100 && fx <= 200 && fx != 101 && fx != 137 && fx != 167 )
		VectorSet( g_cofmodel.ambient, ( fx - 100 ) / 100.0f, ( fx - 100 ) / 100.0f, ( fx - 100 ) / 100.0f );
	if( fx >= 100 && fx <= 200 ) g_cofmodel.last.fx++;

	for( int i = 0; i < m_pStudioHeader->numbones; i++ )
		Matrix3x4_VectorIRotate( g_studio.lighttransform[i], g_cofmodel.lightvec, g_cofmodel.blightvec[i] );

	// the dynamic lights R_StudioEntityLight picked (it also placed the flashlight at the view)
	vec3_t origin;
	Matrix3x4_OriginFromMatrix( g_studio.rotationmatrix, origin );
	g_cofmodel.numlights = Q_min( g_studio.numlocallights, COF_MODEL_LIGHTS );
	for( int l = 0; l < g_cofmodel.numlights; l++ )
	{
		const dlight_t *el = g_studio.locallight[l];
		vec3_t color = { R_CofCurve( el->color.r / 255.0f ) * 0.5f, R_CofCurve( el->color.g / 255.0f ) * 0.5f,
			R_CofCurve( el->color.b / 255.0f ) * 0.5f };
		float r2 = el->radius * el->radius;

		for( int b = -1; b < m_pStudioHeader->numbones; b++ )
		{
			vec3_t pos, d, tint = { 1.0f, 1.0f, 1.0f };
			float atten;

			if( b < 0 ) VectorCopy( origin, pos );
			else VectorSet( pos, g_studio.lighttransform[b][0][3], g_studio.lighttransform[b][1][3], g_studio.lighttransform[b][2][3] );

			VectorSubtract( pos, el->origin, d );
			if( el->key == COF_SPOT_KEY )
				atten = R_CofSpotFactor( pos, tint ) > 0.0f ? 1.0f : 0.0f; // tint carries the cone
			else
				atten = Q_max( 0.0f, 1.0f - DotProduct( d, d ) / r2 );
			VectorNormalize( d );

			float *dir = b < 0 ? g_cofmodel.wlightdir[l] : g_cofmodel.blightdir[l][b];
			float *col = b < 0 ? g_cofmodel.wlightcolor[l] : g_cofmodel.blightcolor[l][b];
			if( b < 0 ) VectorCopy( d, dir );
			else Matrix3x4_VectorIRotate( g_studio.lighttransform[b], d, dir );
			for( int k = 0; k < 3; k++ )
				col[k] = color[k] * tint[k] * atten;
		}
	}
	g_studio.numlocallights = 0; // R_LightLambert must not add them again with the engine's gamma

	VectorCopy( g_cofmodel.ambient, g_cofmodel.last.ambient );
	VectorCopy( g_cofmodel.diffuse, g_cofmodel.last.diffuse );
	VectorCopy( g_cofmodel.lightvec, g_cofmodel.last.lightvec );
}

// FUN_10068d70
static void R_CofModelLighting( vec3_t out, int bone, int flags, const vec3_t normal )
{
	if( FBitSet( flags, STUDIO_NF_FULLBRIGHT ))
	{
		VectorSet( out, 1.0f, 1.0f, 1.0f ); // drawn without the x2 (R_StudioDrawPoints)
		return;
	}

	if( FBitSet( flags, STUDIO_NF_FLATSHADE ))
	{
		VectorMA( g_cofmodel.ambient, 0.8f, g_cofmodel.diffuse, out );
	}
	else
	{
		const float *lightvec = bone < 0 ? g_cofmodel.lightvec : g_cofmodel.blightvec[bone];
		float l = Q_max( 1.0f, gl_cof_lambert.value );
		float lightcos = Q_min( DotProduct( normal, lightvec ), 1.0f );
		float f = ( lightcos + ( l - 1.0f )) / l;

		VectorAdd( g_cofmodel.ambient, g_cofmodel.diffuse, out );
		if( f > 0.0f )
			VectorMA( out, -f, g_cofmodel.diffuse, out );
		for( int k = 0; k < 3; k++ )
			out[k] = Q_max( out[k], 0.0f );

		for( int i = 0; i < g_cofmodel.numlights; i++ )
		{
			const float *dir = bone < 0 ? g_cofmodel.wlightdir[i] : g_cofmodel.blightdir[i][bone];
			const float *col = bone < 0 ? g_cofmodel.wlightcolor[i] : g_cofmodel.blightcolor[i][bone];
			float r = -DotProduct( normal, dir );
			if( r > 0.0f )
				VectorMA( out, r, col, out );
		}
	}

	float brightest = Q_max( out[0], Q_max( out[1], out[2] ));
	if( brightest > 1.0f )
		VectorScale( out, 1.0f / brightest, out );

	// additive meshes are drawn without the x2: give them their doubled colour here
	if( FBitSet( flags, STUDIO_NF_ADDITIVE ))
		for( int k = 0; k < 3; k++ )
			out[k] = Q_min( out[k] * 2.0f, 1.0f );
}

static void R_CofModelStats_f( void )
{
	gEngfuncs.Con_Printf( "cof_model_light active=%d calls=%d hits=%d has61=%d sky=%d fx=%d ambient=%.3f,%.3f,%.3f diffuse=%.3f,%.3f,%.3f lightvec=%.2f,%.2f,%.2f\n",
		g_cofmodel.active, g_cofmodel.last.calls, g_cofmodel.last.hits, g_cofmodel.last.has61, g_cofmodel.last.sky, g_cofmodel.last.fx,
		g_cofmodel.last.ambient[0], g_cofmodel.last.ambient[1], g_cofmodel.last.ambient[2],
		g_cofmodel.last.diffuse[0], g_cofmodel.last.diffuse[1], g_cofmodel.last.diffuse[2],
		g_cofmodel.last.lightvec[0], g_cofmodel.last.lightvec[1], g_cofmodel.last.lightvec[2] );
	memset( &g_cofmodel.last, 0, sizeof( g_cofmodel.last ));
}

/*
===============
R_StudioSetupLighting

===============
*/
static void R_StudioSetupLighting( alight_t *plight )
{""")

patch("gl_studio.c", """	VectorCopy( plight->color, g_studio.lightcolor );
}""", """	VectorCopy( plight->color, g_studio.lightcolor );

	// Cry of Fear: the client's own model lighting; the envpos sky and engine effects keep Xash's
	{
		static qboolean registered;
		cl_entity_t *ent = RI.currententity;

		if( !registered )
		{
			gEngfuncs.Cmd_AddCommand( "cof_model_light", R_CofModelStats_f, "Cry of Fear model lighting of the last frames" );
			registered = true;
		}

		g_cofmodel.active = r_cof_lightmaps.value && r_cof_modellight.value && ent && !R_CoFSkyDrawing()
			&& ent->curstate.renderfx != kRenderFxGlowShell && ent->curstate.renderfx != 137
			&& ent->curstate.rendermode != kRenderTransAdd;
		if( g_cofmodel.active )
			R_CofModelSetupLighting( ent );
	}
}""")

patch("gl_studio.c", """				float lv_tmp;
				if( FBitSet( m_pStudioHeader->flags, STUDIO_HAS_BONEWEIGHTS ))
					R_StudioLighting( &lv_tmp, -1, g_nFaceFlags, g_studio.norms[k] );""", """				float lv_tmp;
				if( g_cofmodel.active )
				{
					if( FBitSet( m_pStudioHeader->flags, STUDIO_HAS_BONEWEIGHTS ))
						R_CofModelLighting( g_studio.lightvalues[k], -1, g_nFaceFlags, g_studio.norms[k] );
					else R_CofModelLighting( g_studio.lightvalues[k], *pnormbone, g_nFaceFlags, (float *)pstudionorms );
					if( FBitSet( g_nFaceFlags, STUDIO_NF_CHROME ))
						R_StudioSetupChrome( g_studio.chrome[k], *pnormbone, (float *)pstudionorms );
					continue;
				}
				if( FBitSet( m_pStudioHeader->flags, STUDIO_HAS_BONEWEIGHTS ))
					R_StudioLighting( &lv_tmp, -1, g_nFaceFlags, g_studio.norms[k] );""")

patch("gl_studio.c", """		R_StudioSetupSkin( m_pStudioHeader, pskinref[pmesh->skinref] );

		R_StudioSubmitMesh( ptricmds, pstudionorms, s, t, shellscale, 0 );
""", """		R_StudioSetupSkin( m_pStudioHeader, pskinref[pmesh->skinref] );

		// Cry of Fear: texture x colour x 2 (R_CofModelLighting)
		if( g_cofmodel.active )
			pglTexEnvf( GL_TEXTURE_ENV, GL_RGB_SCALE_ARB, FBitSet( g_nFaceFlags, STUDIO_NF_FULLBRIGHT|STUDIO_NF_ADDITIVE ) ? 1.0f : 2.0f );

		R_StudioSubmitMesh( ptricmds, pstudionorms, s, t, shellscale, 0 );

		if( g_cofmodel.active )
			pglTexEnvf( GL_TEXTURE_ENV, GL_RGB_SCALE_ARB, 1.0f );
""")
