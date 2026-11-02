import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.listing.*;
import ghidra.program.model.symbol.*;
import java.io.*;
import java.util.*;
// Read-only: functions that reference the black-and-white strings, decompiled
public class DumpBlackRefs extends GhidraScript {
 public void run() throws Exception {
  String[] keys = getScriptArgs()[1].toLowerCase(Locale.ROOT).split("[+,]");
  DecompInterface d=new DecompInterface();d.openProgram(currentProgram);Set<Function> seen=new HashSet<>();
  try(PrintWriter out=new PrintWriter(getScriptArgs()[0])) {
   DataIterator it=currentProgram.getListing().getDefinedData(true);
   while(it.hasNext()) {Data x=it.next();Object v=x.getValue();if(!(v instanceof String))continue;
    String s=((String)v).toLowerCase(); boolean hit=false; for(String k:keys) if(s.contains(k)) hit=true; if(!hit)continue;
    out.println("STRING "+x.getAddress()+" "+v);
    for(Reference r:getReferencesTo(x.getAddress())) {out.println("REF "+r.getFromAddress());Function f=getFunctionContaining(r.getFromAddress());if(f!=null&&seen.add(f)){out.println("FUNCTION "+f.getEntryPoint()+" "+f.getName());DecompileResults z=d.decompileFunction(f,60,monitor);if(z.decompileCompleted())out.println(z.getDecompiledFunction().getC());}}
   }
  }finally{d.dispose();}
 }
}
