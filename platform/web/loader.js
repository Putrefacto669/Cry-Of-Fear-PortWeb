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
    // packs/maps.json: lista de mapas (un .data por mapa, package.sh) o
    // {preloaded: true, maps: [...]} cuando todo va dentro de xash3d.data (build_preload.sh)
    const manifest = await fetch("packs/maps.json").then((r) => r.json()).catch(() => []);
    const preloaded = !Array.isArray(manifest) && manifest.preloaded === true;
    const maps = Array.isArray(manifest) ? manifest : manifest.maps || [];
    const map = params.get("map") || maps[0];
    if (map && !maps.includes(map)) throw new Error(`mapa ${map} no empaquetado`);
    const libDir = preloaded ? "/rodir/lib" : "/lib";

    const args = [
      "-game", "cryoffear",
      "-rodir", "/rodir",
      "-ref", "gles3compat",
      "-dll", `${libDir}/server.wasm`,
      "-clientlib", `${libDir}/client.wasm`,
      "-menulib", `${libDir}/menu.wasm`,
      "-dev", params.get("dev") || "1",
      "-log",
    ];
    if (map) args.push("+map", map);

    window.Module = {
      canvas,
      arguments: args,
      // .data de los paquetes viven en packs/; xash3d.data (--preload-file) junto a index.html
      locateFile: (path) => (path.endsWith(".data") && path !== "xash3d.data" ? `packs/${path}` : path),
      preRun: [() => {
        // /rwdir: configuración y partidas, persistente en IndexedDB
        FS.mkdir("/rwdir");
        FS.mount(IDBFS, {}, "/rwdir");
        ENV.XASH3D_BASEDIR = "/rwdir";
        ENV.LD_LIBRARY_PATH = libDir;
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
    const packs = preloaded ? [] : ["engine", "boot", ...(map ? [`map_${map}`] : [])];
    for (const p of packs) await loadScript(`packs/${p}.js`);
    await loadScript("xash3d.js");
  }

  // --- Pointer Lock -------------------------------------------------------------------------
  // El motor activa SDL_SetRelativeMouseMode al jugar (patches/xash3d/0001) y SDL pide el lock
  // en el siguiente gesto del usuario. Aquí solo se mejora lo que SDL no cubre.
  const pointerHint = document.getElementById("pointer");
  let engineReleased = false; // el motor salió del lock (menú abierto), no el usuario
  let lastRealEscape = 0;

  // Movimiento sin aceleración del SO (Chrome/Edge): mirar 360° con sensibilidad constante y sin
  // los picos de movementX de Windows. Si no se soporta, se repite sin opciones.
  const nativeRequestLock = Element.prototype.requestPointerLock;
  Element.prototype.requestPointerLock = function (options) {
    const fallback = () => nativeRequestLock.call(this);
    try {
      const p = nativeRequestLock.call(this, { unadjustedMovement: true, ...options });
      if (p && typeof p.catch === "function") return p.catch(fallback);
      return p;
    } catch (_) {
      return fallback();
    }
  };

  const nativeExitLock = Document.prototype.exitPointerLock;
  Document.prototype.exitPointerLock = function () {
    engineReleased = true;
    return nativeExitLock.call(this);
  };

  addEventListener("keydown", (e) => { if (e.key === "Escape" && e.isTrusted) lastRealEscape = performance.now(); }, true);

  // Esc libera el lock en el navegador y no siempre llega a la página: si el lock se pierde sin que
  // el motor lo pidiera, se le manda un Escape para que abra el menú en vez de quedarse sin ratón.
  const sendEscape = () => {
    for (const type of ["keydown", "keyup"]) {
      const ev = new KeyboardEvent(type, { key: "Escape", code: "Escape", bubbles: true, cancelable: true });
      Object.defineProperty(ev, "keyCode", { get: () => 27 });
      Object.defineProperty(ev, "which", { get: () => 27 });
      dispatchEvent(ev);
    }
  };

  document.addEventListener("pointerlockchange", () => {
    const locked = document.pointerLockElement === canvas;
    pointerHint.textContent = locked ? "Ratón capturado · Esc para liberarlo" : "";
    if (!locked && !engineReleased && performance.now() - lastRealEscape > 200) sendEscape();
    engineReleased = false;
  });
  document.addEventListener("pointerlockerror", () => {
    pointerHint.textContent = "Haz clic en el juego para capturar el ratón";
  });

  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    setStatus("Contexto WebGL perdido: recarga la página");
  });

  start().catch((e) => { setStatus(`Error: ${e.message}`); log(e.stack || String(e), "err"); });
})();
