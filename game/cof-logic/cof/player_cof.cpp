// Cry of Fear: player mechanics on top of hlsdk's CBasePlayer.
//
// - sprint (+sprint) with stamina, walk/sprint speeds from skill.cfg
// - inventory: keys and weapons picked up (item_key, cof_giveitems, weapon_*)
// - HUD status for platform/web/hud.js: health/stamina bars and the bag (TAB)
//
// +sprint, +inventory and the other CoF binds are not client commands in
// hlsdk's client.dll, so the engine forwards them to the server and they end
// up in CoF_ClientCommand.
//
// The state lives here, indexed by player slot, and survives changelevel
// because the server library stays loaded. It is not in the save file yet:
// loading a save from a fresh page starts with an empty bag.

#include <stdarg.h>
#include "extdll.h"
#include "util.h"
#include "cbase.h"
#include "player.h"
#include "cof_player.h"

#define COF_WALK_SPEED     150.0f
#define COF_SPRINT_SPEED   275.0f  // walk + sk_sprint_speed (125)
#define COF_STAMINA_MAX    100.0f
#define COF_STAMINA_DRAIN  18.0f   // per second while sprinting and moving
#define COF_STAMINA_REGEN  10.0f   // per second
#define COF_STAMINA_DELAY  1.0f    // seconds without sprinting before it recovers
#define COF_STAMINA_RESUME 20.0f   // after running out, needed to sprint again

typedef struct
{
	float stamina;
	float lastSprint;
	float lastTime;
	BOOL sprintHeld;
	BOOL exhausted;
	BOOL sprinting;

	int sentHealth;
	int sentStamina;
	int sentSprint;
	float nextStatus;
	float forceStatus;

	int numItems;
	char items[COF_MAX_ITEMS][COF_ITEM_LEN];    // definition file
	char names[COF_MAX_ITEMS][COF_ITEM_LEN];    // map_name / classname, what doors ask for
	BOOL invDirty;
} cof_player_t;

static cof_player_t g_cofPlayers[33];

void CoF_HudPrint( const char *fmt, ... )
{
	char buf[512];
	va_list ap;
	va_start( ap, fmt );
	vsnprintf( buf, sizeof( buf ), fmt, ap );
	va_end( ap );

	g_engfuncs.pfnServerPrint( buf );
}

static cof_player_t *CoF_State( CBaseEntity *pEntity )
{
	if( !pEntity || !pEntity->IsPlayer() )
		return NULL;

	int i = pEntity->entindex();
	if( i < 1 || i > 32 )
		return NULL;

	return &g_cofPlayers[i];
}

// single player: triggers fired by the world still act on the player
static CBaseEntity *CoF_Recipient( CBaseEntity *pActivator )
{
	if( pActivator && pActivator->IsPlayer() )
		return pActivator;

	return UTIL_PlayerByIndex( 1 );
}

/*
=====================================================================
item definitions (inventoryitems/<item>.txt)

	"map_name"
	{
		data	"apartmentkey"
	}
=====================================================================
*/
static BOOL CoF_ReadItemField( const char *def, const char *field, char *out, int size )
{
	int length = 0;
	char *data = (char *)LOAD_FILE_FOR_ME( (char *)def, &length );
	BOOL found = FALSE;
	char key[80];

	out[0] = 0;
	if( !data )
		return FALSE;

	snprintf( key, sizeof( key ), "\"%s\"", field );
	const char *p = strstr( data, key );
	if( p && ( p = strstr( p + strlen( key ), "data" )) && ( p = strchr( p, '"' )))
	{
		const char *end = strchr( ++p, '"' );
		if( end && end - p < size )
		{
			memcpy( out, p, end - p );
			out[end - p] = 0;
			found = TRUE;
		}
	}

	FREE_FILE( data );
	return found;
}

// "weapon_glock" -> "inventoryitems/weapons/weapon_glock.txt"
static void CoF_ItemDefinition( const char *item, char *def, int size )
{
	if( !strncmp( item, "weapon_", 7 ))
		snprintf( def, size, "inventoryitems/weapons/%s.txt", item );
	else
		snprintf( def, size, "%s", item );

	for( char *c = def; *c; c++ )
		if( *c == '\\' ) *c = '/';
}

static void CoF_SendInventory( cof_player_t *s )
{
	char line[512];
	int len = snprintf( line, sizeof( line ), "COF/HUD INV %d", s->numItems );

	for( int i = 0; i < s->numItems && len < (int)sizeof( line ); i++ )
		len += snprintf( line + len, sizeof( line ) - len, " %s", s->items[i] );

	CoF_HudPrint( "%s\n", line );
	s->invDirty = FALSE;
}

