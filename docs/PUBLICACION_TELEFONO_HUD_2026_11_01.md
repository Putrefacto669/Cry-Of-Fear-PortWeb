# Integración del teléfono y validación de HUD — 1 de noviembre de 2026

Después del informe de investigación, el usuario autorizó integrar la build, hacer commits y subir los cambios al repositorio público y GitHub Pages mediante «Hazlo porfis». Las restricciones anteriores sobre publicación quedan sustituidas por esa autorización para esta integración.

Se promueve la build exacta validada `/root/cof-audits/phone-hud-20261101/dist-controls` a `dist/`. Se compararon SHA-256 y se copiaron únicamente 17 archivos diferentes, sin eliminar archivos. Los paquetes de recursos originales de boot y de los once mapas permanecen idénticos; se actualizan sus índices JS regenerados, postfx.js, el paquete del motor y el manifiesto.

- Manifiesto: **`2f88e7b98c18`**.
- Servidor: `07e7ef5cb6df07708b5c3c15abb7fd18e6a3bcb17d60efb5ad0e6605c2d37ee1`.
- Cliente conservado: `e0bc9af55fa19c19b085c88da63eb425f8606976da408425db28fac2517b2222`.
- Renderer conservado: `8db286f9132d53133c1a9887ef78bf0735dd264962846f2db6b66350d11e0eec`.

La promoción verificó 104 archivos contra la build aislada y todos los pares gzip. Otra comprobación verificó los 86 hashes del manifiesto y que loader.js, hud.js y postfx.js coinciden con sus fuentes. Evidencia: `build/validation/phone-hud-publication-2026-11-01/`.

La investigación y las 14 regresiones de navegador, nueve contratos BSP, Pointer Lock, callbacks en sesión/frío, HUD, iluminación y zoom están en [el informe de desarrollo](CONTINUACION_TELEFONO_HUD_2026_11_01.md). Se preservan los intentos fallidos y las limitaciones. La corrección afecta a la activación independiente del filtro con F; no se declara solucionado todo el síntoma del clic derecho ni implementados munición, puñetazo o extras.

Los proyectos Ghidra, volcados descompilados y partidas siguen excluidos. No se añaden DLL, BSP, modelos, sprites o sonidos originales sueltos. Se conservan licencias y créditos. Los CRLF de dist/postfx.js se preservan byte por byte; la comprobación de whitespace de código/documentación se ejecuta con `core.whitespace=cr-at-eol` para distinguir esos finales de línea de espacios sobrantes. Los logs brutos se excluyen de esa comprobación: conservan sus espacios de consola originales y no se normalizan para modificar la evidencia.

Repositorio de destino: https://github.com/Putrefacto669/Cry-Of-Fear-PortWeb, rama main. La actualización se realiza sin force push. El workflow de Pages se activa por los cambios en dist/.

La comprobación local posterior a la promoción y la verificación del despliegue público se registran por separado a continuación; no se confunde un push con un despliegue satisfactorio.

## Verificación local de dist/

`local-browser/` pasa el fixture de controles de teléfono y barras con Playwright 1.64.1 / Chromium 156.0.8078.4, Service Worker activo y controlando la página, servidor montado `07e7ef5c…`, cliente/renderer esperados y cero errores JavaScript o WebGL. La comprobación no usa la carpeta aislada como servidor: accede al dist/ promovido en el puerto 8110. Se mantiene el audio silenciado en las pruebas y se conservan los controles normales de ratón y F del fixture; la concesión de equipo sigue siendo diagnóstica, sin acreditar progresión natural.

## Publicación y comprobación de la web real

Commit de código, pruebas, informes y build: **`db413753de39abb18431ef794c430b460beeffd9`**, subido a `portweb/main` mediante avance normal desde `9588f8f`, sin force push.

GitHub Pages terminó con **success**: [ejecución 41384389487](https://github.com/Putrefacto669/Cry-Of-Fear-PortWeb/actions/runs/41384389487). Página comprobada: https://putrefacto669.github.io/Cry-Of-Fear-PortWeb/.

- `live-assets.json`: ocho respuestas públicas HTTP 200 coinciden byte por byte con dist/: manifiesto, postfx, loader, index, SW e índices/datos/gzip del motor. Manifiesto publicado **`2f88e7b98c18`**.
- `live-browser/`: Playwright 1.64.1 / Chromium 156.0.8078.4 abre la URL pública con SW habilitado y controlando la página. Los hashes leídos de `/lib/server.wasm`, `/lib/client.wasm` y `/lib/libref_gles3compat.wasm` coinciden con los de la promoción y de la prueba local.
- Pasa la comprobación de los dos modos del teléfono, clic derecho sin alternancia de luz, F en modo SMS sin filtro independiente, F con navaja encendiendo/apagando la luz del servidor, barras visibles y ausencia de errores JavaScript/WebGL.
- `live-browser-verified.json` y `verify_live_results.py` contrastan despliegue, recursos, módulos y estados reales, sin depender únicamente de la palabra PASS del fixture.
- El audio de las pruebas permanece silenciado. La verificación corresponde a una visita nueva conectada a Internet; no certifica escucha humana, modo offline, toda migración de caché o recorrido natural completo.

Las advertencias de Node/imagen del runner se conservan en `pages-watch.log`; no impidieron el despliegue. No se modificó el workflow para resolver avisos ajenos a esta integración.

Un commit posterior agrega únicamente estas evidencias y documentación. Al no modificar dist/, no cambia ni vuelve a desplegar la build verificada de `db41375`. El síntoma general de iluminación reportado por el usuario sigue con los límites explicados en el informe de desarrollo.
