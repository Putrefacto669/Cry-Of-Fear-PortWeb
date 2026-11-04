# Publicación de las protecciones del Service Worker — 3 de noviembre de 2026

El usuario autorizó expresamente los commits, pushes y el despliegue después de recibir el informe de investigación. Esta publicación continúa aquella etapa; las afirmaciones de que no se había tocado `dist/` ni publicado describen el cierre de la investigación anterior a esta autorización.

## Contenido publicado

Se promueve exactamente la candidata aislada **d071fd1b614e**, conservada en `/root/cof-audits/sw-20261103/fixed`. Cambian únicamente `dist/loader.js`, `dist/sw.js` y `dist/sw-manifest.js`. Se comparan todos los archivos de la candidata con `dist/`, las 90 revisiones del manifiesto y los pares gzip. Los paquetes, módulos y recursos de juego permanecen idénticos a la Alpha **03fd8c160749**.

La publicación incorpora verificación de revisiones antes de usar/almacenar respuestas, protección de otras pestañas al aceptar, escritura de IndexedDB antes de recargar, comprobación del manifiesto sin caché HTTP de imports y parada segura si la instalación inicial falla. Incluye los arneses, los resultados satisfactorios y los fallos de la investigación, sin borrar registros históricos.

No se recompila C++: se publica un cambio de frontend y distribución. El motor, cliente, servidor, renderizador y código nativo de guardado no se modifican. Se conservan licencias y créditos.

## Alcance y limitaciones

**No se declara resuelta la promesa intermitente pendiente de `registration.update()`.** La investigación reprodujo llamadas pendientes antes de nuevas peticiones HTTP, también con `updateViaCache: none`. Esos casos siguen registrados como pendientes; no se convierten en PASS por publicar otras correcciones.

La candidata pasó tres repeticiones de diez contratos de caché/ciclo de vida, diez comprobaciones con WASM y guardados reales, las regresiones de puñetazo, combinaciones y extras, recuperación de instalación inicial y Pointer Lock. El informe completo es [SERVICE_WORKER_ESTABILIDAD_2026_11_03.md](SERVICE_WORKER_ESTABILIDAD_2026_11_03.md).

Los workers históricos conservan sus limitaciones hasta ser reemplazados con consentimiento. Los paquetes antiguos ausentes no pueden recuperarse si la URL mutable ya fue reemplazada; la candidata rechaza bytes incompatibles. Una instalación inicial que exceda la espera existente de cinco segundos puede requerir recargar. No se ampliaron plazos para ocultar fallos.

## Comprobación de publicación

Destino: `Putrefacto669/Cry-Of-Fear-PortWeb`, rama `main`, mediante el workflow existente de Pages. Sitio: https://putrefacto669.github.io/Cry-Of-Fear-PortWeb/.

Las evidencias nuevas se conservan por separado en `build/validation/sw-publication-2026-11-03/`. Se verificarán el resultado de Actions, los bytes servidos, una sesión pública antigua conservada antes del push y ejecuciones nuevas con el SW publicado. Los resultados se añaden a continuación al completarse.

### Primer despliegue y fallo real de migración

