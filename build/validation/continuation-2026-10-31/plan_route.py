import struct,collections,json
from pathlib import Path
b=Path('/root/cof-audits/audit-D3Kl5uly/stage/maps/c_start/cryoffear/maps/c_start.bsp').read_bytes()
def lump(i):o,n=struct.unpack_from('<ii',b,4+i*8);return b[o:o+n]
planes=list(struct.iter_unpack('<4fi',lump(1)));nodes=list(struct.iter_unpack('<ihh',lump(9)));head=struct.unpack_from('<i',lump(14),40)[0]
def contents(x,y,z):
 n=head
 while n>=0:
  pi,a,c=nodes[n];nx,ny,nz,d,t=planes[pi];n=a if x*nx+y*ny+z*nz-d>=0 else c
 return n
step=16;heights={}
for x in range(1952,3281,step):
 for y in range(-2672,-1375,step):
  zs=[z for z in range(-860,-600,4) if contents(x,y,z)!=-2 and contents(x,y,z-4)==-2]
  if zs:heights[x,y]=min(zs,key=lambda z:abs(z+731))
start=min(heights,key=lambda p:(p[0]-2108)**2+(p[1]+1485)**2);goal=min(heights,key=lambda p:(p[0]-3100)**2+(p[1]+2390)**2)
q=collections.deque([start]);parents={start:None}
while q:
 p=q.popleft()
 if p==goal:break
 for dx,dy in [(step,0),(-step,0),(0,step),(0,-step)]:
  n=p[0]+dx,p[1]+dy
  if n in heights and n not in parents and abs(heights[n]-heights[p])<=18:parents[n]=p;q.append(n)
print('reached',goal in parents,'visited',len(parents))
if goal in parents:
 path=[];p=goal
 while p is not None:path.append(p);p=parents[p]
 path.reverse();corners=[path[0]]
 for i in range(1,len(path)-1):
  if (path[i][0]-path[i-1][0],path[i][1]-path[i-1][1])!=(path[i+1][0]-path[i][0],path[i+1][1]-path[i][1]):corners.append(path[i])
 corners.append(path[-1]);print(corners)
 Path('build/validation/continuation-2026-10-31/planned-route.json').write_text(json.dumps(dict(route=corners,method='read-only BSP hull1; not runtime proof')))
