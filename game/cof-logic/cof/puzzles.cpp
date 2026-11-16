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
	void Precache( void ) { PRECACHE_SOUND( "weapons/mobile/mobile_sms.wav" ); PRECACHE_SOUND( "phone/phone_vibrate.wav" ); }
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

// Like the original (CCofTriggerMobile): the message goes to the phone, which shows it on its screen.
// Players without the phone get nothing; spawnflag 1 is silent; a phone in the hand looks at it.
#define SF_COFMOBILE_SILENT 1

void CTriggerCofMobile::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	CBasePlayer *pPlayer = (CBasePlayer *)UTIL_PlayerByIndex( 1 );
	cof_phone_t *phone = CoF_Phone( pPlayer );
	if( !phone || !pPlayer->HasNamedPlayerItem( "weapon_mobile" ))
		return;

	phone->message = m_iMessage;
	phone->unread = TRUE;
	CoF_MobileNewMessage( pPlayer );
	if( !FBitSet( pev->spawnflags, SF_COFMOBILE_SILENT ))
	{
		EMIT_SOUND( ENT( pPlayer->pev ), CHAN_WEAPON, "weapons/mobile/mobile_sms.wav", 1.0f, ATTN_NORM );
		EMIT_SOUND( ENT( pPlayer->pev ), CHAN_AUTO, "phone/phone_vibrate.wav", 1.0f, ATTN_NORM );
	}
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
		// hl.dll 100a6790 sends the note kind (iuser1) with the player's current keypad code; 4 is the phone
		// code of c_basement (gfx/vgui/notes/phonecode.TGA, "Phone code:")
		CoF_EnsurePuzzles();
		CoF_HudPrint( "COF/HUD CODE %s %d\n", g_cofKeypadCode, pev->iuser1 );
	}
};

LINK_ENTITY_TO_CLASS( cof_addcodenote, CCofAddCodeNote )

// hl.dll 100a7120: the keypad code becomes 5247 (player +0x2040 = 0x147f, keypad mode +0x2044 = 2). It is fixed in
// the original, unlike the random code of the first chapter; the multi_managers fire it before cof_addcodenote.
class CCofKeypad4 : public CPointEntity
{
public:
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
	{
		CoF_EnsurePuzzles();
		snprintf( g_cofKeypadCode, sizeof( g_cofKeypadCode ), "%d", 0x147f );
	}
};

LINK_ENTITY_TO_CLASS( cof_keypad4, CCofKeypad4 )
LINK_ENTITY_TO_CLASS( cof_updatekeypad, CPointEntity )

/*
=====================================================================
item_padlock: opened with use; its code is not in the map data
=====================================================================
*/
/*
=====================================================================
cof_ladder_manager(_use), rebuilt from hl.dll (read-only analysis):
CCoFLadderManager KeyValue 1004e4d0, Use 1004fb50, LadderThink 1004ed40,
step up 1004f470, step down 1004f780; cof_ladder_manager_use Use 1004fe80.

Using the ladder freezes the player and spawns an animated camera model
(the original's camera_model, CAnimatedCameraModel) with the manager's
model (models/ladder_climb.mdl) at the manager. The client puts the view
on that model's attachments ("AttachCam", client.dll 1006f890/1008cee0),
so the player sees Simon's arms climb. Each time an animation ends, IN_FORWARD
plays the next sequence of animation1..N and IN_BACK goes back down; between
loops the camera moves 48 units (DAT_101afebc). At either end the camera is
removed and the player is put on topent/bottoment.
=====================================================================
*/
#include "studio.h"

#define COF_LADDER_MAX   32
#define COF_LADDER_STEP  48.0f // DAT_101afebc

static int gmsgCoFAttachCam;
void CoF_LinkLadderMessages( void )
{
	if( !gmsgCoFAttachCam )
		gmsgCoFAttachCam = REG_USER_MSG( "CoFAttachCam", 2 );
}

static void CoF_AttachCam( CBaseEntity *pPlayer, CBaseEntity *pCamera )
{
	CoF_LinkLadderMessages();
	MESSAGE_BEGIN( MSG_ONE, gmsgCoFAttachCam, NULL, pPlayer->pev );
	WRITE_SHORT( pCamera ? pCamera->entindex() : 0 );
	MESSAGE_END();
}

