import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.listing.*;
import ghidra.program.model.scalar.Scalar;
import ghidra.program.model.mem.*;
import ghidra.program.model.address.*;
import java.io.*;
import java.util.*;
// Read-only: functions whose instructions use a scalar (e.g. a struct offset), and places that
// hold a pointer to the given addresses (vtables); args: out, "scalar+scalar", "addr+addr"
public class DumpScalarUse extends GhidraScript {
 public void run() throws Exception {
  String[] a = getScriptArgs();
  for (int i = 0; i < a.length; i++) if (a[i].equals("-")) a[i] = "";
  DecompInterface d = new DecompInterface(); d.openProgram(currentProgram);
  Set<Function> seen = new LinkedHashSet<>();
  try (PrintWriter out = new PrintWriter(a[0])) {
   Set<Long> wanted = new HashSet<>();
   if (!a[1].isEmpty()) for (String s : a[1].split("[+]")) wanted.add(Long.decode(s));
   InstructionIterator it = currentProgram.getListing().getInstructions(true);
   while (it.hasNext()) {
    Instruction ins = it.next();
    for (int op = 0; op < ins.getNumOperands(); op++)
     for (Object o : ins.getOpObjects(op))
      if (o instanceof Scalar && wanted.contains(((Scalar) o).getUnsignedValue())) {
       Function f = getFunctionContaining(ins.getAddress());
       out.println("USE " + ins.getAddress() + " " + ins + " in " + (f == null ? "?" : f.getEntryPoint()));
       if (f != null) seen.add(f);
      }
   }
   if (a.length > 2 && !a[2].isEmpty()) for (String s : a[2].split("[+]")) {
    long v = Long.decode(s);
    byte[] pat = { (byte) v, (byte) (v >> 8), (byte) (v >> 16), (byte) (v >> 24) };
    Address p = currentProgram.getMinAddress();
    while ((p = currentProgram.getMemory().findBytes(p, pat, null, true, monitor)) != null) {
     out.println("POINTER to " + s + " at " + p);
     p = p.add(1);
    }
   }
   for (Function f : seen) {
    out.println("FUNCTION " + f.getEntryPoint() + " " + f.getName());
    DecompileResults z = d.decompileFunction(f, 60, monitor);
    if (z.decompileCompleted()) out.println(z.getDecompiledFunction().getC());
   }
  } finally { d.dispose(); }
 }
}
