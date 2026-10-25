#!/usr/bin/env bash
# patches.sh - Exporta o aplica la serie de parches sobre Xash3D FWGS y sus submódulos.
#
#   patches.sh export   # diff del árbol de trabajo en WSL -> patches/xash3d/*.patch (en Windows)
#   patches.sh apply    # aplica patches/xash3d/*.patch sobre un clon limpio
#
# Cada parche se nombra NNNN-<ruta-del-repo>.patch; la ruta indica dónde aplicarlo
# ("root" = repo principal, el resto = submódulo con '/' cambiado por '__').
set -euo pipefail

WORK="${COF_WORK:-$HOME/cof-web}"
ENGINE="$WORK/engine/xash3d-fwgs"
PATCHES="$(cd "$(dirname "$0")/../.." && pwd)/patches/xash3d"
# Orden de la serie: repo principal primero, después submódulos
REPOS=(root 3rdparty/library_suffix 3rdparty/mainui)

repo_dir() { [ "$1" = root ] && echo "$ENGINE" || echo "$ENGINE/$1"; }

case "${1:-}" in
export)
    mkdir -p "$PATCHES"
    rm -f "$PATCHES"/*.patch
    n=1
    for r in "${REPOS[@]}"; do
        d="$(repo_dir "$r")"
        git -C "$d" add -N . # incluir archivos nuevos (c_emscripten.py) en el diff
        if ! git -C "$d" diff --quiet; then
            f="$(printf '%04d' $n)-${r//\//__}.patch"
            git -C "$d" diff --ignore-submodules > "$PATCHES/$f"
            echo "  $f ($(grep -c '^+[^+]' "$PATCHES/$f") líneas añadidas)"
            n=$((n + 1))
        fi
    done
    ;;
apply)
    for f in "$PATCHES"/*.patch; do
        r="$(basename "$f" .patch)"; r="${r#*-}"; r="${r//__//}"
        git -C "$(repo_dir "$r")" apply --whitespace=nowarn "$f"
        echo "  aplicado $(basename "$f")"
    done
    ;;
*) echo "uso: $0 export|apply" >&2; exit 2 ;;
esac
