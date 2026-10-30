// Cry of Fear brush acoustic zones. Uses the engine's existing room DSP message.
// Special original player audio overrides and Spirit master expressions are
// deliberately not approximated by the portable ordinary-player subset.
#include "extdll.h"
#include "util.h"
#include "cbase.h"
#include "player.h"
#include "saverestore.h"
#include <errno.h>
#include <math.h>
#include <stdlib.h>
#include <string.h>

class CCofTriggerSound : public CBaseDelay
{
public:
	void Spawn( void );
	void KeyValue( KeyValueData *pkvd );
	void Touch( CBaseEntity *other );
	int ObjectCaps( void ) { return 0; }
	int Save( CSave &save );
	int Restore( CRestore &restore );
	static TYPEDESCRIPTION m_SaveData[];
	float m_flRoomtype;
	string_t m_iszMaster;
};
LINK_ENTITY_TO_CLASS( trigger_sound, CCofTriggerSound )
TYPEDESCRIPTION CCofTriggerSound::m_SaveData[] =
{
	DEFINE_FIELD( CCofTriggerSound, m_flRoomtype, FIELD_FLOAT ),
	DEFINE_FIELD( CCofTriggerSound, m_iszMaster, FIELD_STRING ),
};
IMPLEMENT_SAVERESTORE( CCofTriggerSound, CBaseDelay )

void CCofTriggerSound::KeyValue( KeyValueData *pkvd )
{
	if( FStrEq( pkvd->szKeyName, "roomtype" ))
	{
		char *end = NULL;
		errno = 0;
		float room = strtof( pkvd->szValue, &end );
		// The current engine has presets 0..28; the original sends a short
		// after truncating the float. Do not send invalid DSP array indices.
		m_flRoomtype = end != pkvd->szValue && !*end && errno != ERANGE &&
			isfinite( room ) && room >= 0 && room < 29 ? room : -1;
	}
	else if( FStrEq( pkvd->szKeyName, "master" ))
		m_iszMaster = *pkvd->szValue ? ALLOC_STRING( pkvd->szValue ) : iStringNull;
	else
	{
		// The original room/master handler delegates directly to CBaseEntity,
		// not CBaseDelay. In particular, BSP delay is not an audio timer.
		CBaseEntity::KeyValue( pkvd );
		return;
	}
	pkvd->fHandled = TRUE;
}

void CCofTriggerSound::Spawn( void )
{
	pev->solid = SOLID_TRIGGER;
	pev->movetype = MOVETYPE_NONE;
	pev->effects |= EF_NODRAW;
	if( FStringNull( pev->model )) { UTIL_Remove( this ); return; }
	SET_MODEL( ENT( pev ), STRING( pev->model ));
}

void CCofTriggerSound::Touch( CBaseEntity *other )
{
	if( !other || !other->IsPlayer() ) return;
	if( m_flRoomtype < 0 )
	{
		ALERT( at_console, "trigger_sound: unsupported roomtype (%s)\n", STRING( pev->model ));
		return;
	}
	if( !FStringNull( m_iszMaster ))
	{
		const char *name = STRING( m_iszMaster );
		CBaseEntity *master = UTIL_FindEntityByTargetname( NULL, name );
		if( strchr( name, '~' ) || strchr( name, '(' ) || !master || !( master->ObjectCaps() & FCAP_MASTER ))
		{
			ALERT( at_console, "trigger_sound: unsupported or missing master %s\n", name );
			return;
		}
		if( !master->IsTriggered( other )) return;
	}
	CBasePlayer *player = (CBasePlayer *)other;
	if( player->m_pentSndLast == edict() ) return;
	if( player->pev->vuser1.x != 0 )
	{
		ALERT( at_console, "trigger_sound: special player audio state not implemented\n" );
		return;
	}
	player->m_pentSndLast = edict();
	player->m_flSndRoomtype = m_flRoomtype;
	player->m_flSndRange = 0;
	MESSAGE_BEGIN( MSG_ONE, SVC_ROOMTYPE, NULL, player->edict() );
	WRITE_SHORT( (short)m_flRoomtype );
	MESSAGE_END();
	if( CVAR_GET_FLOAT( "sv_cheats" ) != 0 )
		ALERT( at_console, "COF/ROOM %s player=%d room=%d\n", STRING( pev->model ), player->entindex(), (int)m_flRoomtype );
	SUB_UseTargets( player, USE_TOGGLE, 0 );
}
