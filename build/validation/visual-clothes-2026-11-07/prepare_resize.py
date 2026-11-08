"""Derive the narrow resize probe from the same real model/readback contract."""
from pathlib import Path
repo=Path(__file__).resolve().parents[3]
private=Path('/root/cof-audits/visual-clothes-20261107')
s=(repo/'tools/e2e/clothes_menu.mjs').read_text()
prefix,body=s.split('try{\n await p.goto',1)
body=body.split(' // Exercise',1)[0]
body+='''
 await open();for(const size of [{width:640,height:480},{width:1280,height:900},{width:960,height:720}]){
  await p.setViewportSize(size);await wait(()=>p.evaluate(()=>{const info=CoFPostFX.preview(),canvas=document.querySelector('#canvas');return info.id>0&&!!GL.textures[info.id]&&info.width===canvas.width&&info.height===canvas.height;}));const image=await pixels();checkPixels(image);r.checks.push({size,image});
 }await close();assert.deepEqual(errors,[]);r.passed=true;
'''
(private/'clothes_resize.mjs').write_text(prefix+'try{\n await p.goto'+body+'}catch(e){'+s.split('}catch(e){',1)[1])
