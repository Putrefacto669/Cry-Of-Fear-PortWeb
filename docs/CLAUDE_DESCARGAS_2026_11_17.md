# Descargas lentas en otras computadoras — 17/11/2026

El usuario probó el port en una computadora del laboratorio y en otra suya: tardaba mucho en descargar.

## 1. Medición (Pages publicado, `b4f0bf2`)

Pages ya sirve los `.data` y el `.wasm` con `Content-Encoding: gzip`, y el Service Worker descarga las copias `.gz`:
no se bajaba nada sin comprimir. A unos 3 MB/s (medido con `curl` desde aquí):

| Hasta | Archivos | Comprimido |
|---|---|---|
| El menú | `xash3d.wasm`, `engine`, `boot`, `extras`, `map_c_game_menu1` | 42 MB |
| Nueva partida | + `map_c_intro` | 62 MB |
| `c_start` | + `c_nightmare`, `c_start` | 124 MB |

Con la red de un laboratorio (compartida, 0,5–2 MB/s) eso son varios minutos antes del menú.

## 2. Causas encontradas

1. **Ningún progreso visible.** `sw.js` descargaba cada paquete entero (`res.arrayBuffer()`), lo verificaba y solo
   entonces respondía: `file_packager` no recibía nada hasta el final. La pantalla de carga solo decía «Cargando…» y el
   estado real iba en la cabecera, que en móvil ni se ve. Parecía colgado durante minutos.
2. **El tiempo del launcher se perdía.** Nada se descargaba hasta pulsar «Jugar».
3. **Imágenes de la interfaz en `boot.data`.** `gfx/vgui` (notas, objetos, armas, las contraseñas, el teclado, las
   introducciones en siete idiomas…) son 45 MiB de TGA, 9,3 MiB comprimidos. Solo las lee `hud.js`: el motor y las DLL
   no las abren (el servidor solo imprime la ruta, `COF/HUD IMAGE`). Iban en el arranque aunque se vean mucho después.
4. Al descargar un `.gz`, el SW lo descomprimía dos veces (una para verificar y otra para servirlo).

## 3. Cambios

- **`sw.js`:**
  - informa a las páginas de los bytes recibidos (`cof-progress`, cada 250 ms) mientras descarga `.data`/`.wasm`;
  - una sola descarga por archivo (`inflight`): una segunda petición espera a la primera y sale de la caché;
  - descomprime una sola vez (verifica y sirve los mismos bytes);
  - las peticiones con `x-cof-warm: 1` solo se aseguran de que el archivo esté en caché y responden 204, sin cuerpo y
    sin descomprimir si ya estaba.
- **`loader.js`:**
  - muestra «Descargando 8,9 de 32,0 MB · 2,4 MB/s» bajo «Cargando…» y en la línea de estado;
  - **descarga anticipada en el launcher** (`warmLauncher`): con el SW en control, descarga uno a uno `xash3d.wasm`,
    `engine`, `boot`, los paquetes compartidos y el menú. No arranca el motor. No lo hace con `?sw=0`, `?prefetch=0` ni
    con el ahorro de datos del navegador.
- **`hud.js`:** `loadTga()` lee primero el sistema de archivos del motor (un paquete de mapa con su propia imagen sigue
  mandando) y, si no está, pide `vgui/<ruta en minúsculas>.png`. Al abrir el menú adelanta las que se ven pronto: el
  tablero de dificultad, el fondo y la hoja del bolso, y la introducción del idioma (y la inglesa de respaldo).
- **`tools/vgui_png.py`** (lo llama `package.sh`): convierte `gfx/vgui` a PNG en `dist/vgui/` y deja fuera de `boot`
  las convertidas. Se quedan en `boot` las que se ven al instante (menú, logos, barras, icono de SMS, menús de objeto:
  0,2 MiB). Los `.psd` y `Thumbs.db` que había en `gfx/vgui` no los lee nada y ya no se empaquetan.
- **`package.sh`:** `boot` se empaqueta desde una copia con enlaces duros (`stage/boot-pack`); `stage/boot` no cambia.
  `vgui/` no entra en la precarga del SW.

Resultado: `boot.data.gz` pasa de 22,8 a 13,4 MB. Hasta el menú, de 42 a 33 MB, y descargados mientras se lee el launcher.

## 4. Pruebas

- **`tools/e2e/download_path.mjs`**, contra un servidor limitado a 3 MB/s por conexión:
  - el launcher deja los cinco archivos en caché en 11,7 s sin cargar `xash3d.js` ni ningún `packs/*.js`;
  - «Jugar» no vuelve a descargar nada;
  - cada archivo pesado se baja una vez, incluso pulsando «Jugar» a mitad de la descarga;
  - la pantalla de carga muestra el progreso en MB;
  - `IMAGE gfx/vgui/640_pass3.tga` llega de `vgui/640_pass3.png` (640×480);
  - la segunda visita no descarga nada pesado.
- **Trampa de la prueba:** `waitForFunction` con un predicado `async` da por buena la promesa al instante. Hay que
  sondear desde Node. Además, Playwright entrega tarde los eventos de red del SW, así que no sirven para separar antes
  y después de un clic: se cuentan todas las descargas del escenario.
- **`launcher_languages.mjs` (Codex) ya fallaba en el dist publicado:** el diálogo de dispositivo de `mobile.js` tapa el
  botón de idioma. Además, su comprobación `noEngineDownload` (ninguna petición a `/packs/` desde el launcher) choca a
  propósito con la descarga anticipada. No se tocó: queda para decidir con el usuario.

## 5. Pendiente

- **Archivos repetidos entre mapas:** 151 MiB de los 549 MiB de los paquetes de mapas (modelos y sonidos compartidos:
  `tunnelnoise.wav` ×4, `player3.mdl` ×4, `skrap.mdl` ×10…). Un paquete compartido ahorraría descarga en cada cambio de
  nivel. Es un cambio de empaquetado mayor.
- `boot` sigue llevando los modelos de armas (6,3 MB comprimidos) y `extras` los trajes (8,3 MB): el motor los necesita
  al montar la partida.
