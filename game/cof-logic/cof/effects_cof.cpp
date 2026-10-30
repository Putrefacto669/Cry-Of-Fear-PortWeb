// Cry of Fear: entities of the prologue and the prelude.
//
// camera_spot_trigger  places to photograph with weapon_camera (the prelude)
// env_customize        changes body, skin and visibility of other entities
//                      (Spirit of Half-Life's entity, used by the scenes)
// env_dynlight         coloured dynamic light, optionally following an entity
// rain_settings/modify rain of the prologue; platform/web/hud.js draws it
//                      while the player is under the open sky

#include "extdll.h"
#include "util.h"
#include "cbase.h"
#include "player.h"
#include "saverestore.h"
#include "cof_player.h"

/*
=====================================================================
camera_spot_trigger: a brush the player photographs; the flash of the
camera fires its target when the brush is in the frame and nothing is
in between. It is the white X of the prelude (texture c_nightmarex on
black, rendermode 5 additive in c_nightmare), so it stays visible until
the level kills it
=====================================================================
*/
class CCameraSpotTrigger : public CBaseEntity
{
public:
	void Spawn( void )
	{
		pev->solid = SOLID_NOT;
		pev->movetype = MOVETYPE_NONE;
		SET_MODEL( ENT( pev ), STRING( pev->model ));
	}
	virtual int ObjectCaps( void ) { return CBaseEntity::ObjectCaps() & ~FCAP_ACROSS_TRANSITION; }
};

LINK_ENTITY_TO_CLASS( camera_spot_trigger, CCameraSpotTrigger )

#define CAMERA_SPOT_RANGE 2048.0f
#define CAMERA_SPOT_CONE  0.94f     // cos of the half angle of the frame (~20 degrees)

void CoF_CameraFlash( CBasePlayer *pPlayer )
{
	Vector eye = pPlayer->pev->origin + pPlayer->pev->view_ofs;
	UTIL_MakeVectors( pPlayer->pev->v_angle + pPlayer->pev->punchangle );
	Vector forward = gpGlobals->v_forward;

	// the photo counts for the spot nearest the middle of the frame; the level removes
	// each spot (killtarget) once it has been photographed
	CBaseEntity *pSpot = NULL, *pBest = NULL;
	float bestDot = CAMERA_SPOT_CONE;
	while(( pSpot = UTIL_FindEntityByClassname( pSpot, "camera_spot_trigger" )))
	{
		// pev->iuser4: already photographed
		if( pSpot->pev->iuser4 || FStringNull( pSpot->pev->target ))
			continue;

		Vector center = ( pSpot->pev->absmin + pSpot->pev->absmax ) * 0.5f;
		Vector dir = center - eye;
		float dist = dir.Length();
		float dot = dist > 1.0f ? DotProduct( dir / dist, forward ) : -1.0f;
		if( dist > CAMERA_SPOT_RANGE || dot < bestDot )
			continue;

		TraceResult tr;
		UTIL_TraceLine( eye, center, ignore_monsters, ENT( pPlayer->pev ), &tr );
		if( tr.flFraction < 1.0f && !tr.fInOpen )
		{
			// blocked before the middle: the brush may still be in front of the wall it covers
			Vector hit = tr.vecEndPos;
			if(( hit - center ).Length() > ( pSpot->pev->size.Length() * 0.5f + 16.0f ))
				continue;
		}

		bestDot = dot;
		pBest = pSpot;
	}

	if( pBest )
	{
		pBest->pev->iuser4 = 1;
		FireTargets( STRING( pBest->pev->target ), pPlayer, pBest, USE_TOGGLE, 0 );
	}

	// the flash dazzles what is right in front: monsters lose their target for a moment
	CBaseEntity *pNear = NULL;
	while(( pNear = UTIL_FindEntityInSphere( pNear, eye, 300 )))
	{
		CBaseMonster *pMonster = pNear->MyMonsterPointer();
		if( !pMonster || pNear->IsPlayer() || !pNear->IsAlive())
			continue;
		Vector dir = ( pNear->Center() - eye ).Normalize();
		if( DotProduct( dir, forward ) < 0.7f )
			continue;
		pMonster->m_flNextAttack = gpGlobals->time + 2.0f;
		pMonster->m_hEnemy = NULL;
		pMonster->SetConditions( bits_COND_LIGHT_DAMAGE );
	}
}

