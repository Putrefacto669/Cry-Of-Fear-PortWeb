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
		SendWeaponAnim( sequence, 0 );
		m_flTimeWeaponIdle = UTIL_WeaponTimeBase() + seconds;
	}
};

/*
=====================================================================
weapon_switchblade
=====================================================================
*/
enum switchblade_e
{
	BLADE_IDLE = 0, BLADE_DRAW = 1, BLADE_HOLSTER = 2, BLADE_ATTACK1 = 3,
	BLADE_ATTACK2 = 16, BLADE_ATTACK3 = 17, BLADE_FIDGET1 = 20
};

class CCofSwitchblade : public CCofWeapon
{
public:
	void Spawn( void );
	void Precache( void );
	int GetItemInfo( ItemInfo *p );
	BOOL Deploy( void ) { return DefaultDeploy( "models/weapons/switchblade/v_switchblade.mdl", "", BLADE_DRAW, "crowbar" ); }
	void Holster( int skiplocal = 0 ) { m_pPlayer->m_flNextAttack = UTIL_WeaponTimeBase() + 0.5f; SendWeaponAnim( BLADE_HOLSTER, 0 ); }
	void PrimaryAttack( void );
	void WeaponIdle( void );
};

LINK_ENTITY_TO_CLASS( weapon_switchblade, CCofSwitchblade )

void CCofSwitchblade::Spawn( void )
{
	Precache();
	m_iId = WEAPON_COF_SWITCHBLADE;
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
	static const int swings[] = { BLADE_ATTACK1, BLADE_ATTACK2, BLADE_ATTACK3 };
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
	m_pPlayer->FireBulletsPlayer( 1, vecSrc, gpGlobals->v_forward, Vector( 0.02f, 0.02f, 0.02f ), 8192, BULLET_PLAYER_9MM, 0, 0, m_pPlayer->pev, m_pPlayer->random_seed );

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
		ClientPrint( m_pPlayer->pev, HUD_PRINTCENTER, "I don't need that right now." );
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
weapon_mobile: Simon's phone, held in flashlight mode
=====================================================================
*/
enum mobile_e { MOBILE_IDLE_FLASH = 5, MOBILE_DRAW_FLASH = 7, MOBILE_HOLSTER_FLASH = 9 };

class CCofMobile : public CCofWeapon
{
public:
	void Spawn( void );
	void Precache( void );
	int GetItemInfo( ItemInfo *p );
	BOOL Deploy( void );
	void Holster( int skiplocal = 0 );
	void WeaponIdle( void );
};

LINK_ENTITY_TO_CLASS( weapon_mobile, CCofMobile )

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

BOOL CCofMobile::Deploy( void )
{
	if( !m_pPlayer->FlashlightIsOn())
		m_pPlayer->FlashlightTurnOn();
	return DefaultDeploy( "models/weapons/mobile/v_mobile.mdl", "", MOBILE_DRAW_FLASH, "trip" );
}

void CCofMobile::Holster( int skiplocal )
{
	if( m_pPlayer->FlashlightIsOn())
		m_pPlayer->FlashlightTurnOff();
	m_pPlayer->m_flNextAttack = UTIL_WeaponTimeBase() + 0.5f;
	SendWeaponAnim( MOBILE_HOLSTER_FLASH, 0 );
}

void CCofMobile::WeaponIdle( void )
{
	if( m_flTimeWeaponIdle > UTIL_WeaponTimeBase())
		return;
	Anim( MOBILE_IDLE_FLASH, 100.0f / 15.0f );
}

void UTIL_PrecacheOtherWeapon( const char *szClassname ); // weapons.cpp, not in a header

// called at the end of hlsdk's W_Precache: every level registers and precaches
// these, because the player carries them from one level to the next
void CoF_PrecacheWeapons( void )
{
	UTIL_PrecacheOtherWeapon( "weapon_switchblade" );
	UTIL_PrecacheOtherWeapon( "weapon_glock" );
	UTIL_PrecacheOtherWeapon( "weapon_syringe" );
	UTIL_PrecacheOtherWeapon( "weapon_mobile" );
	UTIL_PrecacheOtherWeapon( "weapon_camera" );
	UTIL_PrecacheOther( "ammo_glock" );
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
