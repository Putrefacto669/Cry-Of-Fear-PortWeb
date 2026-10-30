// Portable motion_manager subset: literal vectors and targetname/*locus
// destinations. Each activation snapshots its configuration in a saved worker.
// Spirit calc_position/calc_velocity expressions are deliberately not guessed.
#include "extdll.h"
#include "util.h"
#include "cbase.h"
#include "saverestore.h"
#include <ctype.h>
#include <errno.h>
#include <limits.h>
#include <math.h>
#include <stdlib.h>

static bool CoF_MotionVector( const char *text, Vector &out )
{
	// The original literal branch starts with a digit or minus, not a name.
	if( !text || ( !isdigit( (unsigned char)*text ) && *text != '-' )) return false;
	for( int i = 0; i < 3; ++i )
	{
		char *end = NULL;
		errno = 0;
		out[i] = strtof( text, &end );
		if( text == end || errno == ERANGE || !isfinite( out[i] )) return false;
		if( i < 2 && !isspace( (unsigned char)*end )) return false;
		text = end;
		while( isspace( (unsigned char)*text )) ++text;
	}
	return *text == 0;
}

static int CoF_MotionMode( const char *text )
{
	char *end = NULL;
	errno = 0;
	long mode = strtol( text, &end, 10 );
	return text != end && !*end && errno != ERANGE && mode >= 0 && mode <= INT_MAX ? (int)mode : -2;
}

class CCofMotionThread : public CPointEntity
{
public:
	void Spawn( void ) { CPointEntity::Spawn(); pev->movetype = MOVETYPE_NONE; pev->effects |= EF_NODRAW; }
	void Configure( CBaseEntity *target, CBaseEntity *locus, const Vector &position, int posMode,
		const Vector &facing, int faceMode, int flags );
	void EXPORT MotionThink( void );
	int Save( CSave &save );
	int Restore( CRestore &restore );
	static TYPEDESCRIPTION m_SaveData[];
	EHANDLE m_hTarget, m_hLocus;
	Vector m_vecPosition, m_vecFacing;
	int m_iPosMode, m_iFaceMode;
};
LINK_ENTITY_TO_CLASS( cof_motion_thread, CCofMotionThread )
TYPEDESCRIPTION CCofMotionThread::m_SaveData[] =
{
	DEFINE_FIELD( CCofMotionThread, m_hTarget, FIELD_EHANDLE ),
	DEFINE_FIELD( CCofMotionThread, m_hLocus, FIELD_EHANDLE ),
	DEFINE_FIELD( CCofMotionThread, m_vecPosition, FIELD_VECTOR ),
	DEFINE_FIELD( CCofMotionThread, m_vecFacing, FIELD_VECTOR ),
	DEFINE_FIELD( CCofMotionThread, m_iPosMode, FIELD_INTEGER ),
	DEFINE_FIELD( CCofMotionThread, m_iFaceMode, FIELD_INTEGER ),
};
int CCofMotionThread::Save( CSave &save )
{
	// SIDE_MODULE member callbacks have no engine-resolvable symbol name.
	// WriteFunction otherwise omits the field but retains its field count,
	// causing restore to consume the following class block as BASE data.
	// This worker has one deterministic callback, rebound in Restore below.
	auto think = m_pfnThink;
	m_pfnThink = NULL;
	int status = CPointEntity::Save( save );
	m_pfnThink = think;
	if( !status ) return 0;
	return save.WriteFields( "CCofMotionThread", this, m_SaveData, ARRAYSIZE( m_SaveData ));
}

int CCofMotionThread::Restore( CRestore &restore )
{
	if( !CPointEntity::Restore( restore ) ||
		!restore.ReadFields( "CCofMotionThread", this, m_SaveData, ARRAYSIZE( m_SaveData ))) return 0;
	// The callback is deliberately omitted by Save; restore it explicitly.
	SetThink( &CCofMotionThread::MotionThink );
	pev->nextthink = gpGlobals->time + 0.0001f;
	return 1;
}

