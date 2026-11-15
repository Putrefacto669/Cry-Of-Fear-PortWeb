# Versión móvil: texturas, contraseña, rendimiento — Claude Code, 15/11/2026

## Contexto

Partí de la Alpha móvil de Codex publicada (`eeebe6d`, rama `codex/mobile-alpha-release`). Trabajé en un worktree aparte
(`claude/mobile-fixes-20261115`) y en un árbol de WSL propio (`/root/cof-audits/claude-mobile-20261115`), con una copia
del motor canónico.

No toqué el worktree de Codex ni la rama publicada. No hay commits, push ni despliegue.

Tu informe:

- mal rendimiento y tirones;
- texturas de cuadros blancos y negros en las cinemáticas, el tren y el gato;
- el screamer de la pesadilla no se queda enfrente de Simon;
- la contraseña del ordenador se cierra al momento;
- el arrastre para mirar no funciona.

## 1. Texturas a cuadros — reproducido y corregido

**Causa:**

- `stage_map.py --texcomp` empaqueta las texturas del mundo como DDS BC1/BC3 (S3TC). Los WAD originales no se publican.
- En WebGL eso exige `WEBGL_compressed_texture_s3tc`. Casi ningún móvil lo tiene: Adreno, Mali, PowerVR y Apple usan
  ETC2/ASTC.
- Sin esa extensión, `img_dds.c` rechaza el DDS en silencio («silently rejected»). La textura se queda sin datos y el
  motor dibuja su cuadrícula de «falta textura».

**Reproducción** (`tools/e2e/mobile_no_s3tc.mjs`): oculta la extensión como lo haría un teléfono. En `c_intro`, la
versión publicada sin S3TC muestra la cuadrícula magenta en los créditos, el tren y los pasillos, igual que tus
capturas. Con S3TC, como un PC, se ve bien.

**Corrección** (motor, `engine/common/imagelib/img_dds.c`, solo para Emscripten):

- Si la GPU no tiene S3TC y el DDS es DXT1/3/5 2D (no un cubemap), se decodifica el primer nivel a RGBA en la CPU.
- El renderizador genera los mipmaps como con cualquier TGA.
- **Coste:** más memoria de vídeo en móvil, unos 22,6 MiB de texturas por mapa en lugar de 2,9.
- En PC no cambia nada: con S3TC se sigue subiendo el DDS comprimido.

**Verificación:** en la misma prueba, con el motor nuevo y sin S3TC, `c_intro` se ve igual que la versión con S3TC (hoja
comparativa de 15 instantes, de 10 s a 150 s). `xash3d.wasm` pasa a `2e2edb14…`. El `xash3d.js` va emparejado con su
`.wasm` y lleva el gancho de DPR de `package.sh`.

**Trampa encontrada:** sustituir solo el `.wasm` y dejar el `xash3d.js` publicado deja el motor colgado antes de
cargar el servidor, sin error visible.

## 2. La contraseña del ordenador se cierra — reproducido y corregido

**Causa:**

- En móvil, el botón táctil «Usar» abre el diálogo mientras el dedo sigue apoyado.
- Al levantarlo, el navegador genera un `click` de compatibilidad sobre lo que hay debajo, que ya es el fondo del
  diálogo.
- El fondo cerraba el diálogo. En PC no pasa porque se abre con E.

**Reproducción** (`tools/e2e/mobile_computer_tap.mjs`, `c_start2`):

- un toque de 150 ms por CDP, como un dedo. El `tap` de Playwright suelta en el mismo fotograma y el servidor ni lo
  ve;
- el servidor envía `COMPUTER` y el diálogo ya está cerrado a los 150 ms.

**Corrección** (`hud.js`): el fondo y la ✕ solo cierran si la pulsación **empezó** sobre ellos. Con la misma prueba,
el diálogo sigue abierto 1,8 s después y más.

## 3. Rendimiento y tirones — causa probable, cambio solo en móvil

**Lo que pude medir** (`tools/e2e/mobile_perf.mjs`; Chromium con CPU ralentizada 4×, `c_start2`, 45 s):

| Variante | fps | p95 (ms) | Heap JS |
|---|---|---|---|
| Publicada | 8,7 | 216 | **347 MiB** |
| Sin postproceso (`fx=0`) | 9,1 | 200 | 347 MiB |
| Sin precarga (`prefetch=0`) | 8,7 | 200 | **202 MiB** |
| Sin postproceso ni precarga | 8,6 | 216 | 190 MiB |

- **Los fps aquí no valen como referencia.** SwiftShader dibuja en la CPU y domina el tiempo de cada fotograma. Los
  fps de tu teléfono serán otros.
- **La memoria sí es real.** La precarga del mapa siguiente desempaqueta 50–60 MiB en el sistema de archivos en
  memoria (cientos de archivos, en el hilo principal) a los 5 s de empezar cada mapa. Añade unos **145 MiB** de heap y
  ninguno se libera. En un teléfono eso coincide con tirones a mitad de partida y con pausas del recolector de memoria.

**Cambio** (`loader.js`, solo en modo móvil):

- Durante la partida, el paquete siguiente **solo se descarga**: lo guarda el Service Worker o la caché HTTP.
- Se monta en el cambio de nivel, por el camino que ya existía para los paquetes sin montar («changelevel … doesn't
  exist» → montar → `changelevel2`).
- `?prefetch=mount` recupera el comportamiento anterior para comparar. En PC no cambia nada.

