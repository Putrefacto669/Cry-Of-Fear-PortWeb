// Cry of Fear: per-player state that hlsdk's CBasePlayer does not have
// (stamina/sprint, inventory). player_cof.cpp owns it; hlsdk calls the
// CoF_Player* hooks from player.cpp and client.cpp (patches/hlsdk).

#pragma once

class CBasePlayer;
class CBaseEntity;

#define COF_MAX_ITEMS 6         // bag (3) + pockets (3), like the original inventory
#define COF_ITEM_LEN  64

// hooks called by hlsdk
void CoF_PlayerSpawn( CBasePlayer *pPlayer );     // new game: empty inventory, full stamina
void CoF_PlayerPreThink( CBasePlayer *pPlayer );  // sprint, stamina, HUD status
bool CoF_ClientCommand( CBasePlayer *pPlayer, const char *pcmd ); // true if handled

// inventory: entries are the item definition files (inventoryitems/*.txt)
bool CoF_GiveItem( CBaseEntity *pActivator, const char *def );
bool CoF_HasItem( CBaseEntity *pActivator, const char *mapName );
void CoF_RemoveItem( CBaseEntity *pActivator, const char *mapName );
void CoF_ClearItem( CBaseEntity *pActivator, const char *classname );

// one-line markers for platform/web/hud.js ("COF/HUD ..." on the server console)
void CoF_HudPrint( const char *fmt, ... );
