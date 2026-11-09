#!/usr/bin/env bash
# patches.sh - Exporta o aplica las series de parches sobre Xash3D FWGS (y submódulos) y hlsdk-portable.
#
#   patches.sh export                # diff de los árboles de trabajo en WSL -> patches/<proyecto>/*.patch (en Windows)
#   patches.sh export --allow-drop   # igual, aunque el árbol haya perdido o movido cambios de los parches actuales
#   patches.sh check [--diff]        # solo informa: qué se perdería (y con --diff, el diff entre series)
#   patches.sh apply                 # aplica patches/<proyecto>/*.patch sobre clones limpios
#
# Cada parche se nombra NNNN-<ruta-del-repo>.patch; la ruta indica dónde aplicarlo
# ("root" = repo principal, el resto = submódulo con '/' cambiado por '__').
#
# Guarda contra pérdida de trabajo:
#  - la serie se genera con `git diff HEAD` (árbol de trabajo + índice: un cambio solo indexado también entra);
#  - patches_guard.py compara por archivo y en orden las líneas añadidas (con sus anclajes de encima y de debajo)
#    y las eliminadas de los parches actuales con las nuevas; si algo se pierde, se mueve, se reordena o se deshace
#    una eliminación, export no toca patches/ (--allow-drop tras revisar con check --diff);
#  - cada parche nuevo, aplicado sobre `git archive HEAD` de su repositorio, debe reproducir byte a byte todos los
#    archivos que difieren de HEAD en el árbol de trabajo;
#  - el lote es transaccional: se preparan y verifican todos los proyectos (.<proyecto>.new.<id>) antes de
#    sustituir ninguno; si una sustitución falla, se deshacen todas las anteriores. Los respaldos tienen nombre
#    único (.<proyecto>.old.<id>), nunca se borran los de otras ejecuciones y, si la recuperación falla, se
#    conservan y se indican;
#  - con --allow-drop queda un registro durable del cambio aprobado (pérdidas, diff entre series y SHA-256 de ambas)
#    en COF_PATCH_APPROVALS (por defecto build/patch-approvals/ del repositorio).
set -euo pipefail

WORK="${COF_WORK:-$HOME/cof-web}"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PATCH_ROOT="${COF_PATCH_ROOT:-$REPO_ROOT/patches}"
APPROVALS="${COF_PATCH_APPROVALS:-$REPO_ROOT/build/patch-approvals}"
GUARD="$(cd "$(dirname "$0")" && pwd)/patches_guard.py"

# proyecto -> directorio del clon y repos de la serie (principal primero, después submódulos)
declare -A DIRS=( [xash3d]="$WORK/engine/xash3d-fwgs" [hlsdk]="$WORK/game/hlsdk-portable" )
declare -A REPOS=( [xash3d]="root 3rdparty/library_suffix 3rdparty/mainui" [hlsdk]="root" )
[ -n "${COF_PATCH_PROJECTS:-}" ] || COF_PATCH_PROJECTS="xash3d hlsdk"

repo_dir() { [ "$2" = root ] && echo "${DIRS[$1]}" || echo "${DIRS[$1]}/$2"; }

# genera los parches de un proyecto en la carpeta $2 (árbol de trabajo + índice frente a HEAD)
generate() {
    local p="$1" out="$2" n=1 r d f
    mkdir -p "$out"
    for r in ${REPOS[$p]}; do
        d="$(repo_dir "$p" "$r")"
        git -C "$d" add -N . # incluir archivos nuevos en el diff
        if ! git -C "$d" diff HEAD --quiet --ignore-submodules; then
            f="$(printf '%04d' $n)-${r//\//__}.patch"
            git -C "$d" diff HEAD --ignore-submodules > "$out/$f"
            n=$((n + 1))
        fi
    done
}

