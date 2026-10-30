// Cry of Fear: fog, particle emitters and reflections.
//
// env_fog      distance fog, drawn by the client with the engine's TriFog
// env_particle the "aurora" particle systems (aurora/<name>.aur): falling
//              leaves, sparks; the client spawns the sprites
// func_shine   a reflection sprite over a brush (wet street, glass)
//
// The client side is game/cof-logic/client/cof_client.cpp. The user messages:
//	CoFFog:  byte on, byte r g b, short start, short end, short fade*100
//	CoFEmit: short entity, byte on, coord x y z, short sprite model,
//	         byte max per second, short force, short life*10,
//	         short wind strength, short wind yaw, byte size, byte r g b,
//	         short gravity, byte additive, byte alpha*255

#include "extdll.h"
#include "util.h"
#include "cbase.h"
#include "saverestore.h"
#include "cof_player.h"

static int gmsgCoFFog = 0;
static int gmsgCoFEmit = 0;

void CoF_LinkDecalMessages( void ); // static_decal.cpp

// called from hlsdk's LinkUserMessages, with the messages of Half-Life
void CoF_LinkUserMessages( void )
{
	if( !gmsgCoFFog )
	{
		gmsgCoFFog = REG_USER_MSG( "CoFFog", -1 );
		gmsgCoFEmit = REG_USER_MSG( "CoFEmit", -1 );
	}
	CoF_LinkDecalMessages();
}

/*
=====================================================================
env_fog: on at the start unless something names it; "fadein" and
"fadeout" in seconds
=====================================================================
*/
class CEnvFog : public CPointEntity
{
public:
	void Spawn( void );
	virtual void KeyValue( KeyValueData *pkvd );
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );
	void EXPORT FogThink( void );
	void Send( float fade );
	virtual int Save( CSave &save );
	virtual int Restore( CRestore &restore );
	static TYPEDESCRIPTION m_SaveData[];

	float m_flStart, m_flEnd, m_flFadeIn, m_flFadeOut;
	BOOL m_bOn;
};

LINK_ENTITY_TO_CLASS( env_fog, CEnvFog )

TYPEDESCRIPTION CEnvFog::m_SaveData[] =
{
	DEFINE_FIELD( CEnvFog, m_flStart, FIELD_FLOAT ),
	DEFINE_FIELD( CEnvFog, m_flEnd, FIELD_FLOAT ),
	DEFINE_FIELD( CEnvFog, m_flFadeIn, FIELD_FLOAT ),
	DEFINE_FIELD( CEnvFog, m_flFadeOut, FIELD_FLOAT ),
	DEFINE_FIELD( CEnvFog, m_bOn, FIELD_BOOLEAN ),
};

IMPLEMENT_SAVERESTORE( CEnvFog, CPointEntity )

void CEnvFog::KeyValue( KeyValueData *pkvd )
{
	if( FStrEq( pkvd->szKeyName, "startdist" ))
		m_flStart = atof( pkvd->szValue );
	else if( FStrEq( pkvd->szKeyName, "enddist" ))
		m_flEnd = atof( pkvd->szValue );
	else if( FStrEq( pkvd->szKeyName, "fadein" ))
		m_flFadeIn = atof( pkvd->szValue );
	else if( FStrEq( pkvd->szKeyName, "fadeout" ))
		m_flFadeOut = atof( pkvd->szValue );
	else
	{
		CPointEntity::KeyValue( pkvd );
		return;
	}
	pkvd->fHandled = TRUE;
}

void CEnvFog::Spawn( void )
{
	CPointEntity::Spawn();
	m_bOn = FStringNull( pev->targetname );
	SetThink( &CEnvFog::FogThink );
	pev->nextthink = gpGlobals->time + 1.0f;
}

void CEnvFog::Send( float fade )
{
	if( !gmsgCoFFog )
		return;
	MESSAGE_BEGIN( MSG_ALL, gmsgCoFFog );
		WRITE_BYTE( m_bOn ? 1 : 0 );
		WRITE_BYTE( (int)pev->rendercolor.x );
		WRITE_BYTE( (int)pev->rendercolor.y );
		WRITE_BYTE( (int)pev->rendercolor.z );
		WRITE_SHORT( (int)m_flStart );
		WRITE_SHORT( (int)m_flEnd );
		WRITE_SHORT( (int)( fade * 100.0f ));
	MESSAGE_END();
}

