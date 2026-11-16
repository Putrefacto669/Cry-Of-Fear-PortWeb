// Cry of Fear: numbers dialled on the mobile and the phone calls they start.
// Rebuilt from hl.dll (read-only analysis, Ghidra -readOnly):
//
//  "phonenumber <n>" (ClientCommand 10018d60 -> 100e9ff0): the client's phone panel (client.dll CPhone,
//  10049d00) sends the dialled digits. The number goes to the FIRST cof_phonecheck of the map. With frags 1
//  it is compared at once (100a1cd0); otherwise only while a player is within max(iuser1, 32) units of it
//  (10094270, DAT_101a9728 = 32). On a match (impulse) it fires its target with the player as activator,
//  plays its noise (channel 3, volume 1, attenuation 0.8) and, without spawnflag 1, removes itself.
//  Not rebuilt: the emergency numbers 911/112 with the phone in the hand (a separate phone animation).
//
//  cof_phonecall (CPhoneCall): KeyValue 10060140 (subtitlenumber1..32, subtitletime1..32, audiofile),
//  Use 10060fa0, WaitForCall 10061000, ChangeSubtitle 1005fc20, EndCall 1005ff90.
//   - Use: the activating player is remembered; WaitForCall every 0.1 s.
//   - WaitForCall: needs the player on the ground and carrying the mobile. The first time iuser1 != 0 (a call
//     the player makes) plays phone/phone_ringing.wav and waits 3 s; iuser1 0 (a call to the player) plays
//     phone/phone_ringtone.wav. Then, with the mobile in the hand, the call starts (index 1, ChangeSubtitle).
//   - ChangeSubtitle, first time: the audiofile plays, phone/tone_send.wav, the phone goes to the ear
//     (raise_sms/raise_flash, 12/13) and the next step comes after subtitletime1. Then each step shows
//     subtitlenumber[i] (subtitles.txt line) and waits subtitletime[i+1] for the next one; when the next time is
//     below 0.1 s, EndCall one second later.
//   - EndCall: with the mobile in the hand, fires the target (activator: the call), lowers the phone
//     (lower_sms/lower_flash, 15/16) and plays phone/tone_send.wav.
//  Port deviation: the original stops thinking when the mobile is not in the hand at ChangeSubtitle/EndCall
//  (it presumably keeps the player from switching during a call); here those steps wait for the mobile instead
//  of ending the call for good, so the call cannot be lost.

#include "extdll.h"
#include "util.h"
#include "cbase.h"
#include "player.h"
#include "weapons.h"
#include "saverestore.h"
#include "cof_player.h"

#define COF_CALL_LINES 32

static bool CoF_HoldsMobile( CBaseEntity *pPlayer )
{
	if( !pPlayer || !pPlayer->IsPlayer() || !pPlayer->IsAlive() )
		return false;
	CBasePlayer *p = (CBasePlayer *)pPlayer;
	return p->m_pActiveItem && FClassnameIs( p->m_pActiveItem->pev, "weapon_mobile" );
}

// v_mobile.mdl: 12 raise_sms, 13 raise_flash, 14 raise_idle, 15 lower_sms, 16 lower_flash
static void CoF_MobileCallAnim( CBaseEntity *pPlayer, int smsSeq, int flashSeq )
{
	if( !CoF_HoldsMobile( pPlayer ))
		return;
	CBasePlayer *p = (CBasePlayer *)pPlayer;
	cof_phone_t *phone = CoF_Phone( p );
	CBasePlayerWeapon *mobile = (CBasePlayerWeapon *)p->m_pActiveItem->GetWeaponPtr();
	if( !mobile )
		return;
	mobile->SendWeaponAnim( phone && phone->flash ? flashSeq : smsSeq, 0 );
	mobile->m_flTimeWeaponIdle = UTIL_WeaponTimeBase() + 1.1f; // _DAT_101b5ff0
}

/*
=====================================================================
cof_phonecheck
=====================================================================
*/
class CCofPhoneCheck : public CPointEntity
{
public:
	void Spawn( void )
	{
		CPointEntity::Spawn();
		if( !FStringNull( pev->noise ))
			PRECACHE_SOUND( (char *)STRING( pev->noise ));
		if( !pev->iuser1 )
			pev->iuser1 = 128;
	}
	// 100a1cd0
	void Dialled( int number, CBaseEntity *pPlayer )
	{
		if( number != pev->impulse )
			return;
		if( pPlayer && !FStringNull( pev->target ))
			FireTargets( STRING( pev->target ), pPlayer, pPlayer, USE_TOGGLE, 0 );
		if( !FStringNull( pev->noise ))
			EMIT_SOUND( edict(), CHAN_ITEM, STRING( pev->noise ), 1.0f, 0.8f );
		if( !( pev->spawnflags & 1 ))
			UTIL_Remove( this );
	}
};

LINK_ENTITY_TO_CLASS( cof_phonecheck, CCofPhoneCheck )

