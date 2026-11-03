// Cry of Fear: the weapons of the first chapter.
//
// weapon_switchblade (melee), weapon_glock (Glock 19), weapon_mobile (the
// phone, used as a light), weapon_syringe (morphine, heals) and
// weapon_camera (the photos of the prelude). The view
// models are Cry of Fear's, so the animations are their sequence numbers and
// everything runs on the server: no client prediction (cl_lw 0 in
// cof_web.cfg) and no hlsdk events, whose animation indices belong to the
// Half-Life models. hlsdk's own weapon_glock/weapon_mp5 names are taken off
// in patches/hlsdk so these can use them.
//
// Picking a weapon up also puts it in the bag (CoF_AddBagEntry); the bag,
// quick select and the "equip" command live in player_cof.cpp.

#include "extdll.h"
#include "util.h"
#include "cbase.h"
#include "player.h"
#include "weapons.h"
#include "gamerules.h"
#include "skill.h"
#include "shake.h"
#include "cof_player.h"
#include "saverestore.h"

// CoF's skill.cfg uses these names, not Half-Life's sk_plr_9mm_bullet.
// Register before skill.cfg is executed (GameDLLInit). All four original
// difficulty entries default to 13; the original Glock passes explicit damage.
static cvar_t cofPunchSkill[] = {
 {"sk_cof_punch1","5"},{"sk_cof_punch2","5"},{"sk_cof_punch3","5"},{"sk_cof_punch4","5"}
};
static cvar_t cofWeaponDebug={"cof_weapon_debug","0",0};
static cvar_t cofGlockSkill[] = {
	{ "sk_cof_glock1", "13" }, { "sk_cof_glock2", "13" },
	{ "sk_cof_glock3", "13" }, { "sk_cof_glock4", "13" }
};

void CoF_RegisterWeaponSkill( void )
{
 CVAR_REGISTER(&cofWeaponDebug);
 for(unsigned i=0;i<4;++i)CVAR_REGISTER(&cofPunchSkill[i]);
	for( unsigned i = 0; i < sizeof(cofGlockSkill) / sizeof(cofGlockSkill[0]); ++i )
		CVAR_REGISTER( &cofGlockSkill[i] );
}

static int CoF_GlockDamage( void )
{
	int level = (int)CVAR_GET_FLOAT( "skill" );
	if( level < 1 ) level = 1;
	if( level > 4 ) level = 4;
	return (int)CVAR_GET_FLOAT( cofGlockSkill[level - 1].name );
}

#define WEAPON_COF_SWITCHBLADE  16
#define WEAPON_COF_GLOCK        17
#define WEAPON_COF_SYRINGE      18
#define WEAPON_COF_MOBILE       19
#define WEAPON_COF_CAMERA       20

#define COF_GLOCK_CLIP          15  // Glock 19 magazine
#define COF_9MM_MAX             90
#define COF_SYRINGE_MAX         10
#define COF_SYRINGE_HEAL        50.0f

// a weapon that is also a bag entry; refuses to be picked up with a full bag
class CCofWeapon : public CBasePlayerWeapon
{
public:
	int AddToPlayer( CBasePlayer *pPlayer )
	{
		if( !CoF_AddBagEntry( pPlayer, STRING( pev->classname )))
			return FALSE;
		return CBasePlayerWeapon::AddToPlayer( pPlayer );
	}
	int iItemSlot( void ) { return 1; }
	BOOL PlayEmptySound( void ) { return FALSE; }
	// hlsdk is built with CLIENT_WEAPONS: weapon timers are relative to 0 and the player only
	// counts them down for weapons that say so. With cl_lw 0 the animations still go out.
	BOOL UseDecrement( void ) { return TRUE; }

	void Anim( int sequence, float seconds )
	{
		if(!CoF_RouteMobileAnimation(m_pPlayer,this,sequence))SendWeaponAnim( sequence, 0 );
		m_flTimeWeaponIdle = UTIL_WeaponTimeBase() + seconds;
	}
};

/*
=====================================================================
weapon_switchblade
=====================================================================
*/
// The knife has a sequence set per hand: p1* is the right hand, p2* the left (v_switchblade.mdl).
// Right click (SecondaryAttack) moves it to the other hand with p1top2 / p2top1.
enum switchblade_e
{
	BLADE_IDLE = 0, BLADE_DRAW = 1, BLADE_HOLSTER = 2, BLADE_ATTACK1 = 3,
	BLADE_TOP_TO_LEFT = 4, BLADE_IDLE_LEFT = 5, BLADE_DRAW_LEFT = 6, BLADE_HOLSTER_LEFT = 7,
	BLADE_ATTACK1_LEFT = 8, BLADE_TOP_TO_RIGHT = 9,
	BLADE_ATTACK2 = 16, BLADE_ATTACK3 = 17, BLADE_ATTACK2_LEFT = 18, BLADE_ATTACK3_LEFT = 19,
	BLADE_FIDGET1 = 20, BLADE_FIDGET1_LEFT = 23
};

class CCofSwitchblade : public CCofWeapon
{
public:
	void Spawn( void );
	void Precache( void );
	int GetItemInfo( ItemInfo *p );
	BOOL Deploy( void );
	void Holster( int skiplocal = 0 );
	void PrimaryAttack( void );
	void SecondaryAttack( void );
	void WeaponIdle( void );

	void ItemPostFrame(){if(!CoF_DualPostFrame(m_pPlayer,this))CCofWeapon::ItemPostFrame();}
 int Save(CSave&);int Restore(CRestore&);static TYPEDESCRIPTION m_SaveData[];
 int m_iHand;  // 1: right, 2: left
};

LINK_ENTITY_TO_CLASS( weapon_switchblade, CCofSwitchblade )
TYPEDESCRIPTION CCofSwitchblade::m_SaveData[]={DEFINE_FIELD(CCofSwitchblade,m_iHand,FIELD_INTEGER)};
int CCofSwitchblade::Save(CSave &save)
{
 if(!CCofWeapon::Save(save))return 0;
 return save.WriteFields("CCofSwitchblade",this,m_SaveData,ARRAYSIZE(m_SaveData));
}
int CCofSwitchblade::Restore(CRestore &restore)
{
 if(!CCofWeapon::Restore(restore))return 0;
 m_iHand=1;
 // Older port saves contain only the SDK base fields; the optional block rewinds on absence.
 restore.ReadFields("CCofSwitchblade",this,m_SaveData,ARRAYSIZE(m_SaveData));
 return 1;
}

