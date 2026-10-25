// Cry of Fear: player mechanics on top of hlsdk's CBasePlayer.
//
// - sprint (+sprint) with stamina, walk/sprint speeds from skill.cfg
// - inventory: keys and weapons picked up (item_key, cof_giveitems, weapon_*),
//   quick select (1-3), equipping from the bag, ammo and syringes as counted entries
// - HUD status for platform/web/hud.js: health/stamina bars and the bag (TAB)
//
// +sprint, +inventory and the other CoF binds are not client commands in
// hlsdk's client.dll, so the engine forwards them to the server and they end
// up in CoF_ClientCommand.
//
// The state lives here, indexed by player slot, and survives changelevel
// because the server library stays loaded. Save games carry it in a hidden
// cof_playerstate entity (single player: slot 1).

#include <stdarg.h>
#include "extdll.h"
#include "util.h"
#include "cbase.h"
#include "player.h"
#include "weapons.h"
#include "saverestore.h"
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
	int counts[COF_MAX_ITEMS];          // ammo / syringes left, -1 for single items
	char quick[3][COF_ITEM_LEN];        // names in the quick select slots

	char objective[COF_ITEM_LEN];  // hints.txt key of the current objective
	EHANDLE store;                 // cof_playerstate holding this in save games
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
	{
		if( s->counts[i] >= 0 )
			len += snprintf( line + len, sizeof( line ) - len, " %s:%d", s->items[i], s->counts[i] );
		else
			len += snprintf( line + len, sizeof( line ) - len, " %s", s->items[i] );
	}

	CoF_HudPrint( "%s\n", line );
	CoF_HudPrint( "COF/HUD QUICK %s %s %s\n", s->quick[0][0] ? s->quick[0] : "-",
		s->quick[1][0] ? s->quick[1] : "-", s->quick[2][0] ? s->quick[2] : "-" );
	s->invDirty = FALSE;
}

// weapons of weapons_cof.cpp: the bag entry is the weapon the player carries
static bool CoF_IsRealWeapon( const char *name )
{
	return !stricmp( name, "weapon_switchblade" ) || !stricmp( name, "weapon_glock" ) ||
		!stricmp( name, "weapon_syringe" ) || !stricmp( name, "weapon_mobile" );
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

	if( !pPlayer || !item || !item[0] )
		return false;

	// a real weapon enters the bag through its AddToPlayer (CoF_AddBagEntry)
	if( CoF_IsRealWeapon( item ))
	{
		// GiveNamedItem keeps the pointer as the classname (MAKE_STRING): it must outlive the
		// console command buffer that "item" may point into
		( (CBasePlayer *)pPlayer )->GiveNamedItem( STRING( ALLOC_STRING( item )));
		return CoF_HasItem( pPlayer, item );
	}
	return CoF_AddBagEntry( pPlayer, item );
}

bool CoF_AddBagEntry( CBaseEntity *pActivator, const char *item )
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
	s->counts[s->numItems] = -1;
	s->numItems++;
	s->invDirty = TRUE;

	// the first weapons fill the free quick select slots
	if( !strncmp( name, "weapon_", 7 ) && stricmp( name, "weapon_syringe" ))
	{
		for( int q = 0; q < 3; q++ )
		{
			if( !s->quick[q][0] )
			{
				snprintf( s->quick[q], COF_ITEM_LEN, "%s", name );
				break;
			}
		}
	}

	if( CoF_ReadItemField( def, "nice_name", nice, sizeof( nice )))
		CoF_HudPrint( "COF/HUD PICKUP %s\n", def );

	return true;
}

void CoF_SetObjective( const char *key )
{
	cof_player_t *s = &g_cofPlayers[1];
	snprintf( s->objective, sizeof( s->objective ), "%s", key ? key : "" );
	CoF_HudPrint( "COF/HUD OBJECTIVE %s\n", s->objective );
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
		s->counts[i] = s->counts[i + 1];
	}
	s->numItems--;
	s->invDirty = TRUE;

	for( int q = 0; q < 3; q++ )
		if( !stricmp( s->quick[q], mapName ))
			s->quick[q][0] = 0;
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
	CoF_PuzzlesNewGame();
	s->sentHealth = s->sentStamina = s->sentSprint = -1;
	s->invDirty = TRUE;
}

// glock magazines and syringes take a bag slot while there are any left
static void CoF_SyncCount( CBasePlayer *pPlayer, cof_player_t *s, const char *def, const char *name, int count )
{
	int i = CoF_FindItem( s, name );

	if( count <= 0 )
	{
		if( i >= 0 )
			CoF_RemoveItem( pPlayer, name );
		return;
	}
	if( i < 0 )
	{
		if( !CoF_AddBagEntry( pPlayer, def ) || ( i = CoF_FindItem( s, name )) < 0 )
			return;
	}
	if( s->counts[i] != count )
	{
		s->counts[i] = count;
		s->invDirty = TRUE;
	}
}

