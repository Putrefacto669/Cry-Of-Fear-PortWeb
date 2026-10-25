/*
texcomp.c - convert the textures a GoldSrc BSP uses into BC1/BC3 DDS files for Xash3D's materials/

	texcomp <gamedir> <maps/name.bsp> <outdir>

For every texture of the map (embedded in the BSP or found in the WADs listed by worldspawn):
  - decode the 8-bit paletted mip 0 to RGBA ('{' textures: palette index 255 is transparent)
  - build the full mip chain down to 1x1 with a 2x2 box filter (the WAD only ships 4 levels)
  - compress every level with stb_dxt: BC1 for opaque textures, BC3 when there is alpha
  - write <outdir>/materials/<maps/name.bsp>/<texture>.dds, the path Xash3D checks first
    (Mod_SearchForTextureReplacement) before falling back to the WADs

Water ('!', '*') and sky textures are skipped: the engine needs their source pixels (ripples,
sky clouds), so they keep coming from the WAD.

Prints one summary line: converted/skipped/missing counts, VRAM as RGBA8 vs as DDS, and the WADs
the engine still needs for this map (water/sky textures). Exit code 3 if a texture was not found.
*/
#include <ctype.h>
#include <errno.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <dirent.h>
#include <sys/stat.h>

#define STB_DXT_IMPLEMENTATION
#include "stb_dxt.h"

#define BSP_VERSION     30
#define LUMP_ENTITIES   0
#define LUMP_TEXTURES   2
#define MAX_WADS        32
#define MIPLEVELS       4
#define WAD_TYP_MIPTEX  0x43

typedef struct { int32_t ofs, len; } lump_t;
typedef struct { char name[16]; uint32_t width, height, offsets[MIPLEVELS]; } miptex_t;
typedef struct { int32_t filepos, disksize, size; char type, compression, pad[2]; char name[16]; } wadlump_t;

typedef struct
{
	char      name[64];
	uint8_t  *data;
	size_t    size;
	wadlump_t *lumps;
	int       numlumps;
	int       used; // textures taken from this WAD
} wad_t;

static wad_t wads[MAX_WADS];
static int numwads;

static uint8_t *ReadFile( const char *path, size_t *size )
{
	FILE *f = fopen( path, "rb" );
	uint8_t *buf;
	long len;

	if( !f ) return NULL;
	fseek( f, 0, SEEK_END );
	len = ftell( f );
	fseek( f, 0, SEEK_SET );
	buf = malloc( len ? len : 1 );
	if( buf && fread( buf, 1, len, f ) != (size_t)len )
	{
		free( buf );
		buf = NULL;
	}
	fclose( f );
	if( size ) *size = len;
	return buf;
}

// case-insensitive lookup of a single file in a directory
static int FindFileCI( const char *dir, const char *name, char *out, size_t size )
{
	DIR *d = opendir( dir );
	struct dirent *de;
	int found = 0;

	while( d && ( de = readdir( d )))
	{
		if( !strcasecmp( de->d_name, name ))
		{
			snprintf( out, size, "%s/%s", dir, de->d_name );
			found = 1;
			break;
		}
	}
	if( d ) closedir( d );
	return found;
}

static int MkdirP( const char *path )
{
	char tmp[1024];
	snprintf( tmp, sizeof( tmp ), "%s", path );
	for( char *p = tmp + 1; *p; p++ )
	{
		if( *p != '/' ) continue;
		*p = 0;
		if( mkdir( tmp, 0755 ) && errno != EEXIST ) return -1;
		*p = '/';
	}
	return mkdir( tmp, 0755 ) && errno != EEXIST ? -1 : 0;
}

// worldspawn "wad" key: "\sierra\half-life\valve\halflife.wad;\...\cof_new.wad"
static void LoadWadList( const char *gamedir, const char *entities, int len )
{
	const char *key = NULL;
	char list[4096];

	for( const char *p = entities; p < entities + len - 6; p++ )
	{
		if( !strncmp( p, "\"wad\"", 5 )) { key = p + 5; break; }
		if( *p == '}' ) break; // only worldspawn
	}
	if( !key || !( key = strchr( key, '"' ))) return;
	key++;
	snprintf( list, sizeof( list ), "%.*s", (int)( strchr( key, '"' ) - key ), key );

	for( char *tok = strtok( list, ";" ); tok && numwads < MAX_WADS; tok = strtok( NULL, ";" ))
	{
		const char *base = tok;
		char path[1024];
		wad_t *w = &wads[numwads];

		for( char *c = tok; *c; c++ )
			if( *c == '\\' || *c == '/' ) base = c + 1;
		if( !*base ) continue;

		if( !FindFileCI( gamedir, base, path, sizeof( path )))
		{
			fprintf( stderr, "texcomp: wad %s not found, its textures will be reported missing\n", base );
			continue;
		}
		w->data = ReadFile( path, &w->size );
		if( !w->data || w->size < 12 || memcmp( w->data, "WAD3", 4 ))
		{
			fprintf( stderr, "texcomp: %s is not a WAD3 file\n", path );
			free( w->data );
			continue;
		}
		w->numlumps = *(int32_t *)( w->data + 4 );
		w->lumps = (wadlump_t *)( w->data + *(int32_t *)( w->data + 8 ));
		snprintf( w->name, sizeof( w->name ), "%s", base );
		numwads++;
	}
}