void CCofMotionThread::Configure( CBaseEntity *target, CBaseEntity *locus, const Vector &position, int posMode,
	const Vector &facing, int faceMode, int flags )
{
	m_hTarget = target;
	m_hLocus = locus;
	m_vecPosition = position;
	m_vecFacing = facing;
	m_iPosMode = posMode;
	m_iFaceMode = faceMode;
	pev->spawnflags = flags;
	SetThink( &CCofMotionThread::MotionThink );
	pev->nextthink = gpGlobals->time + 0.0001f;
}

void CCofMotionThread::MotionThink( void )
{
	CBaseEntity *target = m_hTarget;
	if( !target || !m_hLocus )
	{
		SetThink( NULL );
		UTIL_Remove( this );
		return;
	}
	const float dt = gpGlobals->frametime;
	switch( m_iPosMode )
	{
	case 0: UTIL_SetOrigin( target->pev, m_vecPosition ); break;
	case 1: UTIL_SetOrigin( target->pev, target->pev->origin + m_vecPosition * dt ); break;
	case 2: target->pev->velocity = m_vecPosition; break;
	case 3: target->pev->velocity = target->pev->velocity + m_vecPosition * dt; break;
	}
	if( m_iPosMode == 0 || m_iPosMode == 1 ) target->pev->flags &= ~FL_ONGROUND;
	Vector angles;
	switch( m_iFaceMode )
	{
	case 0:
	case 1:
		// A zero direction has no orientation and leaves existing angles alone.
		if( m_vecFacing != g_vecZero )
		{
			angles = UTIL_VecToAngles( m_vecFacing );
			target->pev->angles = m_iFaceMode == 0 ? angles : target->pev->angles + angles * dt;
		}
		break;
	case 2: target->pev->angles = target->pev->angles + m_vecFacing * dt; break;
	case 3: target->pev->avelocity = m_vecFacing; break;
	}
	if( pev->spawnflags & 1 )
		ALERT( at_console, "COF/MOTION %s dt=%.6g pos=%.6g,%.6g,%.6g vel=%.6g,%.6g,%.6g angles=%.6g,%.6g,%.6g avel=%.6g,%.6g,%.6g\n",
			STRING( target->pev->targetname ), dt,
			target->pev->origin.x, target->pev->origin.y, target->pev->origin.z,
			target->pev->velocity.x, target->pev->velocity.y, target->pev->velocity.z,
			target->pev->angles.x, target->pev->angles.y, target->pev->angles.z,
			target->pev->avelocity.x, target->pev->avelocity.y, target->pev->avelocity.z );
	pev->nextthink = gpGlobals->time + 0.0001f;
}

class CCofMotionManager : public CPointEntity
{
public:
	void KeyValue( KeyValueData *pkvd );
	void Activate( void );
	void Use( CBaseEntity *activator, CBaseEntity *, USE_TYPE, float );
	int Save( CSave &save );
	int Restore( CRestore &restore );
	static TYPEDESCRIPTION m_SaveData[];
	string_t m_iszPosition, m_iszFacing;
	int m_iPosMode, m_iFaceMode;
	BOOL m_bActivated;
};
LINK_ENTITY_TO_CLASS( motion_manager, CCofMotionManager )
TYPEDESCRIPTION CCofMotionManager::m_SaveData[] =
{
	DEFINE_FIELD( CCofMotionManager, m_iszPosition, FIELD_STRING ),
	DEFINE_FIELD( CCofMotionManager, m_iszFacing, FIELD_STRING ),
	DEFINE_FIELD( CCofMotionManager, m_iPosMode, FIELD_INTEGER ),
	DEFINE_FIELD( CCofMotionManager, m_iFaceMode, FIELD_INTEGER ),
	DEFINE_FIELD( CCofMotionManager, m_bActivated, FIELD_BOOLEAN ),
};
IMPLEMENT_SAVERESTORE( CCofMotionManager, CPointEntity )

