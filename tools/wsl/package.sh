#!/usr/bin/env bash
# package.sh - Ensambla dist/: motor, SIDE_MODULEs y paquetes de datos (.data + .js) con file_packager.
#
#   package.sh [mapa...]      # por defecto empaqueta los mapas que haya en stage/maps/
#
# Paquetes:
#   packs/engine  -> /lib     filesystem_stdio, renderer WebGL 2, menú, client y server del juego
#   packs/boot    -> /rodir   datos comunes (stage/boot, generado por tools/stage_map.py)
#   packs/<mapa>  -> /rodir   dependencias exclusivas de cada mapa
# --use-preload-cache guarda cada paquete en IndexedDB: la segunda visita no vuelve a descargarlo.
set -euo pipefail

WORK="${COF_WORK:-$HOME/cof-web}"
B="$WORK/build"
STAGE="$WORK/stage"
DIST="$WORK/dist"
WEB="$(cd "$(dirname "$0")/../.." && pwd)/platform/web"

# shellcheck disable=SC1091
source "${EMSDK_DIR:-$HOME/emsdk}/emsdk_env.sh" > /dev/null 2>&1
PACKAGER="$EMSDK/upstream/emscripten/tools/file_packager"

mkdir -p "$DIST/packs" "$STAGE/lib"
# xash3d.html es la página por defecto de emcc (sin paquetes ni argumentos); index.html es la buena
cp "$B/engine/engine/xash3d.html" "$B/engine/engine/xash3d.js" "$B/engine/engine/xash3d.wasm" "$DIST/"
rm -f "$DIST/xash.js" "$DIST/xash.wasm"
cp "$WEB/index.html" "$WEB/loader.js" "$DIST/"

# Nombres que espera el motor: dlopen("filesystem_stdio.wasm") y "libref_<nombre>.wasm"
# se resuelven con LD_LIBRARY_PATH=/lib; los del juego se pasan con -dll/-clientlib/-menulib.
cp "$B/engine/filesystem/filesystem_stdio.wasm"   "$STAGE/lib/"
cp "$B/engine/ref/gl/libref_gles3compat.wasm"     "$STAGE/lib/"
cp "$B/engine/3rdparty/mainui/libmenu.wasm"       "$STAGE/lib/menu.wasm"
cp "$B/game/cl_dll/client_emscripten_wasm32.wasm" "$STAGE/lib/client.wasm"
cp "$B/game/dlls/hl_emscripten_wasm32.wasm"       "$STAGE/lib/server.wasm"

pack() {  # pack <nombre> <dir_origen> <punto_de_montaje>
    "$PACKAGER" "$DIST/packs/$1.data" --preload "$2@$3" \
        --js-output="$DIST/packs/$1.js" --use-preload-cache --no-node > /dev/null
    printf '  %-20s %8s\n' "$1" "$(du -h "$DIST/packs/$1.data" | cut -f1)"
}

# extras.pk3 de Xash (fuentes, gráficos del menú y defaults): el motor lo busca en el gamedir base
mkdir -p "$STAGE/boot/valve"
cp "$B/engine/3rdparty/extras/extras.pk3" "$STAGE/boot/valve/"

pack engine "$STAGE/lib" /lib
pack boot "$STAGE/boot" /rodir
maps=("$@")
[ ${#maps[@]} -eq 0 ] && mapfile -t maps < <(ls "$STAGE/maps" 2>/dev/null)
for m in "${maps[@]}"; do
    pack "map_$m" "$STAGE/maps/$m" /rodir
done

# Lista de mapas empaquetados para el loader
printf '%s\n' "${maps[@]}" | python3 -c 'import json,sys; print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))' > "$DIST/packs/maps.json"
echo "dist listo en $DIST"