**Verificado en emulación:**

- **Memoria:** en `c_start2` el heap baja de 347 a 242 MiB (`perf-warm`).
- **Cambio de nivel en modo móvil, de verdad** (`intro_to_nightmare.mjs … "&input=mobile"`, con Service Worker y
  manifiesto regenerado `257b84b0ef4e`): PASS.
  - A los 217 s el motor pide `c_nightmare`, que aún no está montado, y responde «doesn't exist».
  - El loader monta el paquete desde la caché y repite el cambio. `c_nightmare` arranca a los 241 s.
  - En esos ~24 s sigue la última escena del prólogo. En un teléfono puede durar más.
- **Una pasada anterior no vale:** pasó el parámetro sin `&`, así que corrió en modo PC (montaje durante la partida).
  Se conserva.

**Sin verificar en un teléfono real.** No sé cuántos fps gana ni cuánto se nota. Para medirlo necesito tu modelo de
teléfono o una prueba tuya con este cambio.

## 4. Screamer de la pesadilla — no reproducido

**En el original** (análisis en solo lectura; `hl.dll`, `CCofTeleport`, `100a7990`): `beforetele` coloca a Simon en
(−739, −1416) mirando a −y, copia el ángulo, pone la velocidad a cero y `fixangle`, sin congelar los controles. El
port hace lo mismo.

**Medición** (`tools/e2e/mobile_screamer.mjs`, entrando con el joystick táctil pulsado y, en PC, con W):

- en móvil y en PC, Simon avanza hasta 41 unidades de la cabeza;
- se queda ahí mirándola, con 1° de desvío, hasta el siguiente teletransporte (1,5 s).

**Única diferencia visible:** en una pantalla de 2,16:1, el campo de visión vertical es menor y la cabeza **queda
cortada por arriba**. Falta saber qué ves exactamente: si la cabeza aparece de lado, si Simon la atraviesa o si se ve
cortada.

## 5. Arrastre para mirar — no reproducido

`tools/e2e/mobile_look.mjs` arrastra 160 px en la mitad derecha de tres formas: de golpe, en 0,4 s con 20 pasos y en
1,2 s con 40 pasos. Las tres giran 68°.

- El canvas ya tiene `touch-action:none`.
- El postproceso no tapa el canvas: dibuja en el mismo contexto GL.
- Falta saber con qué teléfono y navegador pasa, y si falla siempre o solo tras abrir algún menú o diálogo.

## Candidata local

`/root/cof-audits/claude-mobile-20261115/cand-tex` es el `dist/` publicado más:

- el motor nuevo (`xash3d.wasm` + `xash3d.js`, con su `.gz`);
- `hud.js` y `loader.js`.

**Falta para publicar:**

- regenerar `sw-manifest.js` con `package.sh`;
- exportar el cambio del motor a `patches/xash3d`. El árbol de WSL es una copia; el canónico no se tocó.

## 6. Opciones de rendimiento en móvil (Pixel 10 Pro XL)

Tu teléfono (Tensor G5, gráfica PowerVR, pantalla de 120 Hz) explica las texturas y apunta a tres costes. En modo
móvil, **Opciones** muestra tres ajustes nuevos, que se guardan en `cofOptions` (`hud.js`, `applyPerformance`):

| Opción | Por defecto | Qué hace |
|---|---|---|
| Limitar a 60 fps | Activada | Mide la mediana del intervalo entre fotogramas. A partir de ~110 Hz el bucle del motor corre uno de cada N (`MainLoop.timingValue = floor(Hz/55)`): 120 Hz → 60 fps. A 60 o 90 Hz, o si el juego ya va por debajo, no cambia nada |
| Viñeta | Activada | Apagada, el pase de postproceso (copiar la imagen entera y volver a dibujarla) deja de ejecutarse salvo con linterna, gris o desenfoque |
| Resolución baja | Desactivada | 1 píxel por píxel CSS en lugar de 1,5 |

**Prueba** `tools/e2e/mobile_options.mjs`: **8/8**.

- `timingValue` 2 da un fotograma del motor por cada 2,03 de pantalla.
- Sin viñeta, el pase cuesta 0 ms (antes 0,68–0,98 ms con SwiftShader).
- La resolución baja reduce el búfer de 1266 × 585 a 844 × 390.
- La tasa se mide después de la carga.

**Fallo propio, corregido:** la primera versión medía la tasa justo durante la carga y daba 1 Hz, con lo que nunca
habría limitado. Ahora mide la mediana de 90 intervalos en cada mapa.

**Sin verificar a 120 Hz:** el navegador de pruebas va a 60 Hz.

## 7. Publicación

**Parche del motor:** `patches/xash3d/0001-root.patch` con `patches.sh export`, que añade 158 líneas, solo de
`img_dds.c`.

- **Trampa:** el árbol canónico `audit-D3Kl5uly` no tiene el cambio de `gl_studio.c` del retrato de la ropa (11/11)
  que sí está en los parches publicados. `check` lo detectó; se aplicó ese trozo del parche al árbol copiado antes de
  exportar.
- El `libref_gles3compat.wasm` publicado ya lo incluye y no se sustituye.

**`dist/`:** el publicado (`eeebe6d`) más el motor nuevo, `hud.js`, `loader.js`, `sw.js` y el manifiesto `963e89b2be10`.
El servidor y el cliente no cambian (`server.wasm` `34094386…`).
