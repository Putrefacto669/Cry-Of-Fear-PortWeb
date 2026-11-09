"""Light selection of Cry of Fear models (client.dll 1005bd90) against the real loop of gl_studio.c.

Compiles the selection loop extracted unchanged from the given gl_studio.c with controlled lights, traces and
cone answers, and checks the original's decisions. Based on Codex's studio_selection_review.py (review of
7d2f04e9649f, 8/11/2026), whose cases documented the candidate's divergences; here every case expects the
original's behaviour:
  - the first 4 qualifying lights in list order (a closer fifth one does not displace them);
  - expired lights, lights without radius and lights beyond their radius are skipped;
  - a world-only point trace that starts in solid or does not reach the light (fraction < 1) rejects it
    (1005bf99 reads pmtrace_t +4, startsolid);
  - a spotlight whose cone does not reach the model's box (10084e40/10084b30) takes no slot;
  - the player's flashlight lights the viewmodel without tests, not the player's model.
    python3 studio_selection_contract.py <gl_studio.c> <result.json>
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

source, output = map(Path, sys.argv[1:])
assert not output.exists()
code = source.read_text()
start = code.index("g_cofmodel.numlights = 0;", code.index("const dlight_t *picked[COF_MODEL_LIGHTS]"))
end = code.index("g_cofmodel.last.lights +=", start)
loop = code[start:end]
fixture = r"""
#include <stdio.h>
#include <string.h>
#define MAX_ELIGHTS 128
#define COF_MODEL_LIGHTS 4
#define COF_SPOT_KEY 0x7c0f000
#define PM_WORLD_ONLY 8
typedef int qboolean;
typedef float vec3_t[3];
typedef struct { float die, radius; int key; vec3_t origin; } dlight_t;
typedef struct { int allsolid, startsolid; float fraction; } pmtrace_t;
static struct { dlight_t elights[MAX_ELIGHTS]; } tr;
static struct { int numlights; struct { int far, hidden, cone; } last; } g_cofmodel;
static struct { float time; } g_studio = { 10 };
static struct { float value; } enabled = { 1 }, *r_dynamic = &enabled;
static pmtrace_t traces[MAX_ELIGHTS];
static int cones[MAX_ELIGHTS], invalid_flags, trace_count;
static pmtrace_t trace(vec3_t start, vec3_t end, int flags) {
    (void)start;
    trace_count++;
    invalid_flags += flags != PM_WORLD_ONLY;
    for (int i=0;i<MAX_ELIGHTS;i++)
        if (end==tr.elights[i].origin) return traces[i];
    return (pmtrace_t){1,1,0};
}
static qboolean R_CofSpotTouchesBox(const float *apex, const float *mins, const float *maxs) {
    (void)mins; (void)maxs;
    for (int i=0;i<MAX_ELIGHTS;i++)
        if (apex==tr.elights[i].origin) return cones[i];
    return 0;
}
static struct { pmtrace_t (*CL_TraceLine)(vec3_t,vec3_t,int); } gEngfuncs = { trace };
#define VectorSubtract(a,b,c) do {for(int i=0;i<3;i++) (c)[i]=(a)[i]-(b)[i];}while(0)
#define DotProduct(a,b) ((a)[0]*(b)[0]+(a)[1]*(b)[1]+(a)[2]*(b)[2])
static void reset(void) {
    memset(&tr,0,sizeof(tr)); memset(&g_cofmodel,0,sizeof(g_cofmodel));
    enabled.value=1; invalid_flags=0; trace_count=0;
    for (int i=0;i<MAX_ELIGHTS;i++) { traces[i]=(pmtrace_t){0,0,1}; cones[i]=1; }
}
static void light(int slot, float distance, float radius, float die, int key) {
    tr.elights[slot]=(dlight_t){die,radius,key,{distance,0,0}};
}
static void run(const char *name, qboolean viewmodel) {
    vec3_t origin={0,0,0}, absmin={0,0,0}, absmax={0,0,0};
    const dlight_t *picked[COF_MODEL_LIGHTS];
    (void)absmin; (void)absmax;
""" + loop + r"""
    printf("%s|%d|%d|%d|%d|%d|",name,g_cofmodel.last.far,g_cofmodel.last.hidden,g_cofmodel.last.cone,trace_count,invalid_flags);
    for(int i=0;i<g_cofmodel.numlights;i++)
        printf("%s%td",i?",":"",picked[i]-tr.elights);
    puts("");
}
int main(void) {
    reset();
    for(int i=0;i<5;i++) light(i,5-i,8,10,i);
    run("first-four-even-when-later-is-closer",0);
    reset();
    light(0,1,4,9,0); light(1,1,0,10,1); light(2,4,4,10,2); light(3,5,4,10,3);
    light(4,1,4,10,4); traces[4].fraction=0.5;
    run("expiry-radius-world-blockage",0);
    reset();
    light(0,1,4,10,0); traces[0].startsolid=1;
    run("startsolid-fraction-one",0);
    reset();
    light(0,20,2,10,COF_SPOT_KEY); cones[0]=0;
    for(int i=1;i<=4;i++) light(i,1,4,10,i);
    run("spot-outside-cone-takes-no-slot",0);
    reset();
    light(0,20,2,10,COF_SPOT_KEY);
    run("spot-inside-cone",0);
    reset();
    light(0,20,2,10,COF_SPOT_KEY); traces[0].allsolid=1; traces[0].startsolid=1; cones[0]=0;
    run("flashlight-on-viewmodel-untested",1);
    run("flashlight-on-other-model-tested",0);
    enabled.value=0;
    run("dynamic-disabled",1);
}
"""
with tempfile.TemporaryDirectory() as temporary:
    path = Path(temporary)
    (path / "fixture.c").write_text(fixture)
    subprocess.run(["cc", "-std=c99", "-Wall", "-Wextra", str(path / "fixture.c"), "-o", str(path / "probe")], check=True)
    text = subprocess.check_output([str(path / "probe")], text=True)
rows = {}
for line in text.splitlines():
    name, far, hidden, cone, traces, flags, slots = line.split("|")
    rows[name] = {"slots": [int(slot) for slot in slots.split(",") if slot], "far": int(far), "hidden": int(hidden),
                  "cone": int(cone), "traces": int(traces), "invalidTraceFlags": int(flags)}
expected = {
    "first-four-even-when-later-is-closer": [0, 1, 2, 3],
    "expiry-radius-world-blockage": [2],
    "startsolid-fraction-one": [],
    "spot-outside-cone-takes-no-slot": [1, 2, 3, 4],
    "spot-inside-cone": [0],
    "flashlight-on-viewmodel-untested": [0],
    "flashlight-on-other-model-tested": [],
    "dynamic-disabled": [],
}
failed = [name for name, slots in expected.items() if rows[name]["slots"] != slots]
failed += [name for name, row in rows.items() if row["invalidTraceFlags"]]
output.write_text(json.dumps({"syntheticTraces": True, "expected": expected, "rows": rows, "failed": failed}, indent=2))
print(text, end="")
print("FAIL " + ", ".join(failed) if failed else "PASS light selection: 8 cases of 1005bd90")
sys.exit(1 if failed else 0)
