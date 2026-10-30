// Cry of Fear env_static_decal: leaves, graffiti and posters stuck on walls and floors.
//
// "netname" names a group of gfx/decals/decalinfo.txt; "skin" is the direction to look
// for the surface (0 auto, 1 -X, 2 +X, 3 -Y, 4 +Y, 5 -Z, 6 +Z; cry_of_fear.fgd of the SDK).
// The server finds the surface and tells each client where it is; the client draws it
// (cof_client.cpp). docs/STATIC_DECAL.md.
//
//	CoFDecal: coord x y z, short entity, string texture, short width, short height

#include "extdll.h"
#include "util.h"
#include "cbase.h"
#include "player.h"

static int gmsgCoFDecal = 0;

// called from CoF_LinkUserMessages (atmosphere.cpp)
void CoF_LinkDecalMessages( void )
{
	if( !gmsgCoFDecal )
		gmsgCoFDecal = REG_USER_MSG( "CoFDecal", -1 );
}

/*
=====================================================================
decalinfo.txt: one or more group names, then { texture width height
overlay ... }; a group with several lines picks one at random
=====================================================================
*/
#define MAX_DECAL_VARIANTS 256

struct decalvariant_t
{
	char group[32];
	char texture[32];
	int width, height;
};

static decalvariant_t g_DecalVariants[MAX_DECAL_VARIANTS];
static int g_iDecalVariants = -1; // -1: not read yet

static const char *DecalToken( const char *p, char *token, int size )
{
	for( ;; )
	{
		while( *p && (unsigned char)*p <= ' ' )
			p++;
		if( p[0] == '/' && p[1] == '/' )
		{
			while( *p && *p != '\n' )
				p++;
			continue;
		}
		break;
	}
	if( !*p )
		return NULL;

	int n = 0;
	if( *p == '{' || *p == '}' )
		token[n++] = *p++;
	else
	{
		while( *p && (unsigned char)*p > ' ' && *p != '{' && *p != '}' )
		{
			if( n < size - 1 )
				token[n++] = *p;
			p++;
		}
	}
	token[n] = 0;
	return p;
}

static void ReadDecalInfo( void )
{
	g_iDecalVariants = 0;
	int length;
	char *file = (char *)LOAD_FILE_FOR_ME( (char *)"gfx/decals/decalinfo.txt", &length );
	if( !file )
	{
		ALERT( at_console, "env_static_decal: gfx/decals/decalinfo.txt not found\n" );
		return;
	}

	char groups[8][32], token[64];
	int numgroups = 0;
	const char *p = file;
	while(( p = DecalToken( p, token, sizeof( token ))))
	{
		if( token[0] == '{' )
		{
			// texture width height overlay, until the closing brace
			char line[4][64];
			for( ;; )
			{
				if( !( p = DecalToken( p, line[0], sizeof( line[0] ))) || line[0][0] == '}' )
					break;
				for( int i = 1; i < 4 && p; i++ )
					p = DecalToken( p, line[i], sizeof( line[i] ));
				if( !p )
					break;
				for( int g = 0; g < numgroups && g_iDecalVariants < MAX_DECAL_VARIANTS; g++ )
				{
					decalvariant_t *v = &g_DecalVariants[g_iDecalVariants++];
					strncpy( v->group, groups[g], sizeof( v->group ) - 1 );
					v->group[sizeof( v->group ) - 1] = 0;
					strncpy( v->texture, line[0], sizeof( v->texture ) - 1 );
					v->texture[sizeof( v->texture ) - 1] = 0;
					v->width = atoi( line[1] );
					v->height = atoi( line[2] );
				}
			}
			numgroups = 0;
			if( !p )
				break;
		}
		else if( numgroups < 8 )
		{
			strncpy( groups[numgroups], token, sizeof( groups[0] ) - 1 );
			groups[numgroups++][sizeof( groups[0] ) - 1] = 0;
		}
	}
	FREE_FILE( file );
}

