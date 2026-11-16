// Cry of Fear: melee enemies of the first chapter.
//
// Their models use the standard Half-Life activities (idle, walk, melee
// attack, flinch, die*) and the same attack events as hlsdk's zombie
// (1 = one slash, 3 = both), so one class drives all of them with the AI of
// CBaseMonster; a table gives each one its model, skill.cfg values and
// sounds. stage_map.py ships the models and sound folders listed here.

#include "extdll.h"
#include "util.h"
#include "cbase.h"
#include "monsters.h"
#include "schedule.h"
#include "game.h"
#include "skill.h"
#include "cof_player.h"
#include "saverestore.h"

#define COF_AE_ATTACK_ONE   1
#define COF_AE_ATTACK_LEFT  2
#define COF_AE_ATTACK_BOTH  3
#define COF_FLINCH_DELAY    2.0f

#define COF_MAX_SOUNDS 4

typedef struct
{
	const char *classname;
	const char *model;
	float health[3];      // easy, medium, difficult (skill.cfg 1..3; nightmare plays as difficult)
	float dmgOne[3];
	float dmgBoth[3];
	float reach;          // melee distance
	Vector hullMin, hullMax;
	int blood;
	const char *alert[COF_MAX_SOUNDS];
	const char *attack[COF_MAX_SOUNDS];
	const char *pain[COF_MAX_SOUNDS];
	const char *death[COF_MAX_SOUNDS];
	const char *hit[COF_MAX_SOUNDS];
	const char *miss[COF_MAX_SOUNDS];
	// optional (0 / empty for the chapter 1 monsters, which keep their earlier behaviour):
	float yawSpeed;       // 0: 120
	const char *wall[COF_MAX_SOUNDS];  // a hit on the world or a machine; empty: the hit list
} cof_monster_info_t;

