import ghidra.app.script.GhidraScript;
import ghidra.program.model.listing.*;
import ghidra.program.model.symbol.Reference;
import java.io.PrintWriter;
import java.util.*;
// Read-only: identify named TYPEDESCRIPTION fields at selected object offsets.
public class DumpSaveFields extends GhidraScript {
 public void run() throws Exception {
  String[] a = getScriptArgs(); Set<Integer> wanted = new HashSet<>();
  for (String s : a[1].split("[+]")) wanted.add(Integer.decode(s));
  try (PrintWriter out = new PrintWriter(a[0])) {
   DataIterator it = currentProgram.getListing().getDefinedData(true);
   while (it.hasNext()) {
    Data d = it.next(); Object v = d.getValue();
    if (!(v instanceof String) || !((String)v).startsWith("m_")) continue;
    for (Reference r : getReferencesTo(d.getAddress())) {
     if (getFunctionContaining(r.getFromAddress()) != null) continue;
     try {
      int offset = getInt(r.getFromAddress().add(4));
      int type = getInt(r.getFromAddress().subtract(4));
      if (wanted.contains(offset) && type >= 0 && type <= 20)
       out.println(String.format("offset=0x%x type=%d name=%s descriptor=%s", offset, type, v, r.getFromAddress().subtract(4)));
     } catch (Exception ignored) { }
    }
   }
  }
 }
}