// the original's camera_model: an animating model the client looks through
class CCofLadderCamera : public CBaseAnimating
{
public:
	void Spawn( void )
	{
		pev->solid = SOLID_NOT;
		pev->movetype = MOVETYPE_NONE;
		pev->takedamage = DAMAGE_NO;
		// client.dll 1008cee0 draws this entity with m_fDoInterp = 0 (param_1[6]): no interpolation
		pev->effects |= EF_NOINTERP;
	}
	// not saved: a restored climb is finished by the manager
	virtual int ObjectCaps( void ) { return ( CBaseAnimating::ObjectCaps() & ~FCAP_ACROSS_TRANSITION ) | FCAP_DONT_SAVE; }
	// hl.dll 100c20c0: sequence by name, restarted from frame 0
	float Play( const char *name )
	{
		int seq = LookupSequence( name );
		if( seq < 0 )
		{
			ALERT( at_console, "%s has no sequence named:%s\n", STRING( pev->model ), name );
			return 0;
		}
		pev->sequence = seq;
		pev->frame = 0;
		ResetSequenceInfo();
		studiohdr_t *h = (studiohdr_t *)GET_MODEL_PTR( ENT( pev ));
		if( !h || seq >= h->numseq )
			return 0;
		mstudioseqdesc_t *d = (mstudioseqdesc_t *)((byte *)h + h->seqindex ) + seq;
		return d->fps > 0 && d->numframes > 1 ? ( d->numframes - 1 ) / d->fps : 0;
	}
};

LINK_ENTITY_TO_CLASS( cof_ladder_camera, CCofLadderCamera )

class CCofLadderManager : public CPointEntity
{
public:
	void Spawn( void );
	virtual void KeyValue( KeyValueData *pkvd );
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );
	virtual int Save( CSave &save );
	virtual int Restore( CRestore &restore );
	static TYPEDESCRIPTION m_SaveData[];
	void EXPORT LadderThink( void );
	void StepUp( void );
	void StepDown( void );
	void Finish( void );
	CCofLadderCamera *Camera( void ) { return (CCofLadderCamera *)(CBaseEntity *)m_hCamera; }
	void Raise( float dz )
	{
		CBaseEntity *pCam = m_hCamera;
		if( pCam )
			UTIL_SetOrigin( pCam->pev, pCam->pev->origin + Vector( 0, 0, dz ));
	}
	void Play( const char *name );

	string_t m_iszTop;
	string_t m_iszBottom;
	string_t m_iszAnim[COF_LADDER_MAX + 1]; // animation1..N, by their number
	int m_iCount;
	string_t m_iszCustomOff, m_iszCustomOn, m_iszCustomOffD, m_iszCustomOnD;
	int m_iDescendOffset;
	EHANDLE m_hPlayer;
	EHANDLE m_hCamera;
	int m_iIndex;
	BOOL m_fDown, m_fFinishing, m_fSkipRaise, m_fLowerNext;
	float m_flFinishTime, m_flAnimEnd;
	string_t m_iszLastAnim;
	string_t m_iszViewModel; // port: the weapon is hidden while the arms climb
	// port: the client is sent the entities of the PVS around origin + view_ofs. The player stays
	// still while the camera travels the shaft, so view_ofs follows the camera's eye (the view itself
	// comes from the camera's attachments) and is restored at the end.
	Vector m_vecViewOfs;
	void FollowCamera( void )
	{
		CBaseEntity *pPlayer = m_hPlayer, *pCam = m_hCamera;
		if( pPlayer && pCam )
			pPlayer->pev->view_ofs = pCam->pev->origin + Vector( 0, 0, 72 ) - pPlayer->pev->origin;
	}
};

LINK_ENTITY_TO_CLASS( cof_ladder_manager, CCofLadderManager )