static const cof_monster_info_t g_cofMonsters[] =
{
	{ // sk_zombie_*: the slower is the zombie of skill.cfg
		"monster_slower", "models/slower.mdl",
		{ 20, 40, 70 }, { 4, 7, 13 }, { 4, 7, 13 }, 70,
		VEC_HUMAN_HULL_MIN, VEC_HUMAN_HULL_MAX, BLOOD_COLOR_RED,
		{ "slower/slower_alert10.wav", "slower/slower_alert20.wav", "slower/slower_alert30.wav" },
		{ "slower/slower_attack1.wav", "slower/slower_attack2.wav" },
		{ "slower/slower_pain1.wav", "slower/slower_pain2.wav" },
		{ "slower/slower_pain2.wav" },
		{ "slower/hammer_strike1.wav", "slower/hammer_strike2.wav", "slower/hammer_strike3.wav" },
		{ "slower/hammer_miss1.wav", "slower/hammer_miss2.wav" },
	},
	{
		"monster_slower3", "models/slower3.mdl",
		{ 20, 40, 70 }, { 5, 7, 10 }, { 5, 7, 10 }, 70,
		VEC_HUMAN_HULL_MIN, VEC_HUMAN_HULL_MAX, BLOOD_COLOR_RED,
		{ "slower3/slower_alert10.wav", "slower3/slower_alert20.wav", "slower3/slower_alert30.wav" },
		{ "slower3/slower_attack1.wav", "slower3/slower_attack2.wav" },
		{ "slower3/slower_pain1.wav", "slower3/slower_pain2.wav" },
		{ "slower3/slower_pain2.wav" },
		{ "slower/hammer_strike1.wav", "slower/hammer_strike2.wav", "slower/hammer_strike3.wav" },
		{ "slower/hammer_miss1.wav", "slower/hammer_miss2.wav" },
	},
	{
		"monster_faster", "models/faster.mdl",
		{ 25, 40, 70 }, { 3, 5, 9 }, { 3, 5, 9 }, 70,
		VEC_HUMAN_HULL_MIN, VEC_HUMAN_HULL_MAX, BLOOD_COLOR_RED,
		{ "faster/faster_alert1.wav", "faster/faster_alert2.wav" },
		{ "faster/faster_attack.wav" },
		{ "faster/faster_pain.wav" },
		{ "faster/faster_death.wav" },
		{ "faster/faster_hit1.wav", "faster/faster_hit2.wav", "faster/faster_hit3.wav", "faster/faster_hit4.wav" },
		{ "faster/faster_miss.wav" },
	},
	{
		"monster_child", "models/children.mdl",
		{ 20, 35, 50 }, { 2, 3, 6 }, { 2, 3, 6 }, 60,
		Vector( -12, -12, 0 ), Vector( 12, 12, 48 ), BLOOD_COLOR_RED,
		{ "children/child_alert10.wav", "children/child_alert20.wav", "children/child_alert30.wav" },
		{ "children/child_attack1.wav", "children/child_attack2.wav" },
		{ "children/child_pain1.wav", "children/child_pain2.wav" },
		{ "children/child_pain2.wav" },
		{ "children/child_slice.wav" },
		{ "children/child_slash.wav" },
	},
	{
		"monster_baby", "models/baby.mdl",
		{ 10, 20, 30 }, { 10, 13, 17 }, { 10, 13, 17 }, 50,
		Vector( -12, -12, 0 ), Vector( 12, 12, 24 ), BLOOD_COLOR_RED,
		{ "baby/b_alert1.wav", "baby/b_alert2.wav", "baby/b_alert3.wav" },
		{ "baby/b_attack1.wav", "baby/b_attack2.wav" },
		{ "baby/b_pain1.wav", "baby/b_pain2.wav" },
		{ "baby/b_death1.wav", "baby/b_death2.wav" },
		{ "baby/b_attack2.wav" },
		{ "baby/b_attack1.wav" },
	},
	{ // sk_rcrazy_*
		"monster_crazybitch", "models/crazywoman.mdl",
		{ 17, 37, 60 }, { 2, 4, 8 }, { 2, 4, 8 }, 65,
		VEC_HUMAN_HULL_MIN, VEC_HUMAN_HULL_MAX, BLOOD_COLOR_RED,
		{ "crazylady/lady_alert10.wav", "crazylady/lady_alert20.wav", "crazylady/lady_alert30.wav" },
		{ "crazylady/lady_attack1.wav", "crazylady/lady_attack2.wav" },
		{ "crazylady/lady_pain1.wav", "crazylady/lady_pain2.wav" },
		{ "crazylady/lady_pain2.wav" },
		{ "crazylady/knife_hitbody1.wav", "crazylady/knife_hitbody2.wav" },
		{ "crazylady/knife_swing.wav" },
	},
	{ // sk_chainsawboss_* (no damage values in skill.cfg)
		"monster_bosschainsaw", "models/chainsawguy.mdl",
		{ 50, 80, 100 }, { 15, 20, 25 }, { 15, 20, 25 }, 80,
		VEC_HUMAN_HULL_MIN, VEC_HUMAN_HULL_MAX, BLOOD_COLOR_RED,
		{ "boss/sawer/sawer_alert10.wav", "boss/sawer/sawer_alert20.wav", "boss/sawer/sawer_alert30.wav" },
		{ "boss/sawer/sawer_attack1.wav", "boss/sawer/sawer_attack2.wav" },
		{ "boss/sawer/sawer_pain1.wav", "boss/sawer/sawer_pain2.wav" },
		{ "boss/sawer/sawer_pain2.wav" },
		{ "boss/sawer/chainsaw_attack.wav" },
		{ "boss/sawer/chainsaw_loop.wav" },
	},
	{ // hl.dll CCrab (vtable 101ac5a0): the crawling slower of chapter 2. Spawn 1002b0e0: slower2.mdl, hull
	  // +-cof_monsterhumanscale (4) by 36 high, view 28, field of view 0.5; Precache 1002afa0; skill.cfg
	  // sk_krypande_* (DAT_10226818..20; skill.cfg has no sk_krypande_dmg_both_slash, so that slash does 0);
	  // HandleAnimEvent 1002aa40: reach 55, strike / strike_wall / miss, attack sound one time in two;
	  // SetYawSpeed 1002b0a0: cof_monsterhumanyawspeed (280). No death sound of its own.
		"monster_crab", "models/slower2.mdl",
		{ 20, 30, 50 }, { 2, 4, 8 }, { 0, 0, 0 }, 55,
		Vector( -4, -4, 0 ), Vector( 4, 4, 36 ), BLOOD_COLOR_RED,
		{ "slower/slower_alert10.wav", "slower/slower_alert20.wav", "slower/slower_alert30.wav" },
		{ "slower/slower_attack1.wav", "slower/slower_attack2.wav" },
		{ "slower/slower_pain1.wav", "slower/slower_pain2.wav" },
		{ NULL },
		{ "slower/hammer_strike1.wav", "slower/hammer_strike2.wav", "slower/hammer_strike3.wav" },
		{ "slower/hammer_miss1.wav", "slower/hammer_miss2.wav" },
		280,
		{ "slower/hammer_strike_wall1.wav", "slower/hammer_strike_wall2.wav", "slower/hammer_strike_wall3.wav" },
	},
	{ // hl.dll CSewmo (vtable 101b3cc4), the sewer monster of chapter 2. Spawn 10059130: sewmo.mdl, hull
	  // +-cof_monsterhumanscale (4) by 72 high; skill.cfg sk_sewmo_* (DAT_10226774..7c); HandleAnimEvent 100587f0:
	  // reach 55, claw_strike on a living target, claw_miss on a miss, nothing on the world (common/null.wav keeps
	  // the port's wall list from falling back to the strike); attack sound one time in two; yaw 280.
	  // Its event 6 / MELEE_ATTACK2 state is never reached (sewmo.mdl has no event 6), so attack1 only, as here.
	  // Not reproduced: the "break free" schedule (10058720: ALERT, hurt to half health, 1 in 2, break_free.wav
	  // and the custom task 94 with "horjavel").
		"monster_sewmo", "models/sewmo.mdl",
		{ 40, 60, 90 }, { 4, 6, 9 }, { 4, 6, 9 }, 55,
		Vector( -4, -4, 0 ), Vector( 4, 4, 72 ), BLOOD_COLOR_RED,
		{ "sewmo/sewmo_alert10.wav", "sewmo/sewmo_alert20.wav", "sewmo/sewmo_alert30.wav" },
		{ "sewmo/sewmo_attack1.wav", "sewmo/sewmo_attack2.wav" },
		{ "sewmo/sewmo_pain1.wav", "sewmo/sewmo_pain2.wav" },
		{ NULL },
		{ "sewmo/claw_strike1.wav", "sewmo/claw_strike2.wav", "sewmo/claw_strike3.wav" },
		{ "sewmo/claw_miss1.wav", "sewmo/claw_miss2.wav" },
		280,
		{ "common/null.wav" },
	},
};