static const decalvariant_t *PickDecal( const char *group )
{
	if( g_iDecalVariants < 0 )
		ReadDecalInfo();

	const decalvariant_t *found[MAX_DECAL_VARIANTS];
	int count = 0;
	for( int i = 0; i < g_iDecalVariants; i++ )
		if( !stricmp( g_DecalVariants[i].group, group ))
			found[count++] = &g_DecalVariants[i];
	return count ? found[RANDOM_LONG( 0, count - 1 )] : NULL;
}

/*
=====================================================================
env_static_decal
=====================================================================
*/
#define DECAL_SEARCH_DIST 64

class CStaticDecal : public CPointEntity
{
public:
	void Spawn( void );
	void Send( CBasePlayer *player );
	virtual int Save( CSave &save );
	virtual int Restore( CRestore &restore );
	static TYPEDESCRIPTION m_SaveData[];

	// chosen once, so a loaded game shows the same variant
	string_t m_iszTexture;
	int m_iWidth, m_iHeight;
};

LINK_ENTITY_TO_CLASS( env_static_decal, CStaticDecal )

TYPEDESCRIPTION CStaticDecal::m_SaveData[] =
{
	DEFINE_FIELD( CStaticDecal, m_iszTexture, FIELD_STRING ),
	DEFINE_FIELD( CStaticDecal, m_iWidth, FIELD_INTEGER ),
	DEFINE_FIELD( CStaticDecal, m_iHeight, FIELD_INTEGER ),
};

IMPLEMENT_SAVERESTORE( CStaticDecal, CPointEntity )

void CStaticDecal::Spawn( void )
{
	CPointEntity::Spawn();
	const decalvariant_t *v = PickDecal( STRING( pev->netname ));
	if( !v )
	{
		ALERT( at_console, "env_static_decal: unknown decal group \"%s\"\n", STRING( pev->netname ));
		return;
	}
	m_iszTexture = ALLOC_STRING( v->texture );
	m_iWidth = v->width;
	m_iHeight = v->height;
}

void CStaticDecal::Send( CBasePlayer *player )
{
	if( !gmsgCoFDecal || FStringNull( m_iszTexture ))
		return;

	static const Vector dirs[6] =
	{
		Vector( -1, 0, 0 ), Vector( 1, 0, 0 ), Vector( 0, -1, 0 ),
		Vector( 0, 1, 0 ), Vector( 0, 0, -1 ), Vector( 0, 0, 1 )
	};
	int first = 0, last = 5;
	if( pev->skin >= 1 && pev->skin <= 6 )
		first = last = pev->skin - 1;

	// the nearest surface in the allowed directions
	TraceResult tr, best;
	best.flFraction = 2.0f;
	for( int i = first; i <= last; i++ )
	{
		UTIL_TraceLine( pev->origin, pev->origin + dirs[i] * DECAL_SEARCH_DIST, ignore_monsters, edict(), &tr );
		if( !tr.fStartSolid && tr.flFraction < 1.0f && tr.flFraction < best.flFraction )
			best = tr;
	}
	if( best.flFraction > 1.0f )
	{
		ALERT( at_aiconsole, "env_static_decal %s: no surface within %d units\n", STRING( m_iszTexture ), DECAL_SEARCH_DIST );
		return;
	}

	CBaseEntity *hit = CBaseEntity::Instance( best.pHit );
	MESSAGE_BEGIN( MSG_ONE, gmsgCoFDecal, NULL, player->edict() );
		WRITE_COORD( best.vecEndPos.x );
		WRITE_COORD( best.vecEndPos.y );
		WRITE_COORD( best.vecEndPos.z );
		WRITE_SHORT( hit ? hit->entindex() : 0 );
		WRITE_STRING( STRING( m_iszTexture ));
		WRITE_SHORT( m_iWidth );
		WRITE_SHORT( m_iHeight );
	MESSAGE_END();
}

// a new level or a loaded game starts the client without them (player.cpp, UpdateClientData)
void CoF_SendStaticDecals( CBasePlayer *player )
{
	CBaseEntity *e = NULL;
	while(( e = UTIL_FindEntityByClassname( e, "env_static_decal" )))
		( (CStaticDecal *)e )->Send( player );
}