BOOL CCofSwitchblade::Deploy( void )
{
	if( !m_iHand )
		m_iHand = 1;
	// dual wielded with the phone: its light stays on in the other hand
	cof_phone_t *phone = CoF_Phone( m_pPlayer );
	if( phone && phone->dual )
		{m_iHand=1;CoF_SetFlashlight( m_pPlayer, phone->flash!=0 );}
	return DefaultDeploy( "models/weapons/switchblade/v_switchblade.mdl", "",
		m_iHand == 2 ? BLADE_DRAW_LEFT : BLADE_DRAW, "crowbar" );
}

void CCofSwitchblade::Holster( int skiplocal )
{
	cof_phone_t *phone = CoF_Phone( m_pPlayer );
	if( phone && phone->dual )
		CoF_SetFlashlight( m_pPlayer, false );
	m_pPlayer->m_flNextAttack = UTIL_WeaponTimeBase() + 0.5f;
	SendWeaponAnim( m_iHand == 2 ? BLADE_HOLSTER_LEFT : BLADE_HOLSTER, 0 );
}

// right click: the knife changes hand (p1top2 or p2top1, 35 frames at 30 fps)
void CCofSwitchblade::SecondaryAttack( void )
{
	if( !m_iHand )
		m_iHand = 1;
	Anim( m_iHand == 1 ? BLADE_TOP_TO_LEFT : BLADE_TOP_TO_RIGHT, 35.0f / 30.0f );
	m_iHand = m_iHand == 1 ? 2 : 1;
	m_flNextPrimaryAttack = m_flNextSecondaryAttack = UTIL_WeaponTimeBase() + 35.0f / 30.0f;
}

void CCofSwitchblade::Spawn( void )
{
	Precache();
	m_iId = WEAPON_COF_SWITCHBLADE;
	m_iHand = 1;
	SET_MODEL( ENT( pev ), "models/weapons/switchblade/w_switchblade.mdl" );
	m_iClip = -1;
	FallInit();
}

void CCofSwitchblade::Precache( void )
{
	PRECACHE_MODEL( "models/weapons/switchblade/v_switchblade.mdl" );
	PRECACHE_MODEL( "models/weapons/switchblade/w_switchblade.mdl" );
	PRECACHE_SOUND( "weapons/switchblade/switchblade_swing.wav" );
	PRECACHE_SOUND( "weapons/switchblade/switchblade_hitbody1.wav" );
	PRECACHE_SOUND( "weapons/switchblade/switchblade_hitbody2.wav" );
	PRECACHE_SOUND( "weapons/switchblade/switchblade_hitwall1.wav" );
	PRECACHE_SOUND( "weapons/switchblade/switchblade_hitwall2.wav" );
}

int CCofSwitchblade::GetItemInfo( ItemInfo *p )
{
	p->pszName = STRING( pev->classname );
	p->pszAmmo1 = NULL;
	p->iMaxAmmo1 = -1;
	p->pszAmmo2 = NULL;
	p->iMaxAmmo2 = -1;
	p->iMaxClip = WEAPON_NOCLIP;
	p->iSlot = 0;
	p->iPosition = 1;
	p->iId = m_iId = WEAPON_COF_SWITCHBLADE;
	p->iWeight = 0;
	p->iFlags = ITEM_FLAG_SELECTONEMPTY | ITEM_FLAG_NOAUTOSWITCHEMPTY;
	return 1;
}

void CCofSwitchblade::PrimaryAttack( void )
{
	static const int swingsRight[] = { BLADE_ATTACK1, BLADE_ATTACK2, BLADE_ATTACK3 };
	static const int swingsLeft[] = { BLADE_ATTACK1_LEFT, BLADE_ATTACK2_LEFT, BLADE_ATTACK3_LEFT };
	const int *swings = m_iHand == 2 ? swingsLeft : swingsRight;
	TraceResult tr;

	UTIL_MakeVectors( m_pPlayer->pev->v_angle );
	Vector vecSrc = m_pPlayer->GetGunPosition();
	Vector vecEnd = vecSrc + gpGlobals->v_forward * 48;
	UTIL_TraceLine( vecSrc, vecEnd, dont_ignore_monsters, ENT( m_pPlayer->pev ), &tr );
	if( tr.flFraction >= 1.0f )
	{
		// a thin line misses easily: try the hull of the swing
		UTIL_TraceHull( vecSrc, vecEnd, dont_ignore_monsters, head_hull, ENT( m_pPlayer->pev ), &tr );
	}

	Anim( swings[RANDOM_LONG( 0, 2 )], 1.0f );
	m_pPlayer->SetAnimation( PLAYER_ATTACK1 );
	m_flNextPrimaryAttack = UTIL_WeaponTimeBase() + 0.6f;

	if( tr.flFraction >= 1.0f )
	{
		EMIT_SOUND_DYN( ENT( m_pPlayer->pev ), CHAN_ITEM, "weapons/switchblade/switchblade_swing.wav", 1, ATTN_NORM, 0, 94 + RANDOM_LONG( 0, 15 ));
		return;
	}

	CBaseEntity *pEntity = CBaseEntity::Instance( tr.pHit );
	ClearMultiDamage();
	if( pEntity )
		pEntity->TraceAttack( m_pPlayer->pev, 6.0f, gpGlobals->v_forward, &tr, DMG_SLASH ); // sk_cof_switchblade
	ApplyMultiDamage( m_pPlayer->pev, m_pPlayer->pev );

	if( pEntity && pEntity->Classify() != CLASS_NONE && pEntity->Classify() != CLASS_MACHINE )
		EMIT_SOUND_DYN( ENT( m_pPlayer->pev ), CHAN_ITEM, RANDOM_LONG( 0, 1 ) ? "weapons/switchblade/switchblade_hitbody1.wav" : "weapons/switchblade/switchblade_hitbody2.wav", 1, ATTN_NORM, 0, 100 );
	else
	{
		EMIT_SOUND_DYN( ENT( m_pPlayer->pev ), CHAN_ITEM, RANDOM_LONG( 0, 1 ) ? "weapons/switchblade/switchblade_hitwall1.wav" : "weapons/switchblade/switchblade_hitwall2.wav", 1, ATTN_NORM, 0, 98 + RANDOM_LONG( 0, 3 ));
		DecalGunshot( &tr, BULLET_PLAYER_CROWBAR );
	}
}