void CEnvFog::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	m_bOn = useType == USE_ON ? TRUE : useType == USE_OFF ? FALSE : !m_bOn;
	Send( m_bOn ? m_flFadeIn : m_flFadeOut );
}

// a new level or a loaded game starts the client without fog: say it again now and then
void CEnvFog::FogThink( void )
{
	if( m_bOn )
		Send( 0 );
	pev->nextthink = gpGlobals->time + 2.0f;
}

/*
=====================================================================
env_particle: spawnflag 1 starts it on
=====================================================================
*/
class CEnvParticle : public CPointEntity
{
public:
	void Spawn( void );
	void Precache( void );
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );
	void EXPORT EmitThink( void );
	void Send( void );
	BOOL ReadSystem( void );
	virtual int Save( CSave &save );
	virtual int Restore( CRestore &restore );
	static TYPEDESCRIPTION m_SaveData[];

	BOOL m_bOn;
	string_t m_iszSprite;
	int m_iSprite;            // model index: not saved, Precache finds it again
	float m_flRate, m_flForce, m_flLife, m_flWind, m_flWindYaw, m_flSize;
	Vector m_vecColor;
	float m_flGravity, m_flAlpha;
	BOOL m_bAdditive;
};

LINK_ENTITY_TO_CLASS( env_particle, CEnvParticle )

TYPEDESCRIPTION CEnvParticle::m_SaveData[] =
{
	DEFINE_FIELD( CEnvParticle, m_bOn, FIELD_BOOLEAN ),
	DEFINE_FIELD( CEnvParticle, m_iszSprite, FIELD_STRING ),
	DEFINE_FIELD( CEnvParticle, m_flRate, FIELD_FLOAT ),
	DEFINE_FIELD( CEnvParticle, m_flForce, FIELD_FLOAT ),
	DEFINE_FIELD( CEnvParticle, m_flLife, FIELD_FLOAT ),
	DEFINE_FIELD( CEnvParticle, m_flWind, FIELD_FLOAT ),
	DEFINE_FIELD( CEnvParticle, m_flWindYaw, FIELD_FLOAT ),
	DEFINE_FIELD( CEnvParticle, m_flSize, FIELD_FLOAT ),
	DEFINE_FIELD( CEnvParticle, m_vecColor, FIELD_VECTOR ),
	DEFINE_FIELD( CEnvParticle, m_flGravity, FIELD_FLOAT ),
	DEFINE_FIELD( CEnvParticle, m_flAlpha, FIELD_FLOAT ),
	DEFINE_FIELD( CEnvParticle, m_bAdditive, FIELD_BOOLEAN ),
};

IMPLEMENT_SAVERESTORE( CEnvParticle, CPointEntity )

// the value after "key" in the .aur text; ranges "a..b" give their upper end
static const char *Aur_Value( const char *text, const char *key )
{
	char quoted[64];
	snprintf( quoted, sizeof( quoted ), "\"%s\"", key );
	const char *p = strstr( text, quoted );
	if( !p )
		return NULL;
	p = strchr( p + strlen( quoted ), '"' );
	return p ? p + 1 : NULL;
}

static float Aur_Float( const char *text, const char *key, float def )
{
	const char *p = Aur_Value( text, key );
	if( !p )
		return def;
	const char *end = strchr( p, '"' );
	const char *range = strstr( p, ".." );
	return ( range && end && range < end ) ? atof( range + 2 ) : atof( p );
}

static BOOL Aur_String( const char *text, const char *key, char *out, int size )
{
	const char *p = Aur_Value( text, key );
	const char *end = p ? strchr( p, '"' ) : NULL;
	if( !end || end - p >= size )
		return FALSE;
	memcpy( out, p, end - p );
	out[end - p] = 0;
	return TRUE;
}

