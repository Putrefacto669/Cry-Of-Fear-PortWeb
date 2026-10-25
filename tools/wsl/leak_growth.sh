#!/usr/bin/env bash
# leak_growth.sh - Fugas que CRECEN con cada carga de mapa (las que importan en una sesión larga).
#
#   leak_growth.sh [mapa] [cargas]        por defecto: c_cof_forest1 5
#
# Ejecuta el build nativo con ASan una vez con 1 carga y otra con N, y resta los informes de LSan
# por punto de asignación. Lo que se asigna una sola vez al arrancar (cachés, VGUI...) se cancela;
# solo queda lo que se pierde en cada carga. Sin líneas = sin fugas acumulativas.
set -uo pipefail

T="$(cd "$(dirname "$0")" && pwd)"
MAP="${1:-c_cof_forest1}"
N="${2:-5}"
LOG="${COF_WORK:-$HOME/cof-web}/native-asan/asan-$MAP.log"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

bash "$T/run_native_asan.sh" "$MAP" 1 > /dev/null || { echo "falló la ejecución con 1 carga" >&2; exit 1; }
cp "$LOG" "$TMP/one.log"
bash "$T/run_native_asan.sh" "$MAP" "$N" > /dev/null || { echo "falló la ejecución con $N cargas" >&2; exit 1; }
cp "$LOG" "$TMP/many.log"

python3 - "$TMP/one.log" "$TMP/many.log" "$N" <<'EOF'
import re, sys, collections
ALLOC = r"(malloc|calloc|realloc|strdup|operator new|_Mem_|Mem_Calloc|_copystring|__interceptor_)"

def sites(path):
    text = open(path, errors="replace").read()
    out = collections.Counter()
    for block in re.split(r"\n(?=(?:Direct|Indirect) leak of)", text):
        m = re.match(r"(Direct|Indirect) leak of (\d+) byte", block)
        if not m:
            continue
        frames = [f for f in re.findall(r"#\d+ 0x[0-9a-f]+ in (.+) (\S+)$", block, re.M) if not re.match(ALLOC, f[0])]
        key = " <- ".join(f"{fn[:40]} {re.sub(r'^(../)+', '', loc)}" for fn, loc in frames[:3])
        out[(m.group(1), key)] += int(m.group(2))
    return out

one, many, n = sites(sys.argv[1]), sites(sys.argv[2]), int(sys.argv[3])
growing = sorted(((many[k] - one[k], k) for k in set(one) | set(many) if many[k] > one[k]), reverse=True)
print(f"== fugas que crecen con las cargas ({sys.argv[3]} cargas frente a 1)")
if not growing:
    print("   ninguna: no hay fugas acumulativas")
for delta, (kind, where) in growing:
    print(f"   {delta / (n - 1):8.0f} B/carga  {kind:8} {where}")
EOF