void CCofSwitchblade::WeaponIdle( void )
{
	if( m_flTimeWeaponIdle > UTIL_WeaponTimeBase())
		return;
	if( m_iHand == 2 )
		Anim( RANDOM_LONG( 0, 4 ) ? BLADE_IDLE_LEFT : BLADE_FIDGET1_LEFT, RANDOM_FLOAT( 5, 10 ));
	else
		Anim( RANDOM_LONG( 0, 4 ) ? BLADE_IDLE : BLADE_FIDGET1, RANDOM_FLOAT( 5, 10 ));
}

/*
=====================================================================
weapon_glock
=====================================================================
*/
enum glock_e
{
	GLOCK_IDLE = 0, GLOCK_IDLE_EMPTY = 1, GLOCK_SHOOT = 2, GLOCK_SHOOT_LAST = 3,
	GLOCK_RELOAD = 4, GLOCK_RELOAD_EMPTY = 5, GLOCK_DRAW = 6, GLOCK_DRAW_EMPTY = 7,
	GLOCK_HOLSTER = 8, GLOCK_HOLSTER_EMPTY = 9, GLOCK_FIDGET = 21, GLOCK_FIDGET_EMPTY = 22
};

class CCofGlock : public CCofWeapon
{
public:
 int Save(CSave&);int Restore(CRestore&);static TYPEDESCRIPTION m_SaveData[];
 float m_flReloadRemaining; // relative CLIENT_WEAPONS player deadline, not world time
 void ItemPostFrame(){if(!CoF_DualPostFrame(m_pPlayer,this))CCofWeapon::ItemPostFrame();}
	void Spawn( void );
	void Precache( void );
	int GetItemInfo( ItemInfo *p );
	BOOL Deploy( void ) { return DefaultDeploy( "models/weapons/glock/v_glock.mdl", "", m_iClip ? GLOCK_DRAW : GLOCK_DRAW_EMPTY, "onehanded" ); }
	void Holster( int skiplocal = 0 ) { m_fInReload = FALSE; m_pPlayer->m_flNextAttack = UTIL_WeaponTimeBase() + 0.5f; SendWeaponAnim( m_iClip ? GLOCK_HOLSTER : GLOCK_HOLSTER_EMPTY, 0 ); }
	void PrimaryAttack( void );
	void Reload( void );
	void WeaponIdle( void );
};

LINK_ENTITY_TO_CLASS( weapon_glock, CCofGlock )
// The SDK base saves the clip but omits its pending-reload flag. Keep this local
// to the CoF Glock; reload completion still uses the normal ItemPostFrame path.
TYPEDESCRIPTION CCofGlock::m_SaveData[]={
 DEFINE_FIELD(CCofGlock,m_fInReload,FIELD_BOOLEAN),
 DEFINE_FIELD(CCofGlock,m_flReloadRemaining,FIELD_FLOAT)
};
int CCofGlock::Save(CSave &save)
{
 m_flReloadRemaining=m_fInReload && m_pPlayer?m_pPlayer->m_flNextAttack:0;
 if(!CCofWeapon::Save(save))return 0;
 return save.WriteFields("COFGLOCK",this,m_SaveData,ARRAYSIZE(m_SaveData));
}
int CCofGlock::Restore(CRestore &restore)
{
 if(!CCofWeapon::Restore(restore))return 0;
 m_fInReload=FALSE;m_flReloadRemaining=0;
 int ok=restore.ReadFields("COFGLOCK",this,m_SaveData,ARRAYSIZE(m_SaveData));
 if(ok && m_fInReload && m_pPlayer)m_pPlayer->m_flNextAttack=m_flReloadRemaining;
 return 1; // no COFGLOCK block in saves created before this persistence fix
}

void CCofGlock::Spawn( void )
{
	Precache();
	m_iId = WEAPON_COF_GLOCK;
	SET_MODEL( ENT( pev ), "models/weapons/glock/w_glock.mdl" );
	m_iDefaultAmmo = COF_GLOCK_CLIP;
	FallInit();
}

void CCofGlock::Precache( void )
{
	PRECACHE_MODEL( "models/weapons/glock/v_glock.mdl" );
	PRECACHE_MODEL( "models/weapons/glock/w_glock.mdl" );
	PRECACHE_SOUND( "weapons/glock/glock_fire.wav" );
	PRECACHE_SOUND( "weapons/glock/glock_click.wav" );
}

int CCofGlock::GetItemInfo( ItemInfo *p )
{
	p->pszName = STRING( pev->classname );
	p->pszAmmo1 = "9mm";
	p->iMaxAmmo1 = COF_9MM_MAX;
	p->pszAmmo2 = NULL;
	p->iMaxAmmo2 = -1;
	p->iMaxClip = COF_GLOCK_CLIP;
	p->iSlot = 1;
	p->iPosition = 1;
	p->iId = m_iId = WEAPON_COF_GLOCK;
	p->iWeight = 10;
	p->iFlags = ITEM_FLAG_SELECTONEMPTY | ITEM_FLAG_NOAUTOSWITCHEMPTY;
	return 1;
}

void CCofGlock::PrimaryAttack( void )
{
	if( m_iClip <= 0 )
	{
		EMIT_SOUND( ENT( m_pPlayer->pev ), CHAN_ITEM, "weapons/glock/glock_click.wav", 0.8f, ATTN_NORM );
		m_flNextPrimaryAttack = UTIL_WeaponTimeBase() + 0.3f;
		return;
	}

	m_iClip--;
	m_pPlayer->pev->effects |= EF_MUZZLEFLASH;
	m_pPlayer->SetAnimation( PLAYER_ATTACK1 );
	m_pPlayer->m_iWeaponVolume = NORMAL_GUN_VOLUME;
	m_pPlayer->m_iWeaponFlash = NORMAL_GUN_FLASH;

	UTIL_MakeVectors( m_pPlayer->pev->v_angle + m_pPlayer->pev->punchangle );
	Vector vecSrc = m_pPlayer->GetGunPosition();
	m_pPlayer->FireBulletsPlayer( 1, vecSrc, gpGlobals->v_forward, Vector( 0.02f, 0.02f, 0.02f ), 8192, BULLET_PLAYER_9MM, 0, CoF_GlockDamage(), m_pPlayer->pev, m_pPlayer->random_seed );

	// FireBulletsPlayer leaves the wall marks to client events; draw them here
	TraceResult tr;
	UTIL_TraceLine( vecSrc, vecSrc + gpGlobals->v_forward * 8192, dont_ignore_monsters, ENT( m_pPlayer->pev ), &tr );
	if( tr.flFraction < 1.0f && ( !tr.pHit || VARS( tr.pHit )->solid == SOLID_BSP ))
		DecalGunshot( &tr, BULLET_PLAYER_9MM );

	EMIT_SOUND_DYN( ENT( m_pPlayer->pev ), CHAN_WEAPON, "weapons/glock/glock_fire.wav", 1, ATTN_NORM, 0, 98 + RANDOM_LONG( 0, 4 ));
	m_pPlayer->pev->punchangle.x -= 2.0f;
	Anim( m_iClip ? GLOCK_SHOOT : GLOCK_SHOOT_LAST, RANDOM_FLOAT( 8, 12 ));
	m_flNextPrimaryAttack = UTIL_WeaponTimeBase() + 0.25f;
}

