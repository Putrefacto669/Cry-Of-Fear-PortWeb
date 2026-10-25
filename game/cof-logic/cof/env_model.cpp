// Cry of Fear: static prop entity (env_model).
// The engine renders the model on the client; the server only has to
// precache it, apply the BSP keys and keep it non-solid.

#include "extdll.h"
#include "util.h"
#include "cbase.h"

class CEnvModel : public CBaseEntity
{
public:
	void Spawn( void );
	void Precache( void );
};

LINK_ENTITY_TO_CLASS( env_model, CEnvModel );

void CEnvModel::Precache( void )
{
	if( !FStringNull( pev->model ) )
		PRECACHE_MODEL( (char *)STRING( pev->model ) );
}

void CEnvModel::Spawn( void )
{
	pev->movetype = MOVETYPE_NONE;
	pev->solid = SOLID_NOT;
	pev->takedamage = DAMAGE_NO;

	if( FStringNull( pev->model ) )
	{
		UTIL_Remove( this );
		return;
	}

	// SET_MODEL may reset the animation state, so restore the BSP keys after it.
	int sequence = pev->sequence;
	int body = pev->body;
	int skin = pev->skin;

	SET_MODEL( ENT( pev ), STRING( pev->model ) );

	pev->sequence = sequence;
	pev->body = body;
	pev->skin = skin;
	pev->animtime = gpGlobals->time;
}
