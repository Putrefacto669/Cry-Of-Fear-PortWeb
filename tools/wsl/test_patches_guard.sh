#!/usr/bin/env bash
# test_patches_guard.sh - Prueba de la guarda de patches.sh en repositorios git temporales.
# Incluye los contraejemplos de la revisión de Codex (test_patches_guard_review.sh, 8/11/2026) con la
# expectativa correcta: todos deben rechazarse sin tocar patches/, y un fallo de copia no debe perder la
# serie anterior.
#   bash tools/wsl/test_patches_guard.sh
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
export COF_PATCH_PROJECTS=hlsdk
export COF_PATCH_APPROVALS="$tmp/approvals-other" # approval records of these runs stay out of the repository
fail() { echo "FAIL: $*" >&2; exit 1; }
guard() { bash "$here/patches.sh" "$@" > "$tmp/out" 2>&1; }

fixture() {
    export COF_WORK="$tmp/$1/work" COF_PATCH_ROOT="$tmp/$1/patches"
    repo="$COF_WORK/game/hlsdk-portable"; patch="$COF_PATCH_ROOT/hlsdk/0001-root.patch"
    mkdir -p "$repo" "$COF_PATCH_ROOT"
    git -C "$repo" init -q
    printf 'entry_A\nexit_A\n' > "$repo/a.c"
    printf 'entry_B\nexit_B\n' > "$repo/b.c"
    git -C "$repo" add a.c b.c
    git -C "$repo" -c user.email=t@t -c user.name=t commit -qm base
}
# the current series must be refused and left untouched
refused() {
    local name="$1" before; before="$(cat "$patch" 2>/dev/null || true)"
    if guard check; then fail "$name: check accepted"; fi
    if guard export; then fail "$name: export accepted"; fi
    [ "$(cat "$patch" 2>/dev/null || true)" = "$before" ] || fail "$name: patches/ changed"
    echo "ok refused: $name"
}

# 1. basic: a stale tree that lost a line; a superset; an intended replacement with --allow-drop
fixture basic
printf 'entry_A\nwork A\nexit_A\n' > "$repo/a.c"; guard export || fail "first export"
grep -q '^+work A' "$patch" || fail "first export did not write work A"
printf 'entry_A\nwork B\nexit_A\n' > "$repo/a.c"; refused lost-line
printf 'entry_A\nwork A\nwork B\nexit_A\n' > "$repo/a.c"
guard check || fail "superset refused by check"; guard export || fail "superset refused by export"
grep -q '^+work B' "$patch" || fail "superset not written"
printf 'entry_A\nwork C\nexit_A\n' > "$repo/a.c"
guard export --allow-drop || fail "--allow-drop refused"
grep -q '^+work C' "$patch" && ! grep -q '^+work A' "$patch" || fail "--allow-drop did not replace"
echo "ok basic: lost line refused, superset accepted, --allow-drop replaces"

# 2. Codex's counterexamples
fixture same-line-different-file
printf 'entry_A\ncheck();\nexit_A\n' > "$repo/a.c"; guard export
printf 'entry_A\nexit_A\n' > "$repo/a.c"; printf 'entry_B\ncheck();\nexit_B\n' > "$repo/b.c"
refused same-line-different-file

fixture same-lines-different-order
printf 'entry_A\nvalidate();\nwrite();\nexit_A\n' > "$repo/a.c"; guard export
printf 'entry_A\nwrite();\nvalidate();\nexit_A\n' > "$repo/a.c"
refused same-lines-different-order

fixture same-line-different-context
printf 'entry_A\ncheck();\nexit_A\n' > "$repo/a.c"; guard export
printf 'entry_A\nexit_A\ncheck();\n' > "$repo/a.c"
refused same-line-different-context

fixture restores-removed-code
printf 'entry_A\n' > "$repo/a.c"; guard export
grep -q '^-exit_A' "$patch" || fail "removal not exported"
printf 'entry_A\nexit_A\n' > "$repo/a.c"
refused restores-removed-code

