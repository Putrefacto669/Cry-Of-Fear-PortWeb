from pathlib import Path
p = Path("/root/cof-audits/audit-D3Kl5uly/engine/xash3d-fwgs/ref/gl/gl_rmain.c")
t = p.read_text()
t = t.replace("static int cofSkyAdded; // sky models offered by the client since the last R_ClearScene\n\n", "\n", 1)
t = t.replace("static int cofSkyLastAdded;\nvoid R_ClearScene( void )\n",
              "// Cry of Fear sky models offered by the client: this frame and the last complete one\nstatic int cofSkyAdded, cofSkyLastAdded;\nvoid R_ClearScene( void )\n", 1)
p.write_text(t)