/*
=====================================================================
cof_phonecall
=====================================================================
*/
class CCofPhoneCall : public CPointEntity
{
public:
	void Spawn( void );
	void Precache( void );
	virtual void KeyValue( KeyValueData *pkvd );
	virtual void Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value );
	virtual int Save( CSave &save );
	virtual int Restore( CRestore &restore );
	static TYPEDESCRIPTION m_SaveData[];
	void EXPORT WaitForCall( void );
	void EXPORT ChangeSubtitle( void );
	void EXPORT EndCall( void );
	bool InCall( CBaseEntity *pPlayer ) { return m_fInCall && (CBaseEntity *)m_hPlayer == pPlayer; }

	int m_iNumber[COF_CALL_LINES + 2]; // subtitlenumber1..32 (index 0 and 33 stay 0)
	float m_flTime[COF_CALL_LINES + 2]; // subtitletime1..32
	string_t m_iszAudio;
	int m_iIndex;
	BOOL m_fWaiting;     // 0xdc: the waiting sound has played
	BOOL m_fStarted;     // 0x200: the audio has started
	BOOL m_fInCall;      // port: the phone is at the ear (CCofMobile keeps it there)
	EHANDLE m_hPlayer;
};

LINK_ENTITY_TO_CLASS( cof_phonecall, CCofPhoneCall )

TYPEDESCRIPTION CCofPhoneCall::m_SaveData[] =
{
	DEFINE_ARRAY( CCofPhoneCall, m_iNumber, FIELD_INTEGER, COF_CALL_LINES + 2 ),
	DEFINE_ARRAY( CCofPhoneCall, m_flTime, FIELD_FLOAT, COF_CALL_LINES + 2 ),
	DEFINE_FIELD( CCofPhoneCall, m_iszAudio, FIELD_STRING ),
	DEFINE_FIELD( CCofPhoneCall, m_iIndex, FIELD_INTEGER ),
	DEFINE_FIELD( CCofPhoneCall, m_fWaiting, FIELD_BOOLEAN ),
	DEFINE_FIELD( CCofPhoneCall, m_fStarted, FIELD_BOOLEAN ),
	DEFINE_FIELD( CCofPhoneCall, m_fInCall, FIELD_BOOLEAN ),
	DEFINE_FIELD( CCofPhoneCall, m_hPlayer, FIELD_EHANDLE ),
};

IMPLEMENT_SAVERESTORE( CCofPhoneCall, CPointEntity )

void CCofPhoneCall::KeyValue( KeyValueData *pkvd )
{
	if( !strncmp( pkvd->szKeyName, "subtitlenumber", 14 ))
	{
		int n = atoi( pkvd->szKeyName + 14 );
		if( n >= 1 && n <= COF_CALL_LINES )
			m_iNumber[n] = atoi( pkvd->szValue );
	}
	else if( !strncmp( pkvd->szKeyName, "subtitletime", 12 ))
	{
		int n = atoi( pkvd->szKeyName + 12 );
		if( n >= 1 && n <= COF_CALL_LINES )
			m_flTime[n] = atof( pkvd->szValue );
	}
	else if( FStrEq( pkvd->szKeyName, "audiofile" ))
		m_iszAudio = ALLOC_STRING( pkvd->szValue );
	else
	{
		CPointEntity::KeyValue( pkvd );
		return;
	}
	pkvd->fHandled = TRUE;
}

void CCofPhoneCall::Precache( void )
{
	if( !FStringNull( m_iszAudio ))
		PRECACHE_SOUND( (char *)STRING( m_iszAudio ));
	PRECACHE_SOUND( "phone/phone_ringing.wav" );
	PRECACHE_SOUND( "phone/phone_ringtone.wav" );
	PRECACHE_SOUND( "phone/tone_send.wav" );
}

void CCofPhoneCall::Spawn( void )
{
	Precache();
	CPointEntity::Spawn();
}

// 10060fa0
void CCofPhoneCall::Use( CBaseEntity *pActivator, CBaseEntity *pCaller, USE_TYPE useType, float value )
{
	if( !pActivator || !pActivator->IsPlayer() || !pActivator->IsAlive() )
		return;
	m_fStarted = FALSE;
	m_hPlayer = pActivator;
	SetThink( &CCofPhoneCall::WaitForCall );
	pev->nextthink = gpGlobals->time + 0.1f;
}

// 10061000
void CCofPhoneCall::WaitForCall( void )
{
	CBaseEntity *pPlayer = m_hPlayer;
	if( !pPlayer || !pPlayer->IsAlive() )
		return;
	if( pPlayer->pev->flags & FL_ONGROUND )
	{
		if( !((CBasePlayer *)pPlayer)->HasNamedPlayerItem( "weapon_mobile" ))
			return;
		if( !m_fWaiting )
		{
			m_fWaiting = TRUE;
			if( pev->iuser1 )
			{
				EMIT_SOUND( pPlayer->edict(), CHAN_ITEM, "phone/phone_ringing.wav", 1.0f, 0.8f );
				pev->nextthink = gpGlobals->time + 3.0f;
				return;
			}
			EMIT_SOUND( pPlayer->edict(), CHAN_ITEM, "phone/phone_ringtone.wav", 1.0f, 0.8f );
		}
		if( CoF_HoldsMobile( pPlayer ))
		{
			m_iIndex = 1;
			m_fInCall = TRUE;
			SetThink( &CCofPhoneCall::ChangeSubtitle );
			// the original sets 3 s and then 0.1 s below: the call goes on 0.1 s later
		}
	}
	pev->nextthink = gpGlobals->time + 0.1f;
}