void CCofGlock::Reload( void )
{
	if( m_pPlayer->m_rgAmmo[m_iPrimaryAmmoType] <= 0 || m_iClip == COF_GLOCK_CLIP )
		return;

	// reload_noshot also racks the slide: 105 frames instead of 80
	if( m_iClip == 0 )
		DefaultReload( COF_GLOCK_CLIP, GLOCK_RELOAD_EMPTY, 105.0f / 30.0f );
	else
		DefaultReload( COF_GLOCK_CLIP, GLOCK_RELOAD, 80.0f / 30.0f );
	m_flTimeWeaponIdle = UTIL_WeaponTimeBase() + 4.0f;
}

void CCofGlock::WeaponIdle( void )
{
	if( m_flTimeWeaponIdle > UTIL_WeaponTimeBase())
		return;
	if( RANDOM_LONG( 0, 4 ))
		Anim( m_iClip ? GLOCK_IDLE : GLOCK_IDLE_EMPTY, 101.0f / 30.0f );
	else
		Anim( m_iClip ? GLOCK_FIDGET : GLOCK_FIDGET_EMPTY, 1.0f );
}

// ammo_glock: one magazine
class CCofGlockAmmo : public CBasePlayerAmmo
{
	void Spawn( void )
	{
		Precache();
		SET_MODEL( ENT( pev ), "models/ammo/clip.mdl" );
		CBasePlayerAmmo::Spawn();
	}
	void Precache( void )
	{
		PRECACHE_MODEL( "models/ammo/clip.mdl" );
		PRECACHE_SOUND( "items/gunpickup2.wav" );
	}
	BOOL AddAmmo( CBaseEntity *pOther )
	{
		if( pOther->GiveAmmo( COF_GLOCK_CLIP, "9mm", COF_9MM_MAX ) == -1 )
			return FALSE;
		EMIT_SOUND( ENT( pev ), CHAN_ITEM, "items/gunpickup2.wav", 1, ATTN_NORM );
		return TRUE;
	}
};

LINK_ENTITY_TO_CLASS( ammo_glock, CCofGlockAmmo )

/*
=====================================================================
weapon_syringe: morphine. Each one is a unit of "syringe" ammo; using
it plays the injection and heals.
=====================================================================
*/
enum syringe_e { SYRINGE_IDLE = 0, SYRINGE_DRAW = 1, SYRINGE_HOLSTER = 2, SYRINGE_USE = 3 };

class CCofSyringe : public CCofWeapon
{
public:
	void Spawn( void );
	void Precache( void );
	int GetItemInfo( ItemInfo *p );
	BOOL Deploy( void ) { m_flHealTime = 0; return DefaultDeploy( "models/weapons/syringe/v_syringe.mdl", "", SYRINGE_DRAW, "trip" ); }
	void Holster( int skiplocal = 0 );
	void PrimaryAttack( void );
	void WeaponIdle( void );
	void ItemPostFrame( void );

	float m_flHealTime;   // gpGlobals->time when the needle goes in (frame 39 of "use")
};

LINK_ENTITY_TO_CLASS( weapon_syringe, CCofSyringe )

void CCofSyringe::Spawn( void )
{
	Precache();
	m_iId = WEAPON_COF_SYRINGE;
	SET_MODEL( ENT( pev ), "models/weapons/syringe/w_syringe.mdl" );
	m_iDefaultAmmo = 1;
	FallInit();
}

void CCofSyringe::Precache( void )
{
	PRECACHE_MODEL( "models/weapons/syringe/v_syringe.mdl" );
	PRECACHE_MODEL( "models/weapons/syringe/w_syringe.mdl" );
}

int CCofSyringe::GetItemInfo( ItemInfo *p )
{
	p->pszName = STRING( pev->classname );
	p->pszAmmo1 = "syringe";
	p->iMaxAmmo1 = COF_SYRINGE_MAX;
	p->pszAmmo2 = NULL;
	p->iMaxAmmo2 = -1;
	p->iMaxClip = WEAPON_NOCLIP;
	p->iSlot = 4;
	p->iPosition = 1;
	p->iId = m_iId = WEAPON_COF_SYRINGE;
	p->iWeight = 0;
	p->iFlags = ITEM_FLAG_LIMITINWORLD | ITEM_FLAG_EXHAUSTIBLE;
	return 1;
}

void CCofSyringe::Holster( int skiplocal )
{
	m_flHealTime = 0;
	m_pPlayer->m_flNextAttack = UTIL_WeaponTimeBase() + 0.5f;
	SendWeaponAnim( SYRINGE_HOLSTER, 0 );
}

void CCofSyringe::PrimaryAttack( void )
{
	if( m_pPlayer->m_rgAmmo[m_iPrimaryAmmoType] <= 0 || m_flHealTime )
		return;
	if( m_pPlayer->pev->health >= m_pPlayer->pev->max_health )
	{
		CoF_CenterPrint( "I don't need that right now." );
		m_flNextPrimaryAttack = UTIL_WeaponTimeBase() + 1.0f;
		return;
	}
	Anim( SYRINGE_USE, 105.0f / 30.0f );
	m_flHealTime = gpGlobals->time + 39.0f / 30.0f;
	m_flNextPrimaryAttack = UTIL_WeaponTimeBase() + 105.0f / 30.0f;
}

void CCofSyringe::ItemPostFrame( void )
{
	if( m_flHealTime && m_flHealTime <= gpGlobals->time )
	{
		m_flHealTime = 0;
		m_pPlayer->TakeHealth( COF_SYRINGE_HEAL, DMG_GENERIC );
		m_pPlayer->m_rgAmmo[m_iPrimaryAmmoType]--;
	}
	CCofWeapon::ItemPostFrame();
}

