"""Read-only GoldSrc BSP lighting/material inventory. Outputs statistics, never game data."""
import argparse,collections,hashlib,json,math,struct
from pathlib import Path
from stage_map import read_entities,find_ci

MAPS=('c_intro','c_nightmare','c_start','c_apartment1','c_apartmentsick')
def digest(data):return hashlib.sha256(data).hexdigest()
def stats(data):
 hist=collections.Counter(data);n=len(data)
 return {'bytes':n,'sha256':digest(data),'min':min(data) if n else None,'max':max(data) if n else None,'meanChannel':sum(data)/n if n else None,'zeroFraction':hist[0]/n if n else None,'saturatedFraction':hist[255]/n if n else None}
def inspect(path):
 data=path.read_bytes();version=struct.unpack_from('<i',data)[0];assert version==30,version
 lumps=[data[o:o+n] for o,n in [struct.unpack_from('<ii',data,4+i*8) for i in range(15)]]
 faces=lumps[7];assert len(faces)%20==0
 styles=collections.Counter();lit=multi=0;layouts=collections.Counter();aux={'luxels':0,'fallbackAbsError':0.,'fallbackMaxError':0.,'baseMean':0.,'genericSumMean':0.}
 for n in range(0,len(faces),20):
  face=faces[n:n+20];offset=struct.unpack_from('<i',face,16)[0];s=face[12:16];active=[x for x in s if x!=255]
  if offset>=0:
   assert offset<len(lumps[8]);lit+=1;multi+=len(active)>1
   styles.update(active)
   layouts[','.join(map(str,active))]+=1
   if sorted(active)==[0,61,62,63]:
    first=struct.unpack_from('<i',face,4)[0];edges=struct.unpack_from('<H',face,8)[0];info=struct.unpack_from('<H',face,10)[0]*40
    vectors=[struct.unpack_from('<4f',lumps[6],info+i*16) for i in range(2)];uv=[[],[]]
    for e in struct.unpack_from('<'+'i'*edges,lumps[13],first*4):
     vi=struct.unpack_from('<HH',lumps[12],abs(e)*4)[0 if e>=0 else 1];v=struct.unpack_from('<3f',lumps[3],vi*12)
     for k,vec in enumerate(vectors):uv[k].append(sum(v[i]*vec[i] for i in range(3))+vec[3])
    count=math.prod(math.ceil(max(u)/16)-math.floor(min(u)/16)+1 for u in uv)
    assert offset+count*len(active)*3<=len(lumps[8])
    layer={s:lumps[8][offset+j*count*3:offset+(j+1)*count*3] for j,s in enumerate(active)}
    for i in range(count):
     # Neutral native fallback: tone(2 * (ambient + diffuse * z)) * 0.5.
     z=layer[63][i*3+2]/127.-1
     flat_rgb=[layer[61][i*3+c]+layer[62][i*3+c]*z for c in range(3)]
     largest=max(flat_rgb)
     if largest>255:flat_rgb=[v*255/largest for v in flat_rgb]
     for ch in range(3):
      n=i*3+ch;base=layer[0][n];flat=max(0,int(flat_rgb[ch]))
      error=abs(base-flat);aux['fallbackAbsError']+=error;aux['fallbackMaxError']=max(aux['fallbackMaxError'],error)
      aux['baseMean']+=base;aux['genericSumMean']+=min(255,base+layer[61][n]+layer[62][n])
    aux['luxels']+=count
 tex=lumps[2];count=struct.unpack_from('<i',tex)[0];textures=[]
 for i in range(count):
  o=struct.unpack_from('<i',tex,4+i*4)[0]
  if o<0:continue
  name=tex[o:o+16].split(b'\0')[0].decode('latin1');w,h,*mips=struct.unpack_from('<6I',tex,o+16)
  textures.append({'name':name,'size':[w,h],'embedded':bool(mips[0])})
 entities=read_entities(path);visual=[e for e in entities if e.get('classname','') in ['worldspawn','env_fog','cof_blur','cof_blackandwhite','envpos_world','envpos_sky','light_environment']]
 if aux['luxels']:
  for key in ['fallbackAbsError','baseMean','genericSumMean']:aux[key]/=aux['luxels']*3
 return {'bspSHA256':digest(data),'lighting':stats(lumps[8]),'faces':len(faces)//20,'litFaces':lit,'multiStyleFaces':multi,'lightStyles':dict(styles),'layouts':dict(layouts),'auxiliaryLightmapAnalysis':aux,'textures':textures,'visualEntities':visual}
def main():
 p=argparse.ArgumentParser();p.add_argument('--original',type=Path,required=True);p.add_argument('--stage',type=Path,required=True);p.add_argument('--out',type=Path,required=True);p.add_argument('--skip-material-scan',action='store_true');a=p.parse_args();assert not a.out.exists()
 result={'maps':{},'statisticsAreNotRenderedLuminance':True,'sumAssumption':'unit weights for 0,61,62; 63 dark; byte-domain illustration, not captured renderer luminance','flatReference':'10059660 + 10059f30, gamma=1 brightness=0 contrast=1, preserve hue on overflow; uploaded lightmap before downstream texture blending'}
 material_dir=a.original/'gfx/bumpmaps'
 result['originalBumpDirectoryFiles']=sum(p.is_file() for p in material_dir.iterdir()) if material_dir.is_dir() else 0
 for name in MAPS:
  source=a.original/'maps'/f'{name}.bsp';staged=a.stage/'maps'/name/'cryoffear/maps'/source.name
  r=inspect(source);r['stagedBspIdentical']=source.read_bytes()==staged.read_bytes();assert r['stagedBspIdentical']
  materials=[]
  for tex in r['textures']:
   if tex['name'].startswith(('+','-')):continue
   for suffix in ['', '_gloss','_glosshi']:
    rel='gfx/bumpmaps/'+tex['name']+suffix+'.tga';found=find_ci(a.original,rel)
    if found:
     roots=[a.stage/'boot/cryoffear',a.stage/'shared_extras/cryoffear',staged.parents[1]]
     materials.append({'texture':tex['name'],'role':{'':'normal','_gloss':'gloss','_glosshi':'highGloss'}[suffix],'path':found.relative_to(a.original).as_posix(),'bytes':found.stat().st_size,'staged':any(find_ci(root,rel) for root in roots)})
  r['nativeNamedMaterials']=materials;result['maps'][name]=r;print(name,json.dumps(r['auxiliaryLightmapAnalysis']),'materials',len(materials),flush=True)
 # Materials are recorded as candidates until native loaders establish their exact role.
 candidates=[]
 for path in ([] if a.skip_material_scan else a.original.rglob('*')):
  if path.is_file() and (path.suffix.lower() in ['.mat','.shader'] or any(x in path.stem.lower() for x in ['_normal','_specular','_bump'])):candidates.append(path.relative_to(a.original).as_posix())
 result['materialFilenameCandidates']=candidates
 result['materialScanSkipped']=a.skip_material_scan
 a.out.write_text(json.dumps(result,indent=2),encoding='utf-8');print('PASS unchanged BSPs and original lighting lumps:',len(result['maps']),'maps;',len(candidates),'material filename candidates')
if __name__=='__main__':main()
