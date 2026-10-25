// loader.js - Arranca Xash3D (WASM) con los paquetes de Cry of Fear.
//
// Orden: define Module -> scripts de paquetes (engine, boot, mapa) -> xash3d.js.
// Los paquetes generados por file_packager se registran como dependencias de arranque,
// así que main() no corre hasta que todos están montados en MEMFS.
//
// Parámetros de URL:
//   ?map=c_cof_forest1   mapa a cargar (debe estar en packs/maps.json)
//   &dev=2               nivel de -dev del motor
//   &timer=1             mueve el bucle con temporizadores en vez de requestAnimationFrame
//                        (pestañas ocultas, pruebas automáticas); el motor fija rAF vía vsync
(() => {
  "use strict";

  const params = new URLSearchParams(location.search);
  const statusEl = document.getElementById("status");
  const logEl = document.getElementById("log");
  const canvas = document.getElementById("canvas");

  const LOG_LINES = 400;
  const log = (text, cls) => {
    const line = document.createElement("div");
    if (cls) line.className = cls;
    line.textContent = text;
    logEl.appendChild(line);
    while (logEl.childNodes.length > LOG_LINES) logEl.firstChild.remove();
    logEl.scrollTop = logEl.scrollHeight;
  };
  const setStatus = (text) => { statusEl.textContent = text; };

  const loadScript = (src) => new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`no se pudo cargar ${src}`));
    document.body.appendChild(s);
  });

  async function start() {
    const maps = await fetch("packs/maps.json").then((r) => r.json()).catch(() => []);
    const map = params.get("map") || maps[0];
    if (map && !maps.includes(map)) throw new Error(`mapa ${map} no empaquetado`);

    const args = [
      "-game", "cryoffear",
      "-rodir", "/rodir",
      "-ref", "gles3compat",
      "-dll", "/lib/server.wasm",
      "-clientlib", "/lib/client.wasm",
      "-menulib", "/lib/menu.wasm",
      "-dev", params.get("dev") || "1",
      "-log",
    ];
    if (map) args.push("+map", map);

    window.Module = {
      canvas,
      arguments: args,
      // .data de los paquetes viven en packs/, el resto junto a index.html
      locateFile: (path) => (path.endsWith(".data") ? `packs/${path}` : path),
      preRun: [() => {
        // /rwdir: configuración y partidas, persistente en IndexedDB
        FS.mkdir("/rwdir");
        FS.mount(IDBFS, {}, "/rwdir");
        ENV.XASH3D_BASEDIR = "/rwdir";
        ENV.LD_LIBRARY_PATH = "/lib";
        addRunDependency("idbfs");
        FS.syncfs(true, (err) => {
          if (err) log(`IDBFS: ${err}`, "err");
          removeRunDependency("idbfs");
        });
      }],
      print: (t) => log(t),
      printErr: (t) => log(t, "err"),
      setStatus: (t) => t && setStatus(t),
      onAbort: (what) => { setStatus(`Abortado: ${what}`); log(`abort: ${what}`, "err"); },
      onRuntimeInitialized: () => {
        if (params.get("timer") === "1") MainLoop.requestAnimationFrame = MainLoop.fakeRequestAnimationFrame;
        setStatus(`Ejecutando${map ? ` · ${map}` : ""}`);
      },
    };

    // Guardar /rwdir al salir de la pestaña (configs, partidas)
    addEventListener("pagehide", () => { try { FS.syncfs(false, () => {}); } catch (_) { /* runtime no listo */ } });

    setStatus("Descargando paquetes…");
    const packs = ["engine", "boot", ...(map ? [`map_${map}`] : [])];
    for (const p of packs) await loadScript(`packs/${p}.js`);
    await loadScript("xash3d.js");
  }

  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    setStatus("Contexto WebGL perdido: recarga la página");
  });

  start().catch((e) => { setStatus(`Error: ${e.message}`); log(e.stack || String(e), "err"); });
})();
