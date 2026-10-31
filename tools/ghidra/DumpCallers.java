import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.listing.*;
import ghidra.program.model.symbol.*;
import java.io.*;
import java.util.*;
// Read-only: decompile every function that calls the given function (hex address); args: out, address
public class DumpCallers extends GhidraScript {
 public void run() throws Exception {
  DecompInterface d=new DecompInterface();d.openProgram(currentProgram);Set<Function> seen=new HashSet<>();
  try(PrintWriter out=new PrintWriter(getScriptArgs()[0])) {
   for(Reference r:getReferencesTo(toAddr(getScriptArgs()[1]))) {
    out.println("REF "+r.getFromAddress()+" "+r.getReferenceType());
    Function f=getFunctionContaining(r.getFromAddress());
    if(f==null||!seen.add(f))continue;
    out.println("FUNCTION "+f.getEntryPoint()+" "+f.getName());
    DecompileResults z=d.decompileFunction(f,60,monitor);
    if(z.decompileCompleted())out.println(z.getDecompiledFunction().getC());
   }
  }finally{d.dispose();}
 }
}
