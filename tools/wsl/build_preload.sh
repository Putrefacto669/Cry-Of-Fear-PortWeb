#!/usr/bin/env bash
# build_preload.sh - Variante "todo en uno": motor + lógica + menú + mapas iniciales en xash3d.data
# mediante --preload-file. Todo está montado en /rodir antes de que arranque main().
#
#   build_preload.sh [mapa...]            # por defecto: c_cof_forest1
#
# Requisitos: build_engine.sh, build_game.sh y stage_map.py ya ejecutados (stage/boot, stage/maps/<mapa>).
# Salida: ~/cof-web/dist-preload/ (xash3d.html|js|wasm|data, index.html, loader.js)
#         ~/cof-web/build/engine/engine/link_command.txt  (comando emcc exacto que ejecutó waf)
#
# Frente a package.sh (un .data por mapa, bajo demanda), aquí la primera visita descarga TODO
# antes de mostrar nada. Úsalo para la demo o para un mapa pequeño, no para la campaña completa.
set -euo pipefail

WORK="${COF_WORK:-$HOME/cof-web}"
ENGINE="$WORK/engine/xash3d-fwgs"
B="$WORK/build"
STAGE="$WORK/stage"
DIST="$WORK/dist-preload"
WEB="$(cd "$(dirname "$0")/../.." && pwd)/platform/web"
RODIR="$ENGINE/rodir"
maps=("$@")
[ ${#maps[@]} -eq 0 ] && maps=(c_cof_forest1)

# shellcheck disable=SC1091
source "${EMSDK_DIR:-$HOME/emsdk}/emsdk_env.sh" > /dev/null 2>&1

relink() {
    # waf no ve cambios dentro de rodir/: se borran las salidas del enlace para forzarlo
    rm -f "$B/engine/engine/xash3d."{html,js,wasm,data}
    (cd "$ENGINE" && ./waf build -v -j"$(nproc)" 2>&1) > "$B/engine/link.log"
    grep -q "'build' finished successfully" "$B/engine/link.log" || { tail -20 "$B/engine/link.log"; exit 1; }
}

echo "== rodir: boot + ${maps[*]} + librerías"
rm -rf "$RODIR" && mkdir -p "$RODIR/lib"
cp -al "$STAGE/boot/." "$RODIR/"
for m in "${maps[@]}"; do
    [ -d "$STAGE/maps/$m" ] || { echo "falta stage/maps/$m: ejecuta tools/stage_map.py" >&2; exit 2; }
    cp -al "$STAGE/maps/$m/." "$RODIR/"
done
cp "$B/engine/filesystem/filesystem_stdio.wasm"   "$RODIR/lib/"
cp "$B/engine/ref/gl/libref_gles3compat.wasm"     "$RODIR/lib/"
cp "$B/engine/3rdparty/mainui/libmenu.wasm"       "$RODIR/lib/menu.wasm"
cp "$B/game/cl_dll/client_emscripten_wasm32.wasm" "$RODIR/lib/client.wasm"
cp "$B/game/dlls/hl_emscripten_wasm32.wasm"       "$RODIR/lib/server.wasm"
du -sh "$RODIR" | sed 's/^/   /'

echo "== enlace con --preload-file"
relink
# waf imprime la orden como lista de Python; se guarda como comando de shell ejecutable desde build/engine
grep -m1 -- "--preload-file" "$B/engine/link.log" | python3 -c '
import ast, shlex, sys
line = sys.stdin.read()
print("cd " + shlex.quote(sys.argv[1]) + " && \\\n  " + shlex.join(ast.literal_eval(line[line.index("["):line.rindex("]") + 1])))
' "$B/engine" > "$B/engine/engine/link_command.txt"

rm -rf "$DIST" && mkdir -p "$DIST/packs"
cp "$B/engine/engine/xash3d."{html,js,wasm,data} "$WEB/index.html" "$WEB/loader.js" "$DIST/"
printf '{"preloaded": true, "maps": [%s]}\n' "$(printf '"%s",' "${maps[@]}" | sed 's/,$//')" > "$DIST/packs/maps.json"
find "$DIST" -maxdepth 1 -type f -printf '   %-14f %10s bytes\n' | sort

echo "== restaurando el build normal (rodir vacío, sin precarga)"
rm -rf "$RODIR" && mkdir -p "$RODIR"
relink
echo "dist-preload listo en $DIST"