fixture loses-duplicate
printf 'entry_A\ncheck();\ncheck();\nexit_A\n' > "$repo/a.c"; guard export
printf 'entry_A\ncheck();\nexit_A\n' > "$repo/a.c"
refused loses-duplicate

fixture interrupted-replacement
printf 'entry_A\ncheck();\nexit_A\n' > "$repo/a.c"; guard export
before="$(cat "$patch")"
printf 'entry_A\ncheck();\nwrite();\nexit_A\n' > "$repo/a.c"
mkdir -p "$tmp/bin"; printf '#!/bin/sh\nexit 42\n' > "$tmp/bin/cp"; chmod +x "$tmp/bin/cp"
if PATH="$tmp/bin:$PATH" guard export; then fail "export succeeded with a failing cp"; fi
[ "$(cat "$patch")" = "$before" ] || fail "the previous series was lost when cp failed"
guard export || fail "export after the failure"
grep -q '^+write();' "$patch" || fail "write() missing after a good export"
echo "ok interrupted-replacement: the previous series survives a failed copy"

# 3. the new series must reproduce the working tree (a patch that no longer applies is refused)
fixture reproduces-tree
printf 'entry_A\ncheck();\nexit_A\n' > "$repo/a.c"; guard export
guard check || fail "check refused a reproducible series"
grep -q 'reproduce el árbol' "$tmp/out" || fail "check did not confirm the reproduction"
echo "ok reproduces-tree"

# 4. Codex's second review (09/11/2026)
fixture staged-only
printf 'entry_A\nstaged();\nexit_A\n' > "$repo/a.c"; git -C "$repo" add a.c
guard export || fail "staged-only export refused"
grep -q '^+staged();' "$patch" || fail "a change only in the index was not exported"
echo "ok staged-only: exported from git diff HEAD"

fixture same-anchor-move
printf 'entry_A\n{\nx1\n}\n{\nx2\n}\nexit_A\n' > "$repo/a.c"; git -C "$repo" add a.c
git -C "$repo" -c user.email=t@t -c user.name=t commit -qm blocks
printf 'entry_A\n{\ncheck();\nx1\n}\n{\nx2\n}\nexit_A\n' > "$repo/a.c"; guard export
printf 'entry_A\n{\nx1\n}\n{\ncheck();\nx2\n}\nexit_A\n' > "$repo/a.c"
refused same-anchor-move

fixture approval-record
export COF_PATCH_APPROVALS="$tmp/approvals"
printf 'entry_A\nold();\nexit_A\n' > "$repo/a.c"; guard export
printf 'entry_A\nnew();\nexit_A\n' > "$repo/a.c"; guard export --allow-drop || fail "--allow-drop refused"
record="$(ls "$COF_PATCH_APPROVALS"/*.txt | head -1)"
grep -q 'pérdidas aprobadas' "$record" && grep -q '^-+old();' "$record" && grep -q '^++new();' "$record" || fail "no durable record of the approved change"
echo "ok approval-record: $(basename "$record")"

