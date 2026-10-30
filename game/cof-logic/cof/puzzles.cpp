// Cry of Fear: text, puzzles and props of the first chapter.
//
// subtitle_main/subtitle_linechange (txtfiles/subtitles.txt), trigger_cofmobile
// (txtfiles/phone_messages.txt), cof_document (notes/), tape_recorder (saves),
// cof_passwordnote + cof_computer, cof_keypad + cof_addcodenote, item_padlock,
// cof_ladder_manager(_use). The texts and the dialogs are drawn by
// platform/web/hud.js; answers come back as console commands
// (cof_password, cof_keypad) handled in CoF_PuzzleCommand.
//
// The original picks the computer password and the keypad codes at random in
// its own DLL; this does the same, once per new game.

#include "extdll.h"
#include "util.h"
#include "cbase.h"
#include "player.h"
#include "saverestore.h"
#include "shake.h"
#include "cof_player.h"

static const char *g_cofPasswords[] =
{
	"apple45", "cloudyday", "rosesarered", "junesummer",
	"unforgettable", "thebeatles54", "marriageinapril", "jillanddavid"
};

static int g_cofPassword = -1;      // index in g_cofPasswords, 640_pass<n+1>.tga
static char g_cofKeypadCode[8];
// These digits belong to the player, including landmark transitions.
const char *CoF_PadlockCode() {
 static char text[8]; CBasePlayer *p=(CBasePlayer*)UTIL_PlayerByIndex(1);
 if(!p) return "";
 BOOL generate=FALSE; for(int i=0;i<4;i++) if(p->m_iCofPadlockNumber[i]<1||p->m_iCofPadlockNumber[i]>9) generate=TRUE;
 if(generate) for(int i=0;i<4;i++) p->m_iCofPadlockNumber[i]=RANDOM_LONG(1,9);
 snprintf(text,sizeof(text),"%d%d%d%d",p->m_iCofPadlockNumber[0],p->m_iCofPadlockNumber[1],p->m_iCofPadlockNumber[2],p->m_iCofPadlockNumber[3]); return text;
}
void CoF_SetPadlockCode(const char *code) {
 CBasePlayer *p=(CBasePlayer*)UTIL_PlayerByIndex(1);
 if(!p||!code||strlen(code)!=4) return;
 for(int i=0;i<4;i++) if(code[i]<'1'||code[i]>'9') return;
 for(int i=0;i<4;i++) p->m_iCofPadlockNumber[i]=code[i]-'0';
}

void CoF_PuzzlesNewGame( void )
{
	g_cofPassword = RANDOM_LONG( 0, ARRAYSIZE( g_cofPasswords ) - 1 );
	// keypad3.tga has the keys 1 to 9 only
	for( int i = 0; i < 4; i++ )
		g_cofKeypadCode[i] = (char)( '0' + RANDOM_LONG( 1, 9 ));
	g_cofKeypadCode[4] = 0;
 CoF_PadlockCode();
}

static void CoF_EnsurePuzzles( void )
{
	if( g_cofPassword < 0 )
		CoF_PuzzlesNewGame();
}

// cof_playerstate keeps them in save games: a note read before saving still holds after loading
int CoF_GetPuzzleState( char *code, int size )
{
	CoF_EnsurePuzzles();
	snprintf( code, size, "%s", g_cofKeypadCode );
	return g_cofPassword;
}

void CoF_SetPuzzleState( int password, const char *code )
{
	if( password < 0 || password >= (int)ARRAYSIZE( g_cofPasswords ) || !code || !code[0] )
		return;
	g_cofPassword = password;
	snprintf( g_cofKeypadCode, sizeof( g_cofKeypadCode ), "%s", code );
}

/*
=====================================================================
subtitles and phone messages: line numbers of the text files
=====================================================================
*/
class CSubtitleMain : public CPointEntity
{
public:
	virtual void KeyValue( KeyValueData *pkvd );
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );
	virtual int Save( CSave &save );
	virtual int Restore( CRestore &restore );
	static TYPEDESCRIPTION m_SaveData[];

	int m_iLine;
};

