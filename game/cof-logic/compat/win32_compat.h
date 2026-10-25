/*
win32_compat.h - subset of the Win32 API on top of POSIX / Emscripten

For game code written against <windows.h> (Sleep, CreateFile, CreateThread, critical sections...).
Only active when _WIN32 is not defined; on Windows it includes <windows.h> instead.

Browser rules this header follows:
- Sleep() never blocks the main browser thread: the frame loop is emscripten_set_main_loop,
  blocking it would freeze the tab. On the main thread it is a no-op, on worker threads it sleeps.
- Paths: '\' becomes '/', and every component is matched case-insensitively, because the
  original game data mixes case freely and MEMFS is case-sensitive.
- Threads only exist when linked with -pthread (needs COOP/COEP, see tools/serve.py).
  Without it CreateThread fails with ERROR_NOT_SUPPORTED instead of running the function inline.

Prefer the engine filesystem (gEngfuncs.COM_LoadFile / g_engfuncs.pfnLoadFileForMe) for game
data: it searches WADs, pk3 and the gamedir hierarchy. The file functions here are for code
that really needs raw files, such as savegame-like data under /rwdir.
*/
#ifndef WIN32_COMPAT_H
#define WIN32_COMPAT_H

#ifdef _WIN32
#include <windows.h>
#else // !_WIN32

#include <dirent.h>
#include <errno.h>
#include <fcntl.h>
#include <limits.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <sys/stat.h>
#include <time.h>
#include <unistd.h>
#include <pthread.h>
#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#include <emscripten/threading.h>
#endif

