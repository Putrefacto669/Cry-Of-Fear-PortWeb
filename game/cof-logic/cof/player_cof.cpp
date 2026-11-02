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

#ifdef __EMSCRIPTEN__
extern void CoF_SetManagerTrace( int enabled );
extern void CoF_CameraDump( const char *name );
extern void CoF_TrainDump( const char *name );
extern void CoF_SendEnvpos( CBasePlayer *player );
#endif

#define COF_WALK_SPEED     150.0f
#define COF_SPRINT_SPEED   275.0f  // walk + sk_sprint_speed (125)
#define COF_STAMINA_MAX    100.0f
#define COF_STAMINA_DRAIN  18.0f   // per second while sprinting and moving
#define COF_STAMINA_REGEN  10.0f   // per second
#define COF_STAMINA_DELAY  1.0f    // seconds without sprinting before it recovers
#define COF_STAMINA_RESUME 20.0f   // after running out, needed to sprint again

bool CoF_OnStairs( CBasePlayer *pPlayer );
void CoF_MotionDump( void );

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

	cof_phone_t phone;   // trigger_cofmobile / weapon_mobile
	int sentHide;        // m_iHideHUD in the last COF/HUD STAT
	int sentUnread;      // last COF/HUD SMSICON
	BOOL flashlight;     // the phone's light (CoF_SetFlashlight)
	int sentFlashlight;  // last CoFLight message
	float forceFlashlight;
} cof_player_t;

static cof_player_t g_cofPlayers[33];

void CoF_CenterPrint( const char *text )
{
	if( text && text[0] )
		CoF_HudPrint( "COF/HUD CENTER %s\n", text );
}

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

cof_phone_t *CoF_Phone( CBaseEntity *pPlayer )
{
	cof_player_t *s = CoF_State( pPlayer );
	return s ? &s->phone : NULL;
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
		!stricmp( name, "weapon_syringe" ) || !stricmp( name, "weapon_mobile" ) ||
		!stricmp( name, "weapon_camera" );
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
		CoF_CenterPrint( "I can't carry any more." );
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
	s->sentHealth = s->sentStamina = s->sentSprint = s->sentHide = s->sentFlashlight = -1;
	s->invDirty = TRUE;
}

// The phone's light. The original keeps its own flag (hl.dll FUN_1003fce0: CBasePlayer +0x1ea8 and bit 8
// of a word for the client) with items/flashlight1.wav: no HEV suit and no battery, unlike Half-Life's
// FlashlightTurnOn, which did nothing in the port (Simon has no suit). The client draws it (CoFLight).
bool CoF_FlashlightIsOn( CBaseEntity *pPlayer )
{
	cof_player_t *s = CoF_State( pPlayer );
	return s && s->flashlight;
}

