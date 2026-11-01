from pathlib import Path
import struct,hashlib,json,statistics,math
root=Path('/mnt/c/Program Files (x86)/Steam/steamapps/common/Cry of Fear/cryoffear/gfx')
rows={}
for name in ['flashlight.tga','flashlight2.tga']:
 b=(root/name).read_bytes();idlen,cmap,kind=b[:3];w,h,bits,desc=struct.unpack_from('<HHBB',b,12)
 assert kind==2 and cmap==0 and bits==24
 raw=b[18+idlen:18+idlen+w*h*3]
 def pixel(x,y):
  if not desc&32:y=h-1-y
  if desc&16:x=w-1-x
  i=(y*w+x)*3;return tuple(raw[i:i+3][::-1])
 samples={str(r):pixel(round((w-1)/2+r*(w-1)/2),round((h-1)/2)) for r in [0,.1,.25,.5,.75,.9,1]}
 rows[name]={'sha256':hashlib.sha256(b).hexdigest(),'width':w,'height':h,'bits':bits,'type':kind,'descriptor':desc,'center_to_edge_rgb':samples,'min_channel':min(raw),'max_channel':max(raw),'mean_channel':statistics.mean(raw),'non_grey_pixels':sum(raw[i]!=raw[i+1] or raw[i]!=raw[i+2] for i in range(0,len(raw),3))}
result={'patterns':rows,'kernel_reference':{'range':700,'base_full_fov':50,'max_full_fov':80,'attenuation_at_axis_distance':{str(d):1-(d/700)**2 if 1<d<700 else 0 for d in [0,1,50,150,350,525,699,700,800]},'half_width_at_100_for_fov':{str(f):100*math.tan(math.radians(f/2)) for f in [50,80]}}}
out=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web/build/validation/alpha-consolidation-2026-10-31/pattern-analysis.json');out.write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
