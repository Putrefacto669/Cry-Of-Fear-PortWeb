#!/usr/bin/env python3
# Cry of Fear studio lighting, Studio 4: corrections after Codex's review of Studio 3 (780fe1662f90).
#  E. corona_ draws from a generator of the renderer's own: COM_RandomFloat shares the engine's lran1 with the server
#  C. the viewmodel's flashlight from the viewmodel entity's origin and angles (pitch inverted), -13 forward/+5 right,
#     and the per-bone ramp of 100678d0: cos( ( a + b ) * 0.3 deg ), ( dot - t ) / ( 1 - t ), times 1 - d^2 / r^2
#  B. the flashlight's radial check before its volume test, and the volume without a near plane (10084e40/10084b30)
# Applied on top of Studio 3 (patch_modellight + patch_studio2 + patch_studio3), to the tree given as argv[1].
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


# --- gl_rsurf.c: the spot's aperture for models, and its volume without the near plane --------------------------
patch("gl_rsurf.c", """// whether the spotlight's volume from 'apex' (the frustum of R_SpotAt: 1 to 700 units ahead) can reach the
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
	{""", """// the flashlight's aperture in degrees (r_cofspot_fov, 50 by default), for the models (gl_studio.c)
float R_CofSpotFov( void )
{
	R_SpotTan(); // finds r_cofspot_fov
	return bound( 1.0f, r_cofspot_fov ? r_cofspot_fov->value : 50.0f, 170.0f );
}

// whether the spotlight's volume from 'apex' can reach the box: the original tests the cone's volume against the
// model's box before the light takes one of the model's 4 slots (client.dll 10084e40 builds it, 10084b30 tests
// it): four side planes through the light, the forward axis turned by +-( 90 - aperture / 2 ) about up and
// right, and a far plane through apex + forward * radius (700 here, the reach of R_SpotAt). There is no near
// plane. A box entirely behind one plane is rejected (10083e90), as in a frustum cull.
qboolean R_CofSpotTouchesBox( const vec3_t apex, const vec3_t mins, const vec3_t maxs )
{
	const float half = DEG2RAD( R_CofSpotFov() * 0.5f );
	vec3_t normals[5];
	float dists[5];

	VectorNegate( RI.vforward, normals[0] ); dists[0] = -( DotProduct( RI.vforward, apex ) + 700.0f );
	for( int side = 0; side < 4; side++ )
	{
		const float *axis = side < 2 ? RI.vright : RI.vup;
		const float sign = ( side & 1 ) ? 1.0f : -1.0f;
		for( int k = 0; k < 3; k++ )
			normals[1 + side][k] = RI.vforward[k] * sinf( half ) + sign * axis[k] * cosf( half );
		dists[1 + side] = DotProduct( normals[1 + side], apex );
	}

	for( int p = 0; p < 5; p++ )
	{""")
patch("gl_local.h", "qboolean R_CofSpotTouchesBox( const vec3_t apex, const vec3_t mins, const vec3_t maxs );\n",
      "qboolean R_CofSpotTouchesBox( const vec3_t apex, const vec3_t mins, const vec3_t maxs );\nfloat R_CofSpotFov( void );\n")

# --- gl_studio.c: selection (B), per bone (C), generator (E) -------------------------------------------------------
patch("gl_studio.c", """			// the flashlight's reach is its cone (R_CofSpotFactor, 700 units), not its elight radius
			if( el->key != COF_SPOT_KEY && DotProduct( d, d ) > el->radius * el->radius )""",
      """			// 1005bd90 tests the distance first; the flashlight's reach is its volume's (700 units, R_SpotAt), not the
			// radius of its elight
			const float reach = el->key == COF_SPOT_KEY ? 700.0f : el->radius;
			if( DotProduct( d, d ) > reach * reach )""")
patch("gl_studio.c", """		VectorCopy( el->origin, lightorg );
		if( el->key == COF_SPOT_KEY && viewmodel ) // 100678d0: -13 forward, +5 right of the viewmodel
		{
			VectorMA( lightorg, -13.0f, RI.vforward, lightorg );
			VectorMA( lightorg, 5.0f, RI.vright, lightorg );
		}
""", """		VectorCopy( el->origin, lightorg );
		if( el->key == COF_SPOT_KEY && viewmodel )
		{
			// 100678d0 (100682a8-10068392): the viewmodel entity's origin and angles, pitch inverted, then
			// origin - 13 * forward + 5 * right
			vec3_t angles, forward, right, up;
			VectorCopy( ent->angles, angles );
			angles[PITCH] = -angles[PITCH];
			AngleVectors( angles, forward, right, up );
			VectorMA( ent->origin, -13.0f, forward, lightorg );
			VectorMA( lightorg, 5.0f, right, lightorg );
		}
""")
patch("gl_studio.c", """			VectorSubtract( pos, lightorg, d );
			if( el->key == COF_SPOT_KEY )
				atten = R_CofSpotFactorFrom( lightorg, pos, tint ) > 0.0f ? 1.0f : 0.0f; // tint carries the cone
			else
				atten = Q_max( 0.0f, 1.0f - DotProduct( d, d ) / r2 );""", """			VectorSubtract( pos, lightorg, d );
			if( el->key == COF_SPOT_KEY )
			{
				// 100678d0: 1 - d^2 / r^2 over the spot's reach, times a ramp inside its cone around the light's
				// direction (the view): threshold cos( ( a + b ) * 0.3 deg ) (10068254), with both apertures from
				// r_cofspot_fov, and ( dot - threshold ) / ( 1 - threshold )
				vec3_t dir;
				const float threshold = cosf( DEG2RAD( 2.0f * R_CofSpotFov() * 0.3f ));
				VectorNormalize2( d, dir );
				const float dot = DotProduct( dir, RI.vforward );
				atten = Q_max( 0.0f, 1.0f - DotProduct( d, d ) / ( 700.0f * 700.0f ));
				atten *= dot >= threshold ? ( dot - threshold ) / ( 1.0f - threshold ) : 0.0f;
			}
			else
				atten = Q_max( 0.0f, 1.0f - DotProduct( d, d ) / r2 );""")
patch("gl_studio.c", """// Cry of Fear (10065ef0): a corona_ fullbright texture adds -0.1..+0.1 to each emitted vertex
static qboolean g_cof_corona_mesh;
""", """// Cry of Fear (10065ef0): a corona_ fullbright texture adds -0.1..+0.1 to each emitted vertex. The draw comes from
// a generator of the renderer's own: COM_RandomFloat shares the engine's lran1 state with the server's
// RANDOM_FLOAT/RANDOM_LONG, so drawing a model would change the game's random sequence (Codex's review of Studio 3).
static qboolean g_cof_corona_mesh;
static uint g_cof_corona_rng = 0x9e3779b9u;

static float R_CofCoronaRandom( float low, float high )
{
	g_cof_corona_rng ^= g_cof_corona_rng << 13; // xorshift32
	g_cof_corona_rng ^= g_cof_corona_rng >> 17;
	g_cof_corona_rng ^= g_cof_corona_rng << 5;
	return low + ( high - low ) * (float)( g_cof_corona_rng >> 8 ) * ( 1.0f / 16777216.0f );
}
""")
patch("gl_studio.c", "\t\tconst float r = gEngfuncs.COM_RandomFloat( -0.1f, 0.1f );\n",
      "\t\tconst float r = R_CofCoronaRandom( -0.1f, 0.1f );\n")