static const miptex_t *FindInWads( const char *name, wad_t **owner )
{
	for( int i = 0; i < numwads; i++ )
	{
		for( int j = 0; j < wads[i].numlumps; j++ )
		{
			const wadlump_t *l = &wads[i].lumps[j];
			if( l->type == WAD_TYP_MIPTEX && l->compression == 0 && !strncasecmp( l->name, name, 16 ))
			{
				*owner = &wads[i];
				return (const miptex_t *)( wads[i].data + l->filepos );
			}
		}
	}
	return NULL;
}

// mip 0 of a miptex (palette follows the 4th mip) to RGBA
static uint8_t *DecodeMiptex( const miptex_t *mt, int *has_alpha )
{
	const uint32_t w = mt->width, h = mt->height;
	const uint8_t *base = (const uint8_t *)mt;
	const uint8_t *pixels = base + mt->offsets[0];
	const uint8_t *palette = base + mt->offsets[3] + ( w / 8 ) * ( h / 8 ) + 2; // skip short count
	const int transparent = mt->name[0] == '{';
	uint8_t *rgba = malloc( w * h * 4 );

	*has_alpha = 0;
	for( uint32_t i = 0; i < w * h; i++ )
	{
		const uint8_t idx = pixels[i];
		if( transparent && idx == 255 )
		{
			memset( rgba + i * 4, 0, 4 );
			*has_alpha = 1;
			continue;
		}
		rgba[i * 4 + 0] = palette[idx * 3 + 0];
		rgba[i * 4 + 1] = palette[idx * 3 + 1];
		rgba[i * 4 + 2] = palette[idx * 3 + 2];
		rgba[i * 4 + 3] = 255;
	}
	return rgba;
}

static uint8_t *Downsample( const uint8_t *src, int w, int h, int *nw, int *nh )
{
	const int ow = w > 1 ? w / 2 : 1, oh = h > 1 ? h / 2 : 1;
	uint8_t *dst = malloc( ow * oh * 4 );

	for( int y = 0; y < oh; y++ )
	{
		for( int x = 0; x < ow; x++ )
		{
			const int x0 = x * 2 < w ? x * 2 : w - 1, x1 = x * 2 + 1 < w ? x * 2 + 1 : w - 1;
			const int y0 = y * 2 < h ? y * 2 : h - 1, y1 = y * 2 + 1 < h ? y * 2 + 1 : h - 1;
			for( int c = 0; c < 4; c++ )
			{
				int sum = src[( y0 * w + x0 ) * 4 + c] + src[( y0 * w + x1 ) * 4 + c]
					+ src[( y1 * w + x0 ) * 4 + c] + src[( y1 * w + x1 ) * 4 + c];
				dst[( y * ow + x ) * 4 + c] = (uint8_t)(( sum + 2 ) / 4 );
			}
		}
	}
	*nw = ow; *nh = oh;
	return dst;
}

// one mip level to BC1/BC3; edge pixels are replicated to fill partial 4x4 blocks
static size_t CompressLevel( FILE *f, const uint8_t *rgba, int w, int h, int alpha )
{
	const int bw = ( w + 3 ) / 4, bh = ( h + 3 ) / 4, block_size = alpha ? 16 : 8;
	uint8_t block[64], out[16];

	for( int by = 0; by < bh; by++ )
	{
		for( int bx = 0; bx < bw; bx++ )
		{
			for( int py = 0; py < 4; py++ )
			{
				for( int px = 0; px < 4; px++ )
				{
					int sx = bx * 4 + px, sy = by * 4 + py;
					if( sx >= w ) sx = w - 1;
					if( sy >= h ) sy = h - 1;
					memcpy( block + ( py * 4 + px ) * 4, rgba + ( sy * w + sx ) * 4, 4 );
				}
			}
			stb_compress_dxt_block( out, block, alpha, STB_DXT_HIGHQUAL );
			fwrite( out, 1, block_size, f );
		}
	}
	return (size_t)bw * bh * block_size;
}

static void WriteDDSHeader( FILE *f, int w, int h, int mips, int alpha )
{
	uint32_t hdr[32] = { 0 };
	memcpy( hdr, "DDS ", 4 );
	hdr[1] = 124;                               // dwSize
	hdr[2] = 0x1 | 0x2 | 0x4 | 0x1000 | 0x20000 | 0x80000; // CAPS|HEIGHT|WIDTH|PIXELFORMAT|MIPMAPCOUNT|LINEARSIZE
	hdr[3] = h;
	hdr[4] = w;
	hdr[5] = (uint32_t)(( w + 3 ) / 4 ) * (( h + 3 ) / 4 ) * ( alpha ? 16 : 8 );
	hdr[7] = mips;
	hdr[19] = 32;                               // ddspf.dwSize
	hdr[20] = 0x4;                              // DDPF_FOURCC
	memcpy( &hdr[21], alpha ? "DXT5" : "DXT1", 4 );
	hdr[27] = 0x1000 | 0x400000 | 0x8;          // TEXTURE|MIPMAP|COMPLEX
	fwrite( hdr, 4, 32, f );
}