#ifdef __cplusplus
extern "C" {
#endif

typedef int             BOOL;
typedef unsigned int    DWORD, UINT;
typedef long            LONG;
typedef int64_t         LONGLONG;
typedef void           *HANDLE, *LPVOID;
typedef const char     *LPCSTR;
typedef DWORD          *LPDWORD;
typedef union { struct { DWORD LowPart; LONG HighPart; } u; LONGLONG QuadPart; } LARGE_INTEGER;
typedef DWORD ( *LPTHREAD_START_ROUTINE )( LPVOID );

#ifndef TRUE
#define TRUE  1
#define FALSE 0
#endif
#define WINAPI
#define INFINITE              0xFFFFFFFFu
#define MAX_PATH              260
#define INVALID_HANDLE_VALUE  ((HANDLE)(intptr_t)-1)
#define INVALID_FILE_SIZE     0xFFFFFFFFu
#define INVALID_SET_FILE_POINTER 0xFFFFFFFFu
#define INVALID_FILE_ATTRIBUTES  0xFFFFFFFFu
#define FILE_ATTRIBUTE_DIRECTORY 0x10u
#define FILE_ATTRIBUTE_NORMAL    0x80u

#define GENERIC_READ          0x80000000u
#define GENERIC_WRITE         0x40000000u
#define FILE_SHARE_READ       0x1u
#define FILE_SHARE_WRITE      0x2u
#define CREATE_NEW            1
#define CREATE_ALWAYS         2
#define OPEN_EXISTING         3
#define OPEN_ALWAYS           4
#define TRUNCATE_EXISTING     5
#define FILE_BEGIN            0
#define FILE_CURRENT          1
#define FILE_END              2

#define WAIT_OBJECT_0         0x0u
#define WAIT_TIMEOUT          0x102u
#define WAIT_FAILED           0xFFFFFFFFu

#define ERROR_SUCCESS         0
#define ERROR_FILE_NOT_FOUND  2
#define ERROR_ACCESS_DENIED   5
#define ERROR_INVALID_HANDLE  6
#define ERROR_FILE_EXISTS     80
#define ERROR_NOT_SUPPORTED   50
#define ERROR_ALREADY_EXISTS  183

/*
=====================================================================
errors
=====================================================================
*/
static __thread DWORD win32_last_error;

static inline DWORD GetLastError( void ) { return win32_last_error; }
static inline void SetLastError( DWORD err ) { win32_last_error = err; }

static inline void Win32_SetErrorFromErrno( void )
{
	switch( errno )
	{
	case ENOENT: case ENOTDIR: win32_last_error = ERROR_FILE_NOT_FOUND; break;
	case EACCES: case EPERM:   win32_last_error = ERROR_ACCESS_DENIED; break;
	case EEXIST:               win32_last_error = ERROR_FILE_EXISTS; break;
	case EBADF:                win32_last_error = ERROR_INVALID_HANDLE; break;
	default:                   win32_last_error = (DWORD)errno; break;
	}
}

/*
=====================================================================
time
=====================================================================
*/
static inline double Win32_NowMs( void )
{
#ifdef __EMSCRIPTEN__
	return emscripten_get_now(); // performance.now(), monotonic
#else
	struct timespec ts;
	clock_gettime( CLOCK_MONOTONIC, &ts );
	return ts.tv_sec * 1000.0 + ts.tv_nsec / 1000000.0;
#endif
}

static inline DWORD GetTickCount( void ) { return (DWORD)(uint64_t)Win32_NowMs(); }
static inline uint64_t GetTickCount64( void ) { return (uint64_t)Win32_NowMs(); }

// microsecond ticks, same resolution as QueryPerformanceFrequency reports
static inline BOOL QueryPerformanceFrequency( LARGE_INTEGER *freq )
{
	freq->QuadPart = 1000000;
	return TRUE;
}

static inline BOOL QueryPerformanceCounter( LARGE_INTEGER *count )
{
	count->QuadPart = (LONGLONG)( Win32_NowMs() * 1000.0 );
	return TRUE;
}

static inline void Sleep( DWORD ms )
{
#ifdef __EMSCRIPTEN__
	// blocking the browser thread freezes the page and starves the main loop
	if( emscripten_is_main_browser_thread( ))
		return;
#endif
	usleep( (useconds_t)ms * 1000 );
}

/*
=====================================================================
paths
=====================================================================
*/
// "Maps\C_Cof_Forest1.BSP" -> "maps/c_cof_forest1.bsp" as it exists on disk.
// Returns 1 if the whole path exists. Otherwise out holds the best guess for the missing
// components (useful when creating a file in an existing directory).
static inline int Win32_ResolvePath( const char *in, char *out, size_t size )
{
	char tmp[PATH_MAX];
	char *part, *save = NULL;
	size_t len = 0;
	int exists = 1;
	struct stat st;

	if( !in || size < 2 )
		return 0;

	strncpy( tmp, in, sizeof( tmp ) - 1 );
	tmp[sizeof( tmp ) - 1] = 0;
	for( char *c = tmp; *c; c++ )
		if( *c == '\\' ) *c = '/';

	out[0] = 0;
	if( tmp[0] == '/' )
	{
		out[0] = '/'; out[1] = 0;
		len = 1;
	}

	for( part = strtok_r( tmp, "/", &save ); part; part = strtok_r( NULL, "/", &save ))
	{
		const char *name = part;
		char probe[PATH_MAX];

		if( len + strlen( part ) + 2 >= size )
			return 0;

		snprintf( probe, sizeof( probe ), "%s%s", out, part );
		if( exists && stat( probe, &st ) != 0 )
		{
			DIR *dir = opendir( len ? out : "." );
			struct dirent *de;

			exists = 0;
			while( dir && ( de = readdir( dir )))
			{
				if( !strcasecmp( de->d_name, part ))
				{
					name = de->d_name;
					exists = 1;
					break;
				}
			}
			len += snprintf( out + len, size - len, "%s", name );
			if( dir )
				closedir( dir );
		}
		else
		{
			len += snprintf( out + len, size - len, "%s", name );
		}

		if( save && *save )
			len += snprintf( out + len, size - len, "/" );
	}
	return exists;
}

/*
=====================================================================
files: HANDLE wraps a file descriptor as fd + 1, so 0 is never a valid handle
=====================================================================
*/
#define WIN32_FD_TO_HANDLE( fd ) ((HANDLE)(intptr_t)(( fd ) + 1 ))
#define WIN32_HANDLE_TO_FD( h )  ((int)(intptr_t)( h ) - 1 )

static inline HANDLE CreateFileA( LPCSTR name, DWORD access, DWORD share, LPVOID security,
	DWORD disposition, DWORD flags, HANDLE templ )
{
	char path[PATH_MAX];
	int oflags = 0, fd, existed;
	(void)share; (void)security; (void)flags; (void)templ;

	existed = Win32_ResolvePath( name, path, sizeof( path ));

	if(( access & GENERIC_READ ) && ( access & GENERIC_WRITE )) oflags = O_RDWR;
	else if( access & GENERIC_WRITE ) oflags = O_WRONLY;
	else oflags = O_RDONLY;

	switch( disposition )
	{
	case CREATE_NEW:        oflags |= O_CREAT | O_EXCL; break;
	case CREATE_ALWAYS:     oflags |= O_CREAT | O_TRUNC; break;
	case OPEN_ALWAYS:       oflags |= O_CREAT; break;
	case TRUNCATE_EXISTING: oflags |= O_TRUNC; break;
	case OPEN_EXISTING:
	default: break;
	}

	fd = open( path, oflags, 0644 );
	if( fd < 0 )
	{
		Win32_SetErrorFromErrno();
		return INVALID_HANDLE_VALUE;
	}

	// Win32 reports "already existed" for the overwrite dispositions even on success
	win32_last_error = ( existed && ( disposition == CREATE_ALWAYS || disposition == OPEN_ALWAYS ))
		? ERROR_ALREADY_EXISTS : ERROR_SUCCESS;
	return WIN32_FD_TO_HANDLE( fd );
}
#define CreateFile CreateFileA

static inline BOOL ReadFile( HANDLE h, LPVOID buf, DWORD size, LPDWORD read_bytes, LPVOID overlapped )
{
	ssize_t n;
	(void)overlapped;
	n = read( WIN32_HANDLE_TO_FD( h ), buf, size );
	if( n < 0 )
	{
		Win32_SetErrorFromErrno();
		if( read_bytes ) *read_bytes = 0;
		return FALSE;
	}
	if( read_bytes ) *read_bytes = (DWORD)n;
	return TRUE;
}

static inline BOOL WriteFile( HANDLE h, const void *buf, DWORD size, LPDWORD written, LPVOID overlapped )
{
	ssize_t n;
	(void)overlapped;
	n = write( WIN32_HANDLE_TO_FD( h ), buf, size );
	if( n < 0 )
	{
		Win32_SetErrorFromErrno();
		if( written ) *written = 0;
		return FALSE;
	}
	if( written ) *written = (DWORD)n;
	return TRUE;
}

static inline DWORD SetFilePointer( HANDLE h, LONG distance, LONG *distance_high, DWORD method )
{
	off_t ofs = distance;
	off_t res;
	int whence = method == FILE_END ? SEEK_END : method == FILE_CURRENT ? SEEK_CUR : SEEK_SET;

	if( distance_high )
		ofs = (off_t)(((uint64_t)(uint32_t)*distance_high << 32 ) | (uint32_t)distance );

	res = lseek( WIN32_HANDLE_TO_FD( h ), ofs, whence );
	if( res < 0 )
	{
		Win32_SetErrorFromErrno();
		return INVALID_SET_FILE_POINTER;
	}
	if( distance_high )
		*distance_high = (LONG)((uint64_t)res >> 32 );
	return (DWORD)res;
}

static inline DWORD GetFileSize( HANDLE h, LPDWORD size_high )
{
	struct stat st;
	if( fstat( WIN32_HANDLE_TO_FD( h ), &st ) != 0 )
	{
		Win32_SetErrorFromErrno();
		return INVALID_FILE_SIZE;
	}
	if( size_high ) *size_high = (DWORD)((uint64_t)st.st_size >> 32 );
	return (DWORD)st.st_size;
}

static inline BOOL CloseHandle( HANDLE h )
{
	if( h == INVALID_HANDLE_VALUE || !h )
	{
		win32_last_error = ERROR_INVALID_HANDLE;
		return FALSE;
	}
	return close( WIN32_HANDLE_TO_FD( h )) == 0;
}

static inline DWORD GetFileAttributesA( LPCSTR name )
{
	char path[PATH_MAX];
	struct stat st;
	if( !Win32_ResolvePath( name, path, sizeof( path )) || stat( path, &st ) != 0 )
	{
		win32_last_error = ERROR_FILE_NOT_FOUND;
		return INVALID_FILE_ATTRIBUTES;
	}
	return S_ISDIR( st.st_mode ) ? FILE_ATTRIBUTE_DIRECTORY : FILE_ATTRIBUTE_NORMAL;
}
#define GetFileAttributes GetFileAttributesA

static inline BOOL CreateDirectoryA( LPCSTR name, LPVOID security )
{
	char path[PATH_MAX];
	(void)security;
	if( Win32_ResolvePath( name, path, sizeof( path )))
	{
		win32_last_error = ERROR_ALREADY_EXISTS;
		return FALSE;
	}
	if( mkdir( path, 0755 ) != 0 )
	{
		Win32_SetErrorFromErrno();
		return FALSE;
	}
	return TRUE;
}
#define CreateDirectory CreateDirectoryA

static inline BOOL DeleteFileA( LPCSTR name )
{
	char path[PATH_MAX];
	if( !Win32_ResolvePath( name, path, sizeof( path )) || unlink( path ) != 0 )
	{
		Win32_SetErrorFromErrno();
		return FALSE;
	}
	return TRUE;
}
#define DeleteFile DeleteFileA

/*
=====================================================================
threads and synchronization
=====================================================================
*/
typedef struct { pthread_mutex_t mutex; } CRITICAL_SECTION;

static inline void InitializeCriticalSection( CRITICAL_SECTION *cs )
{
	// Win32 critical sections are recursive
	pthread_mutexattr_t attr;
	pthread_mutexattr_init( &attr );
	pthread_mutexattr_settype( &attr, PTHREAD_MUTEX_RECURSIVE );
	pthread_mutex_init( &cs->mutex, &attr );
	pthread_mutexattr_destroy( &attr );
}
static inline void EnterCriticalSection( CRITICAL_SECTION *cs ) { pthread_mutex_lock( &cs->mutex ); }
static inline BOOL TryEnterCriticalSection( CRITICAL_SECTION *cs ) { return pthread_mutex_trylock( &cs->mutex ) == 0; }
static inline void LeaveCriticalSection( CRITICAL_SECTION *cs ) { pthread_mutex_unlock( &cs->mutex ); }
static inline void DeleteCriticalSection( CRITICAL_SECTION *cs ) { pthread_mutex_destroy( &cs->mutex ); }

static inline LONG InterlockedIncrement( volatile LONG *v ) { return __atomic_add_fetch( v, 1, __ATOMIC_SEQ_CST ); }
static inline LONG InterlockedDecrement( volatile LONG *v ) { return __atomic_sub_fetch( v, 1, __ATOMIC_SEQ_CST ); }
static inline LONG InterlockedExchange( volatile LONG *v, LONG x ) { return __atomic_exchange_n( v, x, __ATOMIC_SEQ_CST ); }
static inline LONG InterlockedCompareExchange( volatile LONG *v, LONG x, LONG cmp )
{
	__atomic_compare_exchange_n( v, &cmp, x, 0, __ATOMIC_SEQ_CST, __ATOMIC_SEQ_CST );
	return cmp; // initial value, as in Win32
}

typedef struct
{
	pthread_t thread;
	LPTHREAD_START_ROUTINE func;
	LPVOID arg;
	DWORD result;
} win32_thread_t;

static inline void *Win32_ThreadTrampoline( void *p )
{
	win32_thread_t *t = (win32_thread_t *)p;
	t->result = t->func( t->arg );
	return NULL;
}

// The returned handle must be released with CloseHandleThread (not CloseHandle, which is for files)
static inline HANDLE CreateThread( LPVOID security, size_t stack, LPTHREAD_START_ROUTINE func,
	LPVOID arg, DWORD flags, LPDWORD id )
{
	(void)security; (void)stack; (void)flags;

#if defined( __EMSCRIPTEN__ ) && !defined( __EMSCRIPTEN_PTHREADS__ )
	// without -pthread pthread_create always fails; say so instead of silently running inline
	(void)func; (void)arg; (void)id;
	win32_last_error = ERROR_NOT_SUPPORTED;
	return NULL;
#else
	win32_thread_t *t = (win32_thread_t *)calloc( 1, sizeof( *t ));
	if( !t )
		return NULL;
	t->func = func;
	t->arg = arg;
	if( pthread_create( &t->thread, NULL, Win32_ThreadTrampoline, t ) != 0 )
	{
		free( t );
		win32_last_error = ERROR_NOT_SUPPORTED;
		return NULL;
	}
	if( id ) *id = (DWORD)(uintptr_t)t;
	return (HANDLE)t;
#endif
}

// Only INFINITE waits on threads are supported; the browser main thread must never wait at all
static inline DWORD WaitForSingleObject( HANDLE h, DWORD ms )
{
	win32_thread_t *t = (win32_thread_t *)h;
	if( !t || ms != INFINITE )
		return WAIT_FAILED;
#ifdef __EMSCRIPTEN__
	if( emscripten_is_main_browser_thread( ))
		return WAIT_FAILED;
#endif
	return pthread_join( t->thread, NULL ) == 0 ? WAIT_OBJECT_0 : WAIT_FAILED;
}

static inline BOOL GetExitCodeThread( HANDLE h, LPDWORD code )
{
	if( !h ) return FALSE;
	*code = ((win32_thread_t *)h)->result;
	return TRUE;
}

static inline BOOL CloseHandleThread( HANDLE h )
{
	free( h );
	return TRUE;
}

#ifdef __cplusplus
}
#endif

#endif // !_WIN32
#endif // WIN32_COMPAT_H
