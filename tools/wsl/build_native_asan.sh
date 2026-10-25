#!/usr/bin/env bash
# build_native_asan.sh - Motor + lógica nativos en Linux (WSL) con AddressSanitizer y LeakSanitizer.
#
#   build_native_asan.sh            -> ~/cof-web/native-asan/   (ejecutar con run_native_asan.sh)
#
# Es el mismo código que el port web (misma serie de parches) compilado para x86_64. Aquí ASan es
# completo: errores con archivo:línea, LSan al salir y sin el "nested bug" que Emscripten 4.0.11
# produce al informar de errores dentro de SIDE_MODULEs. Renderer nulo y SDL "dummy": no hace falta
# ventana ni GPU, el motor carga mapas y ejecuta la lógica igual.
set -euo pipefail

WORK="${COF_WORK:-$HOME/cof-web}"
ENGINE="$WORK/engine/xash3d-fwgs"
SDK="$WORK/game/hlsdk-portable"
OUT="$WORK/build-native-asan"
INSTALL="$WORK/native-asan"

# -T none + flags propios (el tipo "asan" de waf también vale en nativo, pero así controlamos -O1).
# -fno-sanitize=pointer-overflow: GoldSrc guarda las cadenas como desplazamiento desde pStringBase,
# que en la predicción de armas del cliente es NULL (STRING()/MAKE_STRING en util.h). Es así por
# diseño desde HL1 y UBSan lo marcaría en cada arma; el resto de UBSan sigue activo.
export CFLAGS="-O1 -g -fsanitize=address,undefined -fno-sanitize=pointer-overflow -fno-omit-frame-pointer -fno-sanitize-recover=undefined"
export CXXFLAGS="$CFLAGS"
export LINKFLAGS="-fsanitize=address,undefined"
export WAFLOCK=.lock-waf_native_asan

echo "== motor (x86_64, renderer nulo)"
cd "$ENGINE"
./waf configure -o "$OUT/engine" -T none -8 --enable-null --disable-gl > "$OUT.engine.log" 2>&1 || { tail -30 "$OUT.engine.log"; exit 1; }
./waf build -j"$(nproc)" >> "$OUT.engine.log" 2>&1 || { grep -m5 -A5 "error" "$OUT.engine.log"; exit 1; }
./waf install --destdir="$INSTALL" >> "$OUT.engine.log" 2>&1

echo "== lógica (hlsdk-portable, x86_64)"
cd "$SDK"
./waf configure -o "$OUT/game" -T none -8 > "$OUT.game.log" 2>&1 || { tail -30 "$OUT.game.log"; exit 1; }
./waf build -j"$(nproc)" >> "$OUT.game.log" 2>&1 || { grep -m5 -A5 "error" "$OUT.game.log"; exit 1; }
./waf install --destdir="$INSTALL" >> "$OUT.game.log" 2>&1

find "$INSTALL" -maxdepth 3 \( -name "xash3d" -o -name "*.so" \) -printf "   %p\n" | sort
