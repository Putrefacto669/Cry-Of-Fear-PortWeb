# Estabilidad de actualizaciones — 3 de noviembre de 2026

Nota posterior: tras entregar esta investigación, el usuario autorizó publicar la candidata. Esa etapa y sus comprobaciones se documentan por separado en [PUBLICACION_SERVICE_WORKER_2026_11_03.md](PUBLICACION_SERVICE_WORKER_2026_11_03.md). El alcance y las limitaciones de la investigación se conservan abajo.

## Conclusión y alcance

La actualización pendiente de `registration.update()` **se reprodujo de forma intermitente** con las versiones históricas en `c_apartment1`, dentro del entorno aislado. Su causa específica todavía no está confirmada. También hubo ejecuciones satisfactorias, incluida la aceptación completa de la actualización histórica. No se atribuye el incidente a concurrencia, audio, IndexedDB o al motor sin evidencia.

Sí se reprodujeron defectos independientes de distribución y se preparó una corrección en `platform/web/`. La Alpha publicada, `dist/`, los recursos originales, el motor y el guardado nativo permanecen intactos. No se hicieron commits, pushes ni despliegues en esta tarea.

Los resultados finales de las repeticiones se recogen al final de este informe. Los intentos fallidos también se conservan.

## Reconstrucción fiel de las versiones

- Publicación antigua: commit `2c371e7`, manifiesto **2f88e7b98c18**; 86 revisiones verificadas.
- Publicación nueva: commit `15f945f`, manifiesto **03fd8c160749**; 90 revisiones verificadas.
- Ambos `dist/sw.js` eran iguales. El cambio de versión se encontraba en el script importado `sw-manifest.js` y sus recursos.
- Se extrajeron copias privadas mediante `git archive <commit> dist`, fuera del repositorio, en `/root/cof-audits/sw-20261103/old` y `new`. No se modificaron esos árboles históricos.
- El servidor aislado cambia el árbol servido bajo el mismo origen HTTP localhost. Permite fallos 503, truncamiento y retención de una petición, sin alterar archivos del juego.
- La candidata final se prepara como `fixed/`, a partir de la publicación nueva, sustituyendo únicamente `loader.js`, `sw.js` y regenerando el manifiesto. `fixture.json` identifica su versión.
- `next/` es una **fixture sintética**, que añade un comentario a `debug.js`. Sirve para probar otra actualización de la candidata sin inventar un tercer lanzamiento histórico ni modificar módulos o recursos de juego.

Las cuatro distribuciones se verifican contra sus manifiestos durante la preparación. Los perfiles persistentes de Chromium y las copias del juego quedan en WSL; no se añaden al repositorio.

## Evidencia y diagnóstico

### 1. Intermitencia reproducida antes de comenzar la descarga de actualización

`baseline-probe` y `baseline-game` registraron `update: resolved`, un worker nuevo en `waiting/installed` y el anterior en `active/activated`. La página siguió controlada mientras esperaba la decisión del jugador, sin errores JavaScript.

Posteriormente, `baseline-apartment` reprodujo una llamada pendiente durante 30 segundos sin fallos inyectados. `apartment-diagnose-1` lo repitió. Los módulos antiguos permanecieron iguales y el HUD siguió emitiendo estados. No hubo `updatefound`, worker nuevo ni una petición HTTP a `sw.js/sw-manifest.js` después de iniciar la llamada.

No fue solo una espera externa bloqueada de Playwright: las consultas periódicas al propio contexto de página devolvieron el estado pendiente y `document.readyState: complete`. El cliente podía ejecutar JavaScript y el servidor seguía activo. La instrumentación localiza el atasco antes de las descargas de actualización, pero no identifica todavía el trabajo interno que lo retiene.

La instrumentación adicional registró una petición Range de música sin finalizar, pero no la demostró causal: al detener los elementos de audio, esa petición se abortó y la actualización siguió pendiente durante otra fase diagnóstica independiente de 30 segundos. Además, `apartment-norefresh` resolvió con la misma petición de música pendiente; la intervención de desactivar dibujo no llegó a ejecutarse. No hay evidencia para corregir el renderizador ni para eliminar música.