void CCofSyringe::WeaponIdle( void )
{
	if( m_flTimeWeaponIdle > UTIL_WeaponTimeBase())
		return;

	// the last one is gone: drop it from the player like hlsdk's hand grenade
	if( m_pPlayer->m_rgAmmo[m_iPrimaryAmmoType] <= 0 )
	{
		RetireWeapon();
		return;
	}
	Anim( SYRINGE_IDLE, 100.0f / 20.0f );
}

/*
=====================================================================
weapon_mobile: Simon's phone. Like the original (CMobile), it has two
modes: the last text message on its screen (the body picks the
screen1..7 submodel) and a flashlight. It starts with the message;
+attack switches. Taking it out reads the message (UnreadSMS off).
=====================================================================
*/
enum mobile_e
{
	MOBILE_IDLE_SMS = 0, MOBILE_LOOK_SMS = 1, MOBILE_DRAW_SMS = 2, MOBILE_HOLSTER_SMS = 3, MOBILE_SMS_TO_FLASH = 4,
	MOBILE_IDLE_FLASH = 5, MOBILE_LOOK_FLASH = 6, MOBILE_DRAW_FLASH = 7, MOBILE_FLASH_TO_SMS = 8, MOBILE_HOLSTER_FLASH = 9, MOBILE_PUNCH_SMS=10, MOBILE_PUNCH_FLASH=11
};

class CCofMobile : public CCofWeapon
{
public:
	void Spawn( void );
	void Precache( void );
	int GetItemInfo( ItemInfo *p );
	BOOL Deploy( void );
	void Holster( int skiplocal = 0 );
	void PrimaryAttack( void );
 void SecondaryAttack( void );
	void WeaponIdle( void );
	void ItemPostFrame( void );
	void LookAtMessage( void );
 void UpdatePhone();
 int Save(CSave&);int Restore(CRestore&);static TYPEDESCRIPTION m_SaveData[];

	float m_flLightSwitch;  // the flashlight follows the switch animation (FlashToggle of the original)
};

LINK_ENTITY_TO_CLASS( weapon_mobile, CCofMobile )
TYPEDESCRIPTION CCofMobile::m_SaveData[]={DEFINE_FIELD(CCofMobile,m_flLightSwitch,FIELD_TIME)};
int CCofMobile::Save(CSave &save)
{
 if(!CCofWeapon::Save(save))return 0;
 return save.WriteFields("CCofMobile",this,m_SaveData,ARRAYSIZE(m_SaveData));
}
int CCofMobile::Restore(CRestore &restore)
{
 if(!CCofWeapon::Restore(restore))return 0;
 m_flLightSwitch=0;
 // Older port saves contain only the SDK base fields; the optional block rewinds on absence.
 restore.ReadFields("CCofMobile",this,m_SaveData,ARRAYSIZE(m_SaveData));
 return 1;
}

void CCofMobile::Spawn( void )
{
	Precache();
	m_iId = WEAPON_COF_MOBILE;
	SET_MODEL( ENT( pev ), "models/weapons/mobile/w_mobile.mdl" );
	m_iClip = -1;
	FallInit();
}

void CCofMobile::Precache( void )
{
	PRECACHE_MODEL( "models/weapons/mobile/v_mobile.mdl" );
	PRECACHE_MODEL( "models/weapons/mobile/w_mobile.mdl" );
	PRECACHE_SOUND( "weapons/mobile/mobile_sms.wav" );
 PRECACHE_SOUND("weapons/mobile/punch_swing.wav");
 PRECACHE_SOUND("weapons/mobile/punch_smack.wav");
	PRECACHE_SOUND( "phone/phone_vibrate.wav" );
}

int CCofMobile::GetItemInfo( ItemInfo *p )
{
	p->pszName = STRING( pev->classname );
	p->pszAmmo1 = NULL;
	p->iMaxAmmo1 = -1;
	p->pszAmmo2 = NULL;
	p->iMaxAmmo2 = -1;
	p->iMaxClip = WEAPON_NOCLIP;
	p->iSlot = 0;
	p->iPosition = 2;
	p->iId = m_iId = WEAPON_COF_MOBILE;
	p->iWeight = 0;
	p->iFlags = ITEM_FLAG_SELECTONEMPTY | ITEM_FLAG_NOAUTOSWITCHEMPTY;
	return 1;
}

static void CoF_MobileLight( CBasePlayer *pPlayer, BOOL on )
{
	CoF_SetFlashlight( pPlayer, on != 0 );
}

BOOL CCofMobile::Deploy( void )
{
	cof_phone_t *phone = CoF_Phone( m_pPlayer );
	BOOL flash = phone && phone->flash;

	pev->body = phone ? phone->message : 0;
	m_flLightSwitch = 0.0f;
	CoF_MobileLight( m_pPlayer, flash );
	if( !flash && phone )
		CoF_HudPrint( "COF/HUD SMSREAD %d\n", phone->message );
	return DefaultDeploy( "models/weapons/mobile/v_mobile.mdl", "", flash ? MOBILE_DRAW_FLASH : MOBILE_DRAW_SMS, "trip", 0, pev->body );
}

void CCofMobile::Holster( int skiplocal )
{
	cof_phone_t *phone = CoF_Phone( m_pPlayer );

	CoF_MobileLight( m_pPlayer, FALSE );
	m_flLightSwitch = 0.0f;
	m_pPlayer->m_flNextAttack = UTIL_WeaponTimeBase() + 0.5f;
	SendWeaponAnim( phone && phone->flash ? MOBILE_HOLSTER_FLASH : MOBILE_HOLSTER_SMS, 0 );
}

// smstoflash / flashtosms are 30 frames at 30 fps; the light changes partway, as in the original
void CCofMobile::PrimaryAttack( void )
{
	cof_phone_t *phone = CoF_Phone( m_pPlayer );
	if( !phone )
		return;

	phone->flash = !phone->flash;
	Anim( phone->flash ? MOBILE_SMS_TO_FLASH : MOBILE_FLASH_TO_SMS, 1.0f );
	m_flLightSwitch = gpGlobals->time + ( phone->flash ? 0.23f : 0.66f );
	m_flNextPrimaryAttack = m_flNextSecondaryAttack = UTIL_WeaponTimeBase() + 1.0f;
	if( !phone->flash )
		CoF_HudPrint( "COF/HUD SMSREAD %d\n", phone->message );
}