LINK_ENTITY_TO_CLASS( subtitle_main, CSubtitleMain )

TYPEDESCRIPTION CSubtitleMain::m_SaveData[] =
{
	DEFINE_FIELD( CSubtitleMain, m_iLine, FIELD_INTEGER ),
};

IMPLEMENT_SAVERESTORE( CSubtitleMain, CPointEntity )

void CSubtitleMain::KeyValue( KeyValueData *pkvd )
{
	if( FStrEq( pkvd->szKeyName, "linenumber" ))
	{
		m_iLine = atoi( pkvd->szValue );
		pkvd->fHandled = TRUE;
	}
	else
		CPointEntity::KeyValue( pkvd );
}

void CSubtitleMain::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	if( m_iLine > 0 )
		CoF_HudPrint( "COF/HUD SUB %d\n", m_iLine );
}

class CSubtitleLineChange : public CPointEntity
{
public:
	virtual void KeyValue( KeyValueData *pkvd );
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );
	virtual int Save( CSave &save );
	virtual int Restore( CRestore &restore );
	static TYPEDESCRIPTION m_SaveData[];

	int m_iLine;
};

LINK_ENTITY_TO_CLASS( subtitle_linechange, CSubtitleLineChange )

TYPEDESCRIPTION CSubtitleLineChange::m_SaveData[] =
{
	DEFINE_FIELD( CSubtitleLineChange, m_iLine, FIELD_INTEGER ),
};

IMPLEMENT_SAVERESTORE( CSubtitleLineChange, CPointEntity )

void CSubtitleLineChange::KeyValue( KeyValueData *pkvd )
{
	if( FStrEq( pkvd->szKeyName, "linechange" ))
	{
		m_iLine = atoi( pkvd->szValue );
		pkvd->fHandled = TRUE;
	}
	else
		CPointEntity::KeyValue( pkvd );
}

void CSubtitleLineChange::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	if( m_iLine > 0 )
		CoF_HudPrint( "COF/HUD SUB %d\n", m_iLine );
}

class CTriggerCofMobile : public CPointEntity
{
public:
	void Spawn( void ) { Precache(); CPointEntity::Spawn(); }
	void Precache( void ) { PRECACHE_SOUND( "weapons/mobile/mobile_sms.wav" ); }
	virtual void KeyValue( KeyValueData *pkvd );
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );
	virtual int Save( CSave &save );
	virtual int Restore( CRestore &restore );
	static TYPEDESCRIPTION m_SaveData[];

	int m_iMessage;
};

LINK_ENTITY_TO_CLASS( trigger_cofmobile, CTriggerCofMobile )

TYPEDESCRIPTION CTriggerCofMobile::m_SaveData[] =
{
	DEFINE_FIELD( CTriggerCofMobile, m_iMessage, FIELD_INTEGER ),
};

IMPLEMENT_SAVERESTORE( CTriggerCofMobile, CPointEntity )

void CTriggerCofMobile::KeyValue( KeyValueData *pkvd )
{
	if( FStrEq( pkvd->szKeyName, "bodynumber" ))
	{
		m_iMessage = atoi( pkvd->szValue );
		pkvd->fHandled = TRUE;
	}
	else
		CPointEntity::KeyValue( pkvd );
}

void CTriggerCofMobile::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	CBaseEntity *pPlayer = UTIL_PlayerByIndex( 1 );
	if( pPlayer )
		EMIT_SOUND( ENT( pPlayer->pev ), CHAN_ITEM, "weapons/mobile/mobile_sms.wav", 1.0f, ATTN_NORM );
	CoF_HudPrint( "COF/HUD SMS %d\n", m_iMessage );
}

