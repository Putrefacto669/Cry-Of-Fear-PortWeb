// Cry of Fear: client side of game/cof-logic/cof/atmosphere.cpp.
//
// Fog: the engine's TriFog, set every frame (CoFFog message, with a fade).
// Emitters: env_particle sends where and how; the particles live here and
// are drawn as camera-facing quads with the sprite texture (the engine's
// temporary sprites do not show up with the GLES renderer).
//
// hlsdk calls CoF_ClientInit from CHud::Init, CoF_ClientVidInit at each
// level, CoF_ClientFrame from HUD_DrawNormalTriangles and
// CoF_ClientDrawTransparent from HUD_DrawTransparentTriangles.

#include "hud.h"
#include "cl_util.h"
#include "parsemsg.h"
#include "triangleapi.h"
#include "r_efx.h"
#include "cl_entity.h"
#include "com_model.h"
#include <math.h>
#include <string.h>

/*
=====================================================================
fog
=====================================================================
*/
static struct
{
	float color[3];
	float start, end;          // target distances
	float curStart, curEnd;    // what is drawn now
	float fadeFrom, fadeTime;  // client time when the fade started, seconds
	float fromStart, fromEnd;
	int on;
	int drawn;                 // fog is set in the engine
} g_fog;

#define FOG_FAR 12000.0f       // "no fog" while fading in or out

static int __MsgFunc_CoFFog( const char *pszName, int iSize, void *pbuf )
{
	BEGIN_READ( pbuf, iSize );
	int on = READ_BYTE();
	g_fog.color[0] = READ_BYTE();
	g_fog.color[1] = READ_BYTE();
	g_fog.color[2] = READ_BYTE();
	float start = READ_SHORT();
	float end = READ_SHORT();
	float fade = READ_SHORT() / 100.0f;

	// the server repeats the state every two seconds: only a change starts a fade
	if( on == g_fog.on && start == g_fog.start && end == g_fog.end )
		return 1;

	g_fog.fromStart = g_fog.drawn ? g_fog.curStart : FOG_FAR;
	g_fog.fromEnd = g_fog.drawn ? g_fog.curEnd : FOG_FAR;
	g_fog.on = on;
	g_fog.start = on ? start : FOG_FAR;
	g_fog.end = on ? end : FOG_FAR;
	g_fog.fadeFrom = gEngfuncs.GetClientTime();
	g_fog.fadeTime = fade;
	return 1;
}

static void Fog_Frame( void )
{
	float t = g_fog.fadeTime > 0.0f ? ( gEngfuncs.GetClientTime() - g_fog.fadeFrom ) / g_fog.fadeTime : 1.0f;
	if( t < 0.0f ) t = 0.0f;
	if( t > 1.0f ) t = 1.0f;

	g_fog.curStart = g_fog.fromStart + ( g_fog.start - g_fog.fromStart ) * t;
	g_fog.curEnd = g_fog.fromEnd + ( g_fog.end - g_fog.fromEnd ) * t;

	bool want = g_fog.on || t < 1.0f;
	if( want && g_fog.curEnd > g_fog.curStart )
	{
		// the GLES path of the renderer (gl2_shim) only does exponential fog: a density
		// that leaves 5% of the scene at the end distance, exp(-(d * density)^2) = 0.05
		gEngfuncs.pTriAPI->FogParams( 1.73f / g_fog.curEnd, 1 );
		gEngfuncs.pTriAPI->Fog( g_fog.color, g_fog.curStart, g_fog.curEnd, 1 );
		g_fog.drawn = 1;
	}
	else if( g_fog.drawn )
	{
		gEngfuncs.pTriAPI->FogParams( 0.0f, 0 );
		gEngfuncs.pTriAPI->Fog( g_fog.color, 0, 0, 0 );
		g_fog.drawn = 0;
	}
}

/*
=====================================================================
particle emitters
=====================================================================
*/
#define MAX_EMITTERS 32
#define EMIT_RANGE   1500.0f   // only near the player: nobody sees leaves far away

