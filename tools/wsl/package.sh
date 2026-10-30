#!/usr/bin/env bash
# package.sh - Ensambla dist/: motor, SIDE_MODULEs y paquetes de datos (.data + .js) con file_packager.
#
#   package.sh [mapa...]      # por defecto empaqueta los mapas que haya en stage/maps/
#
# Paquetes:
#   packs/engine  -> /lib     filesystem_stdio, renderer WebGL 2, menú, client y server del juego
#   packs/boot    -> /rodir   datos comunes (stage/boot, generado por tools/stage_map.py)
#   packs/<mapa>  -> /rodir   dependencias exclusivas de cada mapa
# La caché entre visitas la lleva sw.js (Service Worker) con sw-manifest.js, que se genera al final
# con el hash de cada archivo. COF_SW_COI=1 hace que el SW añada COOP/COEP (hosts sin cabeceras).
set -euo pipefail

WORK="${COF_WORK:-$HOME/cof-web}"
B="${COF_BUILD:-$WORK/build}"     # build-asan para el build con sanitizers
STAGE="$WORK/stage"
DIST="${COF_DIST:-$WORK/dist}"
WEB="$(cd "$(dirname "$0")/../.." && pwd)/platform/web"

# shellcheck disable=SC1091
source "${EMSDK_DIR:-$HOME/emsdk}/emsdk_env.sh" > /dev/null 2>&1
PACKAGER="$EMSDK/upstream/emscripten/tools/file_packager"

mkdir -p "$DIST/packs" "$STAGE/lib"
# xash3d.html es la página por defecto de emcc (sin paquetes ni argumentos); index.html es la buena
cp "$B/engine/engine/xash3d.html" "$B/engine/engine/xash3d.js" "$B/engine/engine/xash3d.wasm" "$DIST/"
rm -f "$DIST/xash.js" "$DIST/xash.wasm"
cp "$WEB/index.html" "$WEB/loader.js" "$WEB/postfx.js" "$WEB/hud.js" "$WEB/gpustats.js" "$WEB/debug.js" "$WEB/sw.js" "$DIST/"
cp "$WEB/transitions.json" "$DIST/packs/"
rm -rf "$DIST/shaders" && cp -r "$WEB/shaders" "$DIST/shaders"

# Lanzador para probar en Windows con doble clic (no forma parte de la web publicada)
cp "$WEB/../launcher/Jugar.bat" "$WEB/../../tools/serve.py" "$DIST/"

# GPL-3.0: quien recibe los binarios debe poder llegar al código. La página enlaza la licencia y
# el repositorio público (COF_SOURCE_URL; un fork debe apuntarlo a su propio repositorio).
cp "$WEB/../../LICENSE" "$DIST/LICENSE.txt"
SOURCE_URL="${COF_SOURCE_URL:-https://github.com/Putrefacto669/Cry-Of-Fear-PortWeb}"
sed -i "s#__SOURCE_URL__#$SOURCE_URL#" "$DIST/index.html"

# Nombres que espera el motor: dlopen("filesystem_stdio.wasm") y "libref_<nombre>.wasm"
# se resuelven con LD_LIBRARY_PATH=/lib; los del juego se pasan con -dll/-clientlib/-menulib.
cp "$B/engine/filesystem/filesystem_stdio.wasm"   "$STAGE/lib/"
cp "$B/engine/ref/gl/libref_gles3compat.wasm"     "$STAGE/lib/"
cp "$B/engine/3rdparty/mainui/libmenu.wasm"       "$STAGE/lib/menu.wasm"
cp "$B/game/cl_dll/client_emscripten_wasm32.wasm" "$STAGE/lib/client.wasm"
cp "$B/game/dlls/hl_emscripten_wasm32.wasm"       "$STAGE/lib/server.wasm"

pack() {  # pack <nombre> <dir_origen> <punto_de_montaje>
    # sin --use-preload-cache: el SW ya guarda el .data, IndexedDB lo duplicaría
    "$PACKAGER" "$DIST/packs/$1.data" --preload "$2@$3" \
        --js-output="$DIST/packs/$1.js" --no-node > /dev/null
    printf '  %-20s %8s\n' "$1" "$(du -h "$DIST/packs/$1.data" | cut -f1)"
}

