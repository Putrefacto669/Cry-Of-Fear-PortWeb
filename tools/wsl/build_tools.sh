#!/usr/bin/env bash
# build_tools.sh - Herramientas nativas del pipeline de assets (se ejecutan en WSL, no en el navegador).
#
#   build_tools.sh       -> ~/cof-web/build/tools/texcomp
set -euo pipefail

SRC="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${COF_WORK:-$HOME/cof-web}/build/tools"
mkdir -p "$OUT"

# stb_dxt.h se incluye tal cual: sus avisos no son nuestros
gcc -std=c11 -D_DEFAULT_SOURCE -O2 -Wall -Wextra -Wno-unused-parameter -Wno-maybe-uninitialized \
    -o "$OUT/texcomp" "$SRC/texcomp/texcomp.c" -lm
echo "texcomp -> $OUT/texcomp"