/*
=====================================================================
cof_document: a note to read (notes/<note1>, its label picture)
=====================================================================
*/
class CCofDocument : public CPointEntity
{
public:
	void Spawn( void ) { Precache(); CPointEntity::Spawn(); }
	void Precache( void ) { if( !FStringNull( m_iszSound )) PRECACHE_SOUND( (char *)STRING( m_iszSound )); }
	virtual void KeyValue( KeyValueData *pkvd );
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );
	virtual int Save( CSave &save );
	virtual int Restore( CRestore &restore );
	static TYPEDESCRIPTION m_SaveData[];

	string_t m_iszNote;
	string_t m_iszSound;
};

LINK_ENTITY_TO_CLASS( cof_document, CCofDocument )

TYPEDESCRIPTION CCofDocument::m_SaveData[] =
{
	DEFINE_FIELD( CCofDocument, m_iszNote, FIELD_STRING ),
	DEFINE_FIELD( CCofDocument, m_iszSound, FIELD_STRING ),
};

IMPLEMENT_SAVERESTORE( CCofDocument, CPointEntity )

void CCofDocument::KeyValue( KeyValueData *pkvd )
{
	if( FStrEq( pkvd->szKeyName, "note1" ))
	{
		m_iszNote = ALLOC_STRING( pkvd->szValue );
		pkvd->fHandled = TRUE;
	}
	else if( FStrEq( pkvd->szKeyName, "turnsound" ))
	{
		m_iszSound = ALLOC_STRING( pkvd->szValue );
		pkvd->fHandled = TRUE;
	}
	else if( FStrEq( pkvd->szKeyName, "label" ) || !strncmp( pkvd->szKeyName, "page", 4 ) || !strncmp( pkvd->szKeyName, "note", 4 ))
		pkvd->fHandled = TRUE;
	else
		CPointEntity::KeyValue( pkvd );
}

void CCofDocument::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	CBaseEntity *pPlayer = UTIL_PlayerByIndex( 1 );

	if( FStringNull( m_iszNote ) || strchr( STRING( m_iszNote ), ' ' ))
		return;
	if( pPlayer && !FStringNull( m_iszSound ))
		EMIT_SOUND( ENT( pPlayer->pev ), CHAN_ITEM, STRING( m_iszSound ), 1.0f, ATTN_NORM );
	CoF_HudPrint( "COF/HUD NOTE %s\n", STRING( m_iszNote ));
}

/*
=====================================================================
tape_recorder: the save points
=====================================================================
*/
class CTapeRecorder : public CBaseEntity
{
public:
	void Spawn( void );
	void Precache( void ) { PRECACHE_MODEL( "models/tape_recorder.mdl" ); }
	virtual int ObjectCaps( void ) { return CBaseEntity::ObjectCaps() | FCAP_IMPULSE_USE; }
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );
};

LINK_ENTITY_TO_CLASS( tape_recorder, CTapeRecorder )

void CTapeRecorder::Spawn( void )
{
	Precache();
	pev->movetype = MOVETYPE_NONE;
	pev->solid = SOLID_BBOX;
	SET_MODEL( ENT( pev ), "models/tape_recorder.mdl" );
	UTIL_SetSize( pev, Vector( -8, -8, 0 ), Vector( 8, 8, 12 ));
	UTIL_SetOrigin( pev, pev->origin );
}

void CTapeRecorder::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	if( !pActivator || !pActivator->IsPlayer() || !pActivator->IsAlive())
		return;

	// a single slot, like a checkpoint; Load Game in the menu lists it
	SERVER_COMMAND( "save cof_last\n" );
	CoF_HudPrint( "COF/HUD SAVED %s\n", FStringNull( pev->message ) ? "" : STRING( pev->message ));
}

/*
=====================================================================
cof_passwordnote / cof_computer: the computer of c_start2
=====================================================================
*/
class CCofPasswordNote : public CPointEntity
{
public:
 void Precache() { if(FStringNull(pev->model)) pev->model=ALLOC_STRING("models/items/generic_note.mdl"); PRECACHE_MODEL((char*)STRING(pev->model)); }
 void Spawn() { Precache(); SET_MODEL(edict(),STRING(pev->model)); pev->solid=SOLID_BBOX; pev->movetype=MOVETYPE_NONE; pev->health=100; UTIL_SetSize(pev,Vector(-6,-5,0),Vector(6,5,1)); UTIL_SetOrigin(pev,pev->origin+Vector(0,0,1)); DROP_TO_FLOOR(edict()); }
 int ObjectCaps() { return CPointEntity::ObjectCaps()|FCAP_IMPULSE_USE; }