static int CoF_FindItem( cof_player_t *s, const char *name )
{
	for( int i = 0; i < s->numItems; i++ )
		if( !stricmp( s->names[i], name ) || !stricmp( s->items[i], name ))
			return i;

	return -1;
}

bool CoF_GiveItem( CBaseEntity *pActivator, const char *item )
{
	CBaseEntity *pPlayer = CoF_Recipient( pActivator );
	cof_player_t *s = CoF_State( pPlayer );
	char def[COF_ITEM_LEN], name[COF_ITEM_LEN], nice[COF_ITEM_LEN];

	if( !s || !item || !item[0] )
		return false;

	CoF_ItemDefinition( item, def, sizeof( def ));
	if( !CoF_ReadItemField( def, "map_name", name, sizeof( name )) &&
		!CoF_ReadItemField( def, "classname", name, sizeof( name )))
		snprintf( name, sizeof( name ), "%s", item );

	if( CoF_FindItem( s, name ) >= 0 )
		return true; // weapons and keys are unique

	if( s->numItems >= COF_MAX_ITEMS )
	{
		ClientPrint( pPlayer->pev, HUD_PRINTCENTER, "I can't carry any more." );
		return false;
	}

	snprintf( s->items[s->numItems], COF_ITEM_LEN, "%s", def );
	snprintf( s->names[s->numItems], COF_ITEM_LEN, "%s", name );
	s->numItems++;
	s->invDirty = TRUE;

	if( CoF_ReadItemField( def, "nice_name", nice, sizeof( nice )))
		CoF_HudPrint( "COF/HUD PICKUP %s\n", def );

	return true;
}

bool CoF_HasItem( CBaseEntity *pActivator, const char *mapName )
{
	cof_player_t *s = CoF_State( CoF_Recipient( pActivator ));
	return s && mapName && CoF_FindItem( s, mapName ) >= 0;
}

void CoF_RemoveItem( CBaseEntity *pActivator, const char *mapName )
{
	cof_player_t *s = CoF_State( CoF_Recipient( pActivator ));
	int i;

	if( !s || !mapName || ( i = CoF_FindItem( s, mapName )) < 0 )
		return;

	for( ; i < s->numItems - 1; i++ )
	{
		memcpy( s->items[i], s->items[i + 1], COF_ITEM_LEN );
		memcpy( s->names[i], s->names[i + 1], COF_ITEM_LEN );
	}
	s->numItems--;
	s->invDirty = TRUE;
}

void CoF_ClearItem( CBaseEntity *pActivator, const char *classname )
{
	CoF_RemoveItem( pActivator, classname );
}

/*
=====================================================================
hooks
=====================================================================
*/
void CoF_PlayerSpawn( CBasePlayer *pPlayer )
{
	cof_player_t *s = CoF_State( pPlayer );
	if( !s )
		return;

	memset( s, 0, sizeof( *s ));
	s->stamina = COF_STAMINA_MAX;
	s->sentHealth = s->sentStamina = s->sentSprint = -1;
	s->invDirty = TRUE;
}

void CoF_PlayerPreThink( CBasePlayer *pPlayer )
{
	cof_player_t *s = CoF_State( pPlayer );
	entvars_t *pev = pPlayer->pev;
	float now = gpGlobals->time;

	if( !s )
		return;

	// changelevel and save games move the clock: resend everything
	float dt = now - s->lastTime;
	if( dt < 0.0f || dt > 0.5f )
	{
		dt = 0.0f;
		s->nextStatus = s->forceStatus = 0.0f;
		s->lastSprint = now;
		s->invDirty = TRUE;
	}
	s->lastTime = now;

	BOOL ducking = FBitSet( pev->flags, FL_DUCKING ) || FBitSet( pev->button, IN_DUCK );
	BOOL moving = pev->velocity.Length2D() > 20.0f && FBitSet( pev->flags, FL_ONGROUND );

	if( s->exhausted && s->stamina >= COF_STAMINA_RESUME )
		s->exhausted = FALSE;

	s->sprinting = s->sprintHeld && !s->exhausted && !ducking && pPlayer->IsAlive() &&
		pev->waterlevel < 2 && pev->movetype != MOVETYPE_NOCLIP;

	if( s->sprinting && moving )
	{
		s->stamina -= COF_STAMINA_DRAIN * dt;
		s->lastSprint = now;
		if( s->stamina <= 0.0f )
		{
			s->stamina = 0.0f;
			s->exhausted = TRUE;
		}
	}
	else if( now - s->lastSprint > COF_STAMINA_DELAY )
	{
		// hints.txt: "Crouching recovers faster"
		float regen = ducking ? COF_STAMINA_REGEN * 2.0f : COF_STAMINA_REGEN;
		s->stamina = fmin( COF_STAMINA_MAX, s->stamina + regen * dt );
	}

	float speed = s->sprinting ? COF_SPRINT_SPEED : COF_WALK_SPEED;
	if( pev->maxspeed != speed && !FBitSet( pev->flags, FL_FROZEN ))
		g_engfuncs.pfnSetClientMaxspeed( pPlayer->edict(), speed );

	int health = pev->health > 0.0f ? (int)ceil( pev->health ) : 0;
	int stamina = (int)s->stamina;
	BOOL changed = health != s->sentHealth || stamina != s->sentStamina || s->sprinting != s->sentSprint;

	if(( changed && now >= s->nextStatus ) || now >= s->forceStatus )
	{
		CoF_HudPrint( "COF/HUD STAT %d %d %d\n", health, stamina, s->sprinting ? 1 : 0 );
		s->sentHealth = health;
		s->sentStamina = stamina;
		s->sentSprint = s->sprinting;
		s->nextStatus = now + 0.1f;
		s->forceStatus = now + 2.0f;
	}

	if( s->invDirty )
		CoF_SendInventory( s );
}