# extras.pk3 de Xash (fuentes, gráficos del menú y defaults): el motor lo busca en el gamedir base
# controles del CoF original; loader.js lo ejecuta con +exec
cp "$WEB/../game/cof_web.cfg" "$STAGE/boot/cryoffear/"
mkdir -p "$STAGE/boot/valve"
cp "$B/engine/3rdparty/extras/extras.pk3" "$STAGE/boot/valve/"

# música: archivos sueltos que hud.js reproduce en streaming con <audio> (no entran en memoria)
rm -rf "$DIST/mp3" && mkdir -p "$DIST/mp3"
[ -d "$STAGE/mp3" ] && cp "$STAGE/mp3/"*.mp3 "$DIST/mp3/" 2>/dev/null || true

# Lo que ya va en boot sobra en los mapas (preparados quizá antes de que boot creciera): el paquete
# inicial de un mapa se monta junto a boot y file_packager falla con EEXIST si un archivo se repite
python3 - "$STAGE" <<'EOF'
import sys
from pathlib import Path
stage = Path(sys.argv[1])
boot = {p.relative_to(stage / "boot").as_posix().lower() for p in (stage / "boot").rglob("*") if p.is_file()}
for m in (stage / "maps").iterdir() if (stage / "maps").is_dir() else []:
    for p in list(m.rglob("*")):
        if p.is_file() and p.relative_to(m).as_posix().lower() in boot:
            p.unlink()
EOF

pack engine "$STAGE/lib" /lib
pack boot "$STAGE/boot" /rodir
maps=("$@")
[ ${#maps[@]} -eq 0 ] && mapfile -t maps < <(ls "$STAGE/maps" 2>/dev/null)
for m in "${maps[@]}"; do
    pack "map_$m" "$STAGE/maps/$m" /rodir
done

# Lista de mapas empaquetados para el loader
printf '%s\n' "${maps[@]}" | python3 -c 'import json,sys; print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))' > "$DIST/packs/maps.json"

# Manifiesto del Service Worker: revisión (hash) por archivo, lista de precarga ligera y copias .gz
# de lo pesado. Los hostings no comprimen application/octet-stream (los .data bajan al 22-42 %
# con gzip): el SW descarga el .gz y lo descomprime con DecompressionStream. Los originales se
# quedan para navegadores sin SW o ?sw=0.
python3 - "$DIST" "${COF_SW_COI:-0}" "${COF_SW_GZ:-1}" <<'EOF'
import gzip, hashlib, json, sys
from pathlib import Path
dist, coi, use_gz = Path(sys.argv[1]), sys.argv[2] == "1", sys.argv[3] == "1"
for old in dist.rglob("*.gz"):
    old.unlink()
files, gz = {}, {}
for p in sorted(dist.rglob("*")):
    rel = p.relative_to(dist).as_posix()
    if not p.is_file() or rel in ("sw.js", "sw-manifest.js", "Jugar.bat", "serve.py"):
        continue
    data = p.read_bytes()
    files[rel] = hashlib.sha256(data).hexdigest()[:12]
    if use_gz and rel.endswith((".wasm", ".data")):
        packed = gzip.compress(data, 9, mtime=0)
        if len(packed) < 0.9 * len(data):
            Path(f"{p}.gz").write_bytes(packed)
            gz[rel] = {"size": len(data), "gzSize": len(packed)}
precache = [f for f in files if not f.endswith((".wasm", ".data", ".mp3")) and f != "xash3d.html"]
version = hashlib.sha256(json.dumps(files, sort_keys=True).encode()).hexdigest()[:12]
manifest = {"version": version, "coi": coi, "precache": precache, "files": files, "gz": gz}
(dist / "sw-manifest.js").write_text("self.COF_MANIFEST = " + json.dumps(manifest, indent=1) + ";\n")
raw = sum((dist / f).stat().st_size for f in files)
wire = raw - sum(v["size"] - v["gzSize"] for v in gz.values())
print(f"  sw-manifest   versión {version}, {len(files)} archivos: {raw / 2**20:.0f} MiB, "
      f"{wire / 2**20:.0f} MiB a descargar con el SW ({len(gz)} en .gz)")
EOF
echo "dist listo en $DIST"
