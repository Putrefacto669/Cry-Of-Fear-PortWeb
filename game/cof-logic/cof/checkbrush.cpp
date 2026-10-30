// Interactive solid brushes used by the packaged campaign maps.
#include "extdll.h"
#include "util.h"
#include "cbase.h"
#include "saverestore.h"
#include "cof_player.h"

class CCofCheckBrush : public CBaseEntity
{
public:
	void Spawn( void );
	void Precache( void );
	void KeyValue( KeyValueData *pkvd );
	int ObjectCaps( void ) { return FCAP_IMPULSE_USE; }
	void Use( CBaseEntity *, CBaseEntity *, USE_TYPE, float );
	int Save( CSave &save );
	int Restore( CRestore &restore );
	static TYPEDESCRIPTION m_SaveData[];
	string_t m_iszUseSound, m_iszMaster;
	float m_flCheckDelay, m_flNextCheck;
};
LINK_ENTITY_TO_CLASS( trigger_checkbrush, CCofCheckBrush )
TYPEDESCRIPTION CCofCheckBrush::m_SaveData[] =
{
	DEFINE_FIELD( CCofCheckBrush, m_iszUseSound, FIELD_STRING ),
	DEFINE_FIELD( CCofCheckBrush, m_iszMaster, FIELD_STRING ),
	DEFINE_FIELD( CCofCheckBrush, m_flCheckDelay, FIELD_FLOAT ),
	DEFINE_FIELD( CCofCheckBrush, m_flNextCheck, FIELD_TIME ),
};
IMPLEMENT_SAVERESTORE( CCofCheckBrush, CBaseEntity )

void CCofCheckBrush::KeyValue( KeyValueData *pkvd )
{
	if( FStrEq( pkvd->szKeyName, "usesound" )) m_iszUseSound = ALLOC_STRING( pkvd->szValue );
	else if( FStrEq( pkvd->szKeyName, "master" )) m_iszMaster = ALLOC_STRING( pkvd->szValue );
	else if( FStrEq( pkvd->szKeyName, "checkdelay" )) m_flCheckDelay = atoi( pkvd->szValue );
	else { CBaseEntity::KeyValue( pkvd ); return; }
	pkvd->fHandled = TRUE;
}
void CCofCheckBrush::Precache( void )
{
	if( !FStringNull( m_iszUseSound )) PRECACHE_SOUND( (char *)STRING( m_iszUseSound ));
}
void CCofCheckBrush::Spawn( void )
{
	Precache();
	pev->solid = SOLID_BSP;
	pev->movetype = MOVETYPE_PUSH;
	SET_MODEL( edict(), STRING( pev->model ));
	UTIL_SetOrigin( pev, pev->origin );
	if( m_flCheckDelay <= 0 ) m_flCheckDelay = 2;
}
void CCofCheckBrush::Use( CBaseEntity *pActivator, CBaseEntity *, USE_TYPE, float )
{
	if( !pActivator || !pActivator->IsPlayer() || gpGlobals->time < m_flNextCheck ||
		!UTIL_IsMasterTriggered( m_iszMaster, pActivator )) return;
	// Flag 1 is a special repeated-video interaction, not used by the
	// inspected brushes. Do not replace it with the ordinary message.
	if( pev->spawnflags & 1 )
	{
		ALERT( at_console, "trigger_checkbrush: video interaction not implemented\n" );
		return;
	}
	CoF_CenterPrint( STRING( pev->message ));
	if( !FStringNull( m_iszUseSound ))
		EMIT_SOUND( pActivator->edict(), CHAN_AUTO, STRING( m_iszUseSound ), 1, ATTN_NORM );
	m_flNextCheck = gpGlobals->time + m_flCheckDelay;
}