// MeleeHitThinkPunch (native 100e7af0): line, head hull, BSP corner refinement.
extern void FindHullIntersection(const Vector&,TraceResult&,float*,float*,edict_t*);
class CCofPunchHit : public CPointEntity
{
public:
 void Think(); int Save(CSave&);int Restore(CRestore&);static TYPEDESCRIPTION m_SaveData[];
 EHANDLE m_hPlayer;
};
LINK_ENTITY_TO_CLASS(cof_punch_hit,CCofPunchHit)
TYPEDESCRIPTION CCofPunchHit::m_SaveData[]={DEFINE_FIELD(CCofPunchHit,m_hPlayer,FIELD_EHANDLE)};
IMPLEMENT_SAVERESTORE(CCofPunchHit,CPointEntity)
void CCofPunchHit::Think()
{
 CBaseEntity *actor=m_hPlayer;
 if(actor && actor->IsPlayer() && actor->IsAlive()) {
  CBasePlayer *player=(CBasePlayer*)actor;
  UTIL_MakeVectors(player->pev->v_angle);
  Vector start=player->GetGunPosition(),end=start+gpGlobals->v_forward*32;
  TraceResult tr;UTIL_TraceLine(start,end,dont_ignore_monsters,player->edict(),&tr);
  if(tr.flFraction>=1) {
   UTIL_TraceHull(start,end,dont_ignore_monsters,head_hull,player->edict(),&tr);
   if(tr.flFraction<1) {
    CBaseEntity *hit=CBaseEntity::Instance(tr.pHit);
    if(!hit || hit->IsBSPModel()) {
     Vector mins=VEC_DUCK_HULL_MIN,maxs=VEC_DUCK_HULL_MAX;
     FindHullIntersection(start,tr,(float*)&mins,(float*)&maxs,player->edict());
    }
   }
  }
  if(tr.flFraction<1) {
   CBaseEntity *hit=CBaseEntity::Instance(tr.pHit);
   int level=(int)CVAR_GET_FLOAT("skill");if(level<1)level=1;if(level>4)level=4;
   float damage=CVAR_GET_FLOAT(cofPunchSkill[level-1].name);
   ClearMultiDamage();if(hit)hit->TraceAttack(player->pev,damage,gpGlobals->v_forward,&tr,0x04001000);
   ApplyMultiDamage(player->pev,player->pev);
   if(!hit || hit->Classify()==CLASS_NONE || hit->Classify()==CLASS_MACHINE)
    UTIL_ScreenShake(player->pev->origin,2,0.25f,0.15f,2);
   EMIT_SOUND_DYN(player->edict(),CHAN_WEAPON,"weapons/mobile/punch_smack.wav",1,ATTN_NORM,0,100+RANDOM_LONG(-10,10));
   UTIL_ScreenShake(player->pev->origin,1,0.25f,0.1f,2);
   if(cofWeaponDebug.value)ALERT(at_console,"COF/PUNCH impact target=%s id=%d damage=%g hitgroup=%d time=%g\n",hit?STRING(hit->pev->classname):"world",hit?hit->entindex():0,damage,tr.iHitgroup,gpGlobals->time);
  } else if(cofWeaponDebug.value)ALERT(at_console,"COF/PUNCH miss time=%g\n",gpGlobals->time);
 }
 UTIL_Remove(this);
}
static void PhonePunchEvent(CBasePlayer *p);
void CCofMobile::SecondaryAttack()
{
 if(m_flNextPrimaryAttack>0 || m_flNextSecondaryAttack>0 || m_fInReload)return;
 cof_phone_t *phone=CoF_Phone(m_pPlayer);
 PhonePunchEvent(m_pPlayer);
 Anim(phone && phone->flash?MOBILE_PUNCH_FLASH:MOBILE_PUNCH_SMS,1.0f);
 m_flNextPrimaryAttack=m_flNextSecondaryAttack=UTIL_WeaponTimeBase()+1.0f;
 CCofPunchHit *hit=(CCofPunchHit*)CBaseEntity::Create("cof_punch_hit",g_vecZero,g_vecZero,NULL);
 if(hit){hit->m_hPlayer=m_pPlayer;hit->pev->nextthink=gpGlobals->time+0.133f;}
 EMIT_SOUND(m_pPlayer->edict(),CHAN_AUTO,"weapons/mobile/punch_swing.wav",1,ATTN_NORM);
 if(cofWeaponDebug.value)ALERT(at_console,"COF/PUNCH begin seq=%d impact=%g now=%g\n",m_pPlayer->pev->weaponanim,gpGlobals->time+0.133f,gpGlobals->time);
}

// a new message with the phone in the hand: Simon looks at it (sms_looksms / flash_looksms, 53 frames at 35 fps)
void CCofMobile::LookAtMessage( void )
{
	cof_phone_t *phone = CoF_Phone( m_pPlayer );
	if( !phone )
		return;

	pev->body = phone->message;
	Anim( phone->flash ? MOBILE_LOOK_FLASH : MOBILE_LOOK_SMS, 53.0f / 35.0f );
	m_flNextPrimaryAttack = m_flNextSecondaryAttack = UTIL_WeaponTimeBase() + 53.0f / 35.0f;
	CoF_HudPrint( "COF/HUD SMSREAD %d\n", phone->message );
}

void CCofMobile::UpdatePhone()
{
	cof_phone_t *phone = CoF_Phone( m_pPlayer );

	if( phone )
	{
		if( m_flLightSwitch && gpGlobals->time >= m_flLightSwitch )
		{
			CoF_MobileLight( m_pPlayer, phone->flash );
			m_flLightSwitch = 0.0f;
		}
		// the message is on the screen in the hand: read
		phone->unread = FALSE;
	}
}
void CCofMobile::ItemPostFrame(){UpdatePhone();CCofWeapon::ItemPostFrame();}

void CCofMobile::WeaponIdle( void )
{
	cof_phone_t *phone = CoF_Phone( m_pPlayer );

	if( m_flTimeWeaponIdle > UTIL_WeaponTimeBase())
		return;
	if( phone && !phone->flash )
		Anim( MOBILE_IDLE_SMS, 101.0f / 15.0f );
	else
		Anim( MOBILE_IDLE_FLASH, 100.0f / 15.0f );
}

void CoF_MobileNewMessage( CBasePlayer *pPlayer )
{
	if( pPlayer->m_pActiveItem && FClassnameIs( pPlayer->m_pActiveItem->pev, "weapon_mobile" ))
		((CCofMobile *)pPlayer->m_pActiveItem)->LookAtMessage();
}