bool CoF_ClientCommand( CBasePlayer *pPlayer, const char *pcmd )
{
	cof_player_t *s = CoF_State( pPlayer );
	if( !s )
		return false;

	if( FStrEq( pcmd, "+sprint" ))
		s->sprintHeld = TRUE;
	else if( FStrEq( pcmd, "-sprint" ))
		s->sprintHeld = FALSE;
	else if( FStrEq( pcmd, "+inventory" ) || FStrEq( pcmd, "+objectives" ))
	{
		CoF_SendInventory( s );
		CoF_HudPrint( "COF/HUD INVTOGGLE\n" );
	}
	else if( FStrEq( pcmd, "-inventory" ) || FStrEq( pcmd, "-objectives" ))
		;
	// binds of the original config.cfg that do nothing yet: keep them out of the console
	else if( FStrEq( pcmd, "+dodge" ) || FStrEq( pcmd, "-dodge" ) || FStrEq( pcmd, "adlib" ) ||
		FStrEq( pcmd, "cancelselect" ) || FStrEq( pcmd, "weapontoggle" ) || FStrEq( pcmd, "quicksel" ) ||
		FStrEq( pcmd, "+attack3" ) || FStrEq( pcmd, "-attack3" ))
		;
	else
		return false;

	return true;
}

/*
=====================================================================
item_key: an inventory item lying in the map, picked up with +use
=====================================================================
*/
class CCofItemKey : public CBaseEntity
{
public:
	void Spawn( void );
	void Precache( void );
	virtual void KeyValue( KeyValueData *pkvd );
	virtual int ObjectCaps( void ) { return CBaseEntity::ObjectCaps() | FCAP_IMPULSE_USE; }
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );

	string_t m_iszSound;
};

LINK_ENTITY_TO_CLASS( item_key, CCofItemKey )

void CCofItemKey::KeyValue( KeyValueData *pkvd )
{
	if( FStrEq( pkvd->szKeyName, "customsound" ))
	{
		m_iszSound = ALLOC_STRING( pkvd->szValue );
		pkvd->fHandled = TRUE;
	}
	else if( FStrEq( pkvd->szKeyName, "skill" ))
		pkvd->fHandled = TRUE;
	else
		CBaseEntity::KeyValue( pkvd );
}

void CCofItemKey::Precache( void )
{
	char def[COF_ITEM_LEN], value[COF_ITEM_LEN];

	if( !FStringNull( pev->model ))
		PRECACHE_MODEL( (char *)STRING( pev->model ));

	if( FStringNull( m_iszSound ) && !FStringNull( pev->message ))
	{
		CoF_ItemDefinition( STRING( pev->message ), def, sizeof( def ));
		if( CoF_ReadItemField( def, "pickup_sound", value, sizeof( value )))
			m_iszSound = ALLOC_STRING( value );
	}

	if( !FStringNull( m_iszSound ))
		PRECACHE_SOUND( (char *)STRING( m_iszSound ));
}

void CCofItemKey::Spawn( void )
{
	Precache();

	pev->movetype = MOVETYPE_NONE;
	pev->solid = SOLID_TRIGGER;
	if( !FStringNull( pev->model ))
		SET_MODEL( ENT( pev ), STRING( pev->model ));
	UTIL_SetSize( pev, Vector( -8, -8, 0 ), Vector( 8, 8, 16 ));
	UTIL_SetOrigin( pev, pev->origin );
}

void CCofItemKey::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	if( !pActivator || !pActivator->IsPlayer() || FStringNull( pev->message ))
		return;

	if( !CoF_GiveItem( pActivator, STRING( pev->message )))
		return;

	if( !FStringNull( m_iszSound ))
		EMIT_SOUND( ENT( pActivator->pev ), CHAN_ITEM, STRING( m_iszSound ), 1.0f, ATTN_NORM );

	SUB_UseTargets( pActivator, USE_TOGGLE, 0 );
	UTIL_Remove( this );
}