# two projects in one export: xash3d (root + two submodule repos) and hlsdk
batch() {
    export COF_WORK="$tmp/$1/work" COF_PATCH_ROOT="$tmp/$1/patches" COF_PATCH_PROJECTS="xash3d hlsdk"
    mkdir -p "$COF_PATCH_ROOT"
    for d in engine/xash3d-fwgs engine/xash3d-fwgs/3rdparty/library_suffix engine/xash3d-fwgs/3rdparty/mainui game/hlsdk-portable; do
        mkdir -p "$COF_WORK/$d"; git -C "$COF_WORK/$d" init -q
        printf 'entry\nexit\n' > "$COF_WORK/$d/f.c"; git -C "$COF_WORK/$d" add f.c
        git -C "$COF_WORK/$d" -c user.email=t@t -c user.name=t commit -qm base
    done
    xroot="$COF_WORK/engine/xash3d-fwgs"; hroot="$COF_WORK/game/hlsdk-portable"
    printf 'entry\nv1();\nexit\n' > "$xroot/f.c"; printf 'entry\nv1();\nexit\n' > "$hroot/f.c"
    guard export || fail "$1: first batch export"
    printf 'entry\nv1();\nv2();\nexit\n' > "$xroot/f.c"; printf 'entry\nv1();\nv2();\nexit\n' > "$hroot/f.c"
}
# a mv that fails for chosen targets (installing hlsdk, optionally also its rollback)
fakemv() {
    mkdir -p "$tmp/mv-$1"
    cat > "$tmp/mv-$1/mv" <<EOF
#!/bin/sh
case "\$1" in */.hlsdk.new.*) exit 42 ;; esac
[ "$1" = double ] && case "\$1" in */.hlsdk.old.*) exit 43 ;; esac
exec /bin/mv "\$@"
EOF
    chmod +x "$tmp/mv-$1/mv"
}

batch batch-second-fails
fakemv single
xbefore="$(cat "$COF_PATCH_ROOT"/xash3d/*.patch)"; hbefore="$(cat "$COF_PATCH_ROOT"/hlsdk/*.patch)"
if PATH="$tmp/mv-single:$PATH" guard export; then fail "batch: export succeeded although hlsdk could not be installed"; fi
[ "$(cat "$COF_PATCH_ROOT"/xash3d/*.patch)" = "$xbefore" ] || fail "batch: xash3d kept the new series while hlsdk failed"
[ "$(cat "$COF_PATCH_ROOT"/hlsdk/*.patch)" = "$hbefore" ] || fail "batch: hlsdk lost its series"
echo "ok batch-second-fails: both projects keep the previous series"

batch batch-double-failure
fakemv double
hbefore="$(cat "$COF_PATCH_ROOT"/hlsdk/*.patch)"
set +e; PATH="$tmp/mv-double:$PATH" bash "$here/patches.sh" export > "$tmp/out" 2>&1; status=$?; set -e
[ $status = 2 ] || fail "double failure: expected exit 2, got $status"
backup="$(ls -d "$COF_PATCH_ROOT"/.hlsdk.old.* | head -1)"
[ -n "$backup" ] && [ "$(cat "$backup"/*.patch)" = "$hbefore" ] || fail "double failure: the previous hlsdk series is not kept"
mv "$backup" "$COF_PATCH_ROOT/hlsdk" 2>/dev/null || true; cp -r "$COF_PATCH_ROOT/hlsdk" "$backup" # restore by hand, keep a copy
guard export || fail "export after a recovered double failure"
[ -d "$backup" ] || fail "a later export deleted an old backup"
echo "ok batch-double-failure: exit 2, backup kept and not deleted by the next export"

# first export (no series yet in either project) failing on hlsdk: xash3d must not stay installed alone
# (Codex's review of 09/11/2026: rollback only undid projects that had an .old backup)
batch batch-first-export
rm -rf "$COF_PATCH_ROOT/xash3d" "$COF_PATCH_ROOT/hlsdk"
if PATH="$tmp/mv-single:$PATH" guard export; then fail "first export: succeeded although hlsdk could not be installed"; fi
[ ! -e "$COF_PATCH_ROOT/xash3d" ] || fail "first export: xash3d stayed installed while hlsdk failed"
[ ! -e "$COF_PATCH_ROOT/hlsdk" ] || fail "first export: a partial hlsdk series was left"
[ -z "$(ls -A "$COF_PATCH_ROOT")" ] || fail "first export: leftovers in patches/: $(ls -A "$COF_PATCH_ROOT")"
echo "ok batch-first-export: a failed first export leaves no series installed"

echo "PASS patches.sh guard: 7 counterexamples refused, staged changes exported, failed copy and batch keep the series, a failed first export installs nothing, double failure keeps backups, approvals recorded, series reproduces the tree"
