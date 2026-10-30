# Temporary VIEWDBG logging in the Xash work tree (apply / revert). Diagnostic only.
import sys
from pathlib import Path

X = Path("/root/cof-audits/audit-D3Kl5uly/engine/xash3d-fwgs")
EDITS = [
    ("engine/server/sv_game.c",
     "\tMSG_BeginServerCmd( &client->netchan.message, svc_setview );\n\tMSG_WriteWord( &client->netchan.message, viewEnt );\n}",
     "\tMSG_BeginServerCmd( &client->netchan.message, svc_setview );\n\tMSG_WriteWord( &client->netchan.message, viewEnt );\n"
     "\tCon_Printf( \"VIEWDBG sv SET_VIEW %d state=%d time=%g map=%s\\n\", viewEnt, client->state, sv.time, sv.name ); // VIEWDBG\n}"),
    ("engine/server/sv_client.c",
     "\t\tMSG_BeginServerCmd( &msg, svc_setview );\n\t\tMSG_WriteWord( &msg, viewEnt );\n\n\t\tMSG_BeginServerCmd( &msg, svc_signonnum );",
     "\t\tMSG_BeginServerCmd( &msg, svc_setview );\n\t\tMSG_WriteWord( &msg, viewEnt );\n"
     "\t\tCon_Printf( \"VIEWDBG sv spawn handshake viewent=%d time=%g map=%s\\n\", viewEnt, sv.time, sv.name ); // VIEWDBG\n\n\t\tMSG_BeginServerCmd( &msg, svc_signonnum );"),
    ("engine/client/parse/cl_parse.c",
     "\tcl.viewentity = bound( 0, cl.viewentity, clgame.maxEntities - 1 );\n}",
     "\tcl.viewentity = bound( 0, cl.viewentity, clgame.maxEntities - 1 );\n"
     "\tCon_Printf( \"VIEWDBG cl svc_setview %d signon=%d map=%s\\n\", cl.viewentity, cls.signon, clgame.mapname ); // VIEWDBG\n}"),
    ("engine/client/parse/cl_parse.c",
     "\t// will be changed later\n\tcl.viewentity = cl.playernum + 1;\n",
     "\t// will be changed later\n\tcl.viewentity = cl.playernum + 1;\n"
     "\tCon_Printf( \"VIEWDBG cl serverdata reset viewentity=%d changelevel=%d\\n\", cl.viewentity, cls.changelevel ); // VIEWDBG\n"),
]

mode = sys.argv[1]
for rel, old, new in EDITS:
    p = X / rel
    t = p.read_text()
    a, b = (old, new) if mode == "apply" else (new, old)
    if b in t and a not in t:
        print(f"{rel}: already {mode}")
        continue
    assert t.count(a) == 1, f"{rel}: expected one match for {mode}"
    p.write_text(t.replace(a, b))
    print(f"{rel}: {mode}")