BOOL CEnvParticle::ReadSystem( void )
{
	int length = 0;
	char sprite[96];

	if( FStringNull( pev->message ))
		return FALSE;
	char *text = (char *)LOAD_FILE_FOR_ME( (char *)STRING( pev->message ), &length );
	if( !text )
		return FALSE;

	// first block: the emitter; second block: the particles it sprays (both have "lifetime")
	const char *part = strchr( text, '{' );
	part = part ? strchr( part + 1, '{' ) : NULL;
	if( !part )
		part = text;
	char mode[32];

	m_flRate = Aur_Float( text, "sprayrate", 5 );
	m_flForce = Aur_Float( text, "sprayforce", 0 );
	m_flLife = Aur_Float( part, "lifetime", 3 );
	m_flWind = Aur_Float( part, "windstrength", 0 );
	m_flWindYaw = Aur_Float( part, "windyaw", 0 );
	m_flSize = Aur_Float( part, "startsize", 10 );
	m_vecColor = Vector( Aur_Float( part, "startred", 1 ), Aur_Float( part, "startgreen", 1 ), Aur_Float( part, "startblue", 1 ));
	m_flGravity = Aur_Float( part, "gravity", 0 );
	m_flAlpha = Aur_Float( part, "startalpha", 1 );
	if( m_flAlpha > 1.0f ) m_flAlpha = 1.0f;
	m_bAdditive = Aur_String( part, "rendermode", mode, sizeof( mode )) && !stricmp( mode, "additive" );
	BOOL ok = Aur_String( part, "sprite", sprite, sizeof( sprite ));
	FREE_FILE( text );

	if( ok )
		m_iszSprite = ALLOC_STRING( sprite );
	return ok;
}

void CEnvParticle::Precache( void )
{
	if( FStringNull( m_iszSprite ))
		ReadSystem();
	if( !FStringNull( m_iszSprite ))
		m_iSprite = PRECACHE_MODEL( (char *)STRING( m_iszSprite ));
}

void CEnvParticle::Spawn( void )
{
	CPointEntity::Spawn();
	Precache();
	m_bOn = FBitSet( pev->spawnflags, 1 ) || FStringNull( pev->targetname );
	SetThink( &CEnvParticle::EmitThink );
	pev->nextthink = gpGlobals->time + 1.0f;
}

void CEnvParticle::Send( void )
{
	if( !gmsgCoFEmit || !m_iSprite )
		return;
	MESSAGE_BEGIN( MSG_ALL, gmsgCoFEmit );
		WRITE_SHORT( entindex());
		WRITE_BYTE( m_bOn ? 1 : 0 );
		WRITE_COORD( pev->origin.x );
		WRITE_COORD( pev->origin.y );
		WRITE_COORD( pev->origin.z );
		WRITE_SHORT( m_iSprite );
		WRITE_BYTE( (int)fmin( 255.0f, m_flRate ));
		WRITE_SHORT( (int)m_flForce );
		WRITE_SHORT( (int)( m_flLife * 10.0f ));
		WRITE_SHORT( (int)m_flWind );
		WRITE_SHORT( (int)m_flWindYaw );
		WRITE_BYTE( (int)fmin( 255.0f, m_flSize ));
		WRITE_BYTE( (int)( m_vecColor.x * 255.0f ));
		WRITE_BYTE( (int)( m_vecColor.y * 255.0f ));
		WRITE_BYTE( (int)( m_vecColor.z * 255.0f ));
		WRITE_SHORT( (int)m_flGravity );
		WRITE_BYTE( m_bAdditive ? 1 : 0 );
		WRITE_BYTE( (int)( m_flAlpha * 255.0f ));
	MESSAGE_END();
}

void CEnvParticle::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	m_bOn = useType == USE_ON ? TRUE : useType == USE_OFF ? FALSE : !m_bOn;
	Send();
}

void CEnvParticle::EmitThink( void )
{
	Send();
	pev->nextthink = gpGlobals->time + 2.0f;
}

/*
=====================================================================
func_shine: the original draws the sprite on the surface; this puts it
on top of the brush, additive, so it catches the light the same way
=====================================================================
*/
class CFuncShine : public CBaseEntity
{
public:
	void Spawn( void );
};

LINK_ENTITY_TO_CLASS( func_shine, CFuncShine )

void CFuncShine::Spawn( void )
{
	if( FStringNull( pev->message ))
	{
		UTIL_Remove( this );
		return;
	}

	SET_MODEL( ENT( pev ), STRING( pev->model )); // the brush, for its box
	Vector top = ( pev->absmin + pev->absmax ) * 0.5f;
	top.z = pev->absmax.z + 1.0f;

	PRECACHE_MODEL( (char *)STRING( pev->message ));
	pev->model = pev->message;
	SET_MODEL( ENT( pev ), STRING( pev->model ));
	UTIL_SetOrigin( pev, top );
	pev->solid = SOLID_NOT;
	pev->movetype = MOVETYPE_NONE;
	pev->rendermode = kRenderTransAdd;
	if( !pev->renderamt )
		pev->renderamt = 70;
	if( !pev->scale )
		pev->scale = 1.0f;
	pev->renderfx = kRenderFxNone;
}