void CCofMotionManager::KeyValue( KeyValueData *pkvd )
{
	if( FStrEq( pkvd->szKeyName, "m_iszPosition" )) m_iszPosition = ALLOC_STRING( pkvd->szValue );
	else if( FStrEq( pkvd->szKeyName, "m_iszFacing" )) m_iszFacing = ALLOC_STRING( pkvd->szValue );
	else if( FStrEq( pkvd->szKeyName, "m_iPosMode" )) m_iPosMode = CoF_MotionMode( pkvd->szValue );
	else if( FStrEq( pkvd->szKeyName, "m_iFaceMode" )) m_iFaceMode = CoF_MotionMode( pkvd->szValue );
	else { CPointEntity::KeyValue( pkvd ); return; }
	pkvd->fHandled = TRUE;
}

void CCofMotionManager::Activate( void )
{
	// ServerActivate runs again on load. A saved auto-started worker must not
	// be duplicated merely because the manager is activated after restore.
	if( FStringNull( pev->targetname ) && !m_bActivated )
	{
		m_bActivated = TRUE;
		Use( this, this, USE_ON, 0 );
	}
}

void CCofMotionManager::Use( CBaseEntity *activator, CBaseEntity *, USE_TYPE, float )
{
	Vector position = g_vecZero, facing = g_vecZero;
	const bool hasPosition = !FStringNull( m_iszPosition );
	const bool hasFacing = !FStringNull( m_iszFacing );
	if( ( pev->spawnflags & ~1 ) ||
		( hasPosition && ( m_iPosMode < 0 || m_iPosMode > 3 || !CoF_MotionVector( STRING( m_iszPosition ), position ))) ||
		( hasFacing && ( m_iFaceMode < 0 || m_iFaceMode > 3 || !CoF_MotionVector( STRING( m_iszFacing ), facing ))))
	{
		ALERT( at_console, "motion_manager: unsupported vector, mode or flags (%s)\n", STRING( pev->targetname ));
		return;
	}
	if( !activator || FStringNull( pev->target )) return;
	CBaseEntity *target = NULL;
	bool found = false;
	const bool locusTarget = FStrEq( STRING( pev->target ), "*locus" );
	while( ( target = locusTarget ? ( target ? NULL : activator ) : UTIL_FindEntityByTargetname( target, STRING( pev->target )) ) != NULL )
	{
		found = true;
		CBaseEntity *entity = CBaseEntity::Create( "cof_motion_thread", g_vecZero, g_vecZero, NULL );
		if( entity ) ((CCofMotionThread *)entity)->Configure( target, activator, position,
			hasPosition ? m_iPosMode : -1, facing, hasFacing ? m_iFaceMode : -1, pev->spawnflags );
	}
	if( !found ) ALERT( at_console, "motion_manager: no destination %s\n", STRING( pev->target ));
}

void CoF_MotionDump( void )
{
	CBaseEntity *entity = NULL;
	while(( entity = UTIL_FindEntityByClassname( entity, "cof_motion_thread" )))
	{
		CCofMotionThread *thread = (CCofMotionThread *)entity;
		CBaseEntity *target = thread->m_hTarget, *locus = thread->m_hLocus;
		ALERT( at_console, "COF/MOTION_STATE id=%d target=%s locus=%s posMode=%d faceMode=%d next=%g now=%g think=%d movetype=%d flags=%d\n",
			thread->entindex(), target ? STRING( target->pev->targetname ) : "<missing>",
			locus ? STRING( locus->pev->classname ) : "<missing>", thread->m_iPosMode, thread->m_iFaceMode,
			thread->pev->nextthink, gpGlobals->time, thread->m_pfnThink != NULL, thread->pev->movetype, thread->pev->flags );
	}
}
