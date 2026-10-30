# cof_sky_render_status: also report how many sky models the client offered to the renderer this frame
from pathlib import Path

p = Path("/root/cof-audits/audit-D3Kl5uly/engine/xash3d-fwgs/ref/gl/gl_rmain.c")
t = p.read_text()
edits = [
    ("static qboolean R_CoFSkyConfigured( void );\n\nqboolean R_AddEntity( struct cl_entity_s *clent, int type )\n{\n"
     "\tif( R_CoFSkyEntity(clent) && !R_CoFSkyConfigured() ) return true;\n",
     "static qboolean R_CoFSkyConfigured( void );\n"
     "static int cofSkyAdded; // sky models offered by the client since the last R_ClearScene\n\n"
     "qboolean R_AddEntity( struct cl_entity_s *clent, int type )\n{\n"
     "\tif( R_CoFSkyEntity(clent) && !R_CoFSkyConfigured() ) return true;\n"
     "\tif( R_CoFSkyEntity(clent) ) cofSkyAdded++;\n"),
    (" gEngfuncs.Con_Printf(\"COF/SKY_RENDER active=%d draws=%d polys=%d offset=%g,%g,%g view=%g,%g,%g ambient=%d direct=%d\\n\",\n"
     "  R_CoFSkyActive(),cofSkyDraws,cofSkyPolys,cofSkyOffset[0],cofSkyOffset[1],cofSkyOffset[2],\n"
     "  cofSkyView[0],cofSkyView[1],cofSkyView[2],cofSkyAmbient,cofSkyDirect);",
     " gEngfuncs.Con_Printf(\"COF/SKY_RENDER active=%d draws=%d polys=%d offset=%g,%g,%g view=%g,%g,%g ambient=%d direct=%d added=%d\\n\",\n"
     "  R_CoFSkyActive(),cofSkyDraws,cofSkyPolys,cofSkyOffset[0],cofSkyOffset[1],cofSkyOffset[2],\n"
     "  cofSkyView[0],cofSkyView[1],cofSkyView[2],cofSkyAmbient,cofSkyDirect,cofSkyLastAdded);"),
]
for old, new in edits:
    if new in t:
        continue
    assert t.count(old) == 1, old[:60]
    t = t.replace(old, new)
# keep the count of the last complete frame: R_ClearScene starts a new one
old = "void R_ClearScene( void )\n{\n"
new = "static int cofSkyLastAdded;\nvoid R_ClearScene( void )\n{\n\tcofSkyLastAdded = cofSkyAdded;\n\tcofSkyAdded = 0;\n"
if new not in t:
    assert t.count(old) == 1, "R_ClearScene"
    t = t.replace(old, new)
p.write_text(t)
print("ok")
