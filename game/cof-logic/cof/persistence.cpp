// WebAssembly callbacks use stable semantic names, never table indices in saves.
// This opt-in fallback supplements FIELD_FUNCTION; existing entity-specific
// serializers and the native engine's name lookup keep their original behavior.
#include "extdll.h"
#include "util.h"
#include "cbase.h"
#include "player.h"
#include "weapons.h"
#ifdef __EMSCRIPTEN__
struct CofSavedCallback { const char *name; unsigned bytes[2]; };
static CofSavedCallback savedCallbacks[128];
static unsigned savedCallbackCount;
void CoF_AddSavedCallback(const char *name,const void *value,unsigned size)
{
 if(size!=sizeof(savedCallbacks[0].bytes)){ALERT(at_error,"COF/SAVE unsupported callback ABI\n");return;}
 for(unsigned i=0;i<savedCallbackCount;++i)if(!strcmp(name,savedCallbacks[i].name))return;
 if(savedCallbackCount==128){ALERT(at_error,"COF/SAVE callback registry full\n");return;}
 savedCallbacks[savedCallbackCount].name=name;
 memcpy(savedCallbacks[savedCallbackCount++].bytes,value,size);
}
const char *CoF_SavedCallbackName(const void *value,unsigned size)
{
 if(size!=sizeof(savedCallbacks[0].bytes))return NULL;
 for(unsigned i=0;i<savedCallbackCount;++i)if(!memcmp(value,savedCallbacks[i].bytes,size))return savedCallbacks[i].name;
 return NULL;
}
bool CoF_RestoreSavedCallback(const char *name,void *value,unsigned size)
{
 if(size!=sizeof(savedCallbacks[0].bytes))return false;
 for(unsigned i=0;i<savedCallbackCount;++i)if(!strcmp(name,savedCallbacks[i].name)){memcpy(value,savedCallbacks[i].bytes,size);return true;}
 ALERT(at_error,"COF/SAVE unknown callback name %s\n",name);
 return false;
}
extern void CoF_RegisterMakerCallbacks(void);
extern void CoF_RegisterSparkCallbacks(void);
extern void CoF_RegisterFogCallbacks(void);
extern void CoF_RegisterDynLightCallbacks(void);
extern void CoF_RegisterTeleportCallbacks(void);
extern void CoF_RegisterZoomCallbacks(void);
void CoF_RegisterPersistenceCallbacks(void)
{
 // Explicit initialization before either a new map or a cold save restoration.
 // Runtime observation of SetThink is diagnostic only and cannot resolve saves.
 if(savedCallbackCount)return;
 COF_SAVE_THINK(CBaseEntity,SUB_Remove);
 COF_SAVE_THINK(CBaseEntity,SUB_DoNothing);
 COF_SAVE_THINK(CBaseEntity,SUB_StartFadeOut);
 COF_SAVE_THINK(CBaseEntity,SUB_FadeOut);
 COF_SAVE_THINK(CBaseEntity,SUB_CallUseToggle);
 COF_SAVE_THINK(CBaseMonster,MonsterInitThink);
 COF_SAVE_THINK(CBaseMonster,CallMonsterThink);
 COF_SAVE_THINK(CBaseMonster,CorpseFallThink);
 COF_SAVE_USE(CBaseMonster,MonsterUse);
 COF_SAVE_TOUCH(CBasePlayerAmmo,DefaultTouch);
 COF_SAVE_THINK(CBasePlayerAmmo,Materialize);
 COF_SAVE_TOUCH(CBasePlayerItem,DefaultTouch);
 COF_SAVE_THINK(CBasePlayerItem,FallThink);
 COF_SAVE_THINK(CBasePlayerItem,Materialize);
 COF_SAVE_THINK(CBasePlayerItem,AttemptToMaterialize);
 COF_SAVE_THINK(CBasePlayerItem,DestroyItem);
 CoF_RegisterMakerCallbacks();CoF_RegisterSparkCallbacks();CoF_RegisterFogCallbacks();
 CoF_RegisterDynLightCallbacks();CoF_RegisterTeleportCallbacks();CoF_RegisterZoomCallbacks();
}
#endif
