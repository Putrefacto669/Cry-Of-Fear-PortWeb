import struct,pathlib,heapq,math,json
p=pathlib.Path('/root/cof-web/stage/maps/c_start2/cryoffear/maps/c_start2.bsp').read_bytes()
def lump(n):return struct.unpack_from('<ii',p,4+n*8)
a,b=lump(1);planes=[struct.unpack_from('<4fi',p,i) for i in range(a,a+b,20)]
a,b=lump(9);nodes=[struct.unpack_from('<ihh',p,i) for i in range(a,a+b,8)]
a,b=lump(14);root=struct.unpack_from('<9f7i',p,a)[10]
def free(x,y,z=-730.8):
 n=root
 while n>=0:
  pi,c0,c1=nodes[n];v=planes[pi];d=x*v[0]+y*v[1]+z*v[2]-v[3];n=c0 if d>=0 else c1
 return n!=-2
start=(2515,-1115);goal=(3051,-1003);step=8
q=[(0,start)];prev={start:None};cost={start:0}
while q:
 _,s=heapq.heappop(q)
 if math.dist(s,goal)<=step:goal=s;break
 for dx,dy in [(step,0),(-step,0),(0,step),(0,-step),(step,step),(step,-step),(-step,step),(-step,-step)]:
  t=(s[0]+dx,s[1]+dy)
  if not (2300<t[0]<3120 and -1300<t[1]<-750):continue
  if not all(free(s[0]+dx*k/4,s[1]+dy*k/4) for k in range(1,5)):continue
  nc=cost[s]+math.hypot(dx,dy)
  if nc<cost.get(t,1e9):cost[t]=nc;prev[t]=s;heapq.heappush(q,(nc+math.dist(t,goal),t))
else:raise Exception('no path')
out=[];s=goal
while s:out.append(s);s=prev[s]
out=out[::-1];turns=[out[0]]
for i in range(1,len(out)-1):
 if (out[i][0]-out[i-1][0],out[i][1]-out[i-1][1])!=(out[i+1][0]-out[i][0],out[i+1][1]-out[i][1]):turns.append(out[i])
turns.append(out[-1]);print(json.dumps(turns));print(len(prev),'nodes')