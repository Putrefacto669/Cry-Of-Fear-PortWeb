// Cry of Fear: inter_door, the "use and pass through" doors.
//
// They never move. Using one fades the screen to black, moves the player to
// the inter_door_exit named in "target" and fades back in, like the doors of
// survival horror games. "lockedby" keeps it locked: it is either the
// map_name of an inventory key (inventoryitems/*.txt), which unlocks it and
// is used up, or a name no item has, so the door stays shut unless map logic
// changes it with cof_interdooronoff.

#include "extdll.h"
#include "util.h"
#include "cbase.h"
#include "saverestore.h"
#include "shake.h"
#include "player.h"
#include "cof_player.h"

#define INTER_DOOR_FADE 0.35f   // seconds to black and back

class CInterDoor : public CBaseEntity
{
public:
	void Spawn( void );
	void Precache( void );
	virtual void KeyValue( KeyValueData *pkvd );
	virtual int ObjectCaps( void ) { return ( CBaseEntity::ObjectCaps() & ~FCAP_ACROSS_TRANSITION ) | FCAP_IMPULSE_USE; }
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );
	virtual int Save( CSave &save );
	virtual int Restore( CRestore &restore );
	static TYPEDESCRIPTION m_SaveData[];

	void EXPORT PassThink( void );
	BOOL TryUnlock( CBaseEntity *pActivator );
	void ToggleLock() { m_sLockedBy=FStringNull(m_sLockedBy)?ALLOC_STRING("somethinglocked"):iStringNull; }
	void SetLock( string_t lockedBy )
	{
		const char *name = FStringNull( lockedBy ) ? "" : STRING( lockedBy );
		m_sLockedBy = name[0] ? lockedBy : iStringNull;
	}

	string_t m_sOpenSound;
	string_t m_sCloseSound;
	string_t m_sLockedSound;
	string_t m_sUnlockedSound;
	string_t m_sLockedBy;
	string_t m_sLockedMsg;
	string_t m_sUnlockedMsg;
	string_t m_sMaster;
	string_t m_sMusic;          // track of the area behind the door (mp3/)
	float m_flMusicFadeOut;
	EHANDLE m_hUser;
	float m_flNextUse;
	BOOL m_bDisabled;
	void SetDisabled( BOOL disabled ) { m_bDisabled = disabled; }
};

void CoF_InspectInterDoor(const char *name)
{
 CBaseEntity *e=UTIL_FindEntityByTargetname(NULL,name);
 if(!e||!FClassnameIs(e->pev,"inter_door")) { ALERT(at_console,"COF/DOOR %s missing\n",name);return; }
 CInterDoor *d=(CInterDoor*)e;
 ALERT(at_console,"COF/DOOR %s locked=%d disabled=%d target=%s\n",name,!FStringNull(d->m_sLockedBy)&&(STRING(d->m_sLockedBy))[0],d->m_bDisabled,STRING(d->pev->target));
}
LINK_ENTITY_TO_CLASS( inter_door, CInterDoor )
LINK_ENTITY_TO_CLASS( inter_door_exit, CPointEntity )

TYPEDESCRIPTION CInterDoor::m_SaveData[] =
{
	DEFINE_FIELD( CInterDoor, m_sOpenSound, FIELD_STRING ),
	DEFINE_FIELD( CInterDoor, m_sCloseSound, FIELD_STRING ),
	DEFINE_FIELD( CInterDoor, m_sLockedSound, FIELD_STRING ),
	DEFINE_FIELD( CInterDoor, m_sUnlockedSound, FIELD_STRING ),
	DEFINE_FIELD( CInterDoor, m_sLockedBy, FIELD_STRING ),
	DEFINE_FIELD( CInterDoor, m_sLockedMsg, FIELD_STRING ),
	DEFINE_FIELD( CInterDoor, m_sUnlockedMsg, FIELD_STRING ),
	DEFINE_FIELD( CInterDoor, m_sMaster, FIELD_STRING ),
	DEFINE_FIELD( CInterDoor, m_sMusic, FIELD_STRING ),
	DEFINE_FIELD( CInterDoor, m_flMusicFadeOut, FIELD_FLOAT ),
	DEFINE_FIELD( CInterDoor, m_hUser, FIELD_EHANDLE ),
	DEFINE_FIELD( CInterDoor, m_flNextUse, FIELD_TIME ),
	DEFINE_FIELD( CInterDoor, m_bDisabled, FIELD_BOOLEAN ),
};