/*
=====================================================================
env_customize: values of -1 leave the property alone;
m_iVisible 1 shows, 2 hides, 3 toggles
=====================================================================
*/
class CEnvCustomize : public CPointEntity
{
public:
	virtual void KeyValue( KeyValueData *pkvd );
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );
	virtual int Save( CSave &save );
	virtual int Restore( CRestore &restore );
	static TYPEDESCRIPTION m_SaveData[];

	int m_iBody;      // stored +1: 0 means "not given" (KeyValue runs before Spawn)
	int m_iSkin;
	int m_iVisible;
};

LINK_ENTITY_TO_CLASS( env_customize, CEnvCustomize )

TYPEDESCRIPTION CEnvCustomize::m_SaveData[] =
{
	DEFINE_FIELD( CEnvCustomize, m_iBody, FIELD_INTEGER ),
	DEFINE_FIELD( CEnvCustomize, m_iSkin, FIELD_INTEGER ),
	DEFINE_FIELD( CEnvCustomize, m_iVisible, FIELD_INTEGER ),
};

IMPLEMENT_SAVERESTORE( CEnvCustomize, CPointEntity )

void CEnvCustomize::KeyValue( KeyValueData *pkvd )
{
	if( FStrEq( pkvd->szKeyName, "body" ))
		m_iBody = atoi( pkvd->szValue ) + 1;
	else if( FStrEq( pkvd->szKeyName, "skin" ))
		m_iSkin = atoi( pkvd->szValue ) + 1;
	else if( FStrEq( pkvd->szKeyName, "m_iVisible" ))
		m_iVisible = atoi( pkvd->szValue );
	else if( FStrEq( pkvd->szKeyName, "frame" ) || !strncmp( pkvd->szKeyName, "m_", 2 ))
		;
	else
	{
		CPointEntity::KeyValue( pkvd );
		return;
	}
	pkvd->fHandled = TRUE;
}

void CEnvCustomize::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	// "*locus" and friends: Spirit's relative targets, not used by these levels' scenes
	const char *target = FStringNull( pev->target ) ? "" : STRING( pev->target );
	if( !target[0] || target[0] == '*' )
		return;

	CBaseEntity *pTarget = NULL;
	while(( pTarget = UTIL_FindEntityByTargetname( pTarget, STRING( pev->target ))))
	{
		if( m_iBody > 0 )
			pTarget->pev->body = m_iBody - 1;
		if( m_iSkin > 0 )
			pTarget->pev->skin = m_iSkin - 1;
		if( m_iVisible == 1 )
			pTarget->pev->effects &= ~EF_NODRAW;
		else if( m_iVisible == 2 )
			pTarget->pev->effects |= EF_NODRAW;
		else if( m_iVisible == 3 )
			pTarget->pev->effects ^= EF_NODRAW;
	}
}

/*
=====================================================================
env_dynlight: rendercolor * renderamt, radius from scale; spawnflag 1
starts it on; "movewith" keeps it at the same offset from an entity
=====================================================================
*/
class CEnvDynLight : public CPointEntity
{
public:
	void Spawn( void );
	virtual void KeyValue( KeyValueData *pkvd );
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );
	void EXPORT LightThink( void );
	virtual int Save( CSave &save );
	virtual int Restore( CRestore &restore );
	static TYPEDESCRIPTION m_SaveData[];

	string_t m_iszMoveWith;
	Vector m_vecOffset;
	BOOL m_bOffsetSet;
	BOOL m_bOn;
};

