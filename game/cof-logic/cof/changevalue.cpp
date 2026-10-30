// Cry of Fear map compatibility. Only the replacement operations observed in
// c_start are supported; unknown keys/actions must not mutate arbitrary state.
#include "extdll.h"
#include "util.h"
#include "cbase.h"
#include "saverestore.h"
#include <errno.h>
#include <limits.h>
#include <stdlib.h>

class CCofChangeValue : public CPointEntity
{
public:
	void KeyValue( KeyValueData *pkvd );
	void Use( CBaseEntity *, CBaseEntity *, USE_TYPE, float );
	int Save( CSave &save );
	int Restore( CRestore &restore );
	static TYPEDESCRIPTION m_SaveData[];
	string_t m_iszNewValue;
};

LINK_ENTITY_TO_CLASS( trigger_changevalue, CCofChangeValue )

TYPEDESCRIPTION CCofChangeValue::m_SaveData[] =
{
	DEFINE_FIELD( CCofChangeValue, m_iszNewValue, FIELD_STRING ),
};
IMPLEMENT_SAVERESTORE( CCofChangeValue, CPointEntity )

void CCofChangeValue::KeyValue( KeyValueData *pkvd )
{
	if( FStrEq( pkvd->szKeyName, "m_iszNewValue" ))
	{
		m_iszNewValue = ALLOC_STRING( pkvd->szValue );
		pkvd->fHandled = TRUE;
	}
	else
		CPointEntity::KeyValue( pkvd );
}

void CCofChangeValue::Use( CBaseEntity *, CBaseEntity *, USE_TYPE, float )
{
	const char *key = STRING( pev->netname );
	const char *text = STRING( m_iszNewValue );
	char *end = NULL;
	errno = 0;
	long value = strtol( text, &end, 10 );
	if( text == end || *end || errno == ERANGE || value < 0 || value > INT_MAX ||
		( !FStrEq( key, "linenumber" ) && !FStrEq( key, "body" )))
	{
		ALERT( at_console, "trigger_changevalue: unsupported replacement %s=%s\n", key, text );
		return;
	}
	if( FStringNull( pev->target ))
		return;

	// The original server resolves a single destination, even for duplicate names.
	CBaseEntity *pTarget = UTIL_FindEntityByTargetname( NULL, STRING( pev->target ));
	if( pTarget )
	{
		if(( FStrEq( key, "linenumber" ) && FClassnameIs( pTarget->pev, "subtitle_main" )) ||
			( FStrEq( key, "body" ) && FClassnameIs( pTarget->pev, "env_model" )))
		{
			KeyValueData kv = { (char *)STRING( pTarget->pev->classname ), (char *)key, (char *)text, FALSE };
			// Dispatch handles entvars (body) and then the entity's own keys
			// (subtitle_main::m_iLine). Do not activate the destination here.
			DispatchKeyValue( pTarget->edict(), &kv );
		}
		else
			ALERT( at_console, "trigger_changevalue: unsupported target %s for %s\n", STRING( pTarget->pev->classname ), key );
	}
}