IMPLEMENT_SAVERESTORE( CInterDoor, CBaseEntity )

void CInterDoor::KeyValue( KeyValueData *pkvd )
{
	static const struct { const char *key; string_t CInterDoor::*field; } strings[] =
	{
		{ "opensound", &CInterDoor::m_sOpenSound },
		{ "closesound", &CInterDoor::m_sCloseSound },
		{ "lockedsnd", &CInterDoor::m_sLockedSound },
		{ "unlockedsnd", &CInterDoor::m_sUnlockedSound },
		{ "lockedby", &CInterDoor::m_sLockedBy },
		{ "lockedmsg", &CInterDoor::m_sLockedMsg },
		{ "unlockedmsg", &CInterDoor::m_sUnlockedMsg },
		{ "master", &CInterDoor::m_sMaster },
		{ "music", &CInterDoor::m_sMusic },
	};

	for( size_t i = 0; i < sizeof( strings ) / sizeof( strings[0] ); i++ )
	{
		if( FStrEq( pkvd->szKeyName, strings[i].key ))
		{
			this->*strings[i].field = pkvd->szValue[0] ? ALLOC_STRING( pkvd->szValue ) : iStringNull;
			pkvd->fHandled = TRUE;
			return;
		}
	}

	// music, silentroom, doortype...: presentation the port does not do yet
	if( FStrEq( pkvd->szKeyName, "musicfadeout" ))
	{
		m_flMusicFadeOut = atof( pkvd->szValue );
		pkvd->fHandled = TRUE;
	}
	else if( FStrEq( pkvd->szKeyName, "doortype" ) || FStrEq( pkvd->szKeyName, "musicfadein" ) ||
		FStrEq( pkvd->szKeyName, "silentroom" ) || FStrEq( pkvd->szKeyName, "newlevelsnd" ) ||
		FStrEq( pkvd->szKeyName, "propertarget" ) || FStrEq( pkvd->szKeyName, "movewith" ) ||
		FStrEq( pkvd->szKeyName, "useunlock" ) || FStrEq( pkvd->szKeyName, "usesound" ) ||
		FStrEq( pkvd->szKeyName, "checkdelay" ))
	{
		pkvd->fHandled = TRUE;
	}
	else
		CBaseEntity::KeyValue( pkvd );
}

void CInterDoor::Precache( void )
{
	string_t sounds[] = { m_sOpenSound, m_sCloseSound, m_sLockedSound, m_sUnlockedSound };

	for( size_t i = 0; i < sizeof( sounds ) / sizeof( sounds[0] ); i++ )
		if( !FStringNull( sounds[i] ))
			PRECACHE_SOUND( (char *)STRING( sounds[i] ));
}

void CInterDoor::Spawn( void )
{
	Precache();
	m_bDisabled = ( pev->spawnflags & 4 ) != 0;

	pev->solid = SOLID_BSP;
	pev->movetype = MOVETYPE_PUSH;
	UTIL_SetOrigin( pev, pev->origin );
	SET_MODEL( ENT( pev ), STRING( pev->model ));
}

static void InterDoor_Sound( CBaseEntity *pEntity, string_t sound )
{
	if( !FStringNull( sound ))
		EMIT_SOUND( ENT( pEntity->pev ), CHAN_ITEM, STRING( sound ), 1.0f, ATTN_NORM );
}

