// Cry of Fear: func_fogfield, the mist of c_sewer's lower canal (four brushes *49..*52).
//
// Reconstructed from hl.dll (read only; build/entity-analysis):
//   func_fogfield            100124f0  CFuncFogField, 0x180 bytes
//   Spawn                    10011340  angles 0, MOVETYPE_NONE, SOLID_NOT, SET_MODEL, EF_NODRAW;
//                                      spawnflag 2 ("Start on") -> on, else off; Use = FogUse
//   on / off                 10012240 / 100121e0
//   FogUse                   100101a0  toggles when ShouldToggle(useType)
//   SpawnThink               10011a30  every 0.1 s, max(size.x, size.y) / 170 puffs
//   puff                     1000ff30  a random point of the brush's footprint (origin +- size / 2, at the
//                                      origin's height); only if a player is within sv_fogradius of it
//                                      (10010430): sprites/mist1..5.spr, additive, white, scale 1,
//                                      drifting 3..7 / 3..7 / 2..5 units/s, then SUB_StartFadeInAndOut
//   SUB_StartFadeInAndOut    1008ac10  renderamt 2, SOLID_NOT, think 0.1 s
//   SUB_FadeInAndOut         1008aaa0  +3 every 0.1 s up to 32, hold RANDOM_LONG(0, 2) s, -3 every 0.1 s,
//                                      at 7 or less renderamt 0 and SUB_Remove 0.2 s later
//   sv_fogradius             cvar_t in .data (10214764): "384", FCVAR_SERVER
//
// The fade lives in hl.dll's CBaseEntity (a byte flag at +0x88); here it is the mist sprite's own think.

#include "extdll.h"
#include "util.h"
#include "cbase.h"
#include "effects.h"
#include "saverestore.h"

static cvar_t fogRadius = { "sv_fogradius", "384", FCVAR_SERVER };

#define SF_FOGFIELD_START_ON 2
#define FOGFIELD_PUFF_SPACING 170.0f

static const char *const g_mistSprites[] =
{
	"sprites/mist1.spr", "sprites/mist2.spr", "sprites/mist3.spr", "sprites/mist4.spr", "sprites/mist5.spr",
};

// a mist sprite: CSprite::SpriteCreate's sprite (MOVETYPE_NOCLIP, so it drifts) with the fade in and out
class CCofMist : public CSprite
{
public:
	static CCofMist *Create( const char *sprite, const Vector &origin );
	void EXPORT FadeInAndOut( void );

	virtual int Save( CSave &save );
	virtual int Restore( CRestore &restore );
	static TYPEDESCRIPTION m_SaveData[];

	int m_fFadingOut;
};

LINK_ENTITY_TO_CLASS( cof_mist, CCofMist )

TYPEDESCRIPTION CCofMist::m_SaveData[] =
{
	DEFINE_FIELD( CCofMist, m_fFadingOut, FIELD_INTEGER ),
};

IMPLEMENT_SAVERESTORE( CCofMist, CSprite )

CCofMist *CCofMist::Create( const char *sprite, const Vector &origin )
{
	CCofMist *pMist = GetClassPtr( (CCofMist *)NULL );
	pMist->SpriteInit( sprite, origin );
	pMist->pev->classname = MAKE_STRING( "cof_mist" );
	pMist->pev->solid = SOLID_NOT;
	pMist->pev->movetype = MOVETYPE_NOCLIP;
	pMist->TurnOn(); // SpriteCreate( ..., TRUE ); the fade below replaces its think
	pMist->m_fFadingOut = 0;
	return pMist;
}

void CCofMist::FadeInAndOut( void )
{
	if( pev->renderamt < 32.0f && !m_fFadingOut )
	{
		pev->renderamt += 3.0f;
		pev->nextthink = gpGlobals->time + 0.1f;
	}
	if( pev->renderamt >= 32.0f && !m_fFadingOut )
	{
		m_fFadingOut = 1;
		pev->nextthink = gpGlobals->time + (float)RANDOM_LONG( 0, 2 );
		return;
	}
	if( pev->renderamt > 0.0f && m_fFadingOut )
	{
		pev->renderamt -= 3.0f;
		pev->nextthink = gpGlobals->time + 0.1f;
	}
	if( pev->renderamt <= 7.0f && m_fFadingOut )
	{
		pev->renderamt = 0.0f;
		pev->nextthink = gpGlobals->time + 0.2f;
		SetThink( &CBaseEntity::SUB_Remove );
	}
}

