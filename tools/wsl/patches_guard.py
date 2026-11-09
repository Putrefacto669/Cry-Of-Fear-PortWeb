#!/usr/bin/env python3
"""patches_guard.py - what a new patch series would lose from the current one (used by patches.sh).

    patches_guard.py compare OLD_DIR NEW_DIR [--diff]

For every patched file (by repository and path), each line the current series adds must still be added by
the new series, in the same order and between the same anchors: the nearest line above it in its hunk that
the patch does not add (context or removed) and the nearest such line below it. Each line the current
series removes must still be removed, in the same order. This catches a change moved to another file,
lines swapped, a line moved to another place in the same file (also between two blocks that share the line
above), a removal undone and a lost duplicate. Limit: a line moved between two places whose lines above
and below are textually identical is not seen; check --diff shows every change for review.
Exit status 1 when something would be lost. --diff also prints the unified diff between the two series.
"""
import difflib
import re
import sys
from pathlib import Path


def parse(folder):
    files = {}

    def flush(current, hunk):
        if current is None:
            return
        # hunk: list of (kind, text) with kind in " +-"; anchors are the nearest non-added lines around a run
        for i, (kind, text) in enumerate(hunk):
            if kind == "+":
                above = next((t for k, t in reversed(hunk[:i]) if k != "+"), None)
                below = next((t for k, t in hunk[i + 1:] if k != "+"), None)
                current["add"].append((above, below, text))
            elif kind == "-":
                current["remove"].append(text)

    for patch in sorted(Path(folder).glob("*.patch")):
        repo = re.sub(r"^\d+-", "", patch.stem)
        current, hunk, header = None, [], None
        for line in patch.read_text(errors="replace").splitlines():
            if line.startswith("diff --git "):
                flush(current, hunk); current, hunk = None, []
            elif line.startswith("+++ ") and not hunk:
                path = line[4:]
                current = files.setdefault((repo, path[2:] if path.startswith("b/") else path), {"add": [], "remove": []})
            elif line.startswith("--- ") and not hunk:
                old = line[4:]
                if old != "/dev/null":  # deleted files keep their old path
                    files.setdefault((repo, old[2:] if old.startswith("a/") else old), {"add": [], "remove": []})
            elif line.startswith("@@"):
                flush(current, hunk)
                header = line.split("@@")[-1].strip() or None
                hunk = [(" ", header)] if header else []
            elif current is None:
                continue
            elif line[:1] in ("+", "-", " "):
                hunk.append((line[:1], line[1:]))
        flush(current, hunk)
    return files


def missing(old, new):
    """items of old left out of an in-order alignment with new (moved, reordered or removed ones)"""
    matcher = difflib.SequenceMatcher(None, old, new, autojunk=False)
    lost = []
    for tag, i1, i2, _, _ in matcher.get_opcodes():
        if tag in ("delete", "replace"):
            lost.extend(old[i1:i2])
    return lost


def compare(old_dir, new_dir, show_diff):
    old, new = parse(old_dir), parse(new_dir)
    lost = []
    for key, change in old.items():
        target = new.get(key, {"add": [], "remove": []})
        for above, below, text in missing(change["add"], target["add"]):
            lost.append(f"{key[0]}:{key[1]}: added line lost or moved (between {above!r} and {below!r}): +{text}")
        for text in missing(change["remove"], target["remove"]):
            lost.append(f"{key[0]}:{key[1]}: removal undone: -{text}")
    for entry in lost[:60]:
        print("    - " + entry)
    if len(lost) > 60:
        print(f"    ... {len(lost) - 60} more")
    if show_diff:
        print(series_diff(old_dir, new_dir), end="")
    return len(lost)


def series_diff(old_dir, new_dir):
    a = "".join(p.read_text(errors="replace") for p in sorted(Path(old_dir).glob("*.patch"))).splitlines(True)
    b = "".join(p.read_text(errors="replace") for p in sorted(Path(new_dir).glob("*.patch"))).splitlines(True)
    return "".join(difflib.unified_diff(a, b, "current series", "new series", n=2))


if __name__ == "__main__":
    if len(sys.argv) >= 4 and sys.argv[1] == "compare":
        sys.exit(1 if compare(sys.argv[2], sys.argv[3], "--diff" in sys.argv[4:]) else 0)
    if len(sys.argv) == 4 and sys.argv[1] == "seriesdiff":
        sys.stdout.write(series_diff(sys.argv[2], sys.argv[3]))
        sys.exit(0)
    sys.exit(__doc__)