static void InterDoor_Message( CBaseEntity *pPlayer, string_t msg )
{
	if( !FStringNull( msg ))
		CoF_CenterPrint( STRING( msg ));
}

BOOL CInterDoor::TryUnlock( CBaseEntity *pActivator )
{
	if( FStringNull( m_sLockedBy ))
		return TRUE;

	if( !CoF_HasItem( pActivator, STRING( m_sLockedBy )))
	{
		InterDoor_Sound( this, m_sLockedSound );
		InterDoor_Message( pActivator, m_sLockedMsg );
		return FALSE;
	}

	CoF_RemoveItem( pActivator, STRING( m_sLockedBy ));
	m_sLockedBy = iStringNull;
	InterDoor_Sound( this, m_sUnlockedSound );
	InterDoor_Message( pActivator, m_sUnlockedMsg );
	return FALSE; // unlocking takes the use; the next one opens it
}

void CInterDoor::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	if( !pActivator || !pActivator->IsPlayer() || m_bDisabled || gpGlobals->time < m_flNextUse )
		return;

	m_flNextUse = gpGlobals->time + 0.5f;

	if( !UTIL_IsMasterTriggered( m_sMaster, pActivator ))
	{
		InterDoor_Sound( this, m_sLockedSound );
		InterDoor_Message( pActivator, m_sLockedMsg );
		return;
	}

	if( !TryUnlock( pActivator ) || FStringNull( pev->target ))
		return;

	if( !UTIL_FindEntityByTargetname( NULL, STRING( pev->target )))
	{
		ALERT( at_console, "inter_door: no exit named %s\n", STRING( pev->target ));
		return;
	}

	m_hUser = pActivator;
	m_flNextUse = gpGlobals->time + INTER_DOOR_FADE * 3.0f;
	InterDoor_Sound( this, m_sOpenSound );
	pActivator->pev->flags |= FL_FROZEN;
	pActivator->pev->velocity = g_vecZero;
	UTIL_ScreenFade( pActivator, Vector( 0, 0, 0 ), INTER_DOOR_FADE, INTER_DOOR_FADE, 255, FFADE_OUT );

	SetThink( &CInterDoor::PassThink );
	pev->nextthink = pev->ltime + INTER_DOOR_FADE + 0.05f; // MOVETYPE_PUSH thinks on ltime
}

void CInterDoor::PassThink( void )
{
	CBaseEntity *pPlayer = m_hUser;
	CBaseEntity *pExit = FStringNull( pev->target ) ? NULL : UTIL_FindEntityByTargetname( NULL, STRING( pev->target ));

	SetThink( NULL );
	m_hUser = NULL;
	if( !pPlayer )
		return;

	pPlayer->pev->flags &= ~FL_FROZEN;
	if( pExit )
	{
		// the exit marks a spot on the floor or at eye level: find where the hull stands
		Vector start = pExit->pev->origin + Vector( 0, 0, 40 );
		TraceResult tr;
		UTIL_TraceHull( start, pExit->pev->origin - Vector( 0, 0, 80 ), ignore_monsters, human_hull, pPlayer->edict(), &tr );
		Vector dest = ( tr.fStartSolid || tr.fAllSolid ) ? pExit->pev->origin : tr.vecEndPos;

		pPlayer->pev->flags &= ~FL_ONGROUND;
		UTIL_SetOrigin( pPlayer->pev, dest );
		pPlayer->pev->angles = pExit->pev->angles;
		pPlayer->pev->v_angle = pExit->pev->angles;
		pPlayer->pev->fixangle = TRUE;
		pPlayer->pev->velocity = pPlayer->pev->basevelocity = g_vecZero;
	}

	if( !FStringNull( m_sCloseSound ))
		EMIT_SOUND( ENT( pPlayer->pev ), CHAN_ITEM, STRING( m_sCloseSound ), 1.0f, ATTN_NORM );

	// the area behind the door has its own track: replaces what is playing on channel 0
	if( !FStringNull( m_sMusic ) && !strchr( STRING( m_sMusic ), ' ' ))
		CoF_HudPrint( "COF/HUD MUSIC 0 0 %s %g\n", STRING( m_sMusic ), m_flMusicFadeOut );
	UTIL_ScreenFade( pPlayer, Vector( 0, 0, 0 ), INTER_DOOR_FADE, 0, 255, FFADE_IN );
}