static int CoF_SoundCount( const char *const *list )
{
	int n = 0;
	while( n < COF_MAX_SOUNDS && list[n] )
		n++;
	return n;
}

class CCofMonster : public CBaseMonster
{
public:
	void Spawn( void );
	void Precache( void );
	void SetYawSpeed( void ) { pev->yaw_speed = Info()->yawSpeed ? Info()->yawSpeed : 120; }
	int Classify( void ) { return CLASS_ALIEN_MONSTER; }
	void HandleAnimEvent( MonsterEvent_t *pEvent );
	int IgnoreConditions( void );
	int TakeDamage( entvars_t *pevInflictor, entvars_t *pevAttacker, float flDamage, int bitsDamageType );
	BOOL CheckRangeAttack1( float flDot, float flDist ) { return FALSE; }
	BOOL CheckRangeAttack2( float flDot, float flDist ) { return FALSE; }
	BOOL CheckMeleeAttack1( float flDot, float flDist ) { return flDist <= Info()->reach * 0.9f && flDot >= 0.7f; }
	// Half-Life would burst the corpse into its alien gibs, which Cry of Fear does not have
	BOOL ShouldGibMonster( int iGib ) { return FALSE; }

	void PainSound( void ) { if( RANDOM_LONG( 0, 5 ) < 2 ) Say( Info()->pain ); }
	void AlertSound( void ) { Say( Info()->alert ); }
	void IdleSound( void ) { if( RANDOM_LONG( 0, 2 ) == 0 ) Say( Info()->alert ); }
	void DeathSound( void ) { Say( Info()->death ); }

	const cof_monster_info_t *Info( void );
	void Say( const char *const *list );
	void Slash( float damage, float punchZ, float push );

