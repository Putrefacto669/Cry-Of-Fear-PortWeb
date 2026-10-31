# gl2_shim: draw multi-quad batches with client-side indices on Emscripten (fix), plus an optional
# temporary GL2DBG log of who draws them. usage: shimfix.py apply|revert-log
import sys
from pathlib import Path

p = Path("/root/cof-audits/audit-D3Kl5uly/engine/xash3d-fwgs/ref/gl/gl2_shim/gl2_shim.c")
t = p.read_text()
mode = sys.argv[1]

FIX = [
    ("#define TRIQUADS_SIZE GL2_MAX_VERTS / 4 * 6\n",
     "#define TRIQUADS_SIZE GL2_MAX_VERTS / 4 * 6\n"
     "\n"
     "#if XASH_EMSCRIPTEN\n"
     "// the same 0 1 2 0 2 3... sequence in client memory, for drawing quads from client-side arrays\n"
     "static GLushort gl2wrap_triquads_client[TRIQUADS_SIZE];\n"
     "#endif\n"),
    ("\t\tpglGenBuffersARB( 1, &gl2wrap.triquads_ibo[i] );\n",
     "#if XASH_EMSCRIPTEN\n"
     "\t\tif( i == 0 )\n"
     "\t\t\tmemcpy( gl2wrap_triquads_client, triquads_array, sizeof( triquads_array ));\n"
     "#endif\n"
     "\t\tpglGenBuffersARB( 1, &gl2wrap.triquads_ibo[i] );\n"),
    ("\t\tif( count == 4 )\n\t\t\trpglDrawArrays( GL_TRIANGLE_FAN, startindex, count );\n\t\telse if( pglDrawRangeElementsBaseVertex )\n",
     "\t\tif( count == 4 )\n\t\t\trpglDrawArrays( GL_TRIANGLE_FAN, startindex, count );\n"
     "#if XASH_EMSCRIPTEN\n"
     "\t\telse if( !gl2wrap_config.vao_mandatory )\n"
     "\t\t{\n"
     "\t\t\t// The attributes are client-side arrays here (already offset to this batch). Emscripten's\n"
     "\t\t\t// glDrawRangeElements ignores the range, and with an index buffer bound its glDrawElements\n"
     "\t\t\t// cannot read the indices, so it uploads no vertices at all: WebGL then reads past the end\n"
     "\t\t\t// of a 1-byte buffer (GL_INVALID_OPERATION on D3D11). Indices from client memory let it\n"
     "\t\t\t// count and upload the vertices this draw uses.\n"
     "\t\t\tpglBindBufferARB( GL_ELEMENT_ARRAY_BUFFER_ARB, 0 );\n"
     "\t\t\trpglDrawElements( GL_TRIANGLES, Q_min( count / 4 * 6, TRIQUADS_SIZE ), GL_UNSIGNED_SHORT, gl2wrap_triquads_client );\n"
     "\t\t}\n"
     "#endif\n"
     "\t\telse if( pglDrawRangeElementsBaseVertex )\n"),
]
LOG_OLD = "\tif( gl2wrap.prim == GL_QUADS )\n\t{\n\t\t// simple case, one quad may draw like polygon(4)\n"
LOG_NEW = ("\tif( gl2wrap.prim == GL_QUADS )\n\t{\n"
           "\t\t{ static int dbg; if( count > 4 && dbg < 12 ) { dbg++; gEngfuncs.Con_Printf( \"GL2DBG quads count=%d tex=%s ent=%d model=%s\\n\", count, " # GL2DBG
           "R_GetTexture( glState.currentTexturesIndex[glState.activeTMU] )->name, RI.currententity ? RI.currententity->index : -1, " # GL2DBG
           "RI.currententity && RI.currententity->model ? RI.currententity->model->name : \"-\" ); } } // GL2DBG\n"
           "\t\t// simple case, one quad may draw like polygon(4)\n")

if mode == "apply":
    for old, new in FIX:
        if new in t: continue
        assert t.count(old) == 1, old[:50]
        t = t.replace(old, new)
    if LOG_NEW not in t:
        assert t.count(LOG_OLD) == 1
        t = t.replace(LOG_OLD, LOG_NEW)
elif mode == "revert-log":
    t = t.replace(LOG_NEW, LOG_OLD)
elif mode == "revert-fix":
    for old, new in FIX:
        t = t.replace(new, old)
p.write_text(t)
print(mode, "GL2DBG" in t, "gl2wrap_triquads_client" in t)
