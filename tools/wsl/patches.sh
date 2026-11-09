#!/usr/bin/env bash
# patches.sh - Exporta o aplica las series de parches sobre Xash3D FWGS (y submódulos) y hlsdk-portable.
#
#   patches.sh export                # diff de los árboles de trabajo en WSL -> patches/<proyecto>/*.patch (en Windows)
#   patches.sh export --allow-drop   # igual, aunque el árbol haya perdido líneas que están en los parches actuales
#   patches.sh check                 # solo informa: líneas que el export añadiría y que perdería
#   patches.sh apply                 # aplica patches/<proyecto>/*.patch sobre clones limpios
#
# Cada parche se nombra NNNN-<ruta-del-repo>.patch; la ruta indica dónde aplicarlo
# ("root" = repo principal, el resto = submódulo con '/' cambiado por '__').
#
# Guarda contra pérdida de trabajo: export escribe primero en una carpeta temporal y compara las
# líneas añadidas ('+') de los parches nuevos con las de los actuales. Si alguna línea de los
# actuales desaparece (un parche suelto que no estaba aplicado en el árbol, un árbol desfasado...),
# no toca patches/ y termina con error. Un cambio intencionado (sustituir una línea) se exporta con
# --allow-drop después de revisar la lista con check.
set -euo pipefail

WORK="${COF_WORK:-$HOME/cof-web}"
PATCH_ROOT="${COF_PATCH_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)/patches}"

# proyecto -> directorio del clon y repos de la serie (principal primero, después submódulos)
declare -A DIRS=( [xash3d]="$WORK/engine/xash3d-fwgs" [hlsdk]="$WORK/game/hlsdk-portable" )
declare -A REPOS=( [xash3d]="root 3rdparty/library_suffix 3rdparty/mainui" [hlsdk]="root" )
[ -n "${COF_PATCH_PROJECTS:-}" ] || COF_PATCH_PROJECTS="xash3d hlsdk"

repo_dir() { [ "$2" = root ] && echo "${DIRS[$1]}" || echo "${DIRS[$1]}/$2"; }

# las líneas añadidas de una carpeta de parches, ordenadas (multiconjunto para comm)
added_lines() { cat "$1"/*.patch 2>/dev/null | grep '^+' | grep -v '^+++ ' | LC_ALL=C sort || true; }

# genera los parches de un proyecto en la carpeta $2
generate() {
    local p="$1" out="$2" n=1 r d f
    mkdir -p "$out"
    for r in ${REPOS[$p]}; do
        d="$(repo_dir "$p" "$r")"
        git -C "$d" add -N . # incluir archivos nuevos en el diff
        if ! git -C "$d" diff --quiet; then
            f="$(printf '%04d' $n)-${r//\//__}.patch"
            git -C "$d" diff --ignore-submodules > "$out/$f"
            n=$((n + 1))
        fi
    done
}

# compara parches actuales y nuevos; devuelve 1 si se perderían líneas
compare() {
    local p="$1" new="$2" old="$PATCH_ROOT/$1" dropped added
    dropped="$(LC_ALL=C comm -23 <(added_lines "$old") <(added_lines "$new"))"
    added="$(LC_ALL=C comm -13 <(added_lines "$old") <(added_lines "$new"))"
    echo "  $p: $(printf '%s' "$added" | grep -c '' || true) líneas nuevas, $(printf '%s' "$dropped" | grep -c '' || true) líneas que desaparecen"
    if [ -n "$dropped" ]; then
        printf '%s\n' "$dropped" | head -40 | sed 's/^/    - /'
        return 1
    fi
}

case "${1:-}" in
export|check)
    mode="$1"; allow_drop=0
    [ "${2:-}" = "--allow-drop" ] && allow_drop=1
    tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
    lost=0
    for p in $COF_PATCH_PROJECTS; do
        generate "$p" "$tmp/$p"
        compare "$p" "$tmp/$p" || lost=1
    done
    if [ "$mode" = check ]; then
        exit $lost
    fi
    if [ $lost = 1 ] && [ $allow_drop = 0 ]; then
        echo "export cancelado: el árbol de trabajo ($WORK) no contiene todas las líneas de patches/." >&2
        echo "Aplica los parches que faltan al árbol, o revisa con 'check' y usa --allow-drop si es intencionado." >&2
        exit 1
    fi
    for p in $COF_PATCH_PROJECTS; do
        out="$PATCH_ROOT/$p"
        mkdir -p "$out"
        rm -f "$out"/*.patch
        for f in "$tmp/$p"/*.patch; do
            [ -e "$f" ] || continue
            cp "$f" "$out/"
            echo "  $p/$(basename "$f") ($(grep -c '^+[^+]' "$f") líneas añadidas)"
        done
        rmdir "$out" 2>/dev/null || true # sin cambios: sin carpeta
    done
    ;;
apply)
    for p in $COF_PATCH_PROJECTS; do
        for f in "$PATCH_ROOT/$p"/*.patch; do
            [ -e "$f" ] || continue
            r="$(basename "$f" .patch)"; r="${r#*-}"; r="${r//__//}"
            git -C "$(repo_dir "$p" "$r")" apply --whitespace=nowarn "$f"
            echo "  aplicado $p/$(basename "$f")"
        done
    done
    ;;
*) echo "uso: $0 export [--allow-drop]|check|apply" >&2; exit 2 ;;
esac