	// hl.dll CSewmo (spawnflag 32): waits under the water in "appearidle" and rises when a player comes within
	// 128 units (InactiveThink 10058b30: "appear", sewmo/out_water.wav, MonsterInit 0.8 s later in ActivateSewmo
	// 10058600). Driven from Think() with a saved state, so no new think function has to be saved by name.
	void Think( void );
	int Save( CSave &save );
	int Restore( CRestore &restore );
	static TYPEDESCRIPTION m_SaveData[];
	int m_iAppear;  // 0 active, 1 waiting under the water, 2 rising

	float m_flNextFlinch;
};

TYPEDESCRIPTION CCofMonster::m_SaveData[] =
{
	DEFINE_FIELD( CCofMonster, m_iAppear, FIELD_INTEGER ),
};

int CCofMonster::Save( CSave &save )
{
	if( !CBaseMonster::Save( save ))
		return 0;
	return save.WriteFields( "CCofMonster", this, m_SaveData, ARRAYSIZE( m_SaveData ));
}

int CCofMonster::Restore( CRestore &restore )
{
	if( !CBaseMonster::Restore( restore ))
		return 0;
	m_iAppear = 0;
	// saves from before this field have no block: the optional read rewinds on absence
	restore.ReadFields( "CCofMonster", this, m_SaveData, ARRAYSIZE( m_SaveData ));
	return 1;
}

void CCofMonster::Think( void )
{
	if( m_iAppear == 1 )
	{
		StudioFrameAdvance( 0.1f );
		CBaseEntity *pNear = NULL;
		while(( pNear = UTIL_FindEntityInSphere( pNear, pev->origin, 128 )))
		{
			if( pNear->IsPlayer())
			{
				pev->sequence = LookupSequence( "appear" );
				pev->frame = 0;
				ResetSequenceInfo();
				EMIT_SOUND_DYN( ENT( pev ), CHAN_BODY, "sewmo/out_water.wav", 1.0f, 0.8f, 0, 100 + RANDOM_LONG( -5, 5 ));
				m_iAppear = 2;
				pev->nextthink = gpGlobals->time + 0.8f;
				return;
			}
		}
		pev->nextthink = gpGlobals->time + 0.1f;
		return;
	}
	if( m_iAppear == 2 )
	{
		m_iAppear = 0;
		MonsterInit();  // sets MonsterThink and the next think
		return;
	}
	CBaseMonster::Think();
}

const cof_monster_info_t *CCofMonster::Info( void )
{
	for( size_t i = 0; i < ARRAYSIZE( g_cofMonsters ); i++ )
		if( FClassnameIs( pev, g_cofMonsters[i].classname ))
			return &g_cofMonsters[i];
	return &g_cofMonsters[0];
}

LINK_ENTITY_TO_CLASS( monster_slower, CCofMonster )
LINK_ENTITY_TO_CLASS( monster_slower3, CCofMonster )
LINK_ENTITY_TO_CLASS( monster_faster, CCofMonster )
LINK_ENTITY_TO_CLASS( monster_child, CCofMonster )
LINK_ENTITY_TO_CLASS( monster_baby, CCofMonster )
LINK_ENTITY_TO_CLASS( monster_crazybitch, CCofMonster )
LINK_ENTITY_TO_CLASS( monster_bosschainsaw, CCofMonster )
LINK_ENTITY_TO_CLASS( monster_crab, CCofMonster )
LINK_ENTITY_TO_CLASS( monster_sewmo, CCofMonster )

void CCofMonster::Say( const char *const *list )
{
	int n = CoF_SoundCount( list );
	if( n )
		EMIT_SOUND_DYN( ENT( pev ), CHAN_VOICE, list[RANDOM_LONG( 0, n - 1 )], 1.0f, ATTN_NORM, 0, 95 + RANDOM_LONG( 0, 9 ));
}

static int CoF_SkillIndex( void )
{
	int skill = (int)gSkillData.iSkillLevel;
	return skill <= 1 ? 0 : skill == 2 ? 1 : 2;
}