	virtual void KeyValue( KeyValueData *pkvd )
	{
		if( FStrEq( pkvd->szKeyName, "usertype" ))
			pkvd->fHandled = TRUE;
		else
			CPointEntity::KeyValue( pkvd );
	}
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
	{
		CoF_EnsurePuzzles();
		CoF_HudPrint( "COF/HUD IMAGE gfx/vgui/640_pass%d.tga\n", g_cofPassword + 1 );
	}
};

LINK_ENTITY_TO_CLASS( cof_passwordnote, CCofPasswordNote )

class CCofComputer : public CPointEntity
{
public:
 void Precache() { PRECACHE_MODEL("models/props/inomhusd/cafe_monitor.mdl"); }
 void Spawn() { Precache(); SET_MODEL(edict(),"models/props/inomhusd/cafe_monitor.mdl"); pev->solid=SOLID_NOT; pev->movetype=MOVETYPE_NONE; pev->sequence=1; pev->health=100; }

	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
	{
		if(pev->iuser1) CoF_HudPrint("COF/HUD PADCLUE %s\n",CoF_PadlockCode());
 else CoF_HudPrint( "COF/HUD COMPUTER %d\n", entindex());
	}
};

LINK_ENTITY_TO_CLASS( cof_computer, CCofComputer )

/*
=====================================================================
cof_keypad, cof_addcodenote, cof_updatekeypad
=====================================================================
*/
class CCofKeypad : public CPointEntity
{
public:
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
	{
		CoF_HudPrint( "COF/HUD KEYPAD %d\n", entindex());
	}
};

LINK_ENTITY_TO_CLASS( cof_keypad, CCofKeypad )

class CCofAddCodeNote : public CPointEntity
{
public:
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
	{
		CoF_EnsurePuzzles();
		CoF_HudPrint( "COF/HUD CODE %s\n", g_cofKeypadCode );
	}
};

LINK_ENTITY_TO_CLASS( cof_addcodenote, CCofAddCodeNote )
LINK_ENTITY_TO_CLASS( cof_updatekeypad, CPointEntity )

/*
=====================================================================
item_padlock: opened with use; its code is not in the map data
=====================================================================
*/
/*
=====================================================================
cof_ladder_manager(_use): the original plays climbing animations; here
using the ladder fades out and moves the player to the other end
=====================================================================
*/
class CCofLadderManager : public CPointEntity
{
public:
	virtual void KeyValue( KeyValueData *pkvd );
	virtual int Save( CSave &save );
	virtual int Restore( CRestore &restore );
	static TYPEDESCRIPTION m_SaveData[];

	string_t m_iszTop;
	string_t m_iszBottom;
};

LINK_ENTITY_TO_CLASS( cof_ladder_manager, CCofLadderManager )

TYPEDESCRIPTION CCofLadderManager::m_SaveData[] =
{
	DEFINE_FIELD( CCofLadderManager, m_iszTop, FIELD_STRING ),
	DEFINE_FIELD( CCofLadderManager, m_iszBottom, FIELD_STRING ),
};

IMPLEMENT_SAVERESTORE( CCofLadderManager, CPointEntity )

void CCofLadderManager::KeyValue( KeyValueData *pkvd )
{
	if( FStrEq( pkvd->szKeyName, "topent" ))
	{
		m_iszTop = ALLOC_STRING( pkvd->szValue );
		pkvd->fHandled = TRUE;
	}
	else if( FStrEq( pkvd->szKeyName, "bottoment" ))
	{
		m_iszBottom = ALLOC_STRING( pkvd->szValue );
		pkvd->fHandled = TRUE;
	}
	else if( !strncmp( pkvd->szKeyName, "animation", 9 ) || !strncmp( pkvd->szKeyName, "custom", 6 ) ||
		FStrEq( pkvd->szKeyName, "descendoffset" ))
		pkvd->fHandled = TRUE;
	else
		CPointEntity::KeyValue( pkvd );
}