/*
=====================================================================
CoF weapons lying in the map. They go to the bag; using them is not
implemented yet. hlsdk already defines weapon_glock, weapon_mp5 and
weapon_shotgun, so those keep the Half-Life behaviour for now.
=====================================================================
*/
class CCofWeaponPickup : public CBaseEntity
{
public:
	void Spawn( void );
	void Precache( void );
	virtual int ObjectCaps( void ) { return CBaseEntity::ObjectCaps() | FCAP_IMPULSE_USE; }
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );
	void EXPORT PickupTouch( CBaseEntity *pOther );

	const char *ShortName( void ) { return STRING( pev->classname ) + 7; } // after "weapon_"
};

LINK_ENTITY_TO_CLASS( weapon_axe, CCofWeaponPickup )
LINK_ENTITY_TO_CLASS( weapon_booklaser, CCofWeaponPickup )
LINK_ENTITY_TO_CLASS( weapon_camera, CCofWeaponPickup )
LINK_ENTITY_TO_CLASS( weapon_famas, CCofWeaponPickup )
LINK_ENTITY_TO_CLASS( weapon_syringe, CCofWeaponPickup )
LINK_ENTITY_TO_CLASS( weapon_switchblade, CCofWeaponPickup )
LINK_ENTITY_TO_CLASS( weapon_mobile, CCofWeaponPickup )

void CCofWeaponPickup::Precache( void )
{
	char model[COF_ITEM_LEN];
	snprintf( model, sizeof( model ), "models/weapons/%s/w_%s.mdl", ShortName(), ShortName());

	// a missing model would stop the map from loading: stage_map.py ships the ones the BSP uses
	int length = 0;
	byte *probe = LOAD_FILE_FOR_ME( model, &length );
	if( probe )
	{
		FREE_FILE( probe );
		pev->model = ALLOC_STRING( model );
		PRECACHE_MODEL( (char *)STRING( pev->model ));
	}
	PRECACHE_SOUND( "items/gunpickup2.wav" );
}

void CCofWeaponPickup::Spawn( void )
{
	Precache();

	pev->movetype = MOVETYPE_TOSS;
	pev->solid = SOLID_TRIGGER;
	if( !FStringNull( pev->model ))
		SET_MODEL( ENT( pev ), STRING( pev->model ));
	UTIL_SetSize( pev, Vector( -16, -16, 0 ), Vector( 16, 16, 16 ));
	UTIL_SetOrigin( pev, pev->origin );
	SetTouch( &CCofWeaponPickup::PickupTouch );
}

void CCofWeaponPickup::PickupTouch( CBaseEntity *pOther )
{
	Use( pOther, this, USE_ON, 0 );
}

void CCofWeaponPickup::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	if( !pActivator || !pActivator->IsPlayer() )
		return;

	if( !CoF_GiveItem( pActivator, STRING( pev->classname )))
		return;

	EMIT_SOUND( ENT( pActivator->pev ), CHAN_ITEM, "items/gunpickup2.wav", 1.0f, ATTN_NORM );
	SUB_UseTargets( pActivator, USE_TOGGLE, 0 );
	SetTouch( NULL );
	UTIL_Remove( this );
}

/*
=====================================================================
cof_giveitems / cof_clearitems: map logic adding or taking items
=====================================================================
*/
class CCofGiveItems : public CPointEntity
{
public:
	virtual void KeyValue( KeyValueData *pkvd );
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );

	string_t m_iszMsg;
};

LINK_ENTITY_TO_CLASS( cof_giveitems, CCofGiveItems )

void CCofGiveItems::KeyValue( KeyValueData *pkvd )
{
	if( FStrEq( pkvd->szKeyName, "custommsg" ))
	{
		m_iszMsg = ALLOC_STRING( pkvd->szValue );
		pkvd->fHandled = TRUE;
	}
	else
		CPointEntity::KeyValue( pkvd );
}

void CCofGiveItems::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	CBaseEntity *pPlayer = CoF_Recipient( pActivator );

	if( !pPlayer || FStringNull( pev->message ) || !CoF_GiveItem( pPlayer, STRING( pev->message )))
		return;

	if( !FStringNull( m_iszMsg ))
		ClientPrint( pPlayer->pev, HUD_PRINTCENTER, STRING( m_iszMsg ));
}

class CCofClearItems : public CPointEntity
{
public:
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );
};

LINK_ENTITY_TO_CLASS( cof_clearitems, CCofClearItems )

void CCofClearItems::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	if( !FStringNull( pev->message ))
		CoF_ClearItem( pActivator, STRING( pev->message ));
}
