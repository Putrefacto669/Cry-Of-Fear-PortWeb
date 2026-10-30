// Non-solid staircase volumes select sk_stair_speed (50 in all four
// skill tiers of the inspected game data). They do not supply collision.
#include "extdll.h"
#include "util.h"
#include "cbase.h"
#include "player.h"
class CCofStairs : public CBaseEntity
{
public:
	void Spawn( void )
	{
		pev->solid = SOLID_TRIGGER;
		pev->movetype = MOVETYPE_PUSH;
		if( CVAR_GET_FLOAT( "showtriggers" ) == 0 ) pev->effects |= EF_NODRAW;
		else pev->effects &= ~EF_NODRAW;
		SET_MODEL( edict(), STRING( pev->model ));
	}
	int ObjectCaps( void ) { return 0; }
};
LINK_ENTITY_TO_CLASS( func_stairs, CCofStairs )

bool CoF_OnStairs( CBasePlayer *pPlayer )
{
	CBaseEntity *pStairs = NULL;
	while(( pStairs = UTIL_FindEntityByClassname( pStairs, "func_stairs" )))
	{
		if( pPlayer->pev->absmax.x >= pStairs->pev->absmin.x && pPlayer->pev->absmin.x <= pStairs->pev->absmax.x &&
			pPlayer->pev->absmax.y >= pStairs->pev->absmin.y && pPlayer->pev->absmin.y <= pStairs->pev->absmax.y &&
			pPlayer->pev->absmax.z >= pStairs->pev->absmin.z && pPlayer->pev->absmin.z <= pStairs->pev->absmax.z ) return true;
	}
	return false;
}
