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
bool CoF_AddBagEntry( CBaseEntity *pActivator, const char *def ); // without giving the weapon
bool CoF_HasItem( CBaseEntity *pActivator, const char *mapName );
void CoF_RemoveItem( CBaseEntity *pActivator, const char *mapName );
void CoF_ClearItem( CBaseEntity *pActivator, const char *classname );

// current objective (hints.txt key), shown in the bag and kept in save games
void CoF_SetObjective( const char *key );

// puzzles.cpp: computer password and keypad code, drawn for each new game
void CoF_PuzzlesNewGame( void );
int CoF_GetPuzzleState( char *code, int size );
void CoF_SetPuzzleState( int password, const char *code );
bool CoF_PuzzleCommand( CBasePlayer *pPlayer, const char *pcmd );

// puzzles.cpp: the camera flash fires the camera_spot_trigger in the frame
void CoF_CameraFlash( CBasePlayer *pPlayer );

// weapons_cof.cpp, called from hlsdk's W_Precache
void CoF_PrecacheWeapons( void );

// a message in the middle of the screen; hud.js shows it (translated when it can)
void CoF_CenterPrint( const char *text );

// one-line markers for platform/web/hud.js ("COF/HUD ..." on the server console)
void CoF_HudPrint( const char *fmt, ... );

const char *CoF_PadlockCode();
void CoF_SetPadlockCode(const char *code);
bool CoF_PadlockCommand(CBasePlayer *,const char *);
void CoF_PadlockSync(CBasePlayer *);

void CoF_InspectChangeLevel(const char *name);

void CoF_InspectInterDoor(const char *name);
