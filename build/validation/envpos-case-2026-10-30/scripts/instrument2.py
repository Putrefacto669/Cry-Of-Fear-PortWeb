# Instrumented copy of envpos_entities.mjs: at each map transition dump client sky entities,
# the server state of the env_model sky entities, and the renderer counters
import sys
src, dst = sys.argv[1], sys.argv[2]
t = open(src, encoding="utf-8").read()
old = "    await until(async()=>{current=await state();return current.renderer&&+parse(current.renderer).polys>0;});\n    const info=parse(current.client);"
dump = ("    const diag=async tag=>{\n"
        "      const c=await command('cof_sky_entities\\ncof_sky_render_status\\nviewpos\\ncof_list env_model');\n"
        "      const ids=[...c.matchAll(/COF\\/SKY_ENTITY id=(\\d+)/g)].map(m=>m[1]);\n"
        "      const s=ids.length?await command(ids.map(i=>`cof_inspect #${i}`).join('\\n')):'';\n"
        "      console.log(`DIAG ${map} ${tag}\\n${c}\\n${s}`);\n"
        "    };\n")
new = (dump +
       "    await diag('after-connect');\n"
       "    try { await until(async()=>{current=await state();return current.renderer&&+parse(current.renderer).polys>0;}); }\n"
       "    catch(e) { await diag('timeout'); throw e; }\n"
       "    await diag('ok');\n"
       "    const info=parse(current.client);")
assert t.count(old) == 1
open(dst, "w", encoding="utf-8").write(t.replace(old, new))
print("ok")