LINK_ENTITY_TO_CLASS( env_dynlight, CEnvDynLight )

TYPEDESCRIPTION CEnvDynLight::m_SaveData[] =
{
	DEFINE_FIELD( CEnvDynLight, m_iszMoveWith, FIELD_STRING ),
	DEFINE_FIELD( CEnvDynLight, m_vecOffset, FIELD_VECTOR ),
	DEFINE_FIELD( CEnvDynLight, m_bOffsetSet, FIELD_BOOLEAN ),
	DEFINE_FIELD( CEnvDynLight, m_bOn, FIELD_BOOLEAN ),
};

IMPLEMENT_SAVERESTORE( CEnvDynLight, CPointEntity )

void CEnvDynLight::KeyValue( KeyValueData *pkvd )
{
	if( FStrEq( pkvd->szKeyName, "movewith" ))
	{
		m_iszMoveWith = ALLOC_STRING( pkvd->szValue );
		pkvd->fHandled = TRUE;
	}
	else
		CPointEntity::KeyValue( pkvd );
}

void CEnvDynLight::Spawn( void )
{
	CPointEntity::Spawn();
	m_bOn = FStringNull( pev->targetname ) || FBitSet( pev->spawnflags, 1 );
	SetThink( &CEnvDynLight::LightThink );
	pev->nextthink = gpGlobals->time + 0.2f;
}

void CEnvDynLight::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	m_bOn = useType == USE_ON ? TRUE : useType == USE_OFF ? FALSE : !m_bOn;
}

void CEnvDynLight::LightThink( void )
{
	pev->nextthink = gpGlobals->time + 0.1f;

	if( !FStringNull( m_iszMoveWith ))
	{
		CBaseEntity *pParent = UTIL_FindEntityByTargetname( NULL, STRING( m_iszMoveWith ));
		if( pParent )
		{
			if( !m_bOffsetSet )
			{
				m_vecOffset = pev->origin - pParent->pev->origin;
				m_bOffsetSet = TRUE;
			}
			UTIL_SetOrigin( pev, pParent->pev->origin + m_vecOffset );
		}
	}

	if( !m_bOn )
		return;

	float gain = pev->renderamt > 0 ? pev->renderamt / 255.0f : 1.0f;
	int radius = (int)( pev->scale > 0 ? pev->scale * 3.0f : 200.0f ) / 10;
	MESSAGE_BEGIN( MSG_PVS, SVC_TEMPENTITY, pev->origin );
		WRITE_BYTE( TE_DLIGHT );
		WRITE_COORD( pev->origin.x );
		WRITE_COORD( pev->origin.y );
		WRITE_COORD( pev->origin.z );
		WRITE_BYTE( radius < 1 ? 1 : radius > 255 ? 255 : radius );
		WRITE_BYTE( (int)fmin( 255.0f, pev->rendercolor.x * gain ));
		WRITE_BYTE( (int)fmin( 255.0f, pev->rendercolor.y * gain ));
		WRITE_BYTE( (int)fmin( 255.0f, pev->rendercolor.z * gain ));
		WRITE_BYTE( 2 );    // life: 0.2 s, renewed every 0.1 s
		WRITE_BYTE( 0 );
	MESSAGE_END();
}

/*
=====================================================================
rain_settings / rain_modify. The original client draws rain particles
where the sky is above; here the server tells hud.js whether the player
stands under the sky and how hard it rains.
=====================================================================
*/
static int g_rainDrips = 0;
static float g_rainWindX, g_rainWindY;

class CRainModify : public CPointEntity
{
public:
	void Spawn( void );
	virtual void KeyValue( KeyValueData *pkvd );
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value ) { Apply(); }
	void Apply( void ) { g_rainDrips = m_iDrips; g_rainWindX = m_flWindX; g_rainWindY = m_flWindY; }
	virtual int Save( CSave &save );
	virtual int Restore( CRestore &restore );
	static TYPEDESCRIPTION m_SaveData[];

	int m_iDrips;
	float m_flWindX, m_flWindY;
};

