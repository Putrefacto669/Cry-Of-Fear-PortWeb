// CoF's trigger_once/trigger_multiple gate is iuser1 (1 = disabled),
// independent of the Half-Life trigger's solidity or ToggleUse callback.
#include "extdll.h"
#include "util.h"
#include "cbase.h"
class CCofTriggerOn : public CPointEntity
{
public:
	void Use( CBaseEntity *, CBaseEntity *, USE_TYPE, float )
	{
		if( FStringNull( pev->target )) return;
		CBaseEntity *pTarget = UTIL_FindEntityByTargetname( NULL, STRING( pev->target ));
		if( pTarget && ( FClassnameIs( pTarget->pev, "trigger_once" ) || FClassnameIs( pTarget->pev, "trigger_multiple" )))
			pTarget->pev->iuser1 = 0;
	}
};
LINK_ENTITY_TO_CLASS( cof_triggeron, CCofTriggerOn )
