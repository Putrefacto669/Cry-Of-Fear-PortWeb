import re, sys
def files(p):
    t = open(p).read()
    return {m.group(1): int(m.group(3)) - int(m.group(2)) for m in re.finditer(r'"filename":\s*"([^"]+)",\s*"start":\s*(\d+),\s*"end":\s*(\d+)', t)}
for name in sys.argv[1:]:
    a = files(f"/root/cof-audits/audit-D3Kl5uly/dist/packs/{name}.js")
    b = files(f"/root/cof-audits/audit-D3Kl5uly/dist-next/packs/{name}.js")
    print("==", name, len(a), "->", len(b))
    for f in sorted(set(a) - set(b)): print("  only codex:", f, a[f])
    for f in sorted(set(b) - set(a)): print("  only next: ", f, b[f])
    for f in sorted(set(a) & set(b)):
        if a[f] != b[f]: print("  size diff: ", f, a[f], b[f])
