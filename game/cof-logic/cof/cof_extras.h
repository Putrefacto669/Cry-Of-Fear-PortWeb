// Cry of Fear optional entities and their per-game state. Include after cbase.h.
#pragma once
class CBasePlayer;
struct cof_extra_player_t
{
 int costume;
 int nightOwned;
 int nightState; // original states: 0/1, 100 removing, 101 putting on
 float nightTime;
 EHANDLE nightWeapon;
};
void CoF_RegisterExtras();
void CoF_ExtrasSpawn(CBasePlayer *player);
void CoF_ExtrasFrame(CBasePlayer *player);
bool CoF_ExtrasCommand(CBasePlayer *player, const char *command);
bool CoF_ExtrasBlocksDamage(CBasePlayer *player);
cof_extra_player_t *CoF_ExtrasPlayer(CBaseEntity *player);
cof_extra_player_t &CoF_ExtrasPrimaryState();
void CoF_ExtrasRestored();