/*
=====================================================================
cof_interdooronoff: "message" names the inter_door(s), "newlockedby"
is the new lock (empty: unlocked)
=====================================================================
*/
class CCofInterDoorOnOff : public CPointEntity
{
public:
	virtual void KeyValue( KeyValueData *pkvd );
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );
	virtual int Save( CSave &save );
	virtual int Restore( CRestore &restore );
	static TYPEDESCRIPTION m_SaveData[];

	string_t m_sNewLock;
};

LINK_ENTITY_TO_CLASS( cof_interdooronoff, CCofInterDoorOnOff )

TYPEDESCRIPTION CCofInterDoorOnOff::m_SaveData[] =
{
	DEFINE_FIELD( CCofInterDoorOnOff, m_sNewLock, FIELD_STRING ),
};

IMPLEMENT_SAVERESTORE( CCofInterDoorOnOff, CPointEntity )

void CCofInterDoorOnOff::KeyValue( KeyValueData *pkvd )
{
	if( FStrEq( pkvd->szKeyName, "newlockedby" ))
	{
		m_sNewLock = ALLOC_STRING( pkvd->szValue );
		pkvd->fHandled = TRUE;
	}
	else
		CPointEntity::KeyValue( pkvd );
}

void CCofInterDoorOnOff::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	CBaseEntity *pDoor = NULL;

	if( FStringNull( pev->message ))
		return;

	while(( pDoor = UTIL_FindEntityByTargetname( pDoor, STRING( pev->message ))))
	{
		if( FClassnameIs( pDoor->pev, "inter_door" ))
			( (CInterDoor *)pDoor )->ToggleLock();
	}
}

/*
=====================================================================
func_button with "lockedby": hlsdk's CBaseButton asks here before it
is pressed. With the item, it is used up and the button goes at once
(the videotape plays, the rope is placed).
=====================================================================
*/
class CCofInterDoorDisable : public CPointEntity
{
public:
	void Use( CBaseEntity *pActivator, CBaseEntity *, USE_TYPE, float )
	{
		if( !pActivator || !pActivator->IsPlayer() || FStringNull( pev->target )) return;
		CBaseEntity *pTarget = UTIL_FindEntityByTargetname( NULL, STRING( pev->target ));
		if( pTarget && FClassnameIs( pTarget->pev, "inter_door" ))
			((CInterDoor *)pTarget)->SetDisabled( pev->frags == 0 );
	}
};
LINK_ENTITY_TO_CLASS( inter_door_disable, CCofInterDoorDisable )

bool CoF_ButtonLock( CBaseEntity *pButton, CBaseEntity *pActivator, string_t *lockedBy, string_t lockedMsg, string_t unlockedMsg, string_t unlockedSnd )
{
	if( FStringNull( *lockedBy ))
		return true;
	if( !pActivator || !pActivator->IsPlayer())
		return false;

	if( !CoF_HasItem( pActivator, STRING( *lockedBy )))
	{
		if( !FStringNull( lockedMsg ))
			CoF_CenterPrint( STRING( lockedMsg ));
		return false;
	}

	CoF_RemoveItem( pActivator, STRING( *lockedBy ));
	*lockedBy = iStringNull;
	if( !FStringNull( unlockedSnd ))
		EMIT_SOUND( ENT( pButton->pev ), CHAN_ITEM, STRING( unlockedSnd ), 1.0f, ATTN_NORM );
	if( !FStringNull( unlockedMsg ))
		CoF_CenterPrint( STRING( unlockedMsg ));
	return true;
}