typedef struct
{
	int entity;
	int on;
	float origin[3];
	int sprite;
	float rate, force, life, wind, windYaw, size;
	float color[3];
	float gravity;             // aurora: negative falls (leaves), positive rises (steam)
	int additive;
	float alpha;
	float pending;             // particles owed by the frames so far
} emitter_t;

static emitter_t g_emitters[MAX_EMITTERS];
static float g_lastTime;

#define MAX_PARTICLES 768

typedef struct
{
	float pos[3];
	float vel[3];
	float die, life;           // client time it ends, total seconds
	float size;
	short emitter;             // index in g_emitters; -1 free
	short frame;
} cof_particle_t;

static cof_particle_t g_particles[MAX_PARTICLES];

static cof_particle_t *Particle_Alloc( void )
{
	for( int i = 0; i < MAX_PARTICLES; i++ )
		if( g_particles[i].emitter < 0 )
			return &g_particles[i];
	return NULL;   // full: the emitters just wait
}

static int __MsgFunc_CoFEmit( const char *pszName, int iSize, void *pbuf )
{
	BEGIN_READ( pbuf, iSize );
	int entity = READ_SHORT();
	emitter_t *e = NULL;

	for( int i = 0; i < MAX_EMITTERS && !e; i++ )
		if( g_emitters[i].entity == entity )
			e = &g_emitters[i];
	for( int i = 0; i < MAX_EMITTERS && !e; i++ )
		if( !g_emitters[i].entity )
			e = &g_emitters[i];
	if( !e )
		return 1;

	e->entity = entity;
	e->on = READ_BYTE();
	e->origin[0] = READ_COORD();
	e->origin[1] = READ_COORD();
	e->origin[2] = READ_COORD();
	e->sprite = READ_SHORT();
	e->rate = READ_BYTE();
	e->force = READ_SHORT();
	e->life = READ_SHORT() / 10.0f;
	e->wind = READ_SHORT();
	e->windYaw = READ_SHORT();
	e->size = READ_BYTE();
	e->color[0] = READ_BYTE();
	e->color[1] = READ_BYTE();
	e->color[2] = READ_BYTE();
	e->gravity = READ_SHORT();
	e->additive = READ_BYTE();
	e->alpha = READ_BYTE() / 255.0f;
	return 1;
}

static void Emitters_Frame( float dt )
{
	cl_entity_t *player = gEngfuncs.GetLocalPlayer();
	if( !player || dt <= 0.0f || dt > 0.5f )
		return;

	for( int i = 0; i < MAX_EMITTERS; i++ )
	{
		emitter_t *e = &g_emitters[i];
		if( !e->entity || !e->on || !e->sprite )
			continue;

		float d[3] = { e->origin[0] - player->origin[0], e->origin[1] - player->origin[1], e->origin[2] - player->origin[2] };
		if( d[0] * d[0] + d[1] * d[1] + d[2] * d[2] > EMIT_RANGE * EMIT_RANGE )
			continue;

		// "sprayrate 0..N": on average half of the top rate (the server sends the top)
		e->pending += e->rate * 0.5f * dt;
		float windRad = e->windYaw * ( (float)M_PI / 180.0f );
		while( e->pending >= 1.0f )
		{
			e->pending -= 1.0f;
			float yaw = gEngfuncs.pfnRandomFloat( 0.0f, 2.0f * (float)M_PI );
			float pitch = gEngfuncs.pfnRandomFloat( -0.8f, 0.8f );
			float speed = e->force * 0.3f;
			float vel[3] =
			{
				cosf( yaw ) * cosf( pitch ) * speed + cosf( windRad ) * e->wind * 0.3f,
				sinf( yaw ) * cosf( pitch ) * speed + sinf( windRad ) * e->wind * 0.3f,
				e->gravity * 0.5f + gEngfuncs.pfnRandomFloat( -10.0f, 10.0f )
			};
			cof_particle_t *pt = Particle_Alloc();
			if( !pt )
				return;
			for( int k = 0; k < 3; k++ )
			{
				pt->pos[k] = e->origin[k];
				pt->vel[k] = vel[k];
			}
			pt->life = e->life > 0.1f ? e->life : 0.1f;
			pt->die = gEngfuncs.GetClientTime() + pt->life;
			pt->size = e->size;
			pt->emitter = (short)i;
			pt->frame = (short)gEngfuncs.pfnRandomLong( 0, 10 );
		}
	}

	// move them all; the dead free their slot
	float now = gEngfuncs.GetClientTime();
	for( int j = 0; j < MAX_PARTICLES; j++ )
	{
		cof_particle_t *pt = &g_particles[j];
		if( pt->emitter < 0 )
			continue;
		if( now >= pt->die || !g_emitters[pt->emitter].entity )
		{
			pt->emitter = -1;
			continue;
		}
		for( int k = 0; k < 3; k++ )
			pt->pos[k] += pt->vel[k] * dt;
	}
}