static void CoF_SyncCounts( CBasePlayer *pPlayer, cof_player_t *s )
{
	// registered by CoF_PrecacheWeapons when the level loads
	int ammo9mm = CBasePlayer::GetAmmoIndex( "9mm" );
	int ammoSyringe = CBasePlayer::GetAmmoIndex( "syringe" );

	if( ammo9mm >= 0 )
		CoF_SyncCount( pPlayer, s, "inventoryitems/ammo/ammo_glock.txt", "ammo_glock", pPlayer->m_rgAmmo[ammo9mm] );
	if( ammoSyringe >= 0 && pPlayer->HasNamedPlayerItem( "weapon_syringe" ))
		CoF_SyncCount( pPlayer, s, "weapon_syringe", "weapon_syringe", pPlayer->m_rgAmmo[ammoSyringe] );
	else if( CoF_FindItem( s, "weapon_syringe" ) >= 0 )
		CoF_RemoveItem( pPlayer, "weapon_syringe" );
}

// takes the weapon in the hands; anything else in the bag only shows its description
static void CoF_Equip( CBasePlayer *pPlayer, const char *name )
{
	if( name[0] && CoF_IsRealWeapon( name ) && pPlayer->HasNamedPlayerItem( name ))
		pPlayer->SelectItem( name );
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

	CoF_SyncCounts( pPlayer, s );

	if( s->invDirty )
	{
		CoF_SendInventory( s );
		CoF_HudPrint( "COF/HUD OBJECTIVE %s\n", s->objective );
	}

	// one cof_playerstate per level, so the next save game carries the bag
	if( !s->store )
	{
		CBaseEntity *pStore = UTIL_FindEntityByClassname( NULL, "cof_playerstate" );
		s->store = pStore ? pStore : CBaseEntity::Create( "cof_playerstate", g_vecZero, g_vecZero, NULL );
	}
}

/*
=====================================================================
debug commands (sv_cheats 1), for testing map logic from the console:
	cof_give inventoryitems/apartmentkey.txt | weapon_axe
	cof_fire <targetname>        fires it like a trigger, the player as activator
	cof_usemodel *78             uses the brush entity with that model
	cof_goto <targetname|*N>     moves the player next to that entity
	cof_spawn monster_slower     creates it 150 units in front of the player
=====================================================================
*/
static CBaseEntity *CoF_FindDebugTarget( const char *name )
{
	if( name[0] != '*' )
		return UTIL_FindEntityByTargetname( NULL, name );

	return UTIL_FindEntityByString( NULL, "model", name );
}

