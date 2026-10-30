import struct,pathlib,heapq,math,json
p=pathlib.Path('C:/Program Files (x86)/Steam/steamapps/common/Cry of Fear/cryoffear/maps/c_start2.bsp').read_bytes()
def lump(n):return struct.unpack_from('<ii',p,4+n*8)
a,b=lump(1);planes=[struct.unpack_from('<4fi',p,i) for i in range(a,a+b,20)]
a,b=lump(9);nodes=[struct.unpack_from('<ihh',p,i) for i in range(a,a+b,8)]
a,b=lump(14);root=struct.unpack_from('<9f7i',p,a)[10]
def free(x,y,z=-554.8):
 n=root
 while n>=0:
  pi,c0,c1=nodes[n];v=planes[pi];d=x*v[0]+y*v[1]+z*v[2]-v[3];n=c0 if d>=0 else c1
 return n!=-2
from PIL import Image,ImageDraw
im=Image.new('RGB',(600,800),'#111111');d=ImageDraw.Draw(im)
def xy(x,y):return ((x-1000)*600/450,(2150-y)*800/650)
for x in range(1000,1450,4):
 for y in range(1500,2150,4):
  if free(x,y):
   u,v=xy(x,y);d.rectangle((u,v,u+5,v+5),fill='#557777')
for x in range(1000,1451,50):
 u,v=xy(x,1500);d.line((u,0,u,800),fill='#333333');d.text((u,0),str(x),fill='white')
for y in range(1500,2151,50):
 u,v=xy(1000,y);d.line((0,v,600,v),fill='#333333');d.text((0,v),str(y),fill='white')
for x,y,n in [(1100,1620,'player'),(1304,1711,'PC')]:
 u,v=xy(x,y);d.ellipse((u-4,v-4,u+4,v+4),fill='yellow');d.text((u,v),n,fill='yellow')
im.save('build/validation/padlock/private-cafe-collision.png')