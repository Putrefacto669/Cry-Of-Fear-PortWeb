// Cry of Fear: prop and cinematic animation entity (env_model).
// Named On/Off sequences use the portable studio animation implementation.

#include "extdll.h"
#include "util.h"
#include "cbase.h"
#include "saverestore.h"

class CEnvModel : public CBaseAnimating
{
public:
	void Spawn( void );
	void Precache( void );
	void KeyValue( KeyValueData *pkvd );
	void Think( void );
	void Use( CBaseEntity *, CBaseEntity *, USE_TYPE useType, float );
	void SelectSequence( void );
	int Save( CSave &save );
	int Restore( CRestore &restore );
	static TYPEDESCRIPTION m_SaveData[];
	string_t m_iszSequence_On, m_iszSequence_Off;
	int m_iAction_On, m_iAction_Off;
};

LINK_ENTITY_TO_CLASS( env_model, CEnvModel );

TYPEDESCRIPTION CEnvModel::m_SaveData[] =
{
	DEFINE_FIELD( CEnvModel, m_iszSequence_On, FIELD_STRING ),
	DEFINE_FIELD( CEnvModel, m_iszSequence_Off, FIELD_STRING ),
	DEFINE_FIELD( CEnvModel, m_iAction_On, FIELD_INTEGER ),
	DEFINE_FIELD( CEnvModel, m_iAction_Off, FIELD_INTEGER ),
};
IMPLEMENT_SAVERESTORE( CEnvModel, CBaseAnimating )

void CEnvModel::KeyValue( KeyValueData *pkvd )
{
	if( FStrEq( pkvd->szKeyName, "m_iszSequence_On" )) m_iszSequence_On = ALLOC_STRING( pkvd->szValue );
	else if( FStrEq( pkvd->szKeyName, "m_iszSequence_Off" )) m_iszSequence_Off = ALLOC_STRING( pkvd->szValue );
	else if( FStrEq( pkvd->szKeyName, "m_iAction_On" )) m_iAction_On = atoi( pkvd->szValue );
	else if( FStrEq( pkvd->szKeyName, "m_iAction_Off" )) m_iAction_Off = atoi( pkvd->szValue );
	else { CBaseAnimating::KeyValue( pkvd ); return; }
	pkvd->fHandled = TRUE;
}

void CEnvModel::SelectSequence( void )
{
	const bool off = ( pev->spawnflags & 1 ) != 0;
	string_t name = off ? m_iszSequence_Off : m_iszSequence_On;
	// Absent named channels preserve the BSP's numeric sequence and state.
	if( FStringNull( name )) return;
	pev->sequence = LookupSequence( STRING( name ));
	if( pev->sequence < 0 )
	{
		ALERT( at_console, "env_model %s: unknown sequence \"%s\"\n", STRING( pev->targetname ), STRING( name ));
		pev->sequence = 0;
	}
	pev->frame = 0;
	ResetSequenceInfo();
	// The entity action overrides the model's embedded looping flag.
	m_fSequenceLoops = ( off ? m_iAction_Off : m_iAction_On ) == 1;
}

void CEnvModel::Think( void )
{
	StudioFrameAdvance();
	if( m_fSequenceFinished && !m_fSequenceLoops )
	{
		int action = ( pev->spawnflags & 1 ) ? m_iAction_Off : m_iAction_On;
		if( action != 2 ) return;
		pev->spawnflags ^= 1;
		SelectSequence();
	}
	pev->nextthink = gpGlobals->time + 0.1f;
}

void CEnvModel::Use( CBaseEntity *, CBaseEntity *, USE_TYPE useType, float )
{
	if( !ShouldToggle( useType, !( pev->spawnflags & 1 ))) return;
	pev->spawnflags ^= 1;
	SelectSequence();
	pev->nextthink = gpGlobals->time + 0.1f;
}

void CEnvModel::Precache( void )
{
	if( !FStringNull( pev->model ) )
		PRECACHE_MODEL( (char *)STRING( pev->model ) );
}

void CEnvModel::Spawn( void )
{
	Precache();
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
	InitBoneControllers();
	SelectSequence();
	// Virtual Think/Use dispatch needs no serialized member-function pointers.
	pev->nextthink = gpGlobals->time + 0.1f;
}