int main( int argc, char **argv )
{
	size_t bsp_size;
	uint8_t *bsp;
	const lump_t *lumps;
	const uint8_t *texlump;
	int nummiptex, converted = 0, skipped = 0, missing = 0, embedded = 0;
	double rgba_bytes = 0, dds_bytes = 0;
	char bsp_path[1024], outdir[1024];

	if( argc != 4 )
	{
		fprintf( stderr, "usage: %s <gamedir> <maps/name.bsp> <outdir>\n", argv[0] );
		return 2;
	}

	snprintf( bsp_path, sizeof( bsp_path ), "%s/%s", argv[1], argv[2] );
	if( !( bsp = ReadFile( bsp_path, &bsp_size )) || *(int32_t *)bsp != BSP_VERSION )
	{
		fprintf( stderr, "texcomp: %s is not a v30 BSP\n", bsp_path );
		return 1;
	}

	lumps = (const lump_t *)( bsp + 4 );
	LoadWadList( argv[1], (const char *)bsp + lumps[LUMP_ENTITIES].ofs, lumps[LUMP_ENTITIES].len );

	// the engine looks under materials/<mod->name>/, and mod->name is "maps/name.bsp"
	snprintf( outdir, sizeof( outdir ), "%s/materials/%s", argv[3], argv[2] );
	if( MkdirP( outdir ))
	{
		fprintf( stderr, "texcomp: cannot create %s\n", outdir );
		return 1;
	}

	texlump = bsp + lumps[LUMP_TEXTURES].ofs;
	nummiptex = *(const int32_t *)texlump;

	for( int i = 0; i < nummiptex; i++ )
	{
		const int32_t ofs = ((const int32_t *)( texlump + 4 ))[i];
		const miptex_t *mt, *src;
		wad_t *owner = NULL;
		char name[17], safename[17], path[1200];
		uint8_t *level;
		int w, h, alpha, mips = 1;
		FILE *f;

		if( ofs < 0 ) continue;
		mt = (const miptex_t *)( texlump + ofs );
		snprintf( name, sizeof( name ), "%.16s", mt->name );
		if( !name[0] ) continue;

		if( name[0] == '!' || name[0] == '*' || !strncasecmp( name, "sky", 3 ))
		{
			// still loaded from its WAD by the engine, so that WAD stays needed
			if( !mt->offsets[0] && FindInWads( name, &owner ))
				owner->used++;
			skipped++;
			continue;
		}

		if( mt->offsets[0] ) { src = mt; embedded++; } // stored in the BSP itself
		else if( !( src = FindInWads( name, &owner )))
		{
			fprintf( stderr, "texcomp: %s not found in any wad\n", name );
			missing++;
			continue;
		}

		w = src->width; h = src->height;
		if( !w || !h || w > 4096 || h > 4096 || ( w | h ) & 15 )
		{
			fprintf( stderr, "texcomp: %s has unexpected size %dx%d\n", name, w, h );
			missing++;
			continue;
		}

		// same rename the engine applies before looking up the replacement
		snprintf( safename, sizeof( safename ), "%s", name );
		if( safename[0] == '*' ) safename[0] = '!';
		snprintf( path, sizeof( path ), "%s/%s.dds", outdir, safename );
		if( !( f = fopen( path, "wb" )))
		{
			fprintf( stderr, "texcomp: cannot write %s\n", path );
			return 1;
		}

		for( int lw = w, lh = h; lw > 1 || lh > 1; mips++ )
		{
			lw = lw > 1 ? lw / 2 : 1;
			lh = lh > 1 ? lh / 2 : 1;
		}

		level = DecodeMiptex( src, &alpha );
		WriteDDSHeader( f, w, h, mips, alpha );
		for( int m = 0; m < mips; m++ )
		{
			int nw, nh;
			rgba_bytes += (double)w * h * 4;
			dds_bytes += CompressLevel( f, level, w, h, alpha );
			if( m + 1 < mips )
			{
				uint8_t *next = Downsample( level, w, h, &nw, &nh );
				free( level );
				level = next;
				w = nw; h = nh;
			}
		}
		free( level );
		fclose( f );
		converted++;
	}

	// wads_needed: WADs the engine still reads for this map once the DDS files exist
	printf( "converted=%d skipped=%d missing=%d embedded=%d rgba_mib=%.1f dds_mib=%.1f wads_needed=",
		converted, skipped, missing, embedded, rgba_bytes / 1048576.0, dds_bytes / 1048576.0 );
	for( int i = 0, first = 1; i < numwads; i++ )
	{
		if( !wads[i].used ) continue;
		printf( "%s%s", first ? "" : ",", wads[i].name );
		first = 0;
	}
	printf( "\n" );
	return missing ? 3 : 0;
}
