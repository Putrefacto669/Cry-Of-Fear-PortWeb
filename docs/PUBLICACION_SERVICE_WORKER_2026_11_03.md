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
