// Cry of Fear: client side of env_static_decal (game/cof-logic/cof/static_decal.cpp).
//
// The decals are 24-bit TGAs in gfx/decals where gray 128 means "leave the wall as it is":
// the engine's decal renderer clips them to the surface and draws the gfx/decals textures
// with a 2x modulate blend (patches/xash3d, ref/gl/gl_decals.c). The texture comes from
// the engine's RenderAPI, which the client asks for with HUD_GetRenderInterface.

#include "hud.h"
#include "cl_util.h"
#include "parsemsg.h"
#include "r_efx.h"
#include <stdint.h>
#include <stdio.h>
#include <string.h>

// common/render_api.h of Xash3D FWGS: render_api_t up to GL_LoadTexture, in the same order
#define CL_RENDER_INTERFACE_VERSION 37
#define PARM_TEX_SRC_WIDTH  3
#define PARM_TEX_SRC_HEIGHT 4
#define TF_CLAMP            ( 1 << 11 )

struct cof_render_api_t
{
	intptr_t ( *RenderGetParm )( int parm, int arg );
	void *unused[11]; // GetDetailScaleForTexture ... R_StoreEfrags
	int ( *GL_FindTexture )( const char *name );
	const char *( *GL_TextureName )( unsigned int texnum );
	const unsigned char *( *GL_TextureData )( unsigned int texnum );
	int ( *GL_LoadTexture )( const char *name, const unsigned char *buf, size_t size, int flags );
};

static cof_render_api_t *g_renderApi;

// The engine keeps a pointer to its own render_api_t; render_interface_t (the custom renderer
// callbacks) stays empty, so the engine keeps drawing everything itself.
extern "C" int DLLEXPORT HUD_GetRenderInterface( int version, struct render_api_s *renderfuncs, struct render_interface_s *callback )
{
	if( version != CL_RENDER_INTERFACE_VERSION || !renderfuncs )
		return 0;
	g_renderApi = (cof_render_api_t *)renderfuncs;
	return 1;
}

// protocol.h of the engine
#define FDECAL_PERMANENT 0x01 // not replaced by bullet holes when the decal list is full
#define FDECAL_DONTSAVE  0x20 // the server sends them again after a load or a level change

#define MAX_STATIC_DECALS 256

// the ones already on this level: the server repeats them whenever the HUD is reset
static float g_decalPos[MAX_STATIC_DECALS][3];
static int g_numDecals;

static int __MsgFunc_CoFDecal( const char *pszName, int iSize, void *pbuf )
{
	BEGIN_READ( pbuf, iSize );
	float pos[3];
	pos[0] = READ_COORD();
	pos[1] = READ_COORD();
	pos[2] = READ_COORD();
	int entity = READ_SHORT();
	char name[96];
	snprintf( name, sizeof( name ), "gfx/decals/%s.tga", READ_STRING());
	int width = READ_SHORT();

	for( int i = 0; i < g_numDecals; i++ )
	{
		if( g_decalPos[i][0] == pos[0] && g_decalPos[i][1] == pos[1] && g_decalPos[i][2] == pos[2] )
			return 1;
	}
	if( !g_renderApi || g_numDecals >= MAX_STATIC_DECALS || width <= 0 )
		return 1;

	int texture = g_renderApi->GL_FindTexture( name );
	if( !texture )
		texture = g_renderApi->GL_LoadTexture( name, NULL, 0, TF_CLAMP );
	if( !texture )
	{
		gEngfuncs.Con_DPrintf( "env_static_decal: can't load %s\n", name );
		return 1;
	}

	// decalinfo.txt gives the size in world units; the engine sizes decals by texture pixels
	float scale = (float)g_renderApi->RenderGetParm( PARM_TEX_SRC_WIDTH, texture ) / width;
	gEngfuncs.pEfxAPI->R_FireCustomDecal( texture, entity, 0, pos, FDECAL_PERMANENT | FDECAL_DONTSAVE, scale );

	memcpy( g_decalPos[g_numDecals++], pos, sizeof( pos ));
	return 1;
}

void CoF_DecalsInit( void )
{
	gEngfuncs.pfnHookUserMsg( "CoFDecal", __MsgFunc_CoFDecal );
}

// a new level: the engine has dropped the old decals
void CoF_DecalsVidInit( void )
{
	g_numDecals = 0;
}