void CCofMonster::Slash( float damage, float punchZ, float push )
{
	const cof_monster_info_t *info = Info();
	CBaseEntity *pHurt = CheckTraceHullAttack( info->reach, damage, DMG_SLASH );
	const char *const *list = pHurt ? info->hit : info->miss;
	// the crab (1002aa40) tells a living target from the world or a machine
	if( pHurt && info->wall[0] && ( pHurt->Classify() == CLASS_NONE || pHurt->Classify() == CLASS_MACHINE ))
		list = info->wall;
	int n = CoF_SoundCount( list );

	if( pHurt && ( pHurt->pev->flags & ( FL_MONSTER | FL_CLIENT )))
	{
		pHurt->pev->punchangle.z = punchZ;
		pHurt->pev->punchangle.x = 5;
		pHurt->pev->velocity = pHurt->pev->velocity + gpGlobals->v_right * push;
	}
	if( n )
		EMIT_SOUND_DYN( ENT( pev ), CHAN_WEAPON, list[RANDOM_LONG( 0, n - 1 )], 1.0f, ATTN_NORM, 0, 100 + RANDOM_LONG( -5, 5 ));
	if( RANDOM_LONG( 0, 1 ))
		Say( info->attack );
}

void CCofMonster::HandleAnimEvent( MonsterEvent_t *pEvent )
{
	const cof_monster_info_t *info = Info();
	int skill = CoF_SkillIndex();

	switch( pEvent->event )
	{
	case COF_AE_ATTACK_ONE:
		Slash( info->dmgOne[skill], -18, -100 );
		break;
	case COF_AE_ATTACK_LEFT:
		Slash( info->dmgOne[skill], 18, 100 );
		break;
	case COF_AE_ATTACK_BOTH:
		Slash( info->dmgBoth[skill], 0, 0 );
		break;
	default:
		CBaseMonster::HandleAnimEvent( pEvent );
		break;
	}
}

int CCofMonster::TakeDamage( entvars_t *pevInflictor, entvars_t *pevAttacker, float flDamage, int bitsDamageType )
{
	if( IsAlive())
		PainSound();
	return CBaseMonster::TakeDamage( pevInflictor, pevAttacker, flDamage, bitsDamageType );
}

int CCofMonster::IgnoreConditions( void )
{
	int iIgnore = CBaseMonster::IgnoreConditions();

	if( m_Activity == ACT_MELEE_ATTACK1 && m_flNextFlinch >= gpGlobals->time )
		iIgnore |= bits_COND_LIGHT_DAMAGE | bits_COND_HEAVY_DAMAGE;

	if(( m_Activity == ACT_SMALL_FLINCH || m_Activity == ACT_BIG_FLINCH ) && m_flNextFlinch < gpGlobals->time )
		m_flNextFlinch = gpGlobals->time + COF_FLINCH_DELAY;

	return iIgnore;
}

void CCofMonster::Precache( void )
{
	const cof_monster_info_t *info = Info();
	const char *const *lists[] = { info->alert, info->attack, info->pain, info->death, info->hit, info->miss, info->wall };

	PRECACHE_MODEL( (char *)info->model );
	for( size_t l = 0; l < ARRAYSIZE( lists ); l++ )
		for( int i = 0; i < CoF_SoundCount( lists[l] ); i++ )
			PRECACHE_SOUND( (char *)lists[l][i] );
	if( FClassnameIs( pev, "monster_sewmo" ))
	{
		// Precache 10058e50 also loads the rising and breaking-free sounds
		PRECACHE_SOUND( "sewmo/out_water.wav" );
		PRECACHE_SOUND( "sewmo/break_free.wav" );
	}
}

void CCofMonster::Spawn( void )
{
	const cof_monster_info_t *info = Info();

	Precache();
	SET_MODEL( ENT( pev ), info->model );
	UTIL_SetSize( pev, info->hullMin, info->hullMax );

	pev->solid = SOLID_SLIDEBOX;
	pev->movetype = MOVETYPE_STEP;
	m_bloodColor = info->blood;
	pev->health = info->health[CoF_SkillIndex()];
	pev->view_ofs = VEC_VIEW;
	m_flFieldOfView = 0.5f;
	m_MonsterState = MONSTERSTATE_NONE;
	m_afCapability = bits_CAP_DOORS_GROUP;

	if( FClassnameIs( pev, "monster_sewmo" ) && FBitSet( pev->spawnflags, 32 ))
	{
		// waits in "appearidle", not yet a monster (no MonsterInit: no AI, not damageable), until a player is near
		pev->sequence = LookupSequence( "appearidle" );
		pev->frame = 0;
		ResetSequenceInfo();
		m_iAppear = 1;
		pev->nextthink = gpGlobals->time + 0.1f;
		return;
	}
	MonsterInit();
}