// Two hands share the existing inventory weapons, ammo and reload state. No duplicate guns.
static int gmsgCoFHands,gmsgCoFPhonePunch;
void CoF_LinkHandsMessages(){if(!gmsgCoFHands)gmsgCoFHands=REG_USER_MSG("CoFHands",12);if(!gmsgCoFPhonePunch)gmsgCoFPhonePunch=REG_USER_MSG("CoFPunch",6);}
static void PhonePunchEvent(CBasePlayer *p){MESSAGE_BEGIN(MSG_ONE,gmsgCoFPhonePunch,NULL,p->pev);WRITE_COORD(1);WRITE_COORD(1);WRITE_COORD(3);MESSAGE_END();}
static float g_handsSend[33];
static int g_handsVisible[33],g_handsSerial[33];
static int DualKind(CBasePlayer *p)
{
 cof_phone_t *s=CoF_Phone(p);if(!s || !s->dual || !p->m_pActiveItem)return 0;
 int selected=s->dualWeapon?s->dualWeapon:WEAPON_COF_SWITCHBLADE;
 const char *name=STRING(p->m_pActiveItem->pev->classname);
 if(selected==WEAPON_COF_SWITCHBLADE && FStrEq(name,"weapon_switchblade"))return 1;
 if(selected==WEAPON_COF_GLOCK && FStrEq(name,"weapon_glock"))return 2;
 return 0;
}
static CBasePlayerItem *FindCarried(CBasePlayer *p,const char *name)
{
 for(int slot=0;slot<MAX_ITEM_TYPES;++slot)
  for(CBasePlayerItem *item=p->m_rgpPlayerItems[slot];item;item=item->m_pNext)
   if(FClassnameIs(item->pev,name))return item;
 return NULL;
}
static CCofMobile *CarriedMobile(CBasePlayer *p)
{
 return (CCofMobile*)FindCarried(p,"weapon_mobile");
}
static void HandAnimation(CBasePlayer *p,int seq)
{
 cof_phone_t *s=CoF_Phone(p);if(!s)return;
 s->dualSequence=seq;s->dualAnimTime=gpGlobals->time;++s->dualSerial;
}
bool CoF_RouteMobileAnimation(CBasePlayer *p,CBaseEntity *weapon,int seq)
{
 if(!p || !weapon || !DualKind(p) || !FClassnameIs(weapon->pev,"weapon_mobile"))return false;
 HandAnimation(p,seq);return true;
}
void CoF_DualCancel(CBasePlayer *p)
{
 cof_phone_t *s=CoF_Phone(p);if(!s)return;
 if(s->dual && !(p->m_pActiveItem && FClassnameIs(p->m_pActiveItem->pev,"weapon_mobile")))CoF_SetFlashlight(p,false);
 s->dual=0;s->dualWeapon=0;
}
bool CoF_DualSelect(CBasePlayer *p,const char *a,const char *b)
{
 const char *weapon=NULL;
 if(FStrEq(a,"weapon_mobile"))weapon=b;else if(FStrEq(b,"weapon_mobile"))weapon=a;
 if(!weapon || (!FStrEq(weapon,"weapon_switchblade") && !FStrEq(weapon,"weapon_glock"))) {
  CoF_CenterPrint("This combination is not available.");return false;
 }
 CCofMobile *mobile=CarriedMobile(p);CBasePlayerItem *right=FindCarried(p,weapon);
 if(!mobile || !right)return false;
 cof_phone_t *s=CoF_Phone(p);if(!s)return false;
 s->dual=1;s->dualWeapon=FStrEq(weapon,"weapon_glock")?WEAPON_COF_GLOCK:WEAPON_COF_SWITCHBLADE;
 if(p->m_pActiveItem!=right)p->SelectItem(weapon);else right->Deploy();
 HandAnimation(p,s->flash?MOBILE_DRAW_FLASH:MOBILE_DRAW_SMS);
 g_handsVisible[p->entindex()]=0; // a user-selected new pair starts both draw animations
 return p->m_pActiveItem==right;
}
bool CoF_DualPostFrame(CBasePlayer *p,CBasePlayerWeapon *weapon)
{
 if(!DualKind(p))return false;
 CCofMobile *mobile=CarriedMobile(p);if(!mobile)return false;
 int buttons=p->pev->button;
 // Both attacks are independent. The right mouse button operates the left phone,
 // never the knife's hand swap or a synthetic second copy of the pistol.
 if((buttons&IN_ATTACK2) && mobile->m_flNextPrimaryAttack<=0 && mobile->m_flNextSecondaryAttack<=0)
  mobile->PrimaryAttack();
 p->pev->button&=~IN_ATTACK2;
 weapon->CBasePlayerWeapon::ItemPostFrame();
 p->pev->button|=buttons&IN_ATTACK2;
 return true;
}
void CoF_DualFrame(CBasePlayer *p)
{
 int index=p->entindex();if(index<1 || index>32)return;
 CoF_LinkHandsMessages();
 cof_phone_t *s=CoF_Phone(p);if(!s)return;
 int kind=DualKind(p);CCofMobile *mobile=CarriedMobile(p);if(!mobile)kind=0;
 if(kind) {
  if(g_handsVisible[index]!=kind)CoF_SetFlashlight(p,s->flash!=0);
  mobile->UpdatePhone();
  float duration=(s->dualSequence==MOBILE_DRAW_SMS||s->dualSequence==MOBILE_DRAW_FLASH)?0.5f:1.0f;
  if(s->dualSequence!=MOBILE_IDLE_SMS && s->dualSequence!=MOBILE_IDLE_FLASH && gpGlobals->time>=s->dualAnimTime+duration)
   HandAnimation(p,s->flash?MOBILE_IDLE_FLASH:MOBILE_IDLE_SMS);
 } else if(g_handsVisible[index] && !(p->m_pActiveItem && FClassnameIs(p->m_pActiveItem->pev,"weapon_mobile")))CoF_SetFlashlight(p,false);
 if(kind!=g_handsVisible[index] || s->dualSerial!=g_handsSerial[index] || gpGlobals->time>=g_handsSend[index] || g_handsSend[index]>gpGlobals->time+2) {
  union {float f;int i;} age;age.f=Q_max(0.0f,gpGlobals->time-s->dualAnimTime);
  MESSAGE_BEGIN(MSG_ONE,gmsgCoFHands,NULL,p->pev);
  WRITE_BYTE(kind!=0);WRITE_BYTE(s->dualSequence);WRITE_BYTE(s->message);WRITE_BYTE(kind);
  WRITE_LONG(age.i);WRITE_LONG(s->dualSerial);MESSAGE_END();
  if(cofWeaponDebug.value)ALERT(at_console,"COF/HANDS active=%d right=%d phoneSeq=%d serial=%d age=%g time=%g\n",kind!=0,kind,s->dualSequence,s->dualSerial,age.f,gpGlobals->time);
  g_handsSend[index]=gpGlobals->time+2;g_handsSerial[index]=s->dualSerial;
 }
 g_handsVisible[index]=kind;
}
void UTIL_PrecacheOtherWeapon( const char *szClassname ); // weapons.cpp, not in a header

