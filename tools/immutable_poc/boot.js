/* Private PoC bootstrap: fixes a release, prepares one map, then starts the original loader. */
(async () => {
  'use strict';
  const scope = new URL('./', location.href), releaseId = scope.pathname.split('/').filter(Boolean).pop();
  const params = new URLSearchParams(location.search), map = params.get('map') || 'c_apartment1';
  const status = document.getElementById('status');
  const sha = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
  let releaseLock;
  const metrics = [];
  navigator.serviceWorker.addEventListener('message', e => {if (e.data?.type === 'poc-metric') metrics.push(e.data.metric);});
  const raw = await (await fetch('release.json', {cache: 'no-store'})).arrayBuffer();
  if (await sha(raw) !== releaseId) throw Error('Pinned manifest integrity');
  const manifest = JSON.parse(new TextDecoder().decode(raw));
  const script = src => new Promise((resolve, reject) => {const s = document.createElement('script');s.src = src;s.onload = resolve;s.onerror = reject;document.body.append(s);});
  const reg = await navigator.serviceWorker.register('sw.js', {scope: scope.pathname, updateViaCache: 'none'});
  if (navigator.serviceWorker.controller?.scriptURL !== new URL('sw.js', scope).href) {
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(Error('controller deadline')), 30000);
      const check = () => {if (navigator.serviceWorker.controller?.scriptURL === new URL('sw.js', scope).href) {clearTimeout(t);navigator.serviceWorker.removeEventListener('controllerchange', check);resolve();}};
      navigator.serviceWorker.addEventListener('controllerchange', check);check();
    });
  }
  let compatibility = null, error = null, started = false;
  let syncWrapped = false;
  function wrapSync() {
    if (syncWrapped) return;
    const nativeSync = FS.syncfs.bind(FS), queue = [];
    let active = false;
    const drain = () => {
      if (active || !queue.length) return;
      if (FS.syncFSRequests) {setTimeout(drain, 10);return;}
      active = true;
      const [populate, callback] = queue.shift();
      nativeSync(populate, e => {active = false;try {callback(e);} finally {drain();}});
    };
    FS.syncfs = (populate, callback) => {
      if (typeof populate === 'function') {callback = populate;populate = false;}
      queue.push([!!populate, callback || (() => {})]);drain();
    };
    syncWrapped = true;
  }
  const api = window.ImmutablePoC = {
    releaseId, metrics, manifest,
    get error() {return error;}, get started() {return started;},
    get compatibility() {return compatibility;},
    async prepare(nextMap = map) {
      const result = await new Promise((resolve, reject) => {
        const channel = new MessageChannel();const t = setTimeout(() => reject(Error('prepare deadline')), 30000);
        channel.port1.onmessage = e => {clearTimeout(t);resolve(e.data);channel.port1.close();};
        reg.active.postMessage({type: 'prepare', map: nextMap}, [channel.port2]);
      });
      error = result.ok ? null : result.error;
      if (!result.ok) throw Error(result.error);
      return result;
    },
    async flush() {
      if (!started || !window.CoFRuntimeReady) throw Error('No writable runtime');
      wrapSync();
      await new Promise((resolve, reject) => FS.syncfs(false, e => e ? reject(e) : resolve()));
      // Native save format is untouched. This web sidecar expresses provenance only.
      localStorage.setItem('cof-poc-writer', JSON.stringify({releaseId, saveContract: manifest.persistence.saveContract}));
      return true;
    },
    async start() {
      if (started) return;
      const previous = JSON.parse(localStorage.getItem('cof-poc-writer') || 'null');
      compatibility = !previous || previous.saveContract === manifest.persistence.saveContract ? 'same-contract' : 'unverified-incompatible';
      if (compatibility !== 'same-contract') throw Error('Save compatibility unverified: no automatic migration');
      await new Promise((resolve, reject) => {
        navigator.locks.request('cof-poc-idbfs-writer', {ifAvailable: true}, async lock => {
          if (!lock) {reject(Error('Another runtime owns this storage profile'));return;}
          const held = new Promise(r => {releaseLock = r;});resolve();await held;
        }).catch(reject);
      });
      try {
        await api.prepare();
        params.set('sw', '0');params.set('prefetch', '0');params.set('map', map);
        history.replaceState(null, '', scope.pathname + '?' + params);
        // The distribution adapter installs one extra preRun after the unmodified loader defines Module.
        // Read provenance BEFORE IDBFS population, including storage inherited without a sidecar.
        const dbs = await indexedDB.databases();
        if (!previous && dbs.some(d => d.name === '/rwdir')) throw Error('Existing storage without compatibility provenance: explicit audit required');
        for (const src of ['gpustats.js', 'postfx.js', 'extras.js', 'hud.js', 'loader.js']) if (manifest.resources[src]) await script(src);
        started = true;
      } catch (e) {releaseLock?.();releaseLock = null;throw e;}
    },
    async transition(url) {await api.flush();location.assign(url);},
    async storage() {return navigator.storage.estimate();}
  };
  const freeze = object => {for (const value of Object.values(object)) if (value && typeof value === 'object') freeze(value);return Object.freeze(object);};
  freeze(manifest);Object.freeze(api);
  // Do not voluntarily release during pagehide: native persistence can still be in flight.
  // Web Locks releases ownership when this document is actually destroyed.
  try {
    await api.prepare();status.textContent = 'Lanzamiento preparado · ' + releaseId.slice(0, 12);
    if (params.get('prepare') !== '1') await api.start();
  } catch (e) {
    error = String(e);status.textContent = error;
    const retry = document.createElement('button');retry.textContent = 'Reintentar preparación';retry.onclick = () => api.prepare().then(() => {status.textContent = 'Preparado';retry.remove();}).catch(e => {status.textContent = String(e);});document.body.append(retry);
  }
})().catch(e => {window.ImmutablePoCBootError = String(e);document.getElementById('status').textContent = String(e);});
