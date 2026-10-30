// smoke.mjs - Prueba de humo del port web en Chromium sin interfaz (Playwright).
//
//   node smoke.mjs [url] [mapa]           por defecto: http://localhost:8080/ c_cof_forest1
//   (ejecutar desde ~/cof-web/e2e, donde e2e_setup.sh instaló Playwright; ver tools/wsl/e2e.sh)
//
// Tres visitas en el mismo perfil:
//   1. primera visita: el mapa carga, el Service Worker toma el control y guarda lo pesado
//   2. recarga: todo sale del Service Worker, nada de la red
//   3. sin conexión: el juego arranca igual
// Sale con código 1 si algo falla. Escribe una captura en smoke-<visita>.png.
import { chromium } from "playwright";

const base = process.argv[2] || "http://localhost:8080/";
const map = process.argv[3] || "c_cof_forest1";
const url = `${base}?map=${map}&timer=1&fx=0`;
const TIMEOUT = 180_000;

const browser = await chromium.launch({
  // WebGL 2 por software (SwiftShader): no hay GPU en WSL/CI
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"],
});
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();

const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
// El runner headless de CI no tiene dispositivo de audio: AudioContext falla ahí.
page.on("console", (m) => {
  const expected = /Could not load|404|AudioContext encountered an error/;
  if (m.type() === "error" && !expected.test(m.text())) errors.push(m.text());
});

const visit = async (name) => {
  // en el contexto (no en la página) para ver también lo que descarga el propio Service Worker
  const net = { network: 0, networkBytes: 0, fromSW: 0 };
  const onResponse = async (res) => {
    if (res.fromServiceWorker()) { net.fromSW++; return; }
    net.network++;
    const len = Number(res.headers()["content-length"] || 0);
    net.networkBytes += len;
  };
  context.on("response", onResponse);
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    if (!window.CoFRuntimeReady) return false; // FS solo es fiable con el runtime inicializado
    try { return FS.readFile("/rwdir/engine.log", { encoding: "utf8" }).includes("client connected"); }
    catch (_) { return false; }
  }, null, { timeout: TIMEOUT, polling: 500 });
  const loadMs = Date.now() - t0;
  await page.waitForTimeout(1500); // unos frames con el mapa
  context.off("response", onResponse);

  const state = await page.evaluate(async () => {
    const cache = await caches.open("cof-web-v1");
    const keys = await cache.keys();
    return {
      controlled: !!navigator.serviceWorker.controller,
      cachedFiles: keys.length,
      cachedHeavy: keys.filter((k) => /\.(wasm|data)\?/.test(k.url)).length,
      frames: MainLoop.currentFrameNumber,
      isolated: crossOriginIsolated,
    };
  });
  // SwiftShader tarda mucho con mapas con cientos de modelos (CoF: env_model).
  await page.screenshot({ path: `smoke-${name}.png`, timeout: 180_000 });
  return { name, loadMs, ...net, networkMiB: +(net.networkBytes / 2 ** 20).toFixed(1), ...state };
};

const results = [];
let failed = false;
try {
  results.push(await visit("primera"));
  results.push(await visit("recarga"));
  await context.setOffline(true);
  results.push(await visit("offline"));
  await context.setOffline(false);
} catch (e) {
  failed = true;
  errors.push(`fallo: ${e.message.split("\n")[0]}`);
}

const [first, again, offline] = results;
const checks = {
  "el mapa carga": !!first,
  "el SW controla la página": !!first && first.controlled,
  // xash3d.wasm + engine.data + boot.data + el .data del mapa
  "lo pesado (.wasm/.data) queda en caché": !!first && first.cachedHeavy >= 4,
  "la recarga no descarga nada pesado": !!again && again.networkMiB < 1,
  "arranca sin conexión": !!offline,
  "sin errores de página": errors.length === 0,
};
for (const r of results) console.log(JSON.stringify(r));
for (const [k, ok] of Object.entries(checks)) {
  console.log(`${ok ? "OK  " : "FALLO"} ${k}`);
  if (!ok) failed = true;
}
for (const e of errors.slice(0, 10)) console.log(`  ${e}`);
await browser.close();
process.exit(failed ? 1 : 0);
