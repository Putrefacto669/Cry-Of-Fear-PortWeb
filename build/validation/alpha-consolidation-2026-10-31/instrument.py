from pathlib import Path
p=Path('/root/cof-audits/audit-D3Kl5uly/engine/xash3d-fwgs/ref/gl/gl_rsurf.c')
s=p.read_text()
a='static cvar_t\t*r_cofspot_fov;'
assert s.count(a)==1
s=s.replace(a,a+'''
static cvar_t *r_cofspot_debug;
static struct {
 int frame, channels, clipped;
 double requested, retained, base;
} r_spotstats;

static void R_CofSpotStats( void )
{
 gEngfuncs.Con_Printf( "COF/SPOT enabled=%d frame=%d renderframe=%d channels=%d clipped=%d requested=%g retained=%g base=%g cookie=%dx%d bytes=%d\\n",
  r_cofspot_debug && r_cofspot_debug->value != 0, r_spotstats.frame, tr.framecount,
  r_spotstats.channels, r_spotstats.clipped, r_spotstats.requested, r_spotstats.retained, r_spotstats.base,
  r_spotcookie ? r_spotcookie->width : 0, r_spotcookie ? r_spotcookie->height : 0, r_spotcookie ? r_spotcookie->size : 0 );
}

// Opt-in telemetry only; the composition below keeps its existing arithmetic.
static void R_CofSpotObserve( int base, int addition )
{
 if( !r_cofspot_debug || !r_cofspot_debug->value || addition <= 0 ) return;
 if( r_spotstats.frame != tr.framecount ) {
  memset( &r_spotstats, 0, sizeof( r_spotstats ));
  r_spotstats.frame = tr.framecount;
 }
 r_spotstats.channels++;
 r_spotstats.clipped += base + addition > 255;
 r_spotstats.requested += addition;
 r_spotstats.retained += Q_min( addition, 255 - base );
 r_spotstats.base += base;
}
''')
a='static float R_SpotTan( void )\n{'
assert s.count(a)==1
s=s.replace(a,a+'''
 if( !r_cofspot_debug ) {
  r_cofspot_debug = gEngfuncs.Cvar_Get( "r_cofspot_debug", "0", 0, "Record Cry of Fear spotlight lightmap saturation" );
  gEngfuncs.Cmd_AddCommand( "cof_spot_stats", R_CofSpotStats, "Inspect the last spotlight lightmap composition frame" );
 }
''')
a='\t\t\t\tif( r_spotused )\n\t\t\t\t\tdst[i] = Q_min( 255, dst[i] + (int)( spot[i] * 255.0f + 0.5f ));'
assert s.count(a)==1
s=s.replace(a,'''\t\t\t\tif( r_spotused )
\t\t\t\t{
\t\t\t\t\tint addition = (int)( spot[i] * 255.0f + 0.5f );
\t\t\t\t\tR_CofSpotObserve( dst[i], addition );
\t\t\t\t\tdst[i] = Q_min( 255, dst[i] + addition );
\t\t\t\t}''')
p.write_text(s)
