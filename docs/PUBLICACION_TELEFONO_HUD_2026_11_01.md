# Integración del teléfono y validación de HUD — 1 de noviembre de 2026

Después del informe de investigación, el usuario autorizó integrar la build, hacer commits y subir los cambios al repositorio público y GitHub Pages mediante «Hazlo porfis». Las restricciones anteriores sobre publicación quedan sustituidas por esa autorización para esta integración.

Se promueve la build exacta validada `/root/cof-audits/phone-hud-20261101/dist-controls` a `dist/`. Se compararon SHA-256 y se copiaron únicamente 17 archivos diferentes, sin eliminar archivos. Los paquetes de recursos originales de boot y de los once mapas permanecen idénticos; se actualizan sus índices JS regenerados, postfx.js, el paquete del motor y el manifiesto.

- Manifiesto: **`2f88e7b98c18`**.
- Servidor: `07e7ef5cb6df07708b5c3c15abb7fd18e6a3bcb17d60efb5ad0e6605c2d37ee1`.
- Cliente conservado: `e0bc9af55fa19c19b085c88da63eb425f8606976da408425db28fac2517b2222`.
- Renderer conservado: `8db286f9132d53133c1a9887ef78bf0735dd264962846f2db6b66350d11e0eec`.

La promoción verificó 104 archivos contra la build aislada y todos los pares gzip. Otra comprobación verificó los 86 hashes del manifiesto y que loader.js, hud.js y postfx.js coinciden con sus fuentes. Evidencia: `build/validation/phone-hud-publication-2026-11-01/`.

La investigación y las 14 regresiones de navegador, nueve contratos BSP, Pointer Lock, callbacks en sesión/frío, HUD, iluminación y zoom están en [el informe de desarrollo](CONTINUACION_TELEFONO_HUD_2026_11_01.md). Se preservan los intentos fallidos y las limitaciones. La corrección afecta a la activación independiente del filtro con F; no se declara solucionado todo el síntoma del clic derecho ni implementados munición, puñetazo o extras.

Los proyectos Ghidra, volcados descompilados y partidas siguen excluidos. No se añaden DLL, BSP, modelos, sprites o sonidos originales sueltos. Se conservan licencias y créditos. Los CRLF de dist/postfx.js se preservan byte por byte; la comprobación de whitespace se ejecuta con `core.whitespace=cr-at-eol` para distinguir esos finales de línea de espacios sobrantes.

Repositorio de destino: https://github.com/Putrefacto669/Cry-Of-Fear-PortWeb, rama main. La actualización se realiza sin force push. El workflow de Pages se activa por los cambios en dist/.

La comprobación local posterior a la promoción y la verificación del despliegue público se registran por separado a continuación cuando terminan; no se confunde un push con un despliegue satisfactorio.

## Verificación local de dist/

`local-browser/` pasa el fixture de controles de teléfono y barras con Playwright 1.64.1 / Chromium 156.0.8078.4, Service Worker activo y controlando la página, servidor montado `07e7ef5c…`, cliente/renderer esperados y cero errores JavaScript o WebGL. La comprobación no usa la carpeta aislada como servidor: accede al dist/ promovido en el puerto 8110. Se mantiene el audio silenciado en las pruebas y se conservan los controles normales de ratón y F del fixture; la concesión de equipo sigue siendo diagnóstica, sin acreditar progresión natural.
