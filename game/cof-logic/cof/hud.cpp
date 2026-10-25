// Cry of Fear: client-facing HUD/cinematic entities.
//
// The original game sends custom user messages (CoFLogo, Introdn, BlackWhite,
// CameraZoom) to a modified client. This port keeps the server logic and emits
// a small text marker instead; platform/web/hud.js turns it into an overlay or
// a post-process. The marker must stay on one line and be stable: the loader
// matches the exact "COF/HUD " prefix.

#include "extdll.h"
#include "util.h"
#include "cbase.h"
#include "player.h"
#include "gamerules.h"
#include "cof_player.h"

class CCofLogo : public CBaseEntity
{
public:
	void Spawn( void );
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );
};

LINK_ENTITY_TO_CLASS( cof_logo, CCofLogo )

void CCofLogo::Spawn( void )
{
	pev->movetype = MOVETYPE_NONE;
	pev->solid = SOLID_NOT;
	pev->effects |= EF_NODRAW;
	pev->takedamage = DAMAGE_NO;
}

void CCofLogo::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	if( !pActivator || !pActivator->IsPlayer() )
		return;

	int logo = (int)pev->frags;
	if( logo < 0 ) logo = 0;
	if( logo > 255 ) logo = 255;

	CoF_HudPrint( "COF/HUD LOGO %d\n", logo );
}

class CCofIntroduction : public CBaseEntity
{
public:
	void Spawn( void );
	virtual void KeyValue( KeyValueData *pkvd );
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );

	int m_iMode;
};

LINK_ENTITY_TO_CLASS( cof_introduction, CCofIntroduction )

void CCofIntroduction::Spawn( void )
{
	pev->movetype = MOVETYPE_NONE;
	pev->solid = SOLID_NOT;
	pev->effects |= EF_NODRAW;
	pev->takedamage = DAMAGE_NO;
	if( m_iMode < 0 ) m_iMode = 0;
	if( m_iMode > 2 ) m_iMode = 2;
}

void CCofIntroduction::KeyValue( KeyValueData *pkvd )
{
	if( FStrEq( pkvd->szKeyName, "iuser2" ) )
	{
		m_iMode = atoi( pkvd->szValue );
		pkvd->fHandled = TRUE;
	}
	else if( FStrEq( pkvd->szKeyName, "iuser3" ) )
	{
		pkvd->fHandled = TRUE;
	}
	else
		CBaseEntity::KeyValue( pkvd );
}

void CCofIntroduction::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	int coop = ( g_pGameRules && g_pGameRules->IsMultiplayer() ) ? 1 : 0;
	int lang = (int)CVAR_GET_FLOAT( coop ? "cl_coop_language" : "cof_subtitlelanguage" );
	int mode = m_iMode;
	if( mode < 0 ) mode = 0;
	if( mode > 2 ) mode = 2;

	CoF_HudPrint( "COF/HUD INTRO %d %d %d\n", mode, lang, coop );
}

class CCofBlackAndWhite : public CBaseEntity
{
public:
	void Spawn( void );
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );
};

LINK_ENTITY_TO_CLASS( cof_blackandwhite, CCofBlackAndWhite )

void CCofBlackAndWhite::Spawn( void )
{
	pev->movetype = MOVETYPE_NONE;
	pev->solid = SOLID_NOT;
	pev->effects |= EF_NODRAW;
	pev->takedamage = DAMAGE_NO;
}

void CCofBlackAndWhite::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	int strength = (int)pev->iuser1;
	if( strength < 0 ) strength = 0;
	if( strength > 255 ) strength = 255;

	CoF_HudPrint( "COF/HUD BW %d\n", strength );
}

class CCofBlur : public CBaseEntity
{
public:
	void Spawn( void );
	virtual void KeyValue( KeyValueData *pkvd );
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );

	BOOL m_bOn;
	float m_flStrength;
	float m_flFade;
	float m_flRate;
};

LINK_ENTITY_TO_CLASS( cof_blur, CCofBlur )

void CCofBlur::Spawn( void )
{
	pev->movetype = MOVETYPE_NONE;
	pev->solid = SOLID_NOT;
	pev->effects |= EF_NODRAW;
	pev->takedamage = DAMAGE_NO;
}