El commit `45c3cd4` se subió a `main`. [Actions 41750104096](https://github.com/Putrefacto669/Cry-Of-Fear-PortWeb/actions/runs/41750104096) terminó satisfactoriamente. `public-assets.json` verifica los archivos públicos, el paquete de motor y el WASM principal contra sus bytes locales. Las tres suites públicas (`live-regressions/`) pasaron con SW y manifiesto **d071fd1b614e**: puñetazo SP, combinaciones y extras, sin errores JavaScript.

La sesión pública conservada de **03fd8c160749** sí detectó el worker y aceptó el botón, manteniendo sus cinco módulos coherentes. Sin embargo, el worker nuevo respondió que su manifiesto efectivo seguía siendo **03fd8c160749**, aunque la red ya servía el manifiesto nuevo. `upgrade-live/result.json` conserva **passed: false**. Esta vez `update()` resolvió; no fue la promesa pendiente del diagnóstico anterior.

La causa de este fallo concreto es la copia HTTP del manifiesto importado: el cliente antiguo todavía registra con `updateViaCache: imports` y puede reutilizarlo durante 600 segundos. Cambiar esa opción solo en el loader nuevo no corrige retroactivamente el registro del cliente antiguo.

### Corrección adicional de publicación

El worker importa ahora `sw-manifest.js?release=<versión-del-grafo>`. `platform/web/sw.js` contiene un token que `tools/wsl/package.sh` sustituye después de calcular el manifiesto. Así, un grafo nuevo tiene una URL de importación nueva incluso para un cliente con la opción heredada de caché. El SW no pertenece al grafo de recursos; no hay dependencia circular y el manifiesto sigue siendo **d071fd1b614e**.

Se preparó otro árbol privado en `/root/cof-audits/sw-pin-20261103`, conservando intacta la candidata anterior y sus resultados. En `pin-validation/http-cache` y `http-cache-03`, tanto el registro heredado `imports` como `none` obtuvieron un worker esperando con manifiesto **d071fd1b614e**, con cabeceras `max-age=600`. Se probaron los lanzamientos antiguos **2f88e7b98c18** y **03fd8c160749**. `pin-validation/matrix` pasó los diez contratos de fallos/recuperación.

`pin_build.py` ejecuta el bloque real de sustitución de `package.sh` y compara su salida con el worker probado. El primer verificador detectó una diferencia de normalización de saltos de línea; se conservó en `pin-build.log` y no se promovió esa salida. Se ajustó el empaquetado para preservar bytes y `pin-build-verified.log` confirma igualdad exacta y las 90 revisiones intactas. Esta corrección posterior modifica únicamente `dist/sw.js`; no cambia módulos, paquetes ni partidas.

La causa de la promesa intermitente pendiente sigue abierta. Fijar la URL de importación resuelve la reutilización del manifiesto HTTP antiguo comprobada durante esta publicación; no se presenta como solución de aquel otro atasco.

### Despliegue con importación versionada

El commit **bd883c1** incorpora la corrección adicional y se subió a `main`. [Actions 41751440096](https://github.com/Putrefacto669/Cry-Of-Fear-PortWeb/actions/runs/41751440096) terminó con **success**. El manifiesto de recursos continúa siendo **d071fd1b614e**; el worker publicado tiene SHA-256 **9712ce939c7b33c6087454ff345eeadb1f1490101ac25598fc022eec575e6e47**.

`public-pinned-assets.json` comprueba siete respuestas HTTP, incluida `sw-manifest.js?release=d071fd1b614e`, el worker final, el loader, el paquete de motor y el WASM principal. Todos coinciden con los bytes promovidos; los gzip también se comparan después de descomprimir. `git-byte-proof-pinned.json` verifica su identidad con los blobs del commit.

`upgrade-pinned-live/result.json`: **PASS**. Una sesión pública iniciada antes del segundo despliegue conservó sus cinco módulos mientras el worker esperaba; el botón real activó el nuevo worker y recargó. El controlador efectivo respondió **d071fd1b614e**, los cinco hashes montados permanecieron iguales y no hubo errores JavaScript. Esta transición pública comprueba el worker anterior sin URL fijada hacia el final con URL fijada, ambos con el mismo grafo de recursos; no se presenta como una nueva sesión pública del grafo histórico 03fd8c160749.

La comprobación privada `pin-validation/legacy-game` detectó y preparó la actualización desde 03fd8c160749 con el juego real y cabeceras de 600 s, pero agotó 30 s esperando navegación tras el clic. Se conserva con **passed: false**, sin errores JavaScript; no acredita migración completa ni se atribuye una causa sin otra prueba. Las pruebas privadas del manifiesto efectivo con caché heredada y la transición pública anterior siguen registradas por separado.

La repetición sin cambiar código ni plazos, `pin-validation/legacy-game-retry`, completó la migración real **03fd8c160749 → d071fd1b614e** con cabeceras de 600 s: **PASS**, cinco módulos iguales antes/después, botón real, recarga y manifiesto efectivo correcto, `errors: []`. No se descarta ni se convierte en satisfactorio el intento anterior; esta prueba confirma una transición correcta, no estabilidad universal de todas las interacciones del cliente antiguo.

### Cierre de verificación pública

`pinned-live-regressions/` repite las tres suites contra la publicación final con el worker de importación versionada:

- `phone_singleplayer_punch`: **PASS**, impulso SP y persistencia normal/fría.
- `dual_hands`: **PASS**, bolso real, combinaciones, disparo, recarga y restauraciones sin duplicar inventario.
- `extras_persistence`: **PASS**, perfil, guardado antiguo y transición pendiente de visión nocturna, con escenas originales.

Las tres registran el controlador público `sw.js`, manifiesto **d071fd1b614e** y `errors: []`. Playwright 1.64.1 / Chromium 156.0.8078.4, con audio silenciado. No se ampliaron plazos ni se quitaron entidades.

`verify_final.py` consolida estas evidencias en `final-summary.json`, comprueba el commit de Actions, los bytes publicados, el empaquetado del worker y las transiciones correctas, y exige conservar los intentos fallidos. La promesa intermitente pendiente del informe de investigación sigue expresamente sin resolver. La última subida de informe y evidencias no modifica `dist/`; el despliegue de producto comprobado corresponde a **bd883c1**.