`apartment-none-1` también registró una llamada pendiente usando los bytes históricos y forzando únicamente `updateViaCache: none` al registrar. Por tanto, ese ajuste no elimina la intermitencia. En `apartment-cdp`, después del primer plazo, una orden adicional de actualización por DevTools devolvió control, pero la llamada original siguió pendiente durante la siguiente fase de 30 s y tampoco aparecieron peticiones de scripts nuevos. En `apartment-register`, la llamada original resolvió antes de aplicar la intervención; no acredita que volver a registrar recupere un atasco.

`historical-upgrade` ejecutó el arnés histórico corregido contra localhost: conservó cliente/servidor antiguos mientras el nuevo worker esperaba, aceptó con el botón real y montó los módulos esperados de **03fd8c160749**. El texto heredado del log dice “public session”, pero esta ejecución fue aislada en `127.0.0.1:8130`, no un nuevo despliegue público.

El arnés público anterior esperaba directamente `await reg.update()` dentro de `page.evaluate()` y solo escribía el resultado al terminar. Carecía de un límite propio y de registros durante esa llamada. Por eso el cierre manual únicamente permitió identificar dónde estaba suspendido, no qué petición o fase lo retenía.

El nuevo arnés lanza la comprobación, observa su resultado sin bloquear la instrumentación y aplica un límite de **30 segundos**. Registra peticiones, respuestas, fallos, `updatefound`, `installing`, `waiting`, `active`, cambios de estado, `controllerchange` y errores del worker mediante Chrome DevTools Protocol. Cada evento se escribe inmediatamente en JSONL.

Al retener deliberadamente `sw-manifest.js` durante una fase breve controlada, la promesa también queda pendiente sin que deje de responder el cliente activo. Al liberar la petición, resuelve y la instalación llega a `waiting`. Esta inyección sí deja una petición HTTP visible; se distingue del atasco espontáneo anterior a cualquier petición de actualización. No se añadió un timeout mayor ni se presenta esa inyección como causa histórica.

### 2. La caché HTTP puede ocultar una versión sin bloquear la promesa

Las cabeceras públicas observadas para `sw.js` y `sw-manifest.js` incluyen `Cache-Control: max-age=600`; se conservan en `public-headers.json`.

Con los bytes históricos exactos y esas cabeceras, `http-cache/result.json` mostró:

| Registro | Resultado de update() | Nueva versión esperando |
|---|---|---|
| `updateViaCache: imports` (valor anterior por defecto) | resolved | no |
| `updateViaCache: none` | resolved | installed |

El worker principal no había cambiado y el manifiesto importado seguía fresco en la caché HTTP. Se cambió el registro del loader a `updateViaCache: "none"`. Este ajuste afecta la comprobación de scripts del worker; la caché de recursos del juego sigue gestionándose por revisiones. Es un fallo distinto de una promesa que no resuelve. El comportamiento de esta opción se contrasta con [MDN](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/updateViaCache).

### 3. Un miss de caché podía mezclar revisiones

El worker antiguo usaba una clave con el hash de su manifiesto, pero descargaba la URL mutable actual y **no comprobaba los bytes recibidos**. La etiqueta de la entrada no constituía una validación.

En `baseline-probe`, con el worker antiguo todavía activo y el nuevo esperando, la petición no cacheada de `packs/engine.data` devolvió:

- Hash esperado por el árbol antiguo: `037ec1a8d5f57451cffa20879bdbfee6a695761613224a89b1ed52342a0f3f9c`.
- Hash recibido, correspondiente al árbol nuevo: `f6017f6e937f9f6b14f3ca6f8dee1eb523ba3be002977bc0fc242d6a30c7bf84`.
- HTTP 200, sin error JavaScript. El recurso quedaba guardado bajo una clave de revisión antigua.

En una partida ya iniciada, el motor normalmente está cacheado; el mismo mecanismo afecta un paquete de mapa modificado que todavía no se haya descargado. No se confunde esta prueba de integridad con una prueba de progresión de campaña.

La candidata calcula SHA-256 del contenido original y comprueba el prefijo de revisión del manifiesto antes de devolverlo o almacenarlo. Aplica la comprobación a precarga, descargas normales, contenido gzip descomprimido y entradas existentes. Una entrada incorrecta se elimina; un recurso de otra revisión se rechaza. La navegación tampoco almacena un HTML nuevo bajo el hash antiguo: usa su copia verificada si la respuesta de red no corresponde.

