import ghidra.app.script.GhidraScript;
import java.io.PrintWriter;
// Read-only identity check between the analyzed program and the installed reference.
public class DumpProgramInfo extends GhidraScript {
 public void run() throws Exception {
  try (PrintWriter out = new PrintWriter(getScriptArgs()[0])) {
   out.printf("{\"name\":\"%s\",\"sha256\":\"%s\",\"md5\":\"%s\"}%n",
     currentProgram.getName(), currentProgram.getExecutableSHA256(), currentProgram.getExecutableMD5());
  }
 }
}
