import json
from PIL import Image,ImageDraw
p=json.load(open('build/validation/padlock/private-start2-polys.json'))
x0,x1,y0,y1=0,1450,1200,2200
im=Image.new('RGB',(1000,800),'#161616');d=ImageDraw.Draw(im)
def xy(x,y):return ((x-x0)*1000/(x1-x0),(y1-y)*800/(y1-y0))
for a in p:
 if max(t[2] for t in a)>-590 or min(t[2] for t in a)<-650:continue
 d.polygon([xy(*t[:2]) for t in a],fill='#485959',outline='#829999')
for x in range(x0,x1,100):
 u,v=xy(x,y0);d.line((u,0,u,800),fill='#333333');d.text((u,0),str(x),fill='white')
for y in range(y0,y1,100):
 u,v=xy(x0,y);d.line((0,v,1000,v),fill='#333333');d.text((0,v),str(y),fill='white')
for x,y,n in [(2423,-876,'start'),(2926,-864,'now'),(3655,-1257,'door')]:
 u,v=xy(x,y);d.ellipse((u-4,v-4,u+4,v+4),fill='yellow');d.text((u+5,v),n,fill='yellow')
im.save('build/validation/padlock/private-start2-plaza-plan.png')