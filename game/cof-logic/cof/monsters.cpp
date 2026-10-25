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
	void SetYawSpeed( void ) { pev->yaw_speed = 120; }
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

	float m_flNextFlinch;
};

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
	const char *const *lists[] = { info->alert, info->attack, info->pain, info->death, info->hit, info->miss };

	PRECACHE_MODEL( (char *)info->model );
	for( size_t l = 0; l < ARRAYSIZE( lists ); l++ )
		for( int i = 0; i < CoF_SoundCount( lists[l] ); i++ )
			PRECACHE_SOUND( (char *)lists[l][i] );
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

	MonsterInit();
}