static void Particles_Draw( void )
{
	float angles[3], right[3], up[3];
	gEngfuncs.GetViewAngles( angles );
	gEngfuncs.pfnAngleVectors( angles, NULL, right, up );
	float now = gEngfuncs.GetClientTime();
	triangleapi_t *tri = gEngfuncs.pTriAPI;

	for( int j = 0; j < MAX_PARTICLES; j++ )
	{
		cof_particle_t *pt = &g_particles[j];
		if( pt->emitter < 0 )
			continue;
		emitter_t *e = &g_emitters[pt->emitter];
		struct model_s *model = gEngfuncs.pfnGetModelByIndex( e->sprite );
		if( !model || !tri->SpriteTexture( model, pt->frame % ( model->numframes > 0 ? model->numframes : 1 )))
			continue;

		// additive particles (steam) fade out over their life
		float left = ( pt->die - now ) / pt->life;
		float a = e->additive ? e->alpha * left : e->alpha;
		float h = pt->size * 0.5f;

		tri->RenderMode( e->additive ? kRenderTransAdd : kRenderTransAlpha );
		tri->CullFace( TRI_NONE );
		tri->Begin( TRI_QUADS );
		if( e->additive )
			tri->Color4f( a, a, a, 1.0f );
		else
			tri->Color4f( e->color[0] / 255.0f + 0.25f, e->color[1] / 255.0f + 0.25f, e->color[2] / 255.0f + 0.25f, a );
		const float corners[4][2] = { { -1, -1 }, { -1, 1 }, { 1, 1 }, { 1, -1 } };
		const float uv[4][2] = { { 0, 1 }, { 0, 0 }, { 1, 0 }, { 1, 1 } };
		for( int c = 0; c < 4; c++ )
		{
			tri->TexCoord2f( uv[c][0], uv[c][1] );
			tri->Vertex3f( pt->pos[0] + ( right[0] * corners[c][0] + up[0] * corners[c][1] ) * h,
				pt->pos[1] + ( right[1] * corners[c][0] + up[1] * corners[c][1] ) * h,
				pt->pos[2] + ( right[2] * corners[c][0] + up[2] * corners[c][1] ) * h );
		}
		tri->End();
	}
	tri->RenderMode( kRenderNormal );
	tri->CullFace( TRI_FRONT );
}

/*
=====================================================================
hooks
=====================================================================
*/
// cof_fogtest r g b start end: fog by hand, to compare (cof_fogtest with no arguments: off)
static void CoF_FogTest( void )
{
	if( gEngfuncs.Cmd_Argc() < 6 )
	{
		g_fog.on = 0;
		g_fog.start = g_fog.end = FOG_FAR;
		return;
	}
	for( int i = 0; i < 3; i++ )
		g_fog.color[i] = atof( gEngfuncs.Cmd_Argv( i + 1 ));
	g_fog.on = 1;
	g_fog.start = g_fog.fromStart = atof( gEngfuncs.Cmd_Argv( 4 ));
	g_fog.end = g_fog.fromEnd = atof( gEngfuncs.Cmd_Argv( 5 ));
	g_fog.fadeTime = 0;
}