void CoF_SetFlashlight( CBaseEntity *pPlayer, bool on )
{
	cof_player_t *s = CoF_State( pPlayer );
	if( !s || ( s->flashlight != 0 ) == on )
		return;

	s->flashlight = on;
	EMIT_SOUND_DYN( pPlayer->edict(), CHAN_WEAPON, "items/flashlight1.wav", 1.0f, 0.8f, 0, PITCH_NORM );
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

	CoF_UseTrace( pPlayer ); // E: what is looked at first, like the original (doors.cpp)

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

	float speed = CoF_OnStairs( pPlayer ) ? 50.0f : s->sprinting ? COF_SPRINT_SPEED : COF_WALK_SPEED;
	if( pev->maxspeed != speed && !FBitSet( pev->flags, FL_FROZEN ))
		g_engfuncs.pfnSetClientMaxspeed( pPlayer->edict(), speed );

	int health = pev->health > 0.0f ? (int)ceil( pev->health ) : 0;
	int stamina = (int)s->stamina;
	BOOL changed = health != s->sentHealth || stamina != s->sentStamina || s->sprinting != s->sentSprint ||
		pPlayer->m_iHideHUD != s->sentHide;

	// the bars are always on screen in the original, except while the HUD is hidden
	if(( changed && now >= s->nextStatus ) || now >= s->forceStatus )
	{
		CoF_HudPrint( "COF/HUD STAT %d %d %d %d\n", health, stamina, s->sprinting ? 1 : 0, pPlayer->m_iHideHUD );
		s->sentHealth = health;
		s->sentStamina = stamina;
		s->sentSprint = s->sprinting;
		s->sentHide = pPlayer->m_iHideHUD;
		s->nextStatus = now + 0.1f;
		s->forceStatus = now + 2.0f;
	}

	// the light to the client, again every 2 s so it survives a level change or a loaded game
	if( s->flashlight != s->sentFlashlight || now >= s->forceFlashlight )
	{
		CoF_SendFlashlight( pPlayer, s->flashlight );
		s->sentFlashlight = s->flashlight;
		s->forceFlashlight = now + 2.0f;
	}

	// UnreadSMS of the original: the icon stays until the phone is taken out
	if( s->phone.unread != s->sentUnread || s->invDirty )
	{
		CoF_HudPrint( "COF/HUD SMSICON %d\n", s->phone.unread ? 1 : 0 );
		s->sentUnread = s->phone.unread;
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
	// #N: the entity with that index (point entities without a targetname)
	if( name[0] == '#' )
	{
		edict_t *ent = INDEXENT( atoi( name + 1 ));
		return ent && !ent->free ? CBaseEntity::Instance( ent ) : NULL;
	}
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
	if( FStrEq( pcmd, "cof_weapon_status" ))
	{
		CBasePlayerItem *item = pPlayer->m_pActiveItem;
		CBasePlayerWeapon *weapon = item && item->GetWeaponPtr() ? (CBasePlayerWeapon *)item->GetWeaponPtr() : NULL;
		int ammo = weapon ? weapon->m_iPrimaryAmmoType : -1;
		ALERT( at_console, "COF/WEAPON class=%s clip=%d ammo=%d primary=%g secondary=%g playernext=%g reload=%d buttons=%d health=%g\n",
			item ? STRING( item->pev->classname ) : "none", weapon ? weapon->m_iClip : -1,
			ammo >= 0 && ammo < MAX_AMMO_SLOTS ? pPlayer->m_rgAmmo[ammo] : -1,
			weapon ? weapon->m_flNextPrimaryAttack : 0, weapon ? weapon->m_flNextSecondaryAttack : 0,
			pPlayer->m_flNextAttack, weapon ? weapon->m_fInReload : 0, pPlayer->pev->button, pPlayer->pev->health );
		return true;
	}
	if( FStrEq( pcmd, "cof_face" ))
	{
		// turns to the nearest living monster, eyes on its chest
		CBaseEntity *pNear = NULL, *pBest = NULL;
		float best = 1e9f;
		// cof_face <targetname|*N>: that entity instead (brushes: the middle of their box)
		if( CMD_ARGC() >= 2 && ( pBest = CoF_FindDebugTarget( CMD_ARGV( 1 ))))
		{
			Vector center = ( pBest->pev->absmin + pBest->pev->absmax ) * 0.5f;
			Vector ang = UTIL_VecToAngles( center - ( pPlayer->pev->origin + pPlayer->pev->view_ofs ));
			ang.x = -ang.x;
			pPlayer->pev->angles = pPlayer->pev->v_angle = ang;
			pPlayer->pev->fixangle = TRUE;
			ALERT( at_console, "facing %s at %.0f units\n", CMD_ARGV( 1 ), ( center - pPlayer->pev->origin ).Length());
			return true;
		}
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

	if( FStrEq( pcmd, "cof_useaim" ))
 {
  UTIL_MakeVectors(pPlayer->pev->v_angle);
  Vector eyes=pPlayer->pev->origin+pPlayer->pev->view_ofs;
  TraceResult tr; UTIL_TraceLine(eyes,eyes+gpGlobals->v_forward*64,dont_ignore_monsters,pPlayer->edict(),&tr);
  CBaseEntity *hit=tr.pHit?CBaseEntity::Instance(tr.pHit):NULL;
  ALERT(at_console,"COF/USEAIM hit=%s class=%s fraction=%.9g\n",hit?STRING(hit->pev->targetname):"",hit?STRING(hit->pev->classname):"none",tr.flFraction);
  CBaseEntity *e=NULL;
  while((e=UTIL_FindEntityInSphere(e,pPlayer->pev->origin,64))) {
   if(!(e->ObjectCaps()&(FCAP_IMPULSE_USE|FCAP_CONTINUOUS_USE|FCAP_ONOFF_USE))) continue;
   Vector los=UTIL_ClampVectorToBox(VecBModelOrigin(e->pev)-eyes,e->pev->size*.5f);
   ALERT(at_console,"COF/USEAIM candidate=%s class=%s dot=%.9g\n",STRING(e->pev->targetname),STRING(e->pev->classname),DotProduct(los,gpGlobals->v_forward));
  }
 }
 else if( FStrEq( pcmd, "cof_door" ))
  CoF_InspectInterDoor(arg);
 else if( FStrEq( pcmd, "cof_changelevel" ))
  CoF_InspectChangeLevel(arg);
 else if( FStrEq( pcmd, "cof_customize" ))
  CoF_InspectCustomize(CoF_FindDebugTarget(arg),arg);
 else if( FStrEq( pcmd, "cof_fence" ))
		ALERT( at_console, "COF/FENCE %s time=%g\n", arg, gpGlobals->time );
#ifdef __EMSCRIPTEN__
	else if( FStrEq( pcmd, "cof_callbacks" ))
		CoF_DumpCallbacks();
	else if( FStrEq( pcmd, "cof_sky_sync" ))
		CoF_SendEnvpos( pPlayer );
	else if( FStrEq( pcmd, "cof_train" ))
		CoF_TrainDump( arg );
	else if( FStrEq( pcmd, "cof_camera" ))
		CoF_CameraDump( arg );
	else if( FStrEq( pcmd, "cof_manager_trace" ))
		CoF_SetManagerTrace( atoi( arg ));
#endif
	else if( FStrEq( pcmd, "cof_unfreeze" ))
		pPlayer->pev->flags &= ~FL_FROZEN;
	else if( FStrEq( pcmd, "cof_motion_dump" ))
		CoF_MotionDump();
	else if( FStrEq( pcmd, "cof_count" ))
	{
		int count = 0;
		CBaseEntity *entity = NULL;
		while(( entity = UTIL_FindEntityByClassname( entity, arg )))
			if( !FBitSet( entity->pev->flags, FL_KILLME )) ++count;
		ALERT( at_console, "COF/COUNT %s %d\n", arg, count );
	}
	else if( FStrEq( pcmd, "cof_list" ))
	{
		// every entity of a class with what decides whether the client gets it
		CBaseEntity *entity = NULL;
		while(( entity = UTIL_FindEntityByClassname( entity, arg )))
			ALERT( at_console, "COF/LIST %s #%d origin=%.0f,%.0f,%.0f effects=%d renderfx=%d rendermode=%d modelindex=%d model=%s killme=%d\n",
				arg, entity->entindex(), entity->pev->origin.x, entity->pev->origin.y, entity->pev->origin.z,
				entity->pev->effects, entity->pev->renderfx, entity->pev->rendermode, entity->pev->modelindex,
				FStringNull( entity->pev->model ) ? "-" : STRING( entity->pev->model ), FBitSet( entity->pev->flags, FL_KILLME ) != 0 );
	}
	else if( FStrEq( pcmd, "cof_remove" ))
	{
		CBaseEntity *entity = CoF_FindDebugTarget( arg );
		if( entity ) UTIL_Remove( entity );
	}
	else if( FStrEq( pcmd, "cof_kinematics" ))
	{
		CBaseEntity *entity = FStrEq( arg, "!player" ) ? pPlayer : CoF_FindDebugTarget( arg );
		if( entity )
			ALERT( at_console, "COF/KIN %s pos=%.6g,%.6g,%.6g vel=%.6g,%.6g,%.6g angles=%.6g,%.6g,%.6g avel=%.6g,%.6g,%.6g\n", arg,
				entity->pev->origin.x, entity->pev->origin.y, entity->pev->origin.z,
				entity->pev->velocity.x, entity->pev->velocity.y, entity->pev->velocity.z,
				entity->pev->angles.x, entity->pev->angles.y, entity->pev->angles.z,
				entity->pev->avelocity.x, entity->pev->avelocity.y, entity->pev->avelocity.z );
	}
	else if( FStrEq( pcmd, "cof_animation" ))
	{
		CBaseEntity *entity = CoF_FindDebugTarget( arg );
		if( entity && FClassnameIs( entity->pev, "env_model" ))
		{
			CBaseAnimating *anim = (CBaseAnimating *)entity;
			ALERT( at_console, "COF/ANIM %s seq=%d frame=%.6g rate=%.6g loops=%d finished=%d on=%d next=%.6g now=%.6g body=%d skin=%d\n",
				arg, anim->pev->sequence, anim->pev->frame, anim->m_flFrameRate, anim->m_fSequenceLoops,
				anim->m_fSequenceFinished, !( anim->pev->spawnflags & 1 ), anim->pev->nextthink,
				gpGlobals->time, anim->pev->body, anim->pev->skin );
		}
	}
	else if( FStrEq( pcmd, "cof_use" ) && CMD_ARGC() == 3 )
	{
		CBaseEntity *entity = CoF_FindDebugTarget( arg );
		const char *mode = CMD_ARGV( 2 );
		if( entity && ( FStrEq( mode, "on" ) || FStrEq( mode, "off" ) || FStrEq( mode, "toggle" )))
			entity->Use( pPlayer, pPlayer, FStrEq( mode, "on" ) ? USE_ON : FStrEq( mode, "off" ) ? USE_OFF : USE_TOGGLE, 0 );
	}
	else if( FStrEq( pcmd, "cof_inspect" ))
	{
		CBaseEntity *pTarget = FStrEq( arg, "!player" ) ? pPlayer : CoF_FindDebugTarget( arg );
		if( pTarget )
			ALERT( at_console, "COF/ENTITY %s class=%s body=%d solid=%d origin=%.1f,%.1f,%.1f gate=%d speed=%.1f spawn=%d touch=%d target=%s frozen=%d stairs=%d use=%d think=%d toggle=%d next=%g now=%g effects=%d renderfx=%d modelindex=%d model=%s\n",
				arg, STRING( pTarget->pev->classname ), pTarget->pev->body, pTarget->pev->solid,
				pTarget->pev->origin.x, pTarget->pev->origin.y, pTarget->pev->origin.z, pTarget->pev->iuser1, pTarget->pev->maxspeed,
				pTarget->pev->spawnflags, pTarget->m_pfnTouch != NULL, STRING( pTarget->pev->target ),
				FBitSet( pTarget->pev->flags, FL_FROZEN ) != 0, pTarget->IsPlayer() ? CoF_OnStairs( (CBasePlayer *)pTarget ) : -1, pTarget->m_pfnUse != NULL, pTarget->m_pfnThink != NULL, pTarget->GetToggleState(), pTarget->pev->nextthink, gpGlobals->time, pTarget->pev->effects,
				pTarget->pev->renderfx, pTarget->pev->modelindex, FStringNull( pTarget->pev->model ) ? "-" : STRING( pTarget->pev->model ));
		else
			ALERT( at_console, "COF/ENTITY %s missing\n", arg );
	}
	else if( FStrEq( pcmd, "cof_setkey" ) && CMD_ARGC() == 4 )
	{
		CBaseEntity *pTarget = FStrEq( arg, "!player" ) ? pPlayer : CoF_FindDebugTarget( arg );
		if( pTarget )
		{
			KeyValueData kv = { (char *)STRING( pTarget->pev->classname ), (char *)CMD_ARGV( 2 ), (char *)CMD_ARGV( 3 ), FALSE };
			DispatchKeyValue( pTarget->edict(), &kv );
			ALERT( at_console, "COF/KEY %s %s handled=%d\n", arg, CMD_ARGV( 2 ), kv.fHandled );
		}
	}
	else if( FStrEq( pcmd, "cof_touch" ))
	{
		CBaseEntity *pTarget = CoF_FindDebugTarget( arg );
		CBaseEntity *other = CMD_ARGC() >= 3 ? CoF_FindDebugTarget( CMD_ARGV( 2 )) : pPlayer;
		ALERT( at_console, "COF/TOUCH %s found=%d player=%d flags=%d\n", arg, pTarget != NULL, other ? other->IsPlayer() : 0, other ? other->pev->flags : 0 );
		if( pTarget && other ) pTarget->Touch( other );
	}
	else if( FStrEq( pcmd, "cof_soundstate" ))
		ALERT( at_console, "COF/SOUND room=%g range=%g source=%s special=%g\n", pPlayer->m_flSndRoomtype,
			pPlayer->m_flSndRange, FNullEnt( pPlayer->m_pentSndLast ) ? "<none>" : STRING( VARS( pPlayer->m_pentSndLast )->model ), pPlayer->pev->vuser1.x );
	else if( FStrEq( pcmd, "cof_give" ))
		CoF_GiveItem( pPlayer, arg );
	else if( FStrEq( pcmd, "cof_sethealth" ))
		pPlayer->pev->health = atoi( arg ) > 0 ? atoi( arg ) : 1;
	else if( FStrEq( pcmd, "cof_fire" ))
	{
		CBaseEntity *activator = CMD_ARGC() >= 3 ? CoF_FindDebugTarget( CMD_ARGV( 2 )) : pPlayer;
		if( activator ) FireTargets( arg, activator, pPlayer, USE_TOGGLE, 0 );
		else ALERT( at_console, "COF/FIRE missing activator %s\n", CMD_ARGV( 2 ));
	}
	else if( FStrEq( pcmd, "cof_spawn" ))
	{
		UTIL_MakeVectors( Vector( 0, pPlayer->pev->v_angle.y, 0 ));
		Vector pos = pPlayer->pev->origin + gpGlobals->v_forward * 150;
		// Create keeps the name as the classname: not the console buffer
		CBaseEntity *pNew = CBaseEntity::Create( (char *)STRING( ALLOC_STRING( arg )), pos, Vector( 0, pPlayer->pev->v_angle.y + 180, 0 ), NULL );
		if( pNew )
		{
			if( CMD_ARGC() >= 3 ) pNew->pev->targetname = ALLOC_STRING( CMD_ARGV( 2 ));
			DROP_TO_FLOOR( pNew->edict());
		}
	}
	else if( FStrEq( pcmd, "cof_goto" ) && CMD_ARGC() >= 4 )
	{
		// cof_goto x y z
		UTIL_SetOrigin( pPlayer->pev, Vector( atof( CMD_ARGV( 1 )), atof( CMD_ARGV( 2 )), atof( CMD_ARGV( 3 ))));
		pPlayer->pev->velocity = g_vecZero;
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
	// USE on an item that is not a weapon (the original's "inventoryuse"): keys on doors and buttons.
	// hud.js plays the click and closes the bag, or plays the original's "no"
	else if( FStrEq( pcmd, "cof_useitem" ))
	{
		int i = atoi( CMD_ARGV( 1 ));
		char name[COF_ITEM_LEN];
		bool used = false;
		if( i >= 0 && i < s->numItems )
		{
			snprintf( name, sizeof( name ), "%s", s->names[i] ); // the entry goes away if it is used up
			used = CoF_UseItemOn( pPlayer, name );
		}
		CoF_HudPrint( "COF/HUD ITEMUSED %d\n", used ? 1 : 0 );
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
	// the flashlight button of the original ("Press flashlight button to enable"): the phone's light,
	// when the phone is not the weapon in the hands (there, +attack switches it)
	else if( FStrEq( pcmd, "flashlight" ))
	{
		CBasePlayerItem *pActive = pPlayer->m_pActiveItem;
		if( pPlayer->HasNamedPlayerItem( "weapon_mobile" ) && !( pActive && FClassnameIs( pActive->pev, "weapon_mobile" )))
			CoF_SetFlashlight( pPlayer, !CoF_FlashlightIsOn( pPlayer ));
	}
	// DUAL WIELD in the bag: the phone and the knife together, light in one hand and knife in the other
	else if( FStrEq( pcmd, "cof_dualwield" ) && CMD_ARGC() == 3 )
	{
		int a = atoi( CMD_ARGV( 1 )), b = atoi( CMD_ARGV( 2 ));
		cof_phone_t *phone = CoF_Phone( pPlayer );
		if( phone )
		{
			const char *x = ( a >= 0 && a < s->numItems ) ? s->names[a] : "";
			const char *y = ( b >= 0 && b < s->numItems ) ? s->names[b] : "";
			phone->dual = ( !stricmp( x, "weapon_mobile" ) && !stricmp( y, "weapon_switchblade" )) ||
				( !stricmp( x, "weapon_switchblade" ) && !stricmp( y, "weapon_mobile" ));
			CBasePlayerItem *pActive = pPlayer->m_pActiveItem;
			if( phone->dual && pActive && FClassnameIs( pActive->pev, "weapon_switchblade" ))
				CoF_SetFlashlight( pPlayer, true );
			s->invDirty = TRUE;
		}
	}
	// binds of the original config.cfg that do nothing yet: keep them out of the console
	else if( FStrEq( pcmd, "+dodge" ) || FStrEq( pcmd, "-dodge" ) || FStrEq( pcmd, "adlib" ) ||
		FStrEq( pcmd, "cancelselect" ) || FStrEq( pcmd, "weapontoggle" ) ||
		FStrEq( pcmd, "+attack3" ) || FStrEq( pcmd, "-attack3" ))
		;
	else if( CoF_PadlockCommand( pPlayer, pcmd ) || CoF_PuzzleCommand( pPlayer, pcmd ) || CoF_DebugCommand( pPlayer, pcmd ))
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
		CoF_CenterPrint( STRING( m_iszMsg ));
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
 string_t m_iszPadlockCode;
	int m_iSmsMessage;
	BOOL m_fSmsUnread;
	BOOL m_fMobileFlash;
	BOOL m_fMobileDual;
	BOOL m_fFlashlight;
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
 DEFINE_FIELD( CCofPlayerState, m_iszPadlockCode, FIELD_STRING ),
	DEFINE_FIELD( CCofPlayerState, m_flStamina, FIELD_FLOAT ),
	DEFINE_FIELD( CCofPlayerState, m_iSmsMessage, FIELD_INTEGER ),
	DEFINE_FIELD( CCofPlayerState, m_fSmsUnread, FIELD_BOOLEAN ),
	DEFINE_FIELD( CCofPlayerState, m_fMobileFlash, FIELD_BOOLEAN ),
	DEFINE_FIELD( CCofPlayerState, m_fMobileDual, FIELD_BOOLEAN ),
	DEFINE_FIELD( CCofPlayerState, m_fFlashlight, FIELD_BOOLEAN ),
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
	m_iSmsMessage = s->phone.message;
	m_fSmsUnread = s->phone.unread;
	m_fMobileFlash = s->phone.flash;
	m_fMobileDual = s->phone.dual;
	m_fFlashlight = s->flashlight;
	char code[16];
	m_iPassword = CoF_GetPuzzleState( code, sizeof( code ));
	m_iszCode = ALLOC_STRING( code );
 m_iszPadlockCode=ALLOC_STRING(CoF_PadlockCode());

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
	s->phone.message = m_iSmsMessage;
	s->phone.unread = m_fSmsUnread;
	s->phone.flash = m_fMobileFlash;
	s->phone.dual = m_fMobileDual;
	s->flashlight = m_fFlashlight;
	s->sentFlashlight = -1;
	CoF_SetPuzzleState( m_iPassword, FStringNull( m_iszCode ) ? "" : STRING( m_iszCode ));
 if(!FStringNull(m_iszPadlockCode)) CoF_SetPadlockCode(STRING(m_iszPadlockCode));
	s->invDirty = TRUE;
	s->store = this;
	return 1;
}
