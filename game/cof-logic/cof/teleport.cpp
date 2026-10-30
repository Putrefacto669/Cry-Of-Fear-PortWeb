// Cry of Fear: cof_teleport.
// Point entity fired by triggers; moves the activator to the entity named
// in "target" (usually an info_teleport_destination).

#include "extdll.h"
#include "util.h"
#include "cbase.h"

class CCofTeleport : public CPointEntity
{
public:
	virtual void KeyValue( KeyValueData *pkvd );
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );

	string_t m_sMessage;
};

LINK_ENTITY_TO_CLASS( cof_teleport, CCofTeleport )

void CCofTeleport::KeyValue( KeyValueData *pkvd )
{
	if( FStrEq( pkvd->szKeyName, "message" ) )
	{
		m_sMessage = ALLOC_STRING( pkvd->szValue );
		pkvd->fHandled = TRUE;
	}
	else
		CPointEntity::KeyValue( pkvd );
}

static bool CoF_TeleportTo( CBaseEntity *pActivator, string_t target )
{
	if( !pActivator || !FBitSet( pActivator->pev->flags, FL_CLIENT | FL_MONSTER ) )
		return false;

	if( FStringNull( target )) return false;
	CBaseEntity *pDest = UTIL_FindEntityByTargetname( NULL, STRING( target ) );

	if( !pDest )
		return false;

	Vector vecDest = pDest->pev->origin;

	if( pActivator->IsPlayer() )
		vecDest.z -= pActivator->pev->mins.z;

	vecDest.z++;

	pActivator->pev->flags &= ~FL_ONGROUND;
	UTIL_SetOrigin( pActivator->pev, vecDest );

	pActivator->pev->angles = pDest->pev->angles;

	if( pActivator->IsPlayer() )
		pActivator->pev->v_angle = pDest->pev->angles;

	pActivator->pev->fixangle = TRUE;
	pActivator->pev->velocity = pActivator->pev->basevelocity = g_vecZero;
	if( CVAR_GET_FLOAT( "sv_cheats" ) != 0 )
		ALERT( at_console, "COF/TELEPORT %s origin=%.1f,%.1f,%.1f minsZ=%.1f yaw=%.1f velocity=%.1f\n",
			STRING( target ), pActivator->pev->origin.x, pActivator->pev->origin.y, pActivator->pev->origin.z,
			pActivator->pev->mins.z, pActivator->pev->v_angle.y, pActivator->pev->velocity.Length() );
	return true;
}

void CCofTeleport::Use( CBaseEntity *pActivator, CBaseEntity *, USE_TYPE, float )
{
	CoF_TeleportTo( pActivator, pev->target );
}

class CCofTriggerTeleport : public CBaseToggle
{
public:
	int ObjectCaps( void ) { return CBaseToggle::ObjectCaps() & ~FCAP_ACROSS_TRANSITION; }
	void Spawn( void )
	{
		pev->solid = SOLID_TRIGGER;
		pev->movetype = MOVETYPE_NONE;
		if( CVAR_GET_FLOAT( "showtriggers" ) == 0 ) pev->effects |= EF_NODRAW;
		else pev->effects &= ~EF_NODRAW;
		SET_MODEL( edict(), STRING( pev->model ));
		SetTouch( &CCofTriggerTeleport::TeleportTouch );
	}
	void EXPORT TeleportTouch( CBaseEntity *pOther )
	{
		if( !pOther || !pOther->IsPlayer() || !UTIL_IsMasterTriggered( m_sMaster, pOther )) return;
		if( CoF_TeleportTo( pOther, pev->target ) && ( pev->spawnflags & 1 ))
		{
			SetTouch( NULL );
			UTIL_Remove( this );
		}
	}
};
LINK_ENTITY_TO_CLASS( trigger_cofteleport, CCofTriggerTeleport )
