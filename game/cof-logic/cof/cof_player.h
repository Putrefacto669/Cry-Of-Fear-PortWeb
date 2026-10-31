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
bool CoF_UseItemOn( CBaseEntity *pPlayer, const char *mapName ); // USE in the bag: keys (doors.cpp)

// the phone's light: kept here and drawn by the client as the original's spotlight
bool CoF_FlashlightIsOn( CBaseEntity *pPlayer );
void CoF_SetFlashlight( CBaseEntity *pPlayer, bool on );
void CoF_SendFlashlight( CBaseEntity *pPlayer, bool on ); // CoFLight message (atmosphere.cpp)

// current objective (hints.txt key), shown in the bag and kept in save games
void CoF_SetObjective( const char *key );

// Simon's phone (trigger_cofmobile, weapon_mobile), kept in save games. The text messages are
// drawn on the model's screen: "message" picks the screen1..7 submodel of v_mobile.mdl.
typedef struct
{
	int message;   // bodynumber of the last trigger_cofmobile
	int unread;    // UnreadSMS of the original: the HUD icon until the phone is taken out
	int flash;     // held as a flashlight instead of showing the message (the original starts with the message)
	int dual;      // dual wielded with the knife: the light stays on in the other hand (CDualWeapon)
} cof_phone_t;

cof_phone_t *CoF_Phone( CBaseEntity *pPlayer );
void CoF_MobileNewMessage( CBasePlayer *pPlayer );  // weapons_cof.cpp: a phone in the hand shows it

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
void CoF_InspectCustomize(CBaseEntity *entity, const char *name);