La misma falta de verificación se observó con el juego histórico cargado en `c_apartment1`: `apartment-norefresh` y `apartment-register` mantuvieron los módulos antiguos mientras un fetch del paquete todavía ausente de `c_start` obtuvo 75.332.660 bytes de la publicación nueva (`5268d902ae9bb26d8aa5e8921ddf12eebcf590b8430abaa83689970d8f2292bc`). El paquete se descargó como diagnóstico, sin cambiar de nivel ni acreditar progresión.

### 4. Activación con otras pestañas

La activación original llamaba a `clients.claim()`, lo que podía cambiar el controlador de otras partidas abiertas aunque solo una pestaña hubiera aceptado recargar.

La candidata comprueba los otros clientes del ámbito antes de `skipWaiting()`. Si existen, sigue esperando y envía `cof-update-blocked`. El loader reactiva el botón y muestra que deben cerrarse las otras pestañas. Las pruebas cubren dos clientes abiertos, rechazo de activación y aceptación cuando queda el solicitante.

El mensaje `cof-version`, respondido mediante MessageChannel, permite comprobar el manifiesto del controlador efectivo; consultar el manifiesto de red por sí solo no identifica al controlador activo.

### 5. IndexedDB antes de recargar

La actualización anterior dependía de `pagehide`, que no garantiza terminar una escritura asíncrona antes del cierre. Se añadió una espera al mecanismo web existente de `FS.syncfs`, conservando su serialización y coalescencia. El botón solicita esa escritura y solo después envía `skip-waiting`.

Si la escritura devuelve un error, no se acepta la actualización y el botón permite reintentar. Las pruebas usan un guardado nativo real, comparan su SHA-256 y lo cargan después de actualizar. También escriben un marcador pendiente en `/rwdir` para verificar la persistencia antes de la recarga. No se cambia el formato ni el código C++ de guardado de Cry of Fear.

### 6. Fallo de instalación inicial

Al fallar una precarga inicial, el loader anterior continuaba después de su espera de cinco segundos y arrancaba sin controlador. `fresh-failure-before/result.json` registró `runtime: true, controller: false`.

Se conserva el límite existente de cinco segundos: ahora se muestra un error de preparación y se evita arrancar sin controlador cuando se solicitó SW. Tras recuperar la descarga y recargar, la prueba arranca con worker activo. `fresh-failure-after` registró el error esperado, recuperación satisfactoria y cero errores JavaScript. En conexiones lentas, una instalación que exceda esa espera puede requerir recargar; no se amplió el plazo para ocultarlo.

## Código y arneses

Archivos de producto modificados:

- `platform/web/sw.js`: verificación de revisiones, precarga validada, protección frente a otros clientes y consulta de versión.
- `platform/web/loader.js`: registro sin caché HTTP de scripts SW, espera de IndexedDB al aceptar, recuperación del botón bloqueado y parada segura si falla la instalación inicial.

Herramientas añadidas bajo `tools/e2e/`:

- `sw_fixture.py`: servidor con cambio de árbol, fallos controlados y trazas HTTP.
- `sw_prepare.py`: verificación de árboles y construcción privada de candidatas.
- `sw_lifecycle.mjs`: reproducción de los dos lanzamientos históricos.
- `sw_http_cache.mjs`: comprobación de las cabeceras y modos de caché del registro.
- `sw_matrix.mjs`: instalación, rechazo, fallos, reintentos, caché corrupta y coherencia.
- `sw_game_update.mjs`: servidor WASM real, guardado/carga, menú y perfil persistente.
- `sw_initial_failure.mjs`: fallo de instalación inicial y recuperación.
- `sw_validate.sh`, `sw_regressions.sh`: ejecución reproducible y regresiones existentes.

Se modificó además `pages_update.mjs`: mantiene las versiones históricas y sus plazos existentes, añade registro de fases y una espera independiente de confirmación de 30 s; deja de esperar sin límite a la promesa dentro de una llamada al protocolo.

