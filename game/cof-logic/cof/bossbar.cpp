// Server-owned boss health; the web HUD only presents the reported values.
#include "extdll.h"
#include "util.h"
#include "cbase.h"
#include "saverestore.h"
#include "cof_player.h"
class CCofBossBar : public CPointEntity
{
public:
	void KeyValue( KeyValueData *pkvd );
	void Use( CBaseEntity *, CBaseEntity *, USE_TYPE, float );
	void EXPORT UpdateBar( void );
	int Save( CSave &save );
	int Restore( CRestore &restore );
	static TYPEDESCRIPTION m_SaveData[];
	string_t m_iszFull, m_iszEmpty;
	EHANDLE m_hBoss;
	float m_flMaximum;
};
LINK_ENTITY_TO_CLASS( cof_bosshealthbar, CCofBossBar )
TYPEDESCRIPTION CCofBossBar::m_SaveData[] =
{
	DEFINE_FIELD( CCofBossBar, m_iszFull, FIELD_STRING ),
	DEFINE_FIELD( CCofBossBar, m_iszEmpty, FIELD_STRING ),
	DEFINE_FIELD( CCofBossBar, m_hBoss, FIELD_EHANDLE ),
	DEFINE_FIELD( CCofBossBar, m_flMaximum, FIELD_FLOAT ),
};
IMPLEMENT_SAVERESTORE( CCofBossBar, CPointEntity )
void CCofBossBar::KeyValue( KeyValueData *pkvd )
{
	if( FStrEq( pkvd->szKeyName, "fulltga" )) m_iszFull = ALLOC_STRING( pkvd->szValue );
	else if( FStrEq( pkvd->szKeyName, "emptytga" )) m_iszEmpty = ALLOC_STRING( pkvd->szValue );
	else { CPointEntity::KeyValue( pkvd ); return; }
	pkvd->fHandled = TRUE;
}
void CCofBossBar::Use( CBaseEntity *pActivator, CBaseEntity *, USE_TYPE, float )
{
	if( !pActivator || !pActivator->IsPlayer() || FStringNull( pev->message )) return;
	CBaseEntity *pBoss = UTIL_FindEntityByTargetname( NULL, STRING( pev->message ));
	if( !pBoss || !pBoss->MyMonsterPointer() ) return;
	m_hBoss = pBoss;
	m_flMaximum = pBoss->pev->max_health > 0 ? pBoss->pev->max_health : pBoss->pev->health;
	SetThink( &CCofBossBar::UpdateBar );
	UpdateBar();
}
void CCofBossBar::UpdateBar( void )
{
	CBaseEntity *pBoss = m_hBoss;
	if( !pBoss || !pBoss->IsAlive() || pBoss->pev->health <= 0 || m_flMaximum <= 0 )
	{
		CoF_HudPrint( "COF/HUD BOSS 0 0 - -\n" );
		SetThink( NULL );
		pev->nextthink = 0;
		return;
	}
	CoF_HudPrint( "COF/HUD BOSS %g %g %s %s\n", pBoss->pev->health, m_flMaximum,
		FStringNull( m_iszFull ) ? "-" : STRING( m_iszFull ), FStringNull( m_iszEmpty ) ? "-" : STRING( m_iszEmpty ));
	pev->nextthink = gpGlobals->time + 0.2f;
}
