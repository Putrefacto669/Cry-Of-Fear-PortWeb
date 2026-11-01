import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.listing.*;
import java.io.*;
// Read-only bounded function-range inventory and decompilation.
public class DumpFunctionRange extends GhidraScript {
 public void run() throws Exception {
  String[] args=getScriptArgs();
  var start=toAddr(args[1]);var end=toAddr(args[2]);
  if(start.compareTo(end)>0)throw new IllegalArgumentException("Invalid range");
  DecompInterface decomp=new DecompInterface();decomp.openProgram(currentProgram);
  try(PrintWriter out=new PrintWriter(args[0])){
   var iterator=currentProgram.getFunctionManager().getFunctions(start,true);int count=0;
   while(iterator.hasNext()){
    Function fn=iterator.next();if(fn.getEntryPoint().compareTo(end)>0)break;
    if(++count>64)throw new IllegalArgumentException("Range exceeds 64 functions");
    out.println("FUNCTION "+fn.getEntryPoint()+" "+fn.getName());
    var result=decomp.decompileFunction(fn,60,monitor);
    if(result.decompileCompleted())out.println(result.getDecompiledFunction().getC());
   }
  }finally{decomp.dispose();}
 }
}
