/* Experimental distribution adapter; no game code. Shared wire CAS, per-release scope. */
'use strict';
const scope = new URL('./', self.location.href);
const release = scope.pathname.split('/').filter(Boolean).pop();
const CACHE = 'cof-immutable-poc-wire-v1';
let manifestPromise;
const sha = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
async function manifest() {
  return manifestPromise ||= (async () => {
    const r = await fetch(new URL('release.json', scope), {cache: 'no-store'});
    if (!r.ok) throw Error('manifest HTTP ' + r.status);
    const bytes = await r.arrayBuffer();
    if (await sha(bytes) !== release) throw Error('manifest hash mismatch');
    return JSON.parse(new TextDecoder().decode(bytes));
  })().catch(e => {manifestPromise = null; throw e;});
}
const mime = n => n.endsWith('.js') ? 'text/javascript' : n.endsWith('.json') ? 'application/json' : n.endsWith('.wasm') ? 'application/wasm' : n.endsWith('.mp3') ? 'audio/mpeg' : n.endsWith('.css') ? 'text/css' : 'application/octet-stream';
async function object(logical) {
  const start = performance.now(), m = await manifest(), entry = m.resources[logical];
  if (!entry) throw Error('resource absent from pinned graph: ' + logical);
  const url = new URL(entry.url, scope.origin), cache = await caches.open(CACHE);
  let response = await cache.match(url), hit = !!response;
  let wire;
  if (response) {
    wire = await response.arrayBuffer();
    if (wire.byteLength !== entry.wireBytes || await sha(wire) !== entry.object) {
      await cache.delete(url); throw Error('cached object integrity: ' + logical);
    }
  } else {
    response = await fetch(url, {cache: 'no-store'});
    if (!response.ok) throw Error('object HTTP ' + response.status + ': ' + logical);
    wire = await response.arrayBuffer();
    if (wire.byteLength !== entry.wireBytes || await sha(wire) !== entry.object) throw Error('network object integrity: ' + logical);
  }
  const decoded = entry.encoding === 'gzip' ? await new Response(new Blob([wire]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer() : wire;
  if (decoded.byteLength !== entry.decodedBytes || await sha(decoded) !== entry.decodedSHA256) throw Error('decoded integrity: ' + logical);
  if (!hit) await cache.put(url, new Response(wire));
  const metric = {release, logical, hit, wireBytes: wire.byteLength, decodedBytes: decoded.byteLength,
    ms: performance.now() - start, payloadBufferBytes: wire.byteLength + (decoded === wire ? 0 : decoded.byteLength)};
  for (const c of await self.clients.matchAll()) c.postMessage({type: 'poc-metric', metric});
  return new Response(decoded, {headers: {'Content-Type': mime(logical), 'X-PoC-Release': release, 'X-PoC-SHA256': entry.decodedSHA256}});
}
self.addEventListener('install', e => e.waitUntil(manifest().then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('message', e => {
  if (e.data?.type !== 'prepare') return;
  e.waitUntil((async () => {
    try {
      const m = await manifest(), packages = m.maps[e.data.map];
      if (!packages) throw Error('unknown map');
      const logical = [...m.startup.frontend, ...packages.flatMap(n => [m.packages[n].metadata, m.packages[n].data])];
      for (const name of new Set(logical)) await object(name);
      e.ports[0].postMessage({ok: true, release});
    } catch (error) {e.ports[0].postMessage({ok: false, error: String(error)});}
  })());
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  const name = decodeURIComponent(url.pathname.slice(scope.pathname.length));
  if (['', 'index.html', 'release.json', 'sw.js', 'poc_boot.js'].includes(name)) return;
  e.respondWith(object(name).catch(error => new Response(String(error), {status: 503, headers: {'Content-Type': 'text/plain'}})));
});