TYPEDESCRIPTION CCofLadderManager::m_SaveData[] =
{
	DEFINE_FIELD( CCofLadderManager, m_iszTop, FIELD_STRING ),
	DEFINE_FIELD( CCofLadderManager, m_iszBottom, FIELD_STRING ),
	DEFINE_ARRAY( CCofLadderManager, m_iszAnim, FIELD_STRING, COF_LADDER_MAX + 1 ),
	DEFINE_FIELD( CCofLadderManager, m_iCount, FIELD_INTEGER ),
	DEFINE_FIELD( CCofLadderManager, m_iszCustomOff, FIELD_STRING ),
	DEFINE_FIELD( CCofLadderManager, m_iszCustomOn, FIELD_STRING ),
	DEFINE_FIELD( CCofLadderManager, m_iszCustomOffD, FIELD_STRING ),
	DEFINE_FIELD( CCofLadderManager, m_iszCustomOnD, FIELD_STRING ),
	DEFINE_FIELD( CCofLadderManager, m_iDescendOffset, FIELD_INTEGER ),
	DEFINE_FIELD( CCofLadderManager, m_hPlayer, FIELD_EHANDLE ),
	DEFINE_FIELD( CCofLadderManager, m_iIndex, FIELD_INTEGER ),
	DEFINE_FIELD( CCofLadderManager, m_fDown, FIELD_BOOLEAN ),
	DEFINE_FIELD( CCofLadderManager, m_fFinishing, FIELD_BOOLEAN ),
	DEFINE_FIELD( CCofLadderManager, m_fSkipRaise, FIELD_BOOLEAN ),
	DEFINE_FIELD( CCofLadderManager, m_fLowerNext, FIELD_BOOLEAN ),
	DEFINE_FIELD( CCofLadderManager, m_flFinishTime, FIELD_TIME ),
	DEFINE_FIELD( CCofLadderManager, m_flAnimEnd, FIELD_TIME ),
	DEFINE_FIELD( CCofLadderManager, m_iszLastAnim, FIELD_STRING ),
	DEFINE_FIELD( CCofLadderManager, m_iszViewModel, FIELD_STRING ),
	DEFINE_FIELD( CCofLadderManager, m_vecViewOfs, FIELD_VECTOR ),
};

IMPLEMENT_SAVERESTORE( CCofLadderManager, CPointEntity )

void CCofLadderManager::Spawn( void )
{
	CPointEntity::Spawn();
	if( !FStringNull( pev->model ))
		PRECACHE_MODEL( (char *)STRING( pev->model ));
}

void CCofLadderManager::KeyValue( KeyValueData *pkvd )
{
	if( FStrEq( pkvd->szKeyName, "topent" ))
		m_iszTop = ALLOC_STRING( pkvd->szValue );
	else if( FStrEq( pkvd->szKeyName, "bottoment" ))
		m_iszBottom = ALLOC_STRING( pkvd->szValue );
	else if( !strncmp( pkvd->szKeyName, "animation", 9 ))
	{
		int n = atoi( pkvd->szKeyName + 9 );
		if( n < 1 || n > COF_LADDER_MAX )
			return;
		m_iszAnim[n] = ALLOC_STRING( pkvd->szValue );
		m_iCount++;
	}
	else if( FStrEq( pkvd->szKeyName, "customoff" ))
		m_iszCustomOff = ALLOC_STRING( pkvd->szValue );
	else if( FStrEq( pkvd->szKeyName, "customon" ))
		m_iszCustomOn = ALLOC_STRING( pkvd->szValue );
	else if( FStrEq( pkvd->szKeyName, "customoffd" ))
		m_iszCustomOffD = ALLOC_STRING( pkvd->szValue );
	else if( FStrEq( pkvd->szKeyName, "customond" ))
		m_iszCustomOnD = ALLOC_STRING( pkvd->szValue );
	else if( FStrEq( pkvd->szKeyName, "descendoffset" ))
		m_iDescendOffset = atoi( pkvd->szValue );
	else
	{
		CPointEntity::KeyValue( pkvd );
		return;
	}
	pkvd->fHandled = TRUE;
}