class CFuncFogField : public CBaseEntity
{
public:
	void Spawn( void );
	void Precache( void );
	void EXPORT FogUse( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );
	void EXPORT SpawnThink( void );

	virtual int Save( CSave &save );
	virtual int Restore( CRestore &restore );
	static TYPEDESCRIPTION m_SaveData[];

private:
	void TurnOn( void );
	void TurnOff( void );
	void Puff( void );

	int m_fOn;
};

LINK_ENTITY_TO_CLASS( func_fogfield, CFuncFogField )

TYPEDESCRIPTION CFuncFogField::m_SaveData[] =
{
	DEFINE_FIELD( CFuncFogField, m_fOn, FIELD_INTEGER ),
};

IMPLEMENT_SAVERESTORE( CFuncFogField, CBaseEntity )

void CFuncFogField::Precache( void )
{
	for( unsigned i = 0; i < ARRAYSIZE( g_mistSprites ); ++i )
		PRECACHE_MODEL( g_mistSprites[i] );
	// hl.dll registers it with the DLL; here the first fog field does (once per process)
	if( !CVAR_GET_POINTER( fogRadius.name ))
		CVAR_REGISTER( &fogRadius );
}

void CFuncFogField::Spawn( void )
{
	Precache();
	pev->angles = g_vecZero;
	pev->movetype = MOVETYPE_NONE;
	pev->solid = SOLID_NOT;
	SET_MODEL( ENT( pev ), STRING( pev->model ));
	UTIL_SetOrigin( pev, pev->origin );
	pev->effects |= EF_NODRAW;
	if( pev->spawnflags & SF_FOGFIELD_START_ON )
		TurnOn();
	else
		TurnOff();
	SetUse( &CFuncFogField::FogUse );
}

void CFuncFogField::TurnOn( void )
{
	m_fOn = 1;
	SetThink( &CFuncFogField::SpawnThink );
	pev->nextthink = gpGlobals->time + 0.1f;
}

void CFuncFogField::TurnOff( void )
{
	m_fOn = 0;
	SetThink( NULL );
	pev->nextthink = 0;
}

void CFuncFogField::FogUse( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	if( !ShouldToggle( useType, m_fOn ))
		return;
	if( m_fOn )
		TurnOff();
	else
		TurnOn();
}

void CFuncFogField::SpawnThink( void )
{
	int puffs = (int)( Q_max( pev->size.x, pev->size.y ) / FOGFIELD_PUFF_SPACING );
	while( puffs-- > 0 )
		Puff();
	pev->nextthink = gpGlobals->time + 0.1f;
}

void CFuncFogField::Puff( void )
{
	int halfX = (int)( pev->size.x * 0.5f ), halfY = (int)( pev->size.y * 0.5f );
	Vector point( pev->origin.x + (float)RANDOM_LONG( -halfX, halfX ),
		pev->origin.y + (float)RANDOM_LONG( -halfY, halfY ), pev->origin.z );

	// only where a player can see it
	bool near = false;
	CBaseEntity *pEntity = NULL;
	while(( pEntity = UTIL_FindEntityInSphere( pEntity, point, (float)(int)fogRadius.value )))
	{
		if( FClassnameIs( pEntity->pev, "player" )) { near = true; break; }
	}
	if( !near )
		return;

	CCofMist *pMist = CCofMist::Create( g_mistSprites[RANDOM_LONG( 0, ARRAYSIZE( g_mistSprites ) - 1 )], point );
	pMist->pev->rendermode = kRenderTransAdd;
	pMist->pev->rendercolor = Vector( 255, 255, 255 );
	pMist->pev->renderamt = 32;
	pMist->pev->renderfx = kRenderFxNone;
	pMist->pev->velocity = Vector( RANDOM_FLOAT( 3, 7 ), RANDOM_FLOAT( 3, 7 ), RANDOM_FLOAT( 2, 5 ));
	pMist->pev->scale = 1.0f;
	// SUB_StartFadeInAndOut
	pMist->pev->renderamt = 2;
	pMist->pev->solid = SOLID_NOT;
	pMist->SetThink( &CCofMist::FadeInAndOut );
	pMist->pev->nextthink = gpGlobals->time + 0.1f;
}

#ifdef __EMSCRIPTEN__
void CoF_RegisterFogFieldCallbacks(void)
{
 COF_SAVE_THINK(CFuncFogField,SpawnThink);
 COF_SAVE_USE(CFuncFogField,FogUse);
 COF_SAVE_THINK(CCofMist,FadeInAndOut);
}
#endif
