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