// value 0: from the bottom (climb up); otherwise from the top (climb down)
void CCofLadderManager::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	if( !pActivator || !pActivator->IsPlayer() || FStringNull( pev->model ) || (CBaseEntity *)m_hPlayer )
		return;
	CBasePlayer *pPlayer = (CBasePlayer *)pActivator;
	m_fDown = value != 0;
	m_hPlayer = pPlayer;
	// hl.dll 100deff0(0) sets FL_FROZEN, but Xash (SV_ParseClientMove) also clears the buttons of a
	// frozen client, and the climb is driven by IN_FORWARD/IN_BACK: hold the player still instead.
	pPlayer->pev->movetype = MOVETYPE_NONE;
	pPlayer->pev->velocity = g_vecZero;
	CBaseEntity *pCam = CBaseEntity::Create( "cof_ladder_camera", pev->origin, pev->angles, pPlayer->edict());
	if( !pCam )
	{
		pPlayer->pev->movetype = MOVETYPE_WALK;
		m_hPlayer = NULL;
		return;
	}
	SET_MODEL( pCam->edict(), STRING( pev->model ));
	m_hCamera = pCam;
	m_iIndex = m_fDown ? m_iCount : 1;
	if( m_fDown )
		Raise( (float)m_iDescendOffset );
	CoF_AttachCam( pPlayer, pCam );
	pPlayer->pev->flags |= FL_GODMODE | FL_NOTARGET;
	m_iszViewModel = pPlayer->pev->viewmodel;
	pPlayer->pev->viewmodel = 0;
	m_vecViewOfs = pPlayer->pev->view_ofs;
	FollowCamera();
	m_fFinishing = FALSE;
	m_iszLastAnim = 0;
	SetThink( &CCofLadderManager::LadderThink );
	pev->nextthink = gpGlobals->time + 0.1f;
	StepUp();
}

void CCofLadderManager::Play( const char *name )
{
	CCofLadderCamera *pCam = Camera();
	float duration = pCam ? pCam->Play( name ) : 0;
	m_iszLastAnim = ALLOC_STRING( name );
	if( duration == 0 )
	{
		ALERT( at_console, "Unable to find delay\n" );
		return;
	}
	m_flAnimEnd = gpGlobals->time + duration;
}

// hl.dll 1004f470: the next animation of the list (or, the first time from the top, customond)
void CCofLadderManager::StepUp( void )
{
	if( !(CBaseEntity *)m_hPlayer || !Camera() || m_iIndex < 1 || m_iIndex > COF_LADDER_MAX )
		return;
	const char *last = m_iszLastAnim ? STRING( m_iszLastAnim ) : "";
	if( m_iIndex > 1 && !m_fDown && !strstr( last, "climb_loop_down" ) && !m_fSkipRaise )
		Raise( COF_LADDER_STEP );
	string_t name = m_iszAnim[m_iIndex];
	const char *n = name ? STRING( name ) : "";
	if( strstr( n, "climb_end" ) && strstr( n, "up" ))
	{
		if( !m_fDown && m_iszCustomOff )
			name = m_iszCustomOff;
		else if( m_fDown && m_iszCustomOnD )
			name = m_iszCustomOnD;
	}
	BOOL down = m_fDown;
	float before = m_flAnimEnd;
	Play( name ? STRING( name ) : "" );
	if( down )
	{
		m_fSkipRaise = TRUE;
		m_fDown = FALSE;
		m_fLowerNext = TRUE;
	}
	if( m_flAnimEnd != before && m_iIndex == m_iCount && !down )
	{
		m_fFinishing = TRUE;
		m_flFinishTime = m_flAnimEnd;
	}
	if( !down )
		m_iIndex++;
}

// hl.dll 1004f780: back down one step; at the bottom, customoffd (or climb_end_down) ends the climb
void CCofLadderManager::StepDown( void )
{
	if( !(CBaseEntity *)m_hPlayer || !Camera() )
		return;
	m_iIndex--;
	m_fSkipRaise = FALSE;
	if( m_fLowerNext )
	{
		m_fLowerNext = FALSE;
		Raise( -COF_LADDER_STEP );
	}
	if( m_iIndex >= 1 && m_iIndex <= COF_LADDER_MAX && m_iszAnim[m_iIndex] && strstr( STRING( m_iszAnim[m_iIndex] ), "climb_end" ))
	{
		string_t custom = m_fDown ? m_iszCustomOffD : m_iszCustomOff;
		if( custom )
			m_iszAnim[m_iIndex] = custom;
	}
	BOOL lastLoop = m_iszLastAnim && strstr( STRING( m_iszLastAnim ), "climb_loop_down" );
	if( m_iIndex > 1 )
	{
		if( lastLoop )
			Raise( -COF_LADDER_STEP );
		Play( "climb_loop_down" );
		if( m_iIndex == m_iCount )
		{
			m_fFinishing = TRUE;
			m_flFinishTime = m_flAnimEnd;
		}
		return;
	}
	if( lastLoop )
		Raise( -COF_LADDER_STEP );
	string_t custom = m_fDown ? m_iszCustomOffD : m_iszCustomOff;
	Play( custom ? STRING( custom ) : "climb_end_down" );
	m_fFinishing = TRUE;
	m_flFinishTime = m_flAnimEnd;
}

