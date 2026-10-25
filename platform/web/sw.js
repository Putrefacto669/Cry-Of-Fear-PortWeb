// sw.js - Service Worker de Cry of Fear Web: caché por revisión de archivo, offline y actualizaciones.
//
// sw-manifest.js (lo genera tools/wsl/package.sh) define self.COF_MANIFEST:
//   { version, coi, precache: [url...], files: { url: revisión }, gz: { url: { size, gzSize } } }
//
// Estrategia:
//   - instalación: precarga solo lo ligero (precache: html, js, shaders, maps.json). Los .wasm y .data
//     se guardan la primera vez que la página los pide, así la primera visita descarga una sola vez
//     (loader.js espera a que este SW controle la página antes de pedir lo pesado).
//   - archivos del manifiesto: cache-first por revisión (clave url?rev=<hash>). Si cambia un mapa,
//     solo ese archivo cambia de revisión y se vuelve a bajar.
//   - .wasm/.data con copia .gz (manifest.gz): se descarga y se guarda el .gz, y se sirve
//     descomprimido con DecompressionStream. Los hostings no comprimen application/octet-stream.
//   - navegación (index.html): network-first con 3 s de margen, caché si no hay red.
//   - activación: borra revisiones que ya no están en el manifiesto.
//   - una versión nueva espera (no hace skipWaiting sola): con el juego abierto, cambiar motor y
//     paquetes a mitad de sesión rompería la carga del siguiente mapa. La página avisa y el usuario
//     decide (mensaje "skip-waiting").
//   - coi: true -> añade COOP/COEP/CORP a las respuestas, para hosts que no dejan configurar
//     cabeceras (GitHub Pages). Solo hace falta si se activan hilos (SharedArrayBuffer).
"use strict";

importScripts("sw-manifest.js");

const M = self.COF_MANIFEST;
const CACHE = "cof-web-v1"; // esquema de caché, no versión del juego
const scope = new URL(self.registration.scope);
const toKey = (path) => new URL(`${path}?rev=${M.files[path]}`, scope).href;
const pathOf = (url) => {
  const u = new URL(url);
  return u.origin === scope.origin && u.pathname.startsWith(scope.pathname)
    ? u.pathname.slice(scope.pathname.length) || "index.html"
    : null;
};

const withIsolation = (res) => {
  if (!M.coi || res.type === "opaque") return res;
  const h = new Headers(res.headers);
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  h.set("Cross-Origin-Embedder-Policy", "require-corp");
  h.set("Cross-Origin-Resource-Policy", "same-origin");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
};

// red sin caché HTTP intermedia: la revisión del manifiesto es la única fuente de verdad
const fetchFresh = (path) => fetch(new URL(path, scope).href, { cache: "no-store" });

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(M.precache.map(async (path) => {
      if (await cache.match(toKey(path))) return;
      const res = await fetchFresh(path);
      if (!res.ok) throw new Error(`precache ${path}: ${res.status}`);
      await cache.put(toKey(path), res);
    }));
    // primera instalación: no hay versión anterior a la que esperar
    if (!self.registration.active) await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const valid = new Set(Object.keys(M.files).flatMap((p) => [toKey(p), `${toKey(p)}&gz`]));
    for (const name of await caches.keys()) {
      if (name.startsWith("cof-web-") && name !== CACHE) await caches.delete(name);
    }
    const cache = await caches.open(CACHE);
    for (const req of await cache.keys()) {
      if (!valid.has(req.url)) await cache.delete(req);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

const MIME = { ".wasm": "application/wasm", ".data": "application/octet-stream" };
const gzipOk = typeof DecompressionStream === "function";

// la copia .gz en caché -> respuesta con el contenido original, como la esperan file_packager e
// instantiateStreaming. Si el hosting ya la sirvió con Content-Encoding, el navegador la
// descomprimió al descargarla y no hay que hacerlo otra vez.
const inflate = (res, path) => {
  const encoded = /gzip/.test(res.headers.get("x-cof-encoding") || "");
  const body = encoded ? res.body.pipeThrough(new DecompressionStream("gzip")) : res.body;
  const ext = path.slice(path.lastIndexOf("."));
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": MIME[ext] || "application/octet-stream", "Content-Length": String(M.gz[path].size) },
  });
};

const cacheFirst = async (path) => {
  const cache = await caches.open(CACHE);
  const packed = gzipOk && M.gz && M.gz[path];
  const key = packed ? `${toKey(path)}&gz` : toKey(path);
  const hit = await cache.match(key);
  if (hit) return packed ? inflate(hit, path) : hit;

  const res = await fetchFresh(packed ? `${path}.gz` : path);
  // solo respuestas completas: una 206 o un error no se guardan
  if (res.status !== 200) return packed ? fetchFresh(path) : res;
  if (!packed) {
    await cache.put(key, res.clone());
    return res;
  }
  // se guarda lo recibido y si sigue comprimido (sin Content-Encoding del hosting)
  const stillGzip = !res.headers.get("content-encoding");
  const stored = new Response(await res.arrayBuffer(), {
    headers: { "x-cof-encoding": stillGzip ? "gzip" : "identity" },
  });
  await cache.put(key, stored.clone());
  return inflate(stored, path);
};

const networkFirst = async (request, path) => {
  const cache = await caches.open(CACHE);
  try {
    const res = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
    ]);
    if (res.ok && M.files[path]) await cache.put(toKey(path), res.clone());
    return res;
  } catch (_) {
    const hit = M.files[path] && await cache.match(toKey(path));
    if (hit) return hit;
    throw _;
  }
};

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || req.headers.has("range")) return;
  const path = pathOf(req.url);
  if (path === null) return; // otro origen: no se toca

  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req, "index.html").then(withIsolation));
  } else if (M.files[path]) {
    event.respondWith(cacheFirst(path).then(withIsolation));
  }
});
