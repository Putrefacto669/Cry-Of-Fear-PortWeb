// loader.js - Arranca Xash3D (WASM) con los paquetes de Cry of Fear.
//
// Orden: define Module -> scripts de paquetes (engine, boot, mapa) -> xash3d.js.
// Los paquetes generados por file_packager se registran como dependencias de arranque,
// así que main() no corre hasta que todos están montados en MEMFS.
//
// Parámetros de URL:
//   ?map=c_cof_forest1   mapa a cargar (debe estar en packs/maps.json)
//   &dev=2               nivel de -dev del motor
//   &sw=0                sin Service Worker (sin caché entre visitas)
//   &debug=1             carga debug.js: CoFDebug.cmd(), leakCheck(), leakTest() (ASan: dist-asan)
//   &mat=0               no usa las texturas DDS de materials/ (comparar VRAM)
//   &vram=1              panel con la VRAM estimada (gpustats.js)
//   &fx=0                desactiva el post-proceso (postfx.js: linterna, grano, viñeta)
//   &timer=1             mueve el bucle con temporizadores en vez de requestAnimationFrame
//                        (pestañas ocultas, pruebas automáticas); el motor fija rAF vía vsync
//   &prefetch=0          no precarga en segundo plano el siguiente mapa
//   &audio=hrtf          sonido 3D de Web Audio con HRTF (por defecto: panorama equal-power)
//   &audio=motor         mezclador del motor (cálculo de GoldSrc) en vez de Web Audio
//                        (pruebas A/B de las voces de Simon, docs/CONTINUATION_2026_10_31.md)
(() => {
  "use strict";

  const params = new URLSearchParams(location.search);
  const debug = params.get("debug") === "1";
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

  // Suscriptores de stderr (informes de ASan para debug.js). Emscripten guarda Module.printErr al
  // arrancar, así que el reparto se hace aquí en vez de sustituir printErr después.
  const stderrHooks = new Set();
  window.CoFStderr = { add: (fn) => stderrHooks.add(fn), remove: (fn) => stderrHooks.delete(fn) };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let flushForUpdate = async () => {};

  // Service Worker (sw.js): caché por revisión entre visitas. En la primera visita se espera a que
  // controle la página antes de pedir .wasm y .data, así se guardan mientras se descargan (una sola
  // descarga). Una versión nueva no se activa sola con el juego abierto: se ofrece un botón.
  async function setupServiceWorker() {
    if (!("serviceWorker" in navigator) || params.get("sw") === "0") return;
    const sw = navigator.serviceWorker;
    let updating = false;
    const offerUpdate = (worker) => {
      const btn = document.getElementById("update");
      btn.hidden = false;
      btn.onclick = async () => {
        btn.disabled = true;
        try {
          await flushForUpdate();
          updating = true;
          worker.postMessage("skip-waiting");
        } catch (e) {
          btn.disabled = false;
          setStatus("No se pudo guardar en el navegador; vuelve a intentar la actualización");
          log(`IDBFS: ${e.message}`, "err");
        }
      };
    };
    try {
      // Pages caches sw-manifest.js for ten minutes. It is imported by an
      // otherwise unchanged worker, so update checks must revalidate its bytes.
      const reg = await sw.register("sw.js", { updateViaCache: "none" });
      if (reg.waiting && sw.controller) offerUpdate(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const w = reg.installing;
        w.addEventListener("statechange", () => {
          if (w.state === "installed" && sw.controller) offerUpdate(w);
        });
      });
      sw.addEventListener("controllerchange", () => { if (updating) location.reload(); });
      sw.addEventListener("message", (event) => {
        if (event.data?.type !== "cof-update-blocked") return;
        updating = false;
        document.getElementById("update").disabled = false;
        setStatus("Cierra las otras pestañas del juego antes de actualizar");
      });
      if (!sw.controller) {
        setStatus("Preparando caché…");
        await Promise.race([new Promise((r) => sw.addEventListener("controllerchange", r, { once: true })), sleep(5000)]);
        if (!sw.controller) throw new Error("No se pudo preparar la caché; recarga para reintentar");
      }
      // sin esto el navegador puede vaciar la caché cuando le falta espacio
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
    } catch (e) {
      log(`service worker: ${e.message}`, "err");
      if (!sw.controller) throw e;
    }
  }

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
    // sin ?map= arranca en el menú original (c_game_menu1, hud.js) si está empaquetado
    const map = params.get("map") || (maps.includes("c_game_menu1") ? "c_game_menu1" : maps[0]);
    if (map && !maps.includes(map)) throw new Error(`mapa ${map} no empaquetado`);
    const libDir = preloaded ? "/rodir/lib" : "/lib";
    // la variante precargada (build_preload.sh) se cachea con --use-preload-cache, sin SW
    if (!preloaded) await setupServiceWorker();

    // Siguiente mapa por mapa (trigger_changelevel de los BSP, tools/gen_transitions.py). El pack
    // se monta en /rodir en segundo plano: al cambiar de nivel el motor ya encuentra el BSP.
    const packaged = new Set(maps.map((m) => m.toLowerCase()));
    const transitionsPromise = preloaded ? Promise.resolve({}) :
      fetch("packs/transitions.json").then((r) => r.json()).catch(() => ({}));
    const prefetchEnabled = !preloaded && params.get("prefetch") !== "0";
    let currentMap = (map || "").toLowerCase();
    let prefetchTimer = 0;
    let baseStatus = "";
    const prefetched = new Set();
    const prefetching = new Set();

    const packMounted = (name) => {
      try { return FS.analyzePath(`/rodir/cryoffear/maps/${name}.bsp`).exists; } catch (_) { return false; }
    };
    const refreshStatus = () => {
      if (!baseStatus) return;
      const pending = [...prefetching];
      setStatus(baseStatus + (pending.length ? ` · precargando ${pending.join(", ")}…` : ""));
    };
    // Los assets vienen de Windows, donde "models/Props" y "models/props" son la misma carpeta. MEMFS
    // distingue mayúsculas: un paquete que escriba la carpeta de otra forma crearía una segunda, y la
    // búsqueda sin mayúsculas del motor (FS_FixFileCase) solo entra en una de las dos y deja de
    // encontrar lo que está en la otra (docs/ENVPOS_CASE_STUDY.md). Se reutiliza la que ya existe.
    const canonicalPath = (path) => {
      let cur = "";
      for (let name of path.split("/").filter(Boolean)) {
        if (!FS.analyzePath(`${cur}/${name}`).exists) {
          try {
            const lower = name.toLowerCase();
            name = FS.readdir(cur || "/").find((e) => e.toLowerCase() === lower) || name;
          } catch (_) { /* el padre aún no existe: se crea con este nombre */ }
        }
        cur = `${cur}/${name}`;
      }
      return cur || "/";
    };
    const splitPath = (path) => {
      const cut = path.lastIndexOf("/");
      return [path.slice(0, cut) || "/", path.slice(cut + 1)];
    };
    // Los paquetes de mapas comparten archivos (modelos, sonidos): file_packager falla con EEXIST
    // en el primero repetido y deja sin montar el resto del paquete. Se sustituye el existente.
    const allowOverlappingPacks = () => {
      const create = Module.FS_createDataFile, createPath = Module.FS_createPath;
      if (!create || create.cofOverlap) return;
      const wrapped = function (parent, name, ...rest) {
        // file_packager llama (rutaCompleta, null, datos, ...)
        const dir = typeof parent === "string" ? parent : parent && FS.getPath(parent);
        const path = canonicalPath(name == null ? dir : dir ? `${dir}/${name}` : name);
        try { if (FS.analyzePath(path).exists) FS.unlink(path); } catch (_) { /* lo crea igual */ }
        return create.call(this, ...splitPath(path), ...rest);
      };
      wrapped.cofOverlap = true;
      Module.FS_createDataFile = wrapped;
      // file_packager crea antes cada carpeta con createPath(padre, nombre, ...)
      if (createPath) Module.FS_createPath = function (parent, name, ...rest) {
        const dir = typeof parent === "string" ? parent : FS.getPath(parent);
        return createPath.call(this, ...splitPath(canonicalPath(`${dir}/${name}`)), ...rest);
      };
    };

    async function prefetchMap(name) {
      name = name.toLowerCase();
      if (!packaged.has(name) || prefetched.has(name) || prefetching.has(name)) return false;
      if (!window.CoFRuntimeReady) throw new Error("runtime no listo");
      if (packMounted(name)) { prefetched.add(name); return true; }
      prefetching.add(name);
      refreshStatus();
      try {
        allowOverlappingPacks();
        await loadScript(`packs/map_${name}.js`);
        const t0 = performance.now();
        while (!packMounted(name)) {
          if (performance.now() - t0 > 180000) throw new Error("tiempo de espera agotado");
          await sleep(250);
        }
        prefetched.add(name);
        log(`precargado: ${name}`);
        return true;
      } catch (e) {
        log(`no se pudo precargar ${name}: ${e.message}`, "err");
        return false;
      } finally {
        prefetching.delete(name);
        refreshStatus();
      }
    }
    async function prefetchFrom(name) {
      const all = await transitionsPromise;
      for (const next of all[name] || []) {
        if (next !== name) await prefetchMap(next);
      }
    }
    const schedulePrefetch = () => {
      if (!prefetchEnabled) return;
      clearTimeout(prefetchTimer);
      prefetchTimer = setTimeout(() => {
        prefetchFrom(currentMap).catch((e) => log(`precarga: ${e.message}`, "err"));
      }, 5000);
    };
    window.CoFPreload = prefetchMap;
    window.CoFPreloadFrom = prefetchFrom;
    window.CoFCurrentMap = () => currentMap;

    const args = [
      "-game", "cryoffear",
      "-rodir", "/rodir",
      "-ref", "gles3compat",
      "-dll", `${libDir}/server.wasm`,
      "-clientlib", `${libDir}/client.wasm`,
      "-menulib", `${libDir}/menu.wasm`,
      // en ventana: el "fullscreen desktop" de SDL usa el soft fullscreen de Emscripten, que oculta
      // el resto de la página (créditos incluidos). La pantalla completa la pide el botón.
      "-windowed",
      "-dev", params.get("dev") || "1",
      "-log",
    ];
    // controles del CoF original (platform/game/cof_web.cfg): TAB bolso, SHIFT correr, CTRL/C agacharse
    args.push("+exec", "cof_web.cfg");
    // Sonido: Web Audio con panorama equal-power. GoldSrc solo reparte volumen entre los oídos; con
    // HRTF las voces de Simon quedaban apagadas bajo la música (prueba A/B del usuario, 01/11/2026).
    // Las dos cvars se guardan en config.cfg, así que se fijan en cada arranque.
    const audio = params.get("audio");
    args.push("+snd_webaudio", audio === "motor" ? "0" : "1", "+snd_webaudio_hrtf", audio === "hrtf" ? "1" : "0");
    // &mat=0: sin texturas DDS de materials/ (para comparar VRAM con las del BSP/WAD sin comprimir)
    if (params.get("mat") === "0") args.push("+host_allow_materials", "0");
    if (map) args.push("+map", map);

    // un solo syncfs a la vez; si se pide otro mientras tanto, se repite al terminar
    let persisting = false, persistAgain = false;
    const persistWaiters = [];
    const finishPersist = (err) => {
      for (const { resolve, reject } of persistWaiters.splice(0)) err ? reject(err) : resolve();
    };
    const persistRwdir = () => {
      if (persisting) { persistAgain = true; return; }
      persisting = true;
      try {
        FS.syncfs(false, (err) => {
          if (err) log(`IDBFS: ${err}`, "err");
          persisting = false;
          if (persistAgain) { persistAgain = false; persistRwdir(); }
          else finishPersist(err);
        });
      } catch (err) { persisting = false; finishPersist(err); /* runtime no listo */ }
    };
    flushForUpdate = () => new Promise((resolve, reject) => {
      persistWaiters.push({ resolve, reject });
      persistRwdir();
    });

    window.Module = {
      canvas,
      arguments: args,
      // build ASan (Emscripten lee las opciones de Module, no del entorno). Sin ASan se ignora.
      //   leak_check_at_exit=0: la página no termina nunca y, si el motor sale por un error, el
      //     informe de fugas de salida taparía el error real; se piden con CoFDebug.leakCheck()
      //   symbolize=0: simbolizar en el navegador recorriendo SIDE_MODULEs provoca un "nested bug"
      //     que se come el informe; las direcciones se traducen con tools/wsl/asan_symbolize.sh
      ASAN_OPTIONS: "leak_check_at_exit=0:symbolize=0",
      // .data de los paquetes viven en packs/; xash3d.data (--preload-file) junto a index.html
      locateFile: (path) => (path.endsWith(".data") && path !== "xash3d.data" ? `packs/${path}` : path),
      preRun: [() => {
        // antes de que los paquetes iniciales (engine, boot, primer mapa) creen sus archivos
        allowOverlappingPacks();
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
      // con ?debug=1 también a la consola del navegador: sigue legible si el hilo se bloquea
      print: (t) => {
        // marcadores HUD del servidor (game/cof-logic/cof/hud.cpp -> hud.js)
        // con -log el motor antepone la hora ("[13:47:06] ") a cada línea
        const line = t.replace(/^\[\d\d:\d\d:\d\d\]\s*/, "");
        const hud = /^\s*COF\/HUD\s+(.+?)\s*$/.exec(line);
        if (hud) {
          if (window.CoFHUD) CoFHUD.handle(hud[1]);
          if (/^EXTRASPROFILE /.test(hud[1])) setTimeout(persistRwdir, 0);
          if (debug) console.log(t);
          return;
        }
        log(t);
        if (debug) console.log(t);
        // el motor escribe la partida en el mismo comando, justo después de esta línea
        if (/^Saving game to /.test(line)) setTimeout(persistRwdir, 0);
        const spawn = /^Spawn Server:\s*(\S+)/.exec(line);
        if (spawn) {
          currentMap = spawn[1].toLowerCase();
          if (window.CoFHUD) CoFHUD.onMap(currentMap);
          baseStatus = `Ejecutando${currentMap ? ` · ${currentMap}` : ""}`;
          refreshStatus();
        } else if (t.includes("client connected")) {
          // ya está en juego: precargar el siguiente sin competir con la carga inicial
          schedulePrefetch();
        }
      },
      printErr: (t) => { log(t, "err"); if (debug) console.error(t); for (const fn of stderrHooks) fn(t); },
      setStatus: (t) => t && setStatus(t),
      onAbort: (what) => { setStatus(`Abortado: ${what}`); log(`abort: ${what}`, "err"); },
      onRuntimeInitialized: () => {
        // señal para herramientas externas (debug.js, pruebas e2e): FS ya está inicializado
        window.CoFRuntimeReady = true;
        if (params.get("timer") === "1") MainLoop.requestAnimationFrame = MainLoop.fakeRequestAnimationFrame;
        if (params.get("fx") !== "0" && window.CoFPostFX) CoFPostFX.attach().catch((e) => log(`postfx: ${e.message}`, "err"));
        baseStatus = `Ejecutando${currentMap ? ` · ${currentMap}` : ""}`;
        refreshStatus();
        // si el motor no imprime "client connected", precargar igualmente tras el arranque
        if (prefetchEnabled) prefetchTimer = setTimeout(() => {
          prefetchFrom(currentMap).catch((e) => log(`precarga: ${e.message}`, "err"));
        }, 15000);
      },
    };

    // Guardar /rwdir en IndexedDB (configs, partidas). syncfs es asíncrono: solo en pagehide la página
    // solía cerrarse antes de terminar y la partida se perdía, aunque el menú la siguiera listando
    // (la lista va en localStorage). Se guarda también en cuanto el motor escribe una partida (print,
    // "Saving game to") y al ocultar la pestaña.
    document.addEventListener("visibilitychange", () => { if (document.hidden) persistRwdir(); });
    addEventListener("pagehide", persistRwdir);

    setStatus("Descargando paquetes…");
    const sharedPacks = preloaded ? [] : await fetch("packs/shared.json").then(r => r.ok ? r.json() : []);
    const packs = preloaded ? [] : ["engine", "boot", ...sharedPacks, ...(map ? [`map_${map}`] : [])];
    if (debug) await loadScript("debug.js");
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
    const fallback = (error) => {
      // Only unsupported raw movement warrants a second request. In particular,
      // retrying an already locked or gesture-denied request cannot fix it.
      if (error.name !== "NotSupportedError") throw error;
      return nativeRequestLock.call(this);
    };
    const observed = (promise) => {
      // SDL's legacy caller ignores the return value. Handle that case without
      // changing the rejection seen by callers that await the returned promise.
      if (promise && typeof promise.catch === "function") promise.catch(() => {});
      return promise;
    };
    try {
      const p = nativeRequestLock.call(this, { unadjustedMovement: true, ...options });
      if (p && typeof p.catch === "function") return observed(p.catch(fallback));
      return p;
    } catch (error) {
      return observed(fallback(error));
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

  // Pantalla completa real del navegador (requiere el clic del usuario); Esc vuelve a la página
  document.getElementById("fullscreen").addEventListener("click", () => {
    canvas.parentElement.requestFullscreen({ navigationUI: "hide" }).then(() => canvas.focus()).catch(() => {});
  });

  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    setStatus("Contexto WebGL perdido: recarga la página");
  });

  const run = () => start().catch((e) => { setStatus(`Error: ${e.message}`); log(e.stack || String(e), "err"); });

  // Launcher (index.html #launcher): without ?map= the page opens on it and the engine only starts
  // on "Jugar". That click is a user gesture, so the browser lets the game's audio start right away.
  // Links with ?map= (tests, shortcuts) go straight to the game as before.
  const launcher = document.getElementById("launcher");
  if (launcher && !params.has("map")) {
    setStatus("En el launcher");
    launcher.hidden = false;
    document.getElementById("play").addEventListener("click", () => {
      launcher.hidden = true;
      canvas.focus();
      run();
    }, { once: true });
  } else {
    run();
  }
})();
