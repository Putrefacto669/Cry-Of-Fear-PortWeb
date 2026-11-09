"""Studio 4 contract: the corrections after Codex's review of Studio 3, on the real functions of the sources.

Compiles, unchanged, from the given engine tree:
  - engine/common/common.c: the engine's generator (lran1, COM_SetRandomSeed, COM_RandomFloat/Long), shared by the
    renderer and the server;
  - ref/gl/gl_studio.c: R_CofCoronaRandom and R_StudioSetColorArray (the corona_ flicker per emitted vertex) and
    the viewmodel flashlight's offset block;
  - ref/gl/gl_rsurf.c: R_CofSpotTouchesBox (the flashlight's volume against a box).
Checks:
  1. corona_ vertices do not change the server's sequence: with seed 4242 the next COM_RandomLong is the same with
     or without corona draws in between (Codex measured 184442 -> 438565 on Studio 3);
  2. the corona offsets stay in -0.1..+0.1 and vary, the same value on R, G and B;
  3. the viewmodel flashlight origin from Codex's reference case: entity origin (100,200,30), angles (0,45,0)
     -> (94.34314, 187.27208, 30); a pitch shows that it is inverted;
  4. the volume test: a box ahead inside the aperture is accepted, one behind the light, one beyond the far plane
     (700) and one outside the side planes are rejected, and a box 0.5 units ahead is accepted (no near plane).
    python3 studio4_contract.py <engine/xash3d-fwgs> <result.json>
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

engine, output = Path(sys.argv[1]), Path(sys.argv[2])
assert not output.exists()
common = (engine / "engine/common/common.c").read_text()
studio = (engine / "ref/gl/gl_studio.c").read_text()
surf = (engine / "ref/gl/gl_rsurf.c").read_text()


def function(text, declaration):
    start = text.index(declaration)
    opening, depth = text.index("{", start), 0
    for i in range(opening, len(text)):
        depth += (text[i] == "{") - (text[i] == "}")
        if depth == 0:
            return text[start:i + 1]
    raise ValueError(declaration)


rng = common[common.index("static int idum = 0;"):common.index("int GAME_EXPORT COM_RandomLong(")]
rng += function(common, "int GAME_EXPORT COM_RandomLong(")
corona = studio[studio.index("static qboolean g_cof_corona_mesh;"):studio.index("static void R_StudioSetColorArray(")]
corona += function(studio, "static void R_StudioSetColorArray(")
offset = studio[studio.index("if( el->key == COF_SPOT_KEY && viewmodel )\n"):studio.index("for( int b = -1;", studio.index("if( el->key == COF_SPOT_KEY && viewmodel )\n"))]
box = function(surf, "qboolean R_CofSpotTouchesBox(")

source = r"""
#include <math.h>
#include <stdio.h>
#include <time.h>
#define GAME_EXPORT
#define COF_SPOT_KEY 0x7c0f000
#define PITCH 0
#define YAW 1
#define ROLL 2
#define DEG2RAD(a) ((a) * 0.017453292519943295f)
typedef unsigned int uint;
typedef unsigned long dword;
typedef unsigned char byte;
typedef int qboolean;
typedef float vec3_t[3];
#define true 1
#define false 0
#define DotProduct(a,b) ((a)[0]*(b)[0]+(a)[1]*(b)[1]+(a)[2]*(b)[2])
#define VectorCopy(a,b) do {for(int i_=0;i_<3;i_++) (b)[i_]=(a)[i_];}while(0)
#define VectorNegate(a,b) do {for(int i_=0;i_<3;i_++) (b)[i_]=-(a)[i_];}while(0)
#define VectorMA(a,s,b,o) do {for(int i_=0;i_<3;i_++) (o)[i_]=(a)[i_]+(s)*(b)[i_];}while(0)
#define bound(lo,x,hi) fminf(fmaxf((x),(lo)),(hi))
static void AngleVectors(const vec3_t a, vec3_t f, vec3_t r, vec3_t u) {
    float sp=sinf(DEG2RAD(a[0])), cp=cosf(DEG2RAD(a[0])), sy=sinf(DEG2RAD(a[1])), cy=cosf(DEG2RAD(a[1])), sr=sinf(DEG2RAD(a[2])), cr=cosf(DEG2RAD(a[2]));
    f[0]=cp*cy; f[1]=cp*sy; f[2]=-sp;
    r[0]=-sr*sp*cy+cr*sy; r[1]=-sr*sp*sy-cr*cy; r[2]=-sr*cp;
    u[0]=cr*sp*cy+sr*sy; u[1]=cr*sp*sy-sr*cy; u[2]=cr*cp;
}
static struct { vec3_t vforward, vright, vup; } RI = {{1,0,0},{0,-1,0},{0,0,1}};
static struct { vec3_t lightvalues[1]; float lightpos[2]; } g_studio = {{{.5f,.5f,.5f}}, {0,0}};
static struct { float blend; } tr = {1};
static float R_CofSpotFov(void) { return 50.0f; }
static void R_LightLambert(float light, const vec3_t normal, const vec3_t color, byte *out) {
    (void)light; (void)normal; for (int i=0;i<3;i++) out[i]=(byte)(color[i]*255.0f+0.5f);
}
""" + rng + "\n" + corona + "\n" + box + r"""
typedef struct { int key; vec3_t origin; } dlight_t;
typedef struct { vec3_t origin, angles; } cl_entity_t;
static void viewmodel_origin(const cl_entity_t *ent, vec3_t lightorg) {
    dlight_t light = { COF_SPOT_KEY, {0,0,0} }, *el = &light; qboolean viewmodel = true;
    VectorCopy( el->origin, lightorg );
""" + offset + r"""
}
int main(void) {
    COM_SetRandomSeed(4242); int baseline = COM_RandomLong(0, 1000000);
    COM_SetRandomSeed(4242);
    short tri[2] = {0, 0}; vec3_t norms[1] = {{0,0,1}}; byte c1[4], c2[4], c3[4];
    g_cof_corona_mesh = true;
    R_StudioSetColorArray(tri, norms, c1); R_StudioSetColorArray(tri, norms, c2); R_StudioSetColorArray(tri, norms, c3);
    int after = COM_RandomLong(0, 1000000);
    printf("rng|%d|%d\n", baseline, after);
    printf("corona|%d,%d,%d|%d,%d,%d|%d,%d,%d\n", c1[0],c1[1],c1[2], c2[0],c2[1],c2[2], c3[0],c3[1],c3[2]);
    cl_entity_t e = {{100,200,30},{0,45,0}}; vec3_t o; viewmodel_origin(&e, o);
    printf("offset|%.5f,%.5f,%.5f\n", o[0], o[1], o[2]);
    cl_entity_t p = {{0,0,0},{30,0,0}}; viewmodel_origin(&p, o);
    printf("pitch|%.5f,%.5f,%.5f\n", o[0], o[1], o[2]);
    vec3_t apex = {0,0,0};
    #define BOX(name,x0,y0,z0,x1,y1,z1) { vec3_t a={x0,y0,z0}, b={x1,y1,z1}; printf("box|%s|%d\n", name, R_CofSpotTouchesBox(apex, a, b)); }
    BOX("ahead", 100,-5,-5, 110,5,5)
    BOX("behind", -110,-5,-5, -100,5,5)
    BOX("beyond-far", 710,-5,-5, 720,5,5)
    BOX("outside-side", 100,200,-5, 110,210,5)
    BOX("half-unit-ahead", 0.5f,-0.1f,-0.1f, 0.6f,0.1f,0.1f)
    return 0;
}
"""
with tempfile.TemporaryDirectory() as temporary:
    path = Path(temporary)
    (path / "contract.c").write_text(source)
    subprocess.run(["cc", "-std=c99", "-Wall", str(path / "contract.c"), "-lm", "-o", str(path / "contract")], check=True)
    text = subprocess.check_output([str(path / "contract")], text=True)
rows = [line.split("|") for line in text.splitlines()]
result, failed = {"lines": text.splitlines()}, []
rng_row = next(r for r in rows if r[0] == "rng")
if rng_row[1] != rng_row[2]: failed.append(f"server sequence changed by corona draws: {rng_row[1]} -> {rng_row[2]}")
colours = [tuple(map(int, c.split(","))) for c in next(r for r in rows if r[0] == "corona")[1:]]
if any(len(set(c)) != 1 for c in colours): failed.append(f"corona offset differs between channels: {colours}")
if len({c[0] for c in colours}) < 2: failed.append(f"corona offsets do not vary: {colours}")
if any(abs(c[0] - 127.5) > 0.1 * 255 + 1 for c in colours): failed.append(f"corona offset outside -0.1..+0.1: {colours}")
offset_xyz = tuple(map(float, next(r for r in rows if r[0] == "offset")[1].split(",")))
if any(abs(a - b) > 1e-3 for a, b in zip(offset_xyz, (94.34314, 187.27208, 30.0))): failed.append(f"viewmodel offset {offset_xyz}")
pitch_xyz = tuple(map(float, next(r for r in rows if r[0] == "pitch")[1].split(",")))
if not pitch_xyz[2] < 0: failed.append(f"pitch 30 (inverted to -30, looking up) must move the light down: {pitch_xyz}")
boxes = {r[1]: int(r[2]) for r in rows if r[0] == "box"}
expected = {"ahead": 1, "behind": 0, "beyond-far": 0, "outside-side": 0, "half-unit-ahead": 1}
failed += [f"box {k}: {boxes[k]} expected {v}" for k, v in expected.items() if boxes[k] != v]
result["failed"] = failed
output.write_text(json.dumps(result, indent=2))
print(text, end="")
print("FAIL " + "; ".join(failed) if failed else "PASS Studio 4 contract: isolated corona generator, viewmodel offset, spot volume")
sys.exit(1 if failed else 0)