void CCofBlur::KeyValue( KeyValueData *pkvd )
{
	if( FStrEq( pkvd->szKeyName, "strength" ) )
	{
		m_flStrength = atof( pkvd->szValue );
		pkvd->fHandled = TRUE;
	}
	else if( FStrEq( pkvd->szKeyName, "fade" ) )
	{
		m_flFade = atof( pkvd->szValue );
		pkvd->fHandled = TRUE;
	}
	else if( FStrEq( pkvd->szKeyName, "rate" ) )
	{
		m_flRate = atof( pkvd->szValue );
		pkvd->fHandled = TRUE;
	}
	else
		CBaseEntity::KeyValue( pkvd );
}

void CCofBlur::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	m_bOn = !m_bOn;
	CoF_HudPrint( "COF/HUD BLUR %d %g\n", m_bOn ? 1 : 0, m_flStrength );
}

class CCofCameraZoom : public CBaseEntity
{
public:
	void Spawn( void );
	virtual void KeyValue( KeyValueData *pkvd );
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );
	void EXPORT ReturnFOV( void );

	float m_flZoomFov;
	float m_flZoomTime;
	float m_flReturnTime;
	EHANDLE m_hPlayer;
};

LINK_ENTITY_TO_CLASS( cof_camerazoom, CCofCameraZoom )

void CCofCameraZoom::Spawn( void )
{
	pev->movetype = MOVETYPE_NONE;
	pev->solid = SOLID_NOT;
	pev->effects |= EF_NODRAW;
	pev->takedamage = DAMAGE_NO;

	if( m_flZoomFov == 0.0f )
		m_flZoomFov = 111.0f;
	if( m_flReturnTime <= 0.0f )
		m_flReturnTime = 5.0f;
}

void CCofCameraZoom::KeyValue( KeyValueData *pkvd )
{
	if( FStrEq( pkvd->szKeyName, "zoomfov" ) || FStrEq( pkvd->szKeyName, "fov" ) )
	{
		m_flZoomFov = atof( pkvd->szValue );
		pkvd->fHandled = TRUE;
	}
	else if( FStrEq( pkvd->szKeyName, "zoomtime" ) )
	{
		m_flZoomTime = atof( pkvd->szValue );
		pkvd->fHandled = TRUE;
	}
	else if( FStrEq( pkvd->szKeyName, "returntime" ) )
	{
		m_flReturnTime = atof( pkvd->szValue );
		pkvd->fHandled = TRUE;
	}
	else
		CBaseEntity::KeyValue( pkvd );
}

void CCofCameraZoom::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	if( !pActivator || !pActivator->IsPlayer() )
		return;

	CBasePlayer *pPlayer = (CBasePlayer *)pActivator;
	m_hPlayer = pPlayer;

	int fov = (int)m_flZoomFov;
	if( fov == 0 )
		fov = 111;

	pPlayer->m_iFOV = fov;
	pPlayer->pev->fov = fov;

	CoF_HudPrint( "COF/HUD ZOOM %d %g\n", fov, m_flZoomTime );

	SetThink( &CCofCameraZoom::ReturnFOV );
	pev->nextthink = gpGlobals->time + m_flReturnTime;
}

void CCofCameraZoom::ReturnFOV( void )
{
	CBasePlayer *pPlayer = (CBasePlayer *)( (CBaseEntity *)m_hPlayer );
	if( pPlayer )
	{
		if( !FBitSet( pev->spawnflags, 1 ) )
		{
			pPlayer->m_iFOV = 90;
			pPlayer->pev->fov = 90;
			CoF_HudPrint( "COF/HUD UNZOOM\n" );
		}
	}

	pev->nextthink = 0;
}

class CCofGameMenu : public CBaseEntity
{
public:
	void Spawn( void );
	virtual void KeyValue( KeyValueData *pkvd );
	virtual void Think( void );

	int m_iMenu;
};

LINK_ENTITY_TO_CLASS( cof_gamemenu, CCofGameMenu )

void CCofGameMenu::Spawn( void )
{
	pev->movetype = MOVETYPE_NONE;
	pev->solid = SOLID_NOT;
	pev->effects |= EF_NODRAW;
	pev->takedamage = DAMAGE_NO;
	m_iMenu = pev->iuser2;

	if( m_iMenu )
	{
		SetThink( &CCofGameMenu::Think );
		pev->nextthink = gpGlobals->time + 0.1f;
	}
}