// 1005fc20
void CCofPhoneCall::ChangeSubtitle( void )
{
	CBaseEntity *pPlayer = m_hPlayer;
	if( !pPlayer || !pPlayer->IsAlive() )
		return;
	if( !CoF_HoldsMobile( pPlayer ))
	{
		pev->nextthink = gpGlobals->time + 0.1f; // port: wait for the mobile (see the header)
		return;
	}
	int i = m_iIndex;
	if( !m_fStarted )
	{
		m_fStarted = TRUE;
		pev->nextthink = gpGlobals->time + m_flTime[i];
		STOP_SOUND( pPlayer->edict(), CHAN_ITEM, pev->iuser1 ? "phone/phone_ringing.wav" : "phone/phone_ringtone.wav" );
		EMIT_SOUND( pPlayer->edict(), CHAN_ITEM, "phone/tone_send.wav", 1.0f, 0.8f );
		if( !FStringNull( m_iszAudio ))
			EMIT_SOUND( pPlayer->edict(), CHAN_VOICE, STRING( m_iszAudio ), 1.0f, 0.8f );
		CoF_MobileCallAnim( pPlayer, 12, 13 );
		return;
	}
	if( m_iNumber[i] )
		CoF_HudPrint( "COF/HUD SUB %d\n", m_iNumber[i] );
	else
		ALERT( at_console, "SUBTITLE CHANGE: Could not change number!\n" );
	if( i < COF_CALL_LINES )
	{
		if( m_iNumber[i + 1] && m_flTime[i + 1] > 0 )
		{
			m_iIndex = i + 1;
			pev->nextthink = gpGlobals->time + m_flTime[i + 1];
		}
		if( m_flTime[i + 1] < 0.1f )
		{
			SetThink( &CCofPhoneCall::EndCall );
			pev->nextthink = gpGlobals->time + 1.0f;
		}
	}
}

// 1005ff90
void CCofPhoneCall::EndCall( void )
{
	CBaseEntity *pPlayer = m_hPlayer;
	if( !pPlayer || !pPlayer->IsAlive() )
		return;
	if( !CoF_HoldsMobile( pPlayer ))
	{
		pev->nextthink = gpGlobals->time + 0.1f; // port: wait for the mobile (see the header)
		return;
	}
	m_fInCall = FALSE;
	if( !FStringNull( pev->target ))
		FireTargets( STRING( pev->target ), this, this, USE_TOGGLE, 0 );
	CoF_MobileCallAnim( pPlayer, 15, 16 );
	EMIT_SOUND( pPlayer->edict(), CHAN_ITEM, "phone/tone_send.wav", 1.0f, 0.8f );
	SetThink( NULL );
}

// CCofMobile keeps the phone at the ear and ignores its attacks during a call
bool CoF_PhoneInCall( CBaseEntity *pPlayer )
{
	CBaseEntity *e = NULL;
	while(( e = UTIL_FindEntityByClassname( e, "cof_phonecall" )))
		if( ((CCofPhoneCall *)e)->InCall( pPlayer ))
			return true;
	return false;
}

/*
=====================================================================
commands from the phone panel of hud.js
	cof_phonedial          "*" with the phone: the server opens the panel when the mobile is in the hand
	phonenumber <digits>   the original's command (client.dll 10049d00)
=====================================================================
*/
bool CoF_PhoneCommand( CBasePlayer *pPlayer, const char *pcmd )
{
	if( FStrEq( pcmd, "cof_phonedial" ))
	{
		if( CoF_HoldsMobile( pPlayer ) && !CoF_PhoneInCall( pPlayer ))
			CoF_HudPrint( "COF/HUD PHONEDIAL\n" );
		return true;
	}
	if( !FStrEq( pcmd, "phonenumber" ))
		return false;
	if( CMD_ARGC() < 2 )
		return true;
	int number = atoi( CMD_ARGV( 1 ));
	CCofPhoneCheck *pCheck = (CCofPhoneCheck *)UTIL_FindEntityByClassname( NULL, "cof_phonecheck" );
	if( !pCheck )
		return true;
	if( pCheck->pev->frags == 1.0f )
	{
		pCheck->Dialled( number, pPlayer );
		return true;
	}
	// 10094270: only with a player near the check
	float radius = pCheck->pev->iuser1 > 32 ? (float)pCheck->pev->iuser1 : 32.0f;
	CBaseEntity *e = NULL;
	while(( e = UTIL_FindEntityInSphere( e, pCheck->pev->origin, radius )))
	{
		if( e->IsPlayer() )
		{
			pCheck->Dialled( number, pPlayer );
			break;
		}
	}
	return true;
}
