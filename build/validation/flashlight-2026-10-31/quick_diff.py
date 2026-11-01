import struct
from pathlib import Path
r=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web/build/validation/flashlight-2026-10-31')
for case in ['baseline-equipped','fixed-equipped']:
 a=(r/case/'off.rgba').read_bytes();b=(r/case/'spot.rgba').read_bytes();d=[b[i]-a[i] for i in range(len(a)) if i%4!=3];print(case,'meanDelta',sum(d)/len(d),'positive',sum(x>0 for x in d),'max',max(d))
