# Make an instrumented copy of envpos_entities.mjs: on the map-transition wait, dump camera/player state
import sys
src, dst = sys.argv[1], sys.argv[2]
t = open(src, encoding="utf-8").read()
old = "    await until(async()=>{current=await state();return current.renderer&&+parse(current.renderer).polys>0;});\n    const info=parse(current.client);"
new = ("    console.log(`DIAG ${map} after-connect\\n`+await command('cof_camera kamera\\ncof_camera kamera1\\ncof_inspect !player\\nviewpos\\ncof_sky_render_status'));\n"
       "    try { await until(async()=>{current=await state();return current.renderer&&+parse(current.renderer).polys>0;}); }\n"
       "    catch(e) { console.log(`DIAG ${map} timeout\\n`+await command('cof_camera kamera\\ncof_camera kamera1\\ncof_inspect !player\\nviewpos\\ncof_sky_render_status')); throw e; }\n"
       "    const info=parse(current.client);")
assert t.count(old) == 1
open(dst, "w", encoding="utf-8").write(t.replace(old, new))
print("ok")
