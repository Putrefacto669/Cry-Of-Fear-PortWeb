// Cry of Fear sky markers. Reconstructed protocol: docs/ENVPOS.md.
#include "extdll.h"
#include "util.h"
#include "cbase.h"
#include "player.h"

static int worldMessage, skyMessage;
void CoF_PrecacheEnvpos()
{
 if(!worldMessage) worldMessage=REG_USER_MSG("skymark_w",-1);
 if(!skyMessage) skyMessage=REG_USER_MSG("skymark_sky",-1);
}

class CCofEnvPos : public CBaseEntity {
public:
 void Spawn() { CoF_PrecacheEnvpos(); pev->solid=SOLID_NOT; pev->movetype=MOVETYPE_NONE; pev->effects|=EF_NODRAW; }
};
LINK_ENTITY_TO_CLASS(envpos_world, CCofEnvPos)
LINK_ENTITY_TO_CLASS(envpos_sky, CCofEnvPos)

void CoF_SendEnvpos(CBasePlayer *player)
{
 CoF_PrecacheEnvpos();
 CBaseEntity *e=NULL;
 while((e=UTIL_FindEntityByClassname(e,"envpos_world"))) {
  if(CVAR_GET_FLOAT("sv_cheats")) ALERT(at_console,"COF/SKY_SEND world id=%d health=%g\n",worldMessage,e->pev->health);
  MESSAGE_BEGIN(MSG_ONE,worldMessage,NULL,player->edict());
  WRITE_COORD(e->pev->origin.x); WRITE_COORD(e->pev->origin.y); WRITE_COORD(e->pev->origin.z);
  WRITE_COORD(e->pev->health); MESSAGE_END();
 }
 e=NULL;
 while((e=UTIL_FindEntityByClassname(e,"envpos_sky"))) {
  if(CVAR_GET_FLOAT("sv_cheats")) ALERT(at_console,"COF/SKY_SEND sky id=%d flags=%d\n",skyMessage,e->pev->spawnflags);
  MESSAGE_BEGIN(MSG_ONE,skyMessage,NULL,player->edict());
  WRITE_COORD(e->pev->origin.x); WRITE_COORD(e->pev->origin.y); WRITE_COORD(e->pev->origin.z);
  WRITE_BYTE(e->pev->spawnflags);
  if(e->pev->spawnflags&1) WRITE_BYTE(e->pev->skin);
  if(e->pev->spawnflags&2) WRITE_BYTE(e->pev->body);
  MESSAGE_END();
 }
}