// called at the end of hlsdk's W_Precache: every level registers and precaches
// these, because the player carries them from one level to the next
void CoF_PrecacheWeapons( void )
{
	PRECACHE_SOUND("unlockables/nv_on.wav");
	PRECACHE_SOUND("unlockables/nv_off.wav");
	UTIL_PrecacheOtherWeapon( "weapon_switchblade" );
	UTIL_PrecacheOtherWeapon( "weapon_glock" );
	UTIL_PrecacheOtherWeapon( "weapon_syringe" );
	UTIL_PrecacheOtherWeapon( "weapon_mobile" );
	UTIL_PrecacheOtherWeapon( "weapon_camera" );
	UTIL_PrecacheOther( "ammo_glock" );

	// pm_shared.c plays these on the server too (the original's footsteps and bag rustling)
	static const char *steps[] = { "carpet", "concrete", "crawl", "dirt", "glass", "grass", "gravel", "metal",
		"mud", "paper", "sand", "snow", "splash", "wade", "wood" };
	char sample[64];
	for( size_t i = 0; i < ARRAYSIZE( steps ); i++ )
	{
		for( int n = 1; n <= 4; n++ )
		{
			snprintf( sample, sizeof( sample ), "player/footsteps/%s%d.wav", steps[i], n );
			PRECACHE_SOUND( (char *)STRING( ALLOC_STRING( sample )));
		}
	}
	for( int n = 1; n <= 8; n++ )
	{
		snprintf( sample, sizeof( sample ), "player/footsteps/twig_snap%d.wav", n );
		PRECACHE_SOUND( (char *)STRING( ALLOC_STRING( sample )));
	}
	PRECACHE_SOUND( "player/sprint/bag_movement.wav" );
}

/*
=====================================================================
weapon_camera: the photo camera of the prelude. Its flash fires the
camera_spot_trigger in the frame and dazzles the monsters in front.
=====================================================================
*/
enum camera_e { CAMERA_IDLE = 0, CAMERA_DRAW_FIRST = 1, CAMERA_HOLSTER = 2, CAMERA_SHOOT = 3, CAMERA_FIDGET = 4, CAMERA_DRAW = 7 };

class CCofCamera : public CCofWeapon
{
public:
	void Spawn( void );
	void Precache( void );
	int GetItemInfo( ItemInfo *p );
	BOOL Deploy( void ) { return DefaultDeploy( "models/weapons/camera/v_camera.mdl", "", CAMERA_DRAW, "trip" ); }
	void Holster( int skiplocal = 0 ) { m_pPlayer->m_flNextAttack = UTIL_WeaponTimeBase() + 0.5f; SendWeaponAnim( CAMERA_HOLSTER, 0 ); }
	void PrimaryAttack( void );
	void WeaponIdle( void );
};

LINK_ENTITY_TO_CLASS( weapon_camera, CCofCamera )

void CCofCamera::Spawn( void )
{
	Precache();
	m_iId = WEAPON_COF_CAMERA;
	SET_MODEL( ENT( pev ), "models/weapons/camera/w_camera.mdl" );
	m_iClip = -1;
	FallInit();
}

void CCofCamera::Precache( void )
{
	PRECACHE_MODEL( "models/weapons/camera/v_camera.mdl" );
	PRECACHE_MODEL( "models/weapons/camera/w_camera.mdl" );
	PRECACHE_SOUND( "weapons/camera/take_photo.wav" );
	PRECACHE_SOUND( "weapons/camera/flash_charge.wav" );
}

int CCofCamera::GetItemInfo( ItemInfo *p )
{
	p->pszName = STRING( pev->classname );
	p->pszAmmo1 = NULL;
	p->iMaxAmmo1 = -1;
	p->pszAmmo2 = NULL;
	p->iMaxAmmo2 = -1;
	p->iMaxClip = WEAPON_NOCLIP;
	p->iSlot = 0;
	p->iPosition = 3;
	p->iId = m_iId = WEAPON_COF_CAMERA;
	p->iWeight = 0;
	p->iFlags = ITEM_FLAG_SELECTONEMPTY | ITEM_FLAG_NOAUTOSWITCHEMPTY;
	return 1;
}

void CCofCamera::PrimaryAttack( void )
{
	Anim( CAMERA_SHOOT, 40.0f / 30.0f );
	m_flNextPrimaryAttack = UTIL_WeaponTimeBase() + 2.0f; // the flash recharges
	EMIT_SOUND( ENT( m_pPlayer->pev ), CHAN_WEAPON, "weapons/camera/take_photo.wav", 1.0f, ATTN_NORM );

	// the flash: white for an instant on the screen and a light around the player
	UTIL_ScreenFade( m_pPlayer, Vector( 255, 255, 255 ), 0.6f, 0.05f, 200, FFADE_IN );
	Vector eye = m_pPlayer->pev->origin + m_pPlayer->pev->view_ofs;
	MESSAGE_BEGIN( MSG_PVS, SVC_TEMPENTITY, eye );
		WRITE_BYTE( TE_DLIGHT );
		WRITE_COORD( eye.x );
		WRITE_COORD( eye.y );
		WRITE_COORD( eye.z );
		WRITE_BYTE( 40 );       // radius * 10
		WRITE_BYTE( 255 );
		WRITE_BYTE( 255 );
		WRITE_BYTE( 255 );
		WRITE_BYTE( 3 );        // life * 10
		WRITE_BYTE( 60 );       // decay * 10
	MESSAGE_END();

	CoF_CameraFlash( m_pPlayer );
}

void CCofCamera::WeaponIdle( void )
{
	if( m_flTimeWeaponIdle > UTIL_WeaponTimeBase())
		return;
	Anim( RANDOM_LONG( 0, 4 ) ? CAMERA_IDLE : CAMERA_FIDGET, RANDOM_FLOAT( 4, 8 ));
}
