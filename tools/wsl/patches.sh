#!/usr/bin/env bash
# patches.sh - Exporta o aplica las series de parches sobre Xash3D FWGS (y submódulos) y hlsdk-portable.
#
#   patches.sh export   # diff de los árboles de trabajo en WSL -> patches/<proyecto>/*.patch (en Windows)
#   patches.sh apply    # aplica patches/<proyecto>/*.patch sobre clones limpios
#
# Cada parche se nombra NNNN-<ruta-del-repo>.patch; la ruta indica dónde aplicarlo
# ("root" = repo principal, el resto = submódulo con '/' cambiado por '__').
set -euo pipefail

WORK="${COF_WORK:-$HOME/cof-web}"
PATCH_ROOT="$(cd "$(dirname "$0")/../.." && pwd)/patches"

# proyecto -> directorio del clon y repos de la serie (principal primero, después submódulos)
declare -A DIRS=( [xash3d]="$WORK/engine/xash3d-fwgs" [hlsdk]="$WORK/game/hlsdk-portable" )
declare -A REPOS=( [xash3d]="root 3rdparty/library_suffix 3rdparty/mainui" [hlsdk]="root" )

repo_dir() { [ "$2" = root ] && echo "${DIRS[$1]}" || echo "${DIRS[$1]}/$2"; }

case "${1:-}" in
export)
    for p in xash3d hlsdk; do
        out="$PATCH_ROOT/$p"
        mkdir -p "$out"
        rm -f "$out"/*.patch
        n=1
        for r in ${REPOS[$p]}; do
            d="$(repo_dir "$p" "$r")"
            git -C "$d" add -N . # incluir archivos nuevos en el diff
            if ! git -C "$d" diff --quiet; then
                f="$(printf '%04d' $n)-${r//\//__}.patch"
                git -C "$d" diff --ignore-submodules > "$out/$f"
                echo "  $p/$f ($(grep -c '^+[^+]' "$out/$f") líneas añadidas)"
                n=$((n + 1))
            fi
        done
        rmdir "$out" 2>/dev/null || true # sin cambios: sin carpeta
    done
    ;;
apply)
    for p in xash3d hlsdk; do
        for f in "$PATCH_ROOT/$p"/*.patch; do
            [ -e "$f" ] || continue
            r="$(basename "$f" .patch)"; r="${r#*-}"; r="${r//__//}"
            git -C "$(repo_dir "$p" "$r")" apply --whitespace=nowarn "$f"
            echo "  aplicado $p/$(basename "$f")"
        done
    done
    ;;
*) echo "uso: $0 export|apply" >&2; exit 2 ;;
esac
