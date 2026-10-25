// debug.js - Herramientas de depuración del motor (se carga con ?debug=1).
//
//   CoFDebug.cmd("map c_cof_forest1")      comando de consola, se ejecuta en el siguiente frame
//   await CoFDebug.leakCheck()             pasada de LeakSanitizer (solo en el build ASan)
//   await CoFDebug.leakTest({ cycles: 3 }) recarga el mapa N veces y separa las fugas que crecen
//                                          con cada carga de las que ya había al arrancar
//
// LSan informa de bloques inalcanzables en el momento de la llamada; el estado vivo del motor no
// aparece. Una misma fuga sale en cada pasada, por eso leakTest compara contra una línea base.
(() => {
  "use strict";

  const engineLog = () => {
    if (!window.CoFRuntimeReady) return ""; // FS solo es fiable con el runtime inicializado
    try { return FS.readFile("/rwdir/engine.log", { encoding: "utf8" }); } catch (_) { return ""; }
  };
  const count = (text, re) => (text.match(re) || []).length;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const waitForLog = async (re, atLeast, timeoutMs = 60000) => {
    const t0 = performance.now();
    while (performance.now() - t0 < timeoutMs) {
      if (count(engineLog(), re) >= atLeast) return true;
      await sleep(250);
    }
    throw new Error(`timeout esperando ${re}`);
  };

  // "Direct leak of 64 byte(s) in 1 object(s) allocated from:" + los primeros marcos de la pila
  const parseReport = (lines) => {
    const leaks = [];
    let cur = null;
    for (const line of lines) {
      const m = line.match(/(Direct|Indirect) leak of (\d+) byte\(s\) in (\d+) object/);
      if (m) {
        cur = { kind: m[1], bytes: +m[2], objects: +m[3], frames: [] };
        leaks.push(cur);
      } else if (cur && /^\s*#\d+/.test(line) && cur.frames.length < 6) {
        // con símbolos: "#2 0x1234 in Mod_LoadTextures /src/..." -> la función
        // con symbolize=0 (lo normal aquí): "#2 0x1234 (this.program+0x1234)" -> la dirección del
        // módulo, que tools/wsl/asan_symbolize.sh traduce a archivo:línea
        const fn = line.match(/ in ([^\s(]+)/) || line.match(/\(([^)]+\+0x[0-9a-f]+)\)/);
        if (fn && !/^(malloc|calloc|realloc|_Mem_Alloc|_Mem_Realloc|Mem_Calloc)$/.test(fn[1])) cur.frames.push(fn[1]);
      }
    }
    for (const l of leaks) l.signature = `${l.kind}:${l.frames.slice(0, 3).join(" < ")}`;
    return leaks;
  };

  const summarize = (leaks) => {
    const by = new Map();
    for (const l of leaks) {
      const e = by.get(l.signature) || { signature: l.signature, bytes: 0, objects: 0 };
      e.bytes += l.bytes; e.objects += l.objects;
      by.set(l.signature, e);
    }
    return [...by.values()].sort((a, b) => b.bytes - a.bytes);
  };

  const CoFDebug = {
    cmd(text) {
      Module.ccall("Xash_Cmd", null, ["string"], [text]);
    },

    async leakCheck() {
      const lines = [];
      const hook = (t) => lines.push(t);
      window.CoFStderr.add(hook);
      let result;
      try {
        result = Module.ccall("Xash_LeakCheck", "number", [], []);
        await sleep(100); // la salida de stderr se vacía en el mismo tick, margen por si acaso
      } finally {
        window.CoFStderr.remove(hook);
      }
      if (result < 0) return { available: false, note: "build sin ASan: usa tools/wsl/build_asan.sh" };
      const leaks = parseReport(lines);
      return {
        available: true,
        leaked: result === 1,
        totalBytes: leaks.reduce((s, l) => s + l.bytes, 0),
        bySite: summarize(leaks),
        raw: lines,
      };
    },

    async leakTest({ map, cycles = 3 } = {}) {
      map = map || new URLSearchParams(location.search).get("map") || "c_cof_forest1";
      const connected = /client connected/g;
      await waitForLog(connected, 1);
      const base = await this.leakCheck();
      if (!base.available) return base;

      let loads = count(engineLog(), connected);
      for (let i = 0; i < cycles; i++) {
        this.cmd(`map ${map}`);
        await waitForLog(connected, ++loads);
        await sleep(500); // deja correr unos frames con el mapa cargado
      }
      const after = await this.leakCheck();

      const baseBytes = new Map(base.bySite.map((s) => [s.signature, s.bytes]));
      const growing = after.bySite
        .map((s) => ({ ...s, growth: s.bytes - (baseBytes.get(s.signature) || 0) }))
        .filter((s) => s.growth > 0)
        .sort((a, b) => b.growth - a.growth);
      return {
        map, cycles,
        startupLeakBytes: base.totalBytes,
        afterLeakBytes: after.totalBytes,
        perLoadBytes: Math.round((after.totalBytes - base.totalBytes) / cycles),
        growing,
        startup: base.bySite,
      };
    },
  };

  window.CoFDebug = CoFDebug;
})();
