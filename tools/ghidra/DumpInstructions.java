import ghidra.app.script.GhidraScript;
import java.io.PrintWriter;
public class DumpInstructions extends GhidraScript {
 public void run() throws Exception {
  String[] a=getScriptArgs();try(PrintWriter out=new PrintWriter(a[0])){
   for(String s:a[1].split("[+]")){
    var f=getFunctionAt(toAddr(s));if(f==null){out.println("MISSING "+s);continue;}
    out.println("FUNCTION "+f.getEntryPoint()+" "+f.getName());
    var it=currentProgram.getListing().getInstructions(f.getBody(),true);int n=0;
    while(it.hasNext()&&n++<4096){var i=it.next();out.println(i.getAddress()+" "+i.toString());}
   }
  }
 }
}