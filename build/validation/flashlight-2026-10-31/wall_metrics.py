import json
from pathlib import Path
root=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web/build/validation/flashlight-2026-10-31')
w,h=800,347
for case in ['baseline-equipped','fixed-equipped']:
 for name in ['wall-off','wall-spot']:
  f=root/case/(name+'.rgba')
  if not f.exists():continue
  b=f.read_bytes();total=n=0
  for y in range(int(h*.35),int(h*.65)):
   for x in range(280,520):
    i=(y*w+x)*4;total+=.2126*b[i]+.7152*b[i+1]+.0722*b[i+2];n+=1
  print(case,name,total/n)

