import re,sys
SP=sys.argv[1]
src=open(SP+"/patch_studio3.py").read()+open(SP+"/patch_studio4.py").read()
for l in open("/root/cof-audits/guard-check-20261109.txt"):
    m=re.search(r"\): \+(.*)$",l.rstrip("\n"))
    if not m: continue
    t=m.group(1)
    print("IN-PATCH" if t.strip()=="" or t in src else "UNEXPLAINED", repr(t[:90]))
