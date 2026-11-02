import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Function;
import ghidra.program.model.symbol.Symbol;
import java.io.PrintWriter;
// Read-only: args output, vtable address or class namespace, first slot, exclusive last slot.
public class DumpVtableRange extends GhidraScript {
 public void run() throws Exception {
  String[] a = getScriptArgs();
  Address table = null;
  if (a[1].matches("[0-9a-fA-F]{8}")) table = toAddr(a[1]);
  else for (Symbol s : currentProgram.getSymbolTable().getSymbols("vftable")) {
   if (s.getParentNamespace().getName().equals(a[1])) { table = s.getAddress(); break; }
  }
  if (table == null) throw new IllegalArgumentException("Vtable not found: " + a[1]);
  DecompInterface d = new DecompInterface(); d.openProgram(currentProgram);
  try (PrintWriter out = new PrintWriter(a[0])) {
   out.println("VTABLE " + table);
   for (int i = Integer.parseInt(a[2]); i < Integer.parseInt(a[3]); i++) {
    Address target = toAddr(getInt(table.add(i * 4L)) & 0xffffffffL);
    Function f = getFunctionAt(target);
    out.println("SLOT " + i + " " + target);
    if (f == null) continue;
    DecompileResults r = d.decompileFunction(f, 60, monitor);
    if (r.decompileCompleted()) out.println(r.getDecompiledFunction().getC());
   }
  } finally { d.dispose(); }
 }
}
