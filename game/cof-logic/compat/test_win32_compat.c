// test_win32_compat.c - checks for win32_compat.h, see tools/wsl/test_compat.sh
#include <stdio.h>
#include "win32_compat.h"

static int failures;
#define CHECK( cond ) do { if( !( cond )) { printf( "FAIL %s:%d: %s\n", __FILE__, __LINE__, #cond ); failures++; } } while( 0 )

static volatile LONG counter;
static CRITICAL_SECTION cs;

static DWORD WINAPI Worker( LPVOID arg )
{
	for( int i = 0; i < 1000; i++ )
	{
		EnterCriticalSection( &cs );
		EnterCriticalSection( &cs ); // recursive, like Win32
		InterlockedIncrement( &counter );
		LeaveCriticalSection( &cs );
		LeaveCriticalSection( &cs );
	}
	Sleep( 5 );
	return (DWORD)(intptr_t)arg;
}

static void TestFiles( void )
{
	DWORD n = 0, high = 0;
	char buf[32] = { 0 };
	HANDLE h;

	// leftovers from an interrupted native run
	unlink( "/tmp/compat/Maps/Forest.BSP" );
	rmdir( "/tmp/compat/Maps" );
	mkdir( "/tmp/compat", 0755 );
	CHECK( CreateDirectory( "\\tmp\\compat\\Maps", NULL ));
	CHECK( !CreateDirectory( "/tmp/compat/maps", NULL ) && GetLastError() == ERROR_ALREADY_EXISTS );

	// write through one spelling, read back through another
	h = CreateFile( "/tmp/compat/MAPS/Forest.BSP", GENERIC_WRITE, 0, NULL, CREATE_ALWAYS, 0, NULL );
	CHECK( h != INVALID_HANDLE_VALUE );
	CHECK( WriteFile( h, "IBSP-data", 9, &n, NULL ) && n == 9 );
	CHECK( CloseHandle( h ));

	h = CreateFile( "\\tmp\\compat\\maps\\forest.bsp", GENERIC_READ, FILE_SHARE_READ, NULL, OPEN_EXISTING, 0, NULL );
	CHECK( h != INVALID_HANDLE_VALUE );
	CHECK( GetFileSize( h, &high ) == 9 && high == 0 );
	CHECK( SetFilePointer( h, 5, NULL, FILE_BEGIN ) == 5 );
	CHECK( ReadFile( h, buf, sizeof( buf ), &n, NULL ) && n == 4 && !memcmp( buf, "data", 4 ));
	CHECK( CloseHandle( h ));

	CHECK( GetFileAttributes( "/TMP/compat/maps" ) == FILE_ATTRIBUTE_DIRECTORY );
	CHECK( GetFileAttributes( "/tmp/compat/maps/FOREST.bsp" ) == FILE_ATTRIBUTE_NORMAL );
	CHECK( CreateFile( "/tmp/compat/maps/missing.bsp", GENERIC_READ, 0, NULL, OPEN_EXISTING, 0, NULL ) == INVALID_HANDLE_VALUE );
	CHECK( GetLastError() == ERROR_FILE_NOT_FOUND );
	CHECK( CreateFile( "/tmp/compat/maps/forest.bsp", GENERIC_WRITE, 0, NULL, CREATE_NEW, 0, NULL ) == INVALID_HANDLE_VALUE );
	CHECK( GetLastError() == ERROR_FILE_EXISTS );
	CHECK( DeleteFile( "/tmp/compat/Maps/Forest.bsp" ));
	CHECK( GetFileAttributes( "/tmp/compat/maps/forest.bsp" ) == INVALID_FILE_ATTRIBUTES );
	rmdir( "/tmp/compat/Maps" );
	rmdir( "/tmp/compat" );
}

static void TestTime( void )
{
	LARGE_INTEGER f, a, b;
	DWORD t0 = GetTickCount();

	CHECK( QueryPerformanceFrequency( &f ) && f.QuadPart == 1000000 );
	QueryPerformanceCounter( &a );
	QueryPerformanceCounter( &b );
	CHECK( b.QuadPart >= a.QuadPart );
	CHECK( GetTickCount() - t0 < 1000 );
}

static void TestThreads( void )
{
	HANDLE th[4];

	InitializeCriticalSection( &cs );
	counter = 0;

	for( int i = 0; i < 4; i++ )
		th[i] = CreateThread( NULL, 0, Worker, (LPVOID)(intptr_t)( i + 10 ), 0, NULL );

#if defined( __EMSCRIPTEN__ ) && !defined( __EMSCRIPTEN_PTHREADS__ )
	CHECK( th[0] == NULL && GetLastError() == ERROR_NOT_SUPPORTED );
	printf( "threads: not linked with -pthread, CreateThread correctly reports ERROR_NOT_SUPPORTED\n" );
#elif defined( TEST_MAIN_THREAD_WAIT )
	// the browser thread must refuse to block, the threads finish on their own
	CHECK( WaitForSingleObject( th[0], INFINITE ) == WAIT_FAILED );
	printf( "threads: waiting from the browser main thread refused without blocking\n" );
#else
	DWORD code;
	for( int i = 0; i < 4; i++ )
	{
		CHECK( th[i] != NULL );
		CHECK( WaitForSingleObject( th[i], INFINITE ) == WAIT_OBJECT_0 );
		CHECK( GetExitCodeThread( th[i], &code ) && code == (DWORD)( i + 10 ));
		CloseHandleThread( th[i] );
	}
	CHECK( counter == 4000 );
	printf( "threads: 4 workers, counter=%d\n", (int)counter );
#endif
	DeleteCriticalSection( &cs );

	volatile LONG v = 5;
	CHECK( InterlockedCompareExchange( &v, 9, 5 ) == 5 && v == 9 );
	CHECK( InterlockedCompareExchange( &v, 1, 5 ) == 9 && v == 9 );
	CHECK( InterlockedExchange( &v, 3 ) == 9 && v == 3 );
}

int main( void )
{
	TestFiles();
	TestTime();
	TestThreads();
	printf( failures ? "%d FAILED\n" : "all checks passed\n", failures );
	return failures != 0;
}