void CCofGameMenu::KeyValue( KeyValueData *pkvd )
{
	if( FStrEq( pkvd->szKeyName, "iuser2" ) )
	{
		m_iMenu = atoi( pkvd->szValue );
		pev->iuser2 = m_iMenu;
		pkvd->fHandled = TRUE;
	}
	else if( FStrEq( pkvd->szKeyName, "iuser1" ) )
	{
		pkvd->fHandled = TRUE;
	}
	else
		CBaseEntity::KeyValue( pkvd );
}

void CCofGameMenu::Think( void )
{
	if( m_iMenu == 1 )
		CoF_HudPrint( "COF/HUD GAMEMENU difficulty\n" );
	else if( m_iMenu == 2 )
		CoF_HudPrint( "COF/HUD GAMEMENU video\n" );

	pev->nextthink = 0;
}

class CCofGameBegin : public CBaseEntity
{
public:
	void Spawn( void );
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );
};

LINK_ENTITY_TO_CLASS( cof_begingame, CCofGameBegin )

void CCofGameBegin::Spawn( void )
{
	pev->movetype = MOVETYPE_NONE;
	pev->solid = SOLID_NOT;
	pev->effects |= EF_NODRAW;
	pev->takedamage = DAMAGE_NO;
}

void CCofGameBegin::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	int difficulty = (int)CVAR_GET_FLOAT( "difficulty" );
	int lang = (int)CVAR_GET_FLOAT( "cof_subtitlelanguage" );
	int skip = ( pev->spawnflags & 1 ) ? 1 : 0;

	CoF_HudPrint( "COF/HUD GAMESTART %d %d %d\n", difficulty, lang, skip );
}

/*
=====================================================================
ambient_fmodstream / cof_killmp3: music. The original plays mp3/ with
FMOD; the port streams the file in the browser (hud.js), so it never
goes through the engine's memory. "frags" is the channel, spawnflag 2
loops it.
=====================================================================
*/
class CAmbientFmodStream : public CPointEntity
{
public:
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );
};

LINK_ENTITY_TO_CLASS( ambient_fmodstream, CAmbientFmodStream )

void CAmbientFmodStream::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	if( FStringNull( pev->message ) || strchr( STRING( pev->message ), ' ' ))
		return;

	CoF_HudPrint( "COF/HUD MUSIC %d %d %s\n", (int)pev->frags, FBitSet( pev->spawnflags, 2 ) ? 1 : 0, STRING( pev->message ));
}

class CCofKillMp3 : public CPointEntity
{
public:
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );
};

LINK_ENTITY_TO_CLASS( cof_killmp3, CCofKillMp3 )

void CCofKillMp3::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	CoF_HudPrint( "COF/HUD MUSICSTOP %d\n", (int)pev->frags );
}

/*
=====================================================================
cof_chapter, cof_objective, cof_hint: text the original client draws.
hud.js shows the chapter title, keeps the objective for the bag and
reads hints and objectives from txtfiles/hints.txt.
=====================================================================
*/
class CCofChapter : public CPointEntity
{
public:
	void Spawn( void );
	void Precache( void );
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );
};

LINK_ENTITY_TO_CLASS( cof_chapter, CCofChapter )

void CCofChapter::Precache( void )
{
	if( !FStringNull( pev->noise ))
		PRECACHE_SOUND( (char *)STRING( pev->noise ));
}

void CCofChapter::Spawn( void )
{
	Precache();
	CPointEntity::Spawn();
}

void CCofChapter::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	CBaseEntity *pPlayer = UTIL_PlayerByIndex( 1 );

	if( pPlayer && !FStringNull( pev->noise ))
		EMIT_SOUND( ENT( pPlayer->pev ), CHAN_STATIC, STRING( pev->noise ), 1.0f, ATTN_NONE );

	if( !FStringNull( pev->message ))
		CoF_HudPrint( "COF/HUD CHAPTER %s\n", STRING( pev->message ));
}

class CCofObjective : public CPointEntity
{
public:
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );
};

LINK_ENTITY_TO_CLASS( cof_objective, CCofObjective )

void CCofObjective::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	// no message clears the objective
	CoF_SetObjective( FStringNull( pev->message ) ? "" : STRING( pev->message ));
}

class CCofHint : public CPointEntity
{
public:
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );
};

LINK_ENTITY_TO_CLASS( cof_hint, CCofHint )

void CCofHint::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	if( !FStringNull( pev->message ))
		CoF_HudPrint( "COF/HUD HINT %s\n", STRING( pev->message ));
}
