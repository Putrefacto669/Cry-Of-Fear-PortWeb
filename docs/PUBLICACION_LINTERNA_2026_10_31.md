# Integración y publicación de la linterna — 31/10/2026

El usuario autorizó expresamente incorporar todos los cambios publicables al repositorio, a la build y a GitHub Pages después del informe de investigación.

Se incorpora a `dist/` la build exacta validada en `/root/cof-audits/flashlight-20261031/dist-view`. La promoción compara SHA-256 y copia únicamente archivos diferentes, sin eliminar archivos existentes. Los paquetes de recursos originales de los mapas y boot no cambian; se actualizan sus índices JS regenerados, el paquete del motor y el manifiesto del Service Worker.

Módulos incorporados:

- Cliente: `e0bc9af55fa19c19b085c88da63eb425f8606976da408425db28fac2517b2222`.
- Renderer: `96f0157663139112577fa451cf8e72cd09055786ae2c7187012630d354b90735`.
- Servidor: `c204b3bba3995d73fc5910eb220c08c1e136f8d310950adc5d749dd523b05444`, sin cambios.

La investigación, los dos defectos corregidos, las 14 regresiones, los nueve contratos BSP, Pointer Lock y la prueba exploratoria fallida con gl_overbright=0 constan en `INFORME_LINTERNA_2026_10_31_CODEX.md`. Se mantiene el filtro anterior y no se declara fidelidad visual completa.

Las comprobaciones de publicación y sus scripts están en `build/validation/flashlight-2026-10-31/publication/`: promoción por hashes, integridad de archivos del manifiesto y gzip. Los análisis originales privados y las partidas generadas siguen excluidos de Git. No se añaden DLL, BSP, modelos ni texturas sueltas.

Repositorio de destino: https://github.com/Putrefacto669/Cry-Of-Fear-PortWeb, rama main.
Página: https://putrefacto669.github.io/Cry-Of-Fear-PortWeb/.
El workflow `.github/workflows/pages.yml` desplegó correctamente la carpeta `dist/` del commit `1c7411168ae7f09e4ce8b2404f9eba160cd619d7`.

## Verificación posterior del sitio publicado

Despliegue satisfactorio: https://github.com/Putrefacto669/Cry-Of-Fear-PortWeb/actions/runs/41255159831.
GitHub registró su finalización el 01/11/2026 a las 00:07:18 UTC (31/10/2026 por la tarde en México).
Manifiesto publicado: `c42da5797a53`.

- Integridad local: 86 archivos del manifiesto y 14 gzip comprobados; 861.472.918 bytes de distribución.
- Seis recursos públicos respondieron HTTP 200 y coincidieron byte por byte con dist/: index.html, sw.js, sw-manifest.js, packs/engine.js, engine.data y engine.data.gz.
- Playwright 1.64.1 / Chromium 156.0.8078.4 ejecutaron el fixture en la URL real de GitHub Pages, con Service Worker activo y controlando la página.
- Los hashes de cliente, servidor y renderer leídos del filesystem del juego en ese navegador coinciden con los tres módulos indicados arriba.
- Pared apagada: 100,125945; encendida: 113,473992; tras guardar/cargar: 113,474224. Los controles r_dynamic y apagado también pasaron.
- Cero errores JavaScript observados durante esa prueba. Resultado del fixture: PASS.

Evidencias: `publication/live-assets.json`, `pages-deployment.json`, `live-browser/`, `live-browser.log` y `live-browser-verified.json`, dentro del directorio de validación. Los scripts de comprobación se conservan allí. El fixture añade COF_SW=1 para probar el Service Worker y registra los hashes de los módulos realmente cargados.

Esta verificación corresponde a una instalación nueva conectada a Internet. No acredita modo offline, migración desde todas las versiones antiguas de caché ni el recorrido natural completo del capítulo. Se conservan las limitaciones originales del informe, incluida gl_overbright=0. Las anotaciones no bloqueantes de versiones de Node/runner de GitHub Actions quedan registradas en pages-run-watch.log; el despliegue terminó con success.

El commit posterior que añade estas evidencias no cambia dist/, por lo que la build publicada sigue siendo exactamente la verificada del commit 1c74111.