// cof_emittest: twenty particles of the first emitter 40 units in front of the view
static void CoF_EmitTest( void )
{
	float angles[3], forward[3], view[3];
	gEngfuncs.GetViewAngles( angles );
	gEngfuncs.pfnAngleVectors( angles, forward, NULL, NULL );
	cl_entity_t *player = gEngfuncs.GetLocalPlayer();
	if( !player )
		return;
	for( int k = 0; k < 3; k++ )
		view[k] = player->origin[k] + forward[k] * 40.0f;
	view[2] += 28.0f;

	for( int i = 0; i < MAX_EMITTERS; i++ )
	{
		emitter_t *e = &g_emitters[i];
		if( !e->entity || !e->sprite )
			continue;
		float saved[3] = { e->origin[0], e->origin[1], e->origin[2] };
		int wasOn = e->on;
		e->on = 1;
		e->origin[0] = view[0]; e->origin[1] = view[1]; e->origin[2] = view[2];
		e->pending = 20.0f;
		Emitters_Frame( 0.001f );
		e->origin[0] = saved[0]; e->origin[1] = saved[1]; e->origin[2] = saved[2];
		e->on = wasOn;
		gEngfuncs.Con_Printf( "cof_emittest: emitter %d sprite %d additive %d\n", e->entity, e->sprite, e->additive );
		break;
	}
}

// The renderer consumes these client-owned values; they never change server coordinates.
static const char *skyNames[]={"cof_sky_valid","cof_sky_scale","cof_sky_world_x","cof_sky_world_y","cof_sky_world_z","cof_sky_origin_x","cof_sky_origin_y","cof_sky_origin_z","cof_sky_ambient","cof_sky_direct","gl_customsky"};
static int skyValid;
static char skyLevel[128];
static void SkyReset()
{
 skyValid=0;
 for(int i=0;i<10;i++) gEngfuncs.Cvar_SetValue(skyNames[i],i>=8?-1:0);
}
void CoF_ClientSkyReset()
{
 SkyReset();
 const char *level=gEngfuncs.pfnGetLevelName();
 strncpy(skyLevel,level?level:"",sizeof(skyLevel)-1); skyLevel[sizeof(skyLevel)-1]=0;
}
static void SkyLevel()
{
 const char *level=gEngfuncs.pfnGetLevelName();
 if(strcmp(skyLevel,level?level:"")) CoF_ClientSkyReset();
}
static int SkyWorld(const char*,int size,void *buffer)
{
 SkyLevel();
 BEGIN_READ(buffer,size);
 for(int i=2;i<5;i++) gEngfuncs.Cvar_SetValue(skyNames[i],READ_COORD());
 gEngfuncs.Cvar_SetValue(skyNames[1],READ_COORD());
 skyValid|=1; gEngfuncs.Cvar_SetValue(skyNames[0],skyValid);
 return 1;
}
static int SkyMarker(const char*,int size,void *buffer)
{
 SkyLevel();
 BEGIN_READ(buffer,size);
 for(int i=5;i<8;i++) gEngfuncs.Cvar_SetValue(skyNames[i],READ_COORD());
 int flags=READ_BYTE();
 if(flags&1) gEngfuncs.Cvar_SetValue(skyNames[8],READ_BYTE());
 if(flags&2) gEngfuncs.Cvar_SetValue(skyNames[9],READ_BYTE());
 skyValid|=2; gEngfuncs.Cvar_SetValue(skyNames[0],skyValid);
 return 1;
}
static void SkyStatus()
{
 gEngfuncs.Con_Printf("COF/SKY mask=%d valid=%g scale=%g world=%g,%g,%g sky=%g,%g,%g ambient=%g direct=%g\n",
  skyValid,gEngfuncs.pfnGetCvarFloat(skyNames[0]),gEngfuncs.pfnGetCvarFloat(skyNames[1]),
  gEngfuncs.pfnGetCvarFloat(skyNames[2]),gEngfuncs.pfnGetCvarFloat(skyNames[3]),gEngfuncs.pfnGetCvarFloat(skyNames[4]),
  gEngfuncs.pfnGetCvarFloat(skyNames[5]),gEngfuncs.pfnGetCvarFloat(skyNames[6]),gEngfuncs.pfnGetCvarFloat(skyNames[7]),
  gEngfuncs.pfnGetCvarFloat(skyNames[8]),gEngfuncs.pfnGetCvarFloat(skyNames[9]));
}

