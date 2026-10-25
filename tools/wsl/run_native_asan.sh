#!/usr/bin/env bash
# run_native_asan.sh - Carga un mapa N veces en el build nativo con ASan/LSan/UBSan y resume el informe.
#
#   run_native_asan.sh [mapa] [ciclos]          por defecto: c_cof_forest1 3
#
# Requiere build_native_asan.sh y el staging del mapa (tools/stage_map.py). Sin ventana ni audio
# (SDL dummy, renderer nulo). El informe completo queda en ~/cof-web/native-asan/asan-<mapa>.log;
# las supresiones de librerías del sistema están en tools/asan/lsan.supp.
set -uo pipefail

WORK="${COF_WORK:-$HOME/cof-web}"
ROOT="$WORK/native-asan"
STAGE="$WORK/stage"
MAP="${1:-c_cof_forest1}"
CYCLES="${2:-3}"
SUPP="$(cd "$(dirname "$0")/.." && pwd)/asan/lsan.supp"
LOG="$ROOT/asan-$MAP.log"

[ -x "$ROOT/xash3d" ] || { echo "falta $ROOT/xash3d: ejecuta build_native_asan.sh" >&2; exit 2; }
[ -d "$STAGE/maps/$MAP" ] || { echo "falta stage/maps/$MAP: ejecuta tools/stage_map.py" >&2; exit 2; }

# datos: boot + mapa con hardlinks (sin copiar cientos de MB), extras.pk3 de Xash en valve/
rm -rf "$ROOT/cryoffear"
cp -al "$STAGE/boot/cryoffear" "$ROOT/cryoffear"
cp -al "$STAGE/maps/$MAP/cryoffear/." "$ROOT/cryoffear/"
cp -f "$STAGE/boot/valve/extras.pk3" "$ROOT/valve/"

# escenario: cargar el mapa N veces y salir limpiamente (LSan informa en exit())
args=(-game cryoffear -ref null -dll valve/dlls/hl_amd64.so -clientlib valve/cl_dlls/client_amd64.so
      -dev 1 -nosound)
for _ in $(seq "$CYCLES"); do args+=(+map "$MAP" +wait 150); done
args+=(+quit)

cd "$ROOT"
# LSAN_OPTIONS no admite espacios en rutas ("cof web"): se usa una copia local
cp -f "$SUPP" "$ROOT/lsan.supp"
SUPP="$ROOT/lsan.supp"
echo "== $MAP x$CYCLES (ASan + LSan + UBSan)"
LD_LIBRARY_PATH="$ROOT" SDL_VIDEODRIVER=dummy SDL_AUDIODRIVER=dummy \
ASAN_OPTIONS="detect_leaks=1:halt_on_error=1:abort_on_error=0:strict_string_checks=0:detect_stack_use_after_return=1" \
LSAN_OPTIONS="suppressions=$SUPP:print_suppressions=0" \
UBSAN_OPTIONS="print_stacktrace=1:halt_on_error=1" \
timeout 600 ./xash3d "${args[@]}" > "$LOG" 2>&1
status=$?
echo "   salida: $status ($([ $status -eq 124 ] && echo 'timeout' || echo 'terminó'))   informe: $LOG"
loads=$(grep -c "Spawn Server: $MAP" "$LOG")
echo "   cargas del mapa: $loads de $CYCLES"
if [ "$loads" -eq 0 ]; then
    echo "== el mapa no llegó a cargar, final del log:"
    tail -15 "$LOG" | sed 's/^/   /'
    exit 1
fi

# errores de memoria (overflow, use-after-free...) y UB: el primero con su pila
if grep -qE "ERROR: AddressSanitizer|runtime error:" "$LOG"; then
    echo "== errores"
    grep -m3 -E "ERROR: AddressSanitizer|runtime error:" "$LOG" | sed 's/^/   /'
    grep -m1 -A12 -E "ERROR: AddressSanitizer" "$LOG" | grep -E "^\s+#[0-9]" | head -8 | sed 's/^/   /'
fi

# fugas agrupadas por el primer marco que no es del asignador
echo "== fugas"
grep -E "SUMMARY: AddressSanitizer: [0-9]+ byte" "$LOG" | sed 's/^/   /' || echo "   ninguna"
python3 - "$LOG" <<'EOF'
import re, sys, collections
text = open(sys.argv[1], errors="replace").read()
sites = collections.Counter()
for block in re.split(r"\n(?=(?:Direct|Indirect) leak of)", text):
    m = re.match(r"(Direct|Indirect) leak of (\d+) byte", block)
    if not m:
        continue
    # "#2 0x7f.. in CHud::VidInit() ../../game/.../hud.cpp:488": la función puede llevar espacios
    # (operator new(unsigned long)), la ubicación es siempre el último token
    frames = re.findall(r"#\d+ 0x[0-9a-f]+ in (.+) (\S+)$", block, re.M)
    frame = next((f for f in frames
                  if not re.match(r"(malloc|calloc|realloc|strdup|_Mem_Alloc|_Mem_Realloc|Mem_Calloc|_copystring|__interceptor_|operator new)", f[0])),
                 ("?", "?"))
    loc = re.sub(r"^(\.\./)+", "", frame[1])
    sites[(m.group(1), frame[0][:60], loc)] += int(m.group(2))
for (kind, fn, loc), n in sites.most_common(12):
    print(f"   {n:>9} B  {kind:8} {fn}  {loc}")
EOF
exit 0
