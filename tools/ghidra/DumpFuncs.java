import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.*;
import ghidra.program.model.listing.*;
import ghidra.program.model.symbol.*;
import java.io.*;
import java.util.*;
// Read-only: decompile the given functions (hex addresses) and every caller of the given
// imported symbols (names); args: out, "addr,addr", "name,name", depth of callees to follow
public class DumpFuncs extends GhidraScript {
 DecompInterface d; Set<Function> seen = new HashSet<>(); PrintWriter out;
 void dump(Function f, int depth) throws Exception {
  if (f == null || !seen.add(f)) return;
  out.println("FUNCTION " + f.getEntryPoint() + " " + f.getName());
  DecompileResults z = d.decompileFunction(f, 60, monitor);
  if (z.decompileCompleted()) out.println(z.getDecompiledFunction().getC());
  if (depth > 0) for (Function c : f.getCalledFunctions(monitor)) if (!c.isExternal() && !c.isThunk()) dump(c, depth - 1);
 }
 public void run() throws Exception {
  String[] a = getScriptArgs();
  for (int i = 0; i < a.length; i++) if (a[i].equals("-")) a[i] = ""; // the .bat drops empty arguments
  d = new DecompInterface(); d.openProgram(currentProgram);
  int depth = a.length > 3 ? Integer.parseInt(a[3]) : 0;
  try { out = new PrintWriter(a[0]);
   if (!a[1].isEmpty()) for (String s : a[1].split("[+]")) {
    if (s.matches("[0-9a-fA-F]{8}")) dump(getFunctionAt(toAddr(s)), depth);
    else {
     boolean found = false;
     for (Symbol sym : currentProgram.getSymbolTable().getSymbols(s)) {
      Function f = getFunctionAt(sym.getAddress());
      if (f != null) { dump(f, depth); found = true; }
     }
     if (!found) out.println("MISSING FUNCTION " + s);
    }
   }
   if (a.length > 2 && !a[2].isEmpty()) for (String name : a[2].split("[+]")) {
    for (Symbol sym : currentProgram.getSymbolTable().getSymbols(name)) {
     out.println("SYMBOL " + name + " " + sym.getAddress());
     for (Reference r : getReferencesTo(sym.getAddress())) {
      Function f = getFunctionContaining(r.getFromAddress());
      if (f == null) { for (Reference r2 : getReferencesTo(r.getFromAddress())) { Function g = getFunctionContaining(r2.getFromAddress()); if (g != null) { out.println("CALLER " + name + " " + g.getEntryPoint()); dump(g, 0);} } continue; }
      out.println("CALLER " + name + " " + f.getEntryPoint()); dump(f, 0);
     }
    }
   }
   // a[4]: "addr+addr" whose callers are decompiled
   if (a.length > 4 && !a[4].isEmpty()) for (String s : a[4].split("[+]")) {
    for (Reference r : getReferencesTo(toAddr(s))) {
     Function f = getFunctionContaining(r.getFromAddress());
     out.println("CALLER " + s + " " + r.getFromAddress() + " in " + (f == null ? "?" : f.getEntryPoint()));
     dump(f, 0);
    }
   }
  } finally { d.dispose(); out.close(); }
 }
}
