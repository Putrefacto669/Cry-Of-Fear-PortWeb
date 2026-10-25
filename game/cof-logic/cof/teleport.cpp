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

void CCofTeleport::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	if( !pActivator || !FBitSet( pActivator->pev->flags, FL_CLIENT | FL_MONSTER ) )
		return;

	CBaseEntity *pDest = UTIL_FindEntityByTargetname( NULL, STRING( pev->target ) );

	if( !pDest )
		return;

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
}
