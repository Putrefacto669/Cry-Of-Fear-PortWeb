import ghidra.app.script.GhidraScript;
import java.io.*;
// Read-only: float, double, int and string at the given addresses; args: out, "addr+addr"
public class DumpFloats extends GhidraScript {
 public void run() throws Exception {
  String[] a = getScriptArgs();
  try (PrintWriter out = new PrintWriter(a[0])) {
   for (String s : a[1].split("[+]")) {
    var ad = toAddr(s);
    int i = getInt(ad);
    String str = "";
    try { byte[] b = getBytes(ad, 32); int n = 0; while (n < 32 && b[n] >= 32 && b[n] < 127) n++; str = new String(b, 0, n); } catch (Exception e) {}
    out.println(s + " float=" + Float.intBitsToFloat(i) + " double=" + Double.longBitsToDouble(getLong(ad)) + " int=" + i + " str=" + str);
   }
  }
 }
}