No hace falta compilar C++ con Emscripten para estos cambios web. Se usa el servidor, cliente y renderizador ya publicados; sus hashes se comprueban dentro del runtime. La candidata es un empaquetado aislado de frontend, no una nueva compilación del motor ni una actualización de `dist/`.

## Intentos fallidos conservados

- `game-1`: el guardado persistió, pero los diagnósticos posteriores a la carga fallaron porque `sv_cheats` había vuelto a cero. El motor registró `Unknown command: cof_weapon_status/cof_fence`. Se corrigió el arnés para habilitar sus diagnósticos después de cargar; se conservó el límite de 30 s.
- `game-2`: tras bloquear la aceptación con dos pestañas, el clic siguiente agotó 30 s.
- `game-3`: el clic por coordenadas tampoco completó la operación. La captura `failure.png` muestra el ratón capturado por el juego: los eventos de ratón no llegaban al botón de cabecera. No era una confirmación de fallo del worker.
- `game-4`: recorrido completo satisfactorio con la candidata intermedia. El arnés libera Pointer Lock antes de usar el botón real. En headless, si Escape no libera el cursor, usa `document.exitPointerLock()` y lo registra. No llama al handler de actualización ni fuerza el clic.

La última repetición añade comprobación de navegación real, versión efectiva del controlador y un error inyectado de almacenamiento. Los cambios del adaptador Pointer Lock de producto no se tocaron.

## Límites de las garantías

1. La promesa pendiente se ha reproducido en local, pero falta identificar qué retiene el trabajo antes de que emita peticiones HTTP. No se ha demostrado que las correcciones de integridad eliminen ese atasco intermitente. No se desplegó ni se alteró la Alpha para investigarlo.
2. Un worker histórico que ya está activo conserva su código anterior. Esta corrección no puede añadir retroactivamente verificaciones a `2f88e7b98c18` o `03fd8c160749` sin que se acepte un worker nuevo. La prueba histórica documenta ese riesgo.
3. Si un paquete antiguo no está cacheado y el hosting ya lo reemplazó, la candidata rechaza los bytes incompatibles; no puede reconstruir el recurso antiguo. La partida con recursos ya montados/cacheados continúa, pero no se garantiza cargar un mapa antiguo todavía ausente. Para eso harían falta URLs inmutables o conservar recursos por lanzamiento; queda como decisión posterior de distribución.
4. El manifiesto actual contiene prefijos SHA-256 de 12 caracteres. Se respeta ese contrato; no se presenta como autenticación criptográfica frente a un atacante. Las pruebas comparan SHA-256 completos de los módulos montados.
5. Las peticiones Range de música conservan su ruta anterior; las pruebas de integridad se refieren a paquetes y módulos completos. No se certifica aquí una campaña íntegra sin conexión, otros navegadores, móvil ni sincronización entre dispositivos.
6. El bloqueo de activación cubre los clientes abiertos que se enumeran al aceptar. No se ensayó la carrera de abrir otra pestaña exactamente entre esa enumeración y la activación.
7. No existe un botón separado de rechazo en la interfaz anterior: posponer significa continuar sin pulsar “Nueva versión”. Se comprobó que el worker espera y que no cambia el controlador durante ese aplazamiento.
8. Por inspección, un loader histórico no conoce el mensaje nuevo `cof-update-blocked`: si intenta migrar con otras pestañas abiertas, el worker candidato espera de forma segura, pero la interfaz antigua puede requerir guardar, cerrar las otras pestañas y recargar para volver a ofrecer la actualización. El restablecimiento del botón se comprobó con el loader candidato; no se presenta esa mejora como retroactiva.
9. No se reconstruyó todo el historial de caché/CDN y tiempo de vida de la sesión pública ya cerrada. Se reconstruyeron los bytes exactos y se reprodujo una actualización pendiente en localhost. No se afirma que todos los episodios pendientes compartan una causa interna ya demostrada.