class CCofLadderUse : public CBaseEntity
{
public:
	void Spawn( void )
	{
		pev->solid = SOLID_BSP;
		pev->movetype = MOVETYPE_PUSH;
		UTIL_SetOrigin( pev, pev->origin );
		SET_MODEL( ENT( pev ), STRING( pev->model ));
	}
	virtual int ObjectCaps( void ) { return ( CBaseEntity::ObjectCaps() & ~FCAP_ACROSS_TRANSITION ) | FCAP_IMPULSE_USE; }
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );
};

LINK_ENTITY_TO_CLASS( cof_ladder_manager_use, CCofLadderUse )

void CCofLadderUse::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	if( !pActivator || !pActivator->IsPlayer() || FStringNull( pev->target ))
		return;

	CCofLadderManager *pLadder = (CCofLadderManager *)UTIL_FindEntityByTargetname( NULL, STRING( pev->target ));
	if( !pLadder || !FClassnameIs( pLadder->pev, "cof_ladder_manager" ))
		return;

	// iuser1 0: this use area is at the bottom, so the player goes up
	string_t dest = pev->iuser1 ? pLadder->m_iszBottom : pLadder->m_iszTop;
	CBaseEntity *pDest = FStringNull( dest ) ? NULL : UTIL_FindEntityByTargetname( NULL, STRING( dest ));
	if( !pDest )
		return;

	UTIL_ScreenFade( pActivator, Vector( 0, 0, 0 ), 0.4f, 0.2f, 255, FFADE_IN );
	pActivator->pev->flags &= ~FL_ONGROUND;
	UTIL_SetOrigin( pActivator->pev, pDest->pev->origin + Vector( 0, 0, -pActivator->pev->mins.z + 1 ));
	pActivator->pev->velocity = g_vecZero;
	if( pDest->pev->angles != g_vecZero )
	{
		pActivator->pev->angles = pActivator->pev->v_angle = pDest->pev->angles;
		pActivator->pev->fixangle = TRUE;
	}
}

/*
=====================================================================
answers from the dialogs of hud.js
	cof_password <entindex> <text>
	cof_keypad <entindex> <digits>
=====================================================================
*/
bool CoF_PuzzleCommand( CBasePlayer *pPlayer, const char *pcmd )
{
	bool password = FStrEq( pcmd, "cof_password" );
	if( !password && !FStrEq( pcmd, "cof_keypad" ))
		return false;
	if( CMD_ARGC() < 3 )
		return true;

	CoF_EnsurePuzzles();
	edict_t *pEdict = INDEXENT( atoi( CMD_ARGV( 1 )));
	CBaseEntity *pEntity = pEdict ? CBaseEntity::Instance( pEdict ) : NULL;
	const char *answer = CMD_ARGV( 2 );
	const char *wanted = password ? g_cofPasswords[g_cofPassword] : g_cofKeypadCode;

	if( !pEntity || !FClassnameIs( pEntity->pev, password ? "cof_computer" : "cof_keypad" ))
		return true;

	// a keypad without target never opens (the elevator panel of c_apartment1)
	if( stricmp( answer, wanted ) || FStringNull( pEntity->pev->target ))
	{
		CoF_HudPrint( "COF/HUD DENIED\n" );
		return true;
	}

	if(password) {
  CoF_HudPrint("COF/HUD PADCLUE %s\n",CoF_PadlockCode());
  if(!pEntity->pev->iuser1) {
   pEntity->pev->iuser1=1; pEntity->pev->sequence=2;
   FireTargets(STRING(pEntity->pev->target),pPlayer,pEntity,USE_TOGGLE,0);
  }
 } else {
  CoF_HudPrint("COF/HUD GRANTED\n");
  FireTargets(STRING(pEntity->pev->target),pPlayer,pEntity,USE_TOGGLE,0);
 }
	return true;
}
