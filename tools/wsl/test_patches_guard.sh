#!/usr/bin/env bash
# test_patches_guard.sh - Prueba de la guarda de patches.sh: un export desde un árbol al que le falta
# trabajo de los parches actuales debe fallar sin tocar patches/. Usa un repositorio git temporal.
#   bash tools/wsl/test_patches_guard.sh
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
export COF_WORK="$tmp/work" COF_PATCH_ROOT="$tmp/patches" COF_PATCH_PROJECTS=hlsdk
repo="$COF_WORK/game/hlsdk-portable"
mkdir -p "$repo" "$COF_PATCH_ROOT"
git -C "$repo" init -q
git -C "$repo" -c user.email=t@t -c user.name=t commit -q --allow-empty -m base
printf 'base\n' > "$repo/a.c"
git -C "$repo" add a.c
git -C "$repo" -c user.email=t@t -c user.name=t commit -q -m a
fail() { echo "FAIL: $*" >&2; exit 1; }
patch="$COF_PATCH_ROOT/hlsdk/0001-root.patch"

# 1. first export of a change
printf 'base\nwork A\n' > "$repo/a.c"
bash "$here/patches.sh" export > /dev/null
grep -q '^+work A' "$patch" || fail "export did not write work A"

# 2. a tree that lost work A (e.g. a stale tree) must not overwrite the patches
printf 'base\nwork B\n' > "$repo/a.c"
if bash "$here/patches.sh" export > "$tmp/out" 2>&1; then fail "export accepted a tree without work A"; fi
grep -q 'work A' "$tmp/out" || fail "the lost line was not reported"
grep -q '^+work A' "$patch" || fail "patches/ was modified by a refused export"
if bash "$here/patches.sh" check > /dev/null 2>&1; then fail "check did not report the loss"; fi

# 3. keeping work A and adding more is accepted
printf 'base\nwork A\nwork B\n' > "$repo/a.c"
bash "$here/patches.sh" check > /dev/null || fail "check refused a superset"
bash "$here/patches.sh" export > /dev/null || fail "export refused a superset"
grep -q '^+work B' "$patch" || fail "work B missing"

# 4. an intended replacement goes through only with --allow-drop
printf 'base\nwork C\n' > "$repo/a.c"
bash "$here/patches.sh" export --allow-drop > /dev/null || fail "--allow-drop refused"
grep -q '^+work C' "$patch" && ! grep -q '^+work A' "$patch" || fail "--allow-drop did not replace"

echo "PASS patches.sh guard: refuses lost lines, accepts supersets, --allow-drop replaces"