La distinción entre instalación, espera y activación se consulta en la [especificación Service Workers](https://w3c.github.io/ServiceWorker/). Una comprobación que resuelve no acredita por sí sola que haya una versión esperando ni que haya sido aceptada.

## Ejecución y resultados finales

Evidencias en `build/validation/sw-2026-11-03/`: árboles y versiones (`fixture.json`), peticiones HTTP (`http*.jsonl`), eventos de navegador (`trace.jsonl`), resultados y logs del motor. Los perfiles WSL contienen datos de prueba privados y no se incluyen en Git.

Para repetir se necesitan los árboles históricos, Playwright 1.64.1 y Chromium 156. Debe elegirse una salida nueva y un perfil nuevo; los arneses rechazan sobrescribir resultados. Después de preparar `fixed/next`, se sirve con `sw_fixture.py` y se ejecuta `sw_validate.sh <origen-local> <raíz-privada> <evidencias>`. No se debe dirigir este servidor de fallos ni sus controles al sitio público.

### Resultados de la revisión final

- Candidata aislada: **d071fd1b614e**. Fixture siguiente sintética: **787fbb09d6fc**. No son versiones desplegadas.
- `matrix-final-1`, `matrix-final-2`, `matrix-final-3`: **PASS**, diez contratos en cada repetición (30 comprobaciones, no treinta escenarios distintos).
- `game-final`: **PASS**, diez comprobaciones con el servidor WASM real: aplazamiento con partida abierta, aceptación, guardado nativo, carga, recarga, HTML incompatible de red, cierre/reapertura, otras pestañas, error de almacenamiento/reintento y aceptación desde menú. Se verificó navegación real y versión efectiva del controlador.
- `historical-upgrade`: **PASS**, transición aislada completa **2f88e7b98c18 → 03fd8c160749**, con el arnés histórico acotado, el botón real y los hashes esperados del servidor/cliente nuevos. No acredita ausencia de intermitencia en todas las condiciones.
- `fresh-failure-final`: **PASS**, no arranca sin controlador tras fallo de instalación y se recupera al reintentar; cero errores JavaScript.
- Regresiones existentes sobre la candidata final: `phone_singleplayer_punch`, `dual_hands`, `extras_persistence`: **PASS**, SW activo y manifiesto esperado. Incluyen guardados normales/fríos, recargas pendientes, inventario, perfil y visión nocturna. Chromium **156.0.8078.4**. Las escenas originales de `c_start` no se retiraron.
- `pointer_lock.mjs`: **PASS**. No se modificó el adaptador de entrada del producto.
- Sintaxis Node, AST de herramientas Python y sintaxis bash: satisfactorias. `git diff --check` de código/documentación, satisfactorio. `dist/` sin diferencias; HEAD continúa en `f4e12dd`.
- **Pendientes reales retenidos:** `baseline-apartment`, `apartment-diagnose-1`, `apartment-none-1`, `apartment-cdp`. Las actualizaciones antiguas conservaron los módulos y el cliente siguió funcional, pero no completaron la confirmación dentro de 30 s. No se contabilizan como pruebas de estabilidad satisfactorias.

Los cinco módulos montados en `game-final` conservaron estos SHA-256:

| Módulo | SHA-256 |
|---|---|
| server.wasm | c2d9d984a416e6a8552f1a75939c065c0bd983263b0d8206e60c5f5d9e6a69a5 |
| client.wasm | fac7e66382a9915f33534030eab35ab0c8a9e846304e0200000bb300f8cde585 |
| libref_gles3compat.wasm | 8db286f9132d53133c1a9887ef78bf0735dd264962846f2db6b66350d11e0eec |
| filesystem_stdio.wasm | 85e8f987a23b86f6dcabc92acda5e2818653bb155e84b7fab25fdbd3ec507a95 |
| menu.wasm | bbde8c4bcdfc8b61ed538fbcd86c5d92693a35277a7955fa502f5232285e6051 |

`summary.json`, generado por `verify_results.py`, comprueba los resultados, compara los dos fuentes con la candidata servida y conserva explícitamente `originalTimeoutCause: unconfirmed` y `allUpdateConditionsStable: false`.

### Próximo paso recomendado

No declarar solucionado el atasco ni desplegar estas correcciones como si lo eliminaran. La siguiente investigación debe centrarse en la ruta de actualización de Chromium anterior al fetch: trazas de cola de trabajos/registro y comparación de cliente antiguo, llamada directa y comprobación desde otra página. La evidencia actual no justifica tocar física, renderizador, música ni guardado nativo. La integridad de paquetes y la entrada táctil deben seguir tratándose como trabajos separados.
