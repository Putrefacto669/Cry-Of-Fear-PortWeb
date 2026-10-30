import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.*;
import ghidra.program.model.listing.*;
import ghidra.program.model.symbol.*;
import java.io.*;
import java.util.*;
// Read-only: for an entity class exported by name (LINK_ENTITY_TO_CLASS), decompile the export, the
// vtable it installs and every function in that vtable. args: out, classname, number of vtable slots
public class DumpEntityClass extends GhidraScript {
 public void run() throws Exception {
  String[] a = getScriptArgs();
  int slots = a.length > 2 ? Integer.parseInt(a[2]) : 64;
  DecompInterface d = new DecompInterface(); d.openProgram(currentProgram);
  try (PrintWriter out = new PrintWriter(a[0])) {
   for (Symbol sym : currentProgram.getSymbolTable().getSymbols(a[1])) {
    Function f = getFunctionAt(sym.getAddress());
    out.println("EXPORT " + a[1] + " " + sym.getAddress());
    if (f == null) continue;
    DecompileResults z = d.decompileFunction(f, 60, monitor);
    String c = z.decompileCompleted() ? z.getDecompiledFunction().getC() : "";
    out.println(c);
    // the constructor stores &PTR_LAB_xxxxxxxx (the vtable) into the object
    Set<Address> vtables = new LinkedHashSet<>();
    // named vtables (RTTI): "*puVar = Class::vftable;"
    java.util.regex.Matcher named = java.util.regex.Pattern.compile("(\\w+)::vftable").matcher(c);
    while (named.find())
     for (Symbol vs : currentProgram.getSymbolTable().getSymbols("vftable"))
      if (vs.getParentNamespace().getName().equals(named.group(1))) vtables.add(vs.getAddress());
    for (Function callee : f.getCalledFunctions(monitor)) {
     DecompileResults zc = d.decompileFunction(callee, 60, monitor);
     if (!zc.decompileCompleted()) continue;
     String cc = zc.getDecompiledFunction().getC();
     java.util.regex.Matcher m = java.util.regex.Pattern.compile("PTR_[A-Za-z_]*([0-9a-f]{8})").matcher(cc + c);
     while (m.find()) vtables.add(toAddr(m.group(1)));
    }
    for (Address vt : vtables) {
     out.println("VTABLE " + vt);
     for (int i = 0; i < slots; i++) {
      Address slot = vt.add(i * 4L);
      Address target = toAddr(getInt(slot) & 0xffffffffL);
      Function g = getFunctionAt(target);
      if (g == null) { out.println("  slot " + i + " -> " + target + " (no function)"); continue; }
      out.println("SLOT " + i + " " + target + " " + g.getName());
      DecompileResults zg = d.decompileFunction(g, 60, monitor);
      if (zg.decompileCompleted()) out.println(zg.getDecompiledFunction().getC());
     }
    }
   }
  } finally { d.dispose(); }
 }
}