// hl.dll 1004ed40
void CCofLadderManager::LadderThink( void )
{
	CBaseEntity *pPlayer = m_hPlayer;
	if( !pPlayer )
	{
		if( (CBaseEntity *)m_hCamera )
			UTIL_Remove( m_hCamera );
		m_hCamera = NULL;
		SetThink( NULL );
		return;
	}
	// a restored climb has no camera (it is not saved): finish it where it was heading
	if( !Camera() || ( m_fFinishing && gpGlobals->time > m_flFinishTime ))
	{
		Finish();
		return;
	}
	((CBasePlayer *)pPlayer)->m_flNextAttack = 0.2f; // port: no shots from the hidden weapon
	pPlayer->pev->velocity = g_vecZero;
	FollowCamera();
	if( gpGlobals->time > m_flAnimEnd )
	{
		if( pPlayer->pev->button & IN_FORWARD )
		{
			m_fDown = FALSE;
			StepUp();
		}
		if( pPlayer->pev->button & IN_BACK )
		{
			m_fDown = TRUE;
			StepDown();
		}
	}
	pev->nextthink = gpGlobals->time + 0.01f;
}

void CCofLadderManager::Finish( void )
{
	CBaseEntity *pPlayer = m_hPlayer;
	SetThink( NULL );
	m_fFinishing = FALSE;
	if( (CBaseEntity *)m_hCamera )
		UTIL_Remove( m_hCamera );
	m_hCamera = NULL;
	m_hPlayer = NULL;
	if( !pPlayer )
		return;
	pPlayer->pev->flags &= ~( FL_GODMODE | FL_NOTARGET );
	pPlayer->pev->movetype = MOVETYPE_WALK;
	if( m_vecViewOfs != g_vecZero )
		pPlayer->pev->view_ofs = m_vecViewOfs;
	CoF_AttachCam( pPlayer, NULL );
	if( !pPlayer->pev->viewmodel )
		pPlayer->pev->viewmodel = m_iszViewModel;
	string_t dest = m_fDown ? m_iszBottom : m_iszTop;
	CBaseEntity *pDest = FStringNull( dest ) ? NULL : UTIL_FindEntityByTargetname( NULL, STRING( dest ));
	if( pDest )
	{
		UTIL_SetOrigin( pPlayer->pev, pDest->pev->origin + Vector( 0, 0, 36.0f + 1.0f ));
		pPlayer->pev->angles = pPlayer->pev->v_angle = pDest->pev->angles;
		pPlayer->pev->fixangle = TRUE;
		pPlayer->pev->velocity = pPlayer->pev->basevelocity = g_vecZero;
		pPlayer->pev->flags &= ~FL_ONGROUND;
	}
	if( !FStringNull( pev->target ))
		FireTargets( STRING( pev->target ), pPlayer, pPlayer, USE_TOGGLE, 0 );
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
	float m_flNextUse; // not saved, like a debounce
};

LINK_ENTITY_TO_CLASS( cof_ladder_manager_use, CCofLadderUse )

// hl.dll 1004fe80: on the ground, at most once a second; the value tells the manager the direction
void CCofLadderUse::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	if( !pActivator || !pActivator->IsPlayer() || FStringNull( pev->target ) || gpGlobals->time < m_flNextUse )
		return;
	if( !( pActivator->pev->flags & FL_ONGROUND ))
		return;
	m_flNextUse = gpGlobals->time + 1.0f;
	// iuser1 0: this use area is at the bottom, so the player goes up
	FireTargets( STRING( pev->target ), pActivator, pActivator, USE_TOGGLE, (float)pev->iuser1 );
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
	// keypadnumber (100e5890): a code of 9999 means the keypad was already used
	if( stricmp( answer, wanted ) || FStringNull( pEntity->pev->target ) || ( !password && !strcmp( wanted, "9999" )))
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
  // 100e5890 fires with the player as activator and caller, then sets the code to 9999 (used once)
  FireTargets(STRING(pEntity->pev->target),pPlayer,pPlayer,USE_TOGGLE,0);
  snprintf( g_cofKeypadCode, sizeof( g_cofKeypadCode ), "9999" );
 }
	return true;
}