static bool CoF_DebugCommand( CBasePlayer *pPlayer, const char *pcmd )
{
	if( strncmp( pcmd, "cof_", 4 ) || CVAR_GET_FLOAT( "sv_cheats" ) == 0.0f )
		return false;

	if( FStrEq( pcmd, "cof_dump" ))
	{
		cof_player_t *s = CoF_State( pPlayer );
		for( int i = 0; s && i < s->numItems; i++ )
			ALERT( at_console, "bag %d: %s (%s) count %d\n", i, s->names[i], s->items[i], s->counts[i] );
		for( int slot = 0; slot < MAX_ITEM_TYPES; slot++ )
			for( CBasePlayerItem *pItem = pPlayer->m_rgpPlayerItems[slot]; pItem; pItem = pItem->m_pNext )
				ALERT( at_console, "carried %d: %s\n", slot, STRING( pItem->pev->classname ));
		CBaseEntity *pNear = NULL;
		while(( pNear = UTIL_FindEntityInSphere( pNear, pPlayer->pev->origin, 512 )))
			if( pNear->MyMonsterPointer() && !pNear->IsPlayer())
				ALERT( at_console, "monster %s health %.0f dead %d dist %.0f\n", STRING( pNear->pev->classname ),
					pNear->pev->health, pNear->pev->deadflag, ( pNear->pev->origin - pPlayer->pev->origin ).Length());
		return true;
	}
	if( FStrEq( pcmd, "cof_face" ))
	{
		// turns to the nearest living monster, eyes on its chest
		CBaseEntity *pNear = NULL, *pBest = NULL;
		float best = 1e9f;
		while(( pNear = UTIL_FindEntityInSphere( pNear, pPlayer->pev->origin, 1024 )))
		{
			float d = ( pNear->pev->origin - pPlayer->pev->origin ).Length();
			if( pNear->MyMonsterPointer() && !pNear->IsPlayer() && pNear->IsAlive() && pNear->pev->takedamage && d < best )
			{
				best = d;
				pBest = pNear;
			}
		}
		if( pBest )
		{
			Vector dir = pBest->Center() - ( pPlayer->pev->origin + pPlayer->pev->view_ofs );
			Vector ang = UTIL_VecToAngles( dir );
			ang.x = -ang.x;
			pPlayer->pev->angles = pPlayer->pev->v_angle = ang;
			pPlayer->pev->fixangle = TRUE;
		}
		return true;
	}
	if( CMD_ARGC() < 2 )
		return false;

	const char *arg = CMD_ARGV( 1 );

	if( FStrEq( pcmd, "cof_give" ))
		CoF_GiveItem( pPlayer, arg );
	else if( FStrEq( pcmd, "cof_sethealth" ))
		pPlayer->pev->health = atoi( arg ) > 0 ? atoi( arg ) : 1;
	else if( FStrEq( pcmd, "cof_fire" ))
		FireTargets( arg, pPlayer, pPlayer, USE_TOGGLE, 0 );
	else if( FStrEq( pcmd, "cof_spawn" ))
	{
		UTIL_MakeVectors( Vector( 0, pPlayer->pev->v_angle.y, 0 ));
		Vector pos = pPlayer->pev->origin + gpGlobals->v_forward * 150;
		// Create keeps the name as the classname: not the console buffer
		CBaseEntity *pNew = CBaseEntity::Create( (char *)STRING( ALLOC_STRING( arg )), pos, Vector( 0, pPlayer->pev->v_angle.y + 180, 0 ), NULL );
		if( pNew )
			DROP_TO_FLOOR( pNew->edict());
	}
	else if( FStrEq( pcmd, "cof_usemodel" ) || FStrEq( pcmd, "cof_goto" ))
	{
		CBaseEntity *pTarget = CoF_FindDebugTarget( arg );
		if( !pTarget )
		{
			ALERT( at_console, "%s: nothing named %s\n", pcmd, arg );
			return true;
		}
		if( FStrEq( pcmd, "cof_usemodel" ))
			pTarget->Use( pPlayer, pPlayer, USE_TOGGLE, 0 );
		else
		{
			Vector center = ( pTarget->pev->absmin + pTarget->pev->absmax ) * 0.5f;
			UTIL_SetOrigin( pPlayer->pev, center + Vector( 0, 0, 8 ));
			pPlayer->pev->velocity = g_vecZero;
		}
	}
	else
		return false;

	return true;
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
	else if( FStrEq( pcmd, "quicksel" ))
	{
		int q = atoi( CMD_ARGV( 1 )) - 1;
		if( q >= 0 && q < 3 )
			CoF_Equip( pPlayer, s->quick[q] );
	}
	// from the bag (hud.js): double click equips, click on a quick slot assigns
	else if( FStrEq( pcmd, "cof_equip" ))
	{
		int i = atoi( CMD_ARGV( 1 ));
		if( i >= 0 && i < s->numItems )
			CoF_Equip( pPlayer, s->names[i] );
	}
	else if( FStrEq( pcmd, "cof_quickset" ))
	{
		int q = atoi( CMD_ARGV( 1 )) - 1, i = atoi( CMD_ARGV( 2 ));
		if( q >= 0 && q < 3 && i >= 0 && i < s->numItems && CoF_IsRealWeapon( s->names[i] ))
		{
			for( int other = 0; other < 3; other++ )
				if( !stricmp( s->quick[other], s->names[i] ))
					s->quick[other][0] = 0;
			snprintf( s->quick[q], COF_ITEM_LEN, "%s", s->names[i] );
			s->invDirty = TRUE;
		}
	}
	// binds of the original config.cfg that do nothing yet: keep them out of the console
	else if( FStrEq( pcmd, "+dodge" ) || FStrEq( pcmd, "-dodge" ) || FStrEq( pcmd, "adlib" ) ||
		FStrEq( pcmd, "cancelselect" ) || FStrEq( pcmd, "weapontoggle" ) ||
		FStrEq( pcmd, "+attack3" ) || FStrEq( pcmd, "-attack3" ))
		;
	else if( CoF_PuzzleCommand( pPlayer, pcmd ) || CoF_DebugCommand( pPlayer, pcmd ))
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
CoF weapons lying in the map that only go to the bag: using them is not
implemented yet (weapons_cof.cpp has the ones that are).
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
LINK_ENTITY_TO_CLASS( weapon_mp5, CCofWeaponPickup )

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

/*
=====================================================================
cof_playerstate: invisible, saved with the level. Save() copies the
player state in, Restore() copies it back, so loading a save game
brings back the bag, stamina and objective. It does not go across
level transitions; the state is still in memory then and the next
level gets a fresh one.
=====================================================================
*/
class CCofPlayerState : public CBaseEntity
{
public:
	void Spawn( void );
	virtual int ObjectCaps( void ) { return 0; }
	virtual int Save( CSave &save );
	virtual int Restore( CRestore &restore );
	static TYPEDESCRIPTION m_SaveData[];

	int m_iNumItems;
	string_t m_iszItems[COF_MAX_ITEMS];
	string_t m_iszNames[COF_MAX_ITEMS];
	string_t m_iszObjective;
	string_t m_iszQuick[3];
	float m_flStamina;
	int m_iPassword;
	string_t m_iszCode;
};

LINK_ENTITY_TO_CLASS( cof_playerstate, CCofPlayerState )

TYPEDESCRIPTION CCofPlayerState::m_SaveData[] =
{
	DEFINE_FIELD( CCofPlayerState, m_iNumItems, FIELD_INTEGER ),
	DEFINE_ARRAY( CCofPlayerState, m_iszItems, FIELD_STRING, COF_MAX_ITEMS ),
	DEFINE_ARRAY( CCofPlayerState, m_iszNames, FIELD_STRING, COF_MAX_ITEMS ),
	DEFINE_FIELD( CCofPlayerState, m_iszObjective, FIELD_STRING ),
	DEFINE_ARRAY( CCofPlayerState, m_iszQuick, FIELD_STRING, 3 ),
	DEFINE_FIELD( CCofPlayerState, m_iPassword, FIELD_INTEGER ),
	DEFINE_FIELD( CCofPlayerState, m_iszCode, FIELD_STRING ),
	DEFINE_FIELD( CCofPlayerState, m_flStamina, FIELD_FLOAT ),
};

void CCofPlayerState::Spawn( void )
{
	pev->solid = SOLID_NOT;
	pev->movetype = MOVETYPE_NONE;
	pev->effects |= EF_NODRAW;
}

int CCofPlayerState::Save( CSave &save )
{
	cof_player_t *s = &g_cofPlayers[1];

	m_iNumItems = s->numItems;
	for( int i = 0; i < COF_MAX_ITEMS; i++ )
	{
		m_iszItems[i] = i < s->numItems ? ALLOC_STRING( s->items[i] ) : iStringNull;
		m_iszNames[i] = i < s->numItems ? ALLOC_STRING( s->names[i] ) : iStringNull;
	}
	m_iszObjective = s->objective[0] ? ALLOC_STRING( s->objective ) : iStringNull;
	for( int q = 0; q < 3; q++ )
		m_iszQuick[q] = s->quick[q][0] ? ALLOC_STRING( s->quick[q] ) : iStringNull;
	m_flStamina = s->stamina;
	char code[16];
	m_iPassword = CoF_GetPuzzleState( code, sizeof( code ));
	m_iszCode = ALLOC_STRING( code );

	if( !CBaseEntity::Save( save ))
		return 0;
	return save.WriteFields( "CCofPlayerState", this, m_SaveData, ARRAYSIZE( m_SaveData ));
}

int CCofPlayerState::Restore( CRestore &restore )
{
	if( !CBaseEntity::Restore( restore ))
		return 0;
	if( !restore.ReadFields( "CCofPlayerState", this, m_SaveData, ARRAYSIZE( m_SaveData )))
		return 0;

	cof_player_t *s = &g_cofPlayers[1];
	s->numItems = m_iNumItems < 0 ? 0 : m_iNumItems > COF_MAX_ITEMS ? COF_MAX_ITEMS : m_iNumItems;
	for( int i = 0; i < s->numItems; i++ )
	{
		snprintf( s->items[i], COF_ITEM_LEN, "%s", FStringNull( m_iszItems[i] ) ? "" : STRING( m_iszItems[i] ));
		snprintf( s->names[i], COF_ITEM_LEN, "%s", FStringNull( m_iszNames[i] ) ? "" : STRING( m_iszNames[i] ));
		s->counts[i] = -1;
	}
	for( int q = 0; q < 3; q++ )
		snprintf( s->quick[q], COF_ITEM_LEN, "%s", FStringNull( m_iszQuick[q] ) ? "" : STRING( m_iszQuick[q] ));
	snprintf( s->objective, sizeof( s->objective ), "%s", FStringNull( m_iszObjective ) ? "" : STRING( m_iszObjective ));
	s->stamina = m_flStamina;
	s->exhausted = FALSE;
	CoF_SetPuzzleState( m_iPassword, FStringNull( m_iszCode ) ? "" : STRING( m_iszCode ));
	s->invDirty = TRUE;
	s->store = this;
	return 1;
}