# cada repositorio con cambios debe tener parche, y su parche aplicado sobre HEAD debe reproducir el árbol
verify() {
    local p="$1" series="$2" r d f clean name ok=0
    for r in ${REPOS[$p]}; do
        d="$(repo_dir "$p" "$r")"
        f="$(ls "$series"/*-"${r//\//__}".patch 2>/dev/null | head -1 || true)"
        if [ -z "$f" ]; then
            git -C "$d" diff HEAD --quiet --ignore-submodules || { echo "  $p/$r: cambios sin parche" >&2; ok=1; }
            continue
        fi
        clean="$(mktemp -d)"
        git -C "$d" archive HEAD | tar -x -C "$clean"
        if ! git -C "$clean" apply --whitespace=nowarn "$f" 2> "$clean/.apply.log"; then
            echo "  $p/$(basename "$f"): no aplica sobre HEAD de $d" >&2; cat "$clean/.apply.log" >&2; ok=1
        else
            while IFS= read -r name; do
                [ -n "$name" ] || continue
                if [ -e "$d/$name" ]; then
                    cmp -s "$clean/$name" "$d/$name" || { echo "  $p: $name no coincide con el árbol" >&2; ok=1; }
                elif [ -e "$clean/$name" ]; then
                    echo "  $p: $name existe en la serie pero no en el árbol" >&2; ok=1
                fi
            done < <(git -C "$clean" apply --numstat "$f" | cut -f3; git -C "$d" diff HEAD --name-only --ignore-submodules)
        fi
        rm -rf "$clean"
    done
    return $ok
}

case "${1:-}" in
export|check)
    mode="$1"; allow_drop=0; show_diff=""
    for arg in "${@:2}"; do
        case "$arg" in
        --allow-drop) allow_drop=1 ;;
        --diff) show_diff=--diff ;;
        *) echo "opción desconocida: $arg" >&2; exit 2 ;;
        esac
    done
    tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
    lost=0; broken=0
    for p in $COF_PATCH_PROJECTS; do
        generate "$p" "$tmp/$p"
        mkdir -p "$tmp/old-$p"
        for f in "$PATCH_ROOT/$p"/*.patch; do if [ -e "$f" ]; then cat "$f" > "$tmp/old-$p/$(basename "$f")"; fi; done
        echo "  $p:"
        python3 "$GUARD" compare "$tmp/old-$p" "$tmp/$p" $show_diff > "$tmp/report-$p" || lost=1
        cat "$tmp/report-$p"
        verify "$p" "$tmp/$p" || broken=1
    done
    [ $lost = 1 ] && echo "  la serie nueva pierde o mueve cambios de la actual (ver arriba)"
    [ $broken = 1 ] && echo "  la serie nueva no reproduce el árbol de trabajo"
    if [ "$mode" = check ]; then
        [ $lost = 0 ] && [ $broken = 0 ] && echo "  sin pérdidas; la serie nueva reproduce el árbol"
        exit $(( lost | broken ))
    fi
    if [ $broken = 1 ] || { [ $lost = 1 ] && [ $allow_drop = 0 ]; }; then
        echo "export cancelado: patches/ no se ha modificado ($WORK)." >&2
        [ $lost = 1 ] && echo "Revisa con 'check --diff' y usa --allow-drop si el cambio es intencionado." >&2
        exit 1
    fi

    id="$(date +%Y%m%d-%H%M%S)-$$"
    # registro del cambio aprobado
    if [ $lost = 1 ]; then
        mkdir -p "$APPROVALS"
        record="$APPROVALS/$id.txt"
        { echo "patches.sh export --allow-drop $id (COF_WORK=$WORK)"
          for p in $COF_PATCH_PROJECTS; do
              echo "== $p: pérdidas aprobadas"; cat "$tmp/report-$p"
              echo "== $p: SHA-256 de la serie anterior"; (cd "$tmp/old-$p" && sha256sum *.patch 2>/dev/null || true)
              echo "== $p: SHA-256 de la serie nueva"; (cd "$tmp/$p" && sha256sum *.patch 2>/dev/null || true)
              echo "== $p: diff entre series"; python3 "$GUARD" seriesdiff "$tmp/old-$p" "$tmp/$p"
          done; } > "$record" || { echo "export cancelado: no se pudo escribir el registro $record; patches/ intacto." >&2; exit 1; }
        echo "  registro del cambio aprobado: $record"
    fi

    # 1. preparar y verificar todo el lote junto a patches/ (mismo sistema de archivos)
    staged=()
    for p in $COF_PATCH_PROJECTS; do
        s="$PATCH_ROOT/.$p.new.$id"
        mkdir -p "$s"
        for f in "$tmp/$p"/*.patch; do
            [ -e "$f" ] || continue
            if ! cp "$f" "$s/" || ! cmp -s "$f" "$s/$(basename "$f")"; then
                rm -rf "$PATCH_ROOT"/.*.new."$id"; echo "export cancelado: no se pudo preparar $s; patches/ intacto." >&2; exit 1
            fi
        done
        staged+=("$p")
    done

    # 2. sustituir proyecto a proyecto; si algo falla, deshacer los ya sustituidos
    # fresh: projects that had no series before this run (first export). Undoing them means removing what
    # this run installed, since there is no .old backup to put back (Codex's review of 09/11/2026).
    done_list=(); fresh=" "
    rollback() {
        local failed=0 q
        for q in "${done_list[@]}" "$@"; do
            if [ -d "$PATCH_ROOT/$q" ] && { [ -d "$PATCH_ROOT/.$q.old.$id" ] || [[ "$fresh" == *" $q "* ]]; }; then
                mv "$PATCH_ROOT/$q" "$PATCH_ROOT/.$q.failed.$id" || failed=1
            fi
            [ -d "$PATCH_ROOT/.$q.old.$id" ] && { mv "$PATCH_ROOT/.$q.old.$id" "$PATCH_ROOT/$q" || failed=1; }
        done
        if [ $failed = 1 ]; then
            echo "ERROR: la recuperación falló. Series anteriores conservadas en $PATCH_ROOT/.*.old.$id; no se borra nada." >&2
            exit 2
        fi
        rm -rf "$PATCH_ROOT"/.*.new."$id" "$PATCH_ROOT"/.*.failed."$id"
        echo "export cancelado: se restauraron las series anteriores." >&2
        exit 1
    }
    for p in "${staged[@]}"; do
        out="$PATCH_ROOT/$p"
        [ -d "$out" ] || fresh+="$p "
        if [ -d "$out" ] && ! mv "$out" "$PATCH_ROOT/.$p.old.$id"; then rollback; fi
        if ! mv "$PATCH_ROOT/.$p.new.$id" "$out"; then rollback "$p"; fi
        done_list+=("$p")
    done

    # 3. éxito completo: solo ahora se borran los respaldos de esta ejecución
    rm -rf "$PATCH_ROOT"/.*.old."$id"
    for p in $COF_PATCH_PROJECTS; do
        for f in "$PATCH_ROOT/$p"/*.patch; do
            if [ -e "$f" ]; then echo "  $p/$(basename "$f") ($(grep -c '^+[^+]' "$f") líneas añadidas)"; fi
        done
        rmdir "$PATCH_ROOT/$p" 2>/dev/null || true # sin cambios: sin carpeta
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
*) echo "uso: $0 export [--allow-drop]|check [--diff]|apply" >&2; exit 2 ;;
esac