LINK_ENTITY_TO_CLASS( rain_modify, CRainModify )

TYPEDESCRIPTION CRainModify::m_SaveData[] =
{
	DEFINE_FIELD( CRainModify, m_iDrips, FIELD_INTEGER ),
	DEFINE_FIELD( CRainModify, m_flWindX, FIELD_FLOAT ),
	DEFINE_FIELD( CRainModify, m_flWindY, FIELD_FLOAT ),
};

IMPLEMENT_SAVERESTORE( CRainModify, CPointEntity )

void CRainModify::KeyValue( KeyValueData *pkvd )
{
	if( FStrEq( pkvd->szKeyName, "m_iDripsPerSecond" ))
		m_iDrips = atoi( pkvd->szValue );
	else if( FStrEq( pkvd->szKeyName, "m_flWindX" ))
		m_flWindX = atof( pkvd->szValue );
	else if( FStrEq( pkvd->szKeyName, "m_flWindY" ))
		m_flWindY = atof( pkvd->szValue );
	else if( !strncmp( pkvd->szKeyName, "m_fl", 4 ))
		;
	else
	{
		CPointEntity::KeyValue( pkvd );
		return;
	}
	pkvd->fHandled = TRUE;
}

void CRainModify::Spawn( void )
{
	CPointEntity::Spawn();
	// the one nobody triggers is the weather the level starts with
	if( FStringNull( pev->targetname ))
		Apply();
}

class CRainSettings : public CPointEntity
{
public:
	void Spawn( void );
	void EXPORT RainThink( void );
	int m_iSent;   // last drips value sent, -1 forces a message
};

LINK_ENTITY_TO_CLASS( rain_settings, CRainSettings )

void CRainSettings::Spawn( void )
{
	CPointEntity::Spawn();
	// two rain_settings in a level: one is enough to drive the overlay
	if( UTIL_FindEntityByClassname( NULL, "rain_settings" ) != this )
		return;
	m_iSent = -1;
	SetThink( &CRainSettings::RainThink );
	pev->nextthink = gpGlobals->time + 0.5f;
}

void CRainSettings::RainThink( void )
{
	pev->nextthink = gpGlobals->time + 0.5f;

	CBaseEntity *pPlayer = UTIL_PlayerByIndex( 1 );
	if( !pPlayer )
		return;

	// open sky above what the player sees: the eyes, or the trigger_camera of a cutscene
	// (hlsdk keeps no view entity; an active camera is the one that keeps thinking)
	Vector eye = pPlayer->pev->origin + pPlayer->pev->view_ofs;
	CBaseEntity *pCamera = NULL;
	while(( pCamera = UTIL_FindEntityByClassname( pCamera, "trigger_camera" )))
	{
		if( pCamera->pev->nextthink > 0 )
		{
			eye = pCamera->pev->origin;
			break;
		}
	}
	TraceResult tr;
	UTIL_TraceLine( eye, eye + Vector( 0, 0, 4096 ), ignore_monsters, ENT( pPlayer->pev ), &tr );
	// these levels compile their sky as solid brushes: the texture name tells it apart
	const char *tex = tr.flFraction < 1.0f ? TRACE_TEXTURE( tr.pHit ? tr.pHit : ENT( 0 ), eye, eye + Vector( 0, 0, 4096 )) : NULL;
	BOOL outside = ( tex && !strnicmp( tex, "sky", 3 )) ||
		( tr.flFraction < 1.0f && UTIL_PointContents( tr.vecEndPos + Vector( 0, 0, 2 )) == CONTENTS_SKY );

	int drips = outside ? g_rainDrips : 0;
	if( drips != m_iSent )
	{
		CoF_HudPrint( "COF/HUD RAIN %d %g %g\n", drips, g_rainWindX, g_rainWindY );
		m_iSent = drips;
	}
}