// sky models (renderfx 137) the client knows about; "fresh" = in the last packet from the server
static void SkyEntities() {
 cl_entity_t *local=gEngfuncs.GetLocalPlayer();
 int current=local?local->curstate.messagenum:-1,count=0;
 for(int i=1;i<2048;i++) {cl_entity_t *e=gEngfuncs.GetEntityByIndex(i);
  if(e&&e->model&&e->curstate.renderfx==137) {
   count++;gEngfuncs.Con_Printf("COF/SKY_ENTITY id=%d model=%s origin=%g,%g,%g effects=%d fresh=%d\n",i,e->model->name,e->origin[0],e->origin[1],e->origin[2],e->curstate.effects,e->curstate.messagenum==current);
  }
 }
 gEngfuncs.Con_Printf("COF/SKY_ENTITY count=%d\n",count);
}
static void PadlockRenderStatus() {
 int count=0;
 for(int i=1;i<2048;i++) {cl_entity_t *e=gEngfuncs.GetEntityByIndex(i);
  if(e&&e->model&&strstr(e->model->name,"padlock.mdl")) {
   count++;gEngfuncs.Con_Printf("COF/PAD_RENDER id=%d origin=%g,%g,%g effect=%d fx=%d mode=%d amount=%d seq=%d controller=%d,%d,%d,%d\n",i,e->origin[0],e->origin[1],e->origin[2],e->curstate.effects,e->curstate.renderfx,e->curstate.rendermode,e->curstate.renderamt,e->curstate.sequence,e->curstate.controller[0],e->curstate.controller[1],e->curstate.controller[2],e->curstate.controller[3]);
  }
 }
 gEngfuncs.Con_Printf("COF/PAD_RENDER count=%d\n",count);
}
static int PadlockMessage(const char*,int size,void *buffer) { BEGIN_READ(buffer,size); gEngfuncs.Con_Printf("COF/HUD PADLOCK %d\n",READ_BYTE()); return 1; }
void CoF_DecalsInit( void );    // cof_decals.cpp
void CoF_DecalsVidInit( void );
void CoF_ClientInit( void )
{
	CoF_DecalsInit();
 gEngfuncs.pfnHookUserMsg("Padlock",PadlockMessage);
 gEngfuncs.pfnAddCommand("cof_padlock_render",PadlockRenderStatus);
 gEngfuncs.pfnRegisterVariable("cof_padlock_trace","0",0);
 for(int i=0;i<11;i++) gEngfuncs.pfnRegisterVariable(skyNames[i],i==10?"1":i>=8?"-1":"0",0);
 gEngfuncs.pfnHookUserMsg("skymark_w",SkyWorld);
 gEngfuncs.pfnHookUserMsg("skymark_sky",SkyMarker);
 gEngfuncs.pfnAddCommand("cof_sky_status",SkyStatus);
 gEngfuncs.pfnAddCommand("cof_sky_entities",SkyEntities);
	gEngfuncs.pfnAddCommand( "cof_emittest", CoF_EmitTest );
	gEngfuncs.pfnHookUserMsg( "CoFFog", __MsgFunc_CoFFog );
	gEngfuncs.pfnHookUserMsg( "CoFEmit", __MsgFunc_CoFEmit );
	gEngfuncs.pfnAddCommand( "cof_fogtest", CoF_FogTest );
}

void CoF_ClientDrawTransparent( void )
{
	Particles_Draw();
}

void CoF_ClientVidInit( void )
{
 SkyLevel();
	CoF_DecalsVidInit();
	for( int j = 0; j < MAX_PARTICLES; j++ )
		g_particles[j].emitter = -1;
	memset( &g_fog, 0, sizeof( g_fog ));
	g_fog.start = g_fog.end = g_fog.curStart = g_fog.curEnd = FOG_FAR;
	memset( g_emitters, 0, sizeof( g_emitters ));
	g_lastTime = 0.0f;
}

void CoF_ClientFrame( void )
{
	float now = gEngfuncs.GetClientTime();
	float dt = g_lastTime > 0.0f ? now - g_lastTime : 0.0f;
	g_lastTime = now;

	Fog_Frame();
	Emitters_Frame( dt );
}
