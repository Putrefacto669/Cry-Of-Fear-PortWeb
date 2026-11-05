# Publicación del HUD compatible con Gecko — 4 de noviembre de 2026

El usuario autorizó publicar la corrección probada del HUD en GitHub Pages. El prototipo de distribución inmutable y la investigación de trabajos de Service Worker permanecen separados; sus paquetes y registros experimentales no se incorporan a `dist/` ni a este despliegue.

## Contenido

- `platform/web/hud.js` y `dist/hud.js`: tamaños equivalentes con longitudes `vh`/porcentajes, sin división CSS tipada que deja altura cero en Gecko.
- `dist/sw-manifest.js`: grafo **b591c193f94d**, con 90 recursos verificados.
- `dist/sw.js`: importa el manifiesto con `?release=b591c193f94d` para que los clientes existentes descubran la nueva revisión.
- `tools/e2e/hud_css.mjs`: regresión con fixtures sintéticos en Chromium y Firefox, ahora independiente de un servidor local auxiliar.

Se ejecutó el bloque real de manifiesto/pinning de `tools/wsl/package.sh` en una carpeta privada nueva. La comparación de todos sus archivos con la distribución anterior exige exactamente tres diferencias: HUD, manifiesto y worker. Se verificaron los quince gzip contra su contenido descomprimido. Los módulos WASM, paquetes de mapas, recursos originales, inventario y formato de guardado no cambian. No fue necesario recompilar C++.

| Archivo | SHA-256 |
|---|---|
| hud.js | 9ba7204f0483fd79d006c81ea9e16d4822f2bda72f04ae823868f6e9a35cac94 |
| sw-manifest.js | 8ed8dc4448ecc1048ce4bf5bba20fc97dbc32ea27c3cc37e90ee97c4ac314c0c |
| sw.js | 0d31aefac509777dbe85e0a44d632034101abdd9951868b618c0fa1e1368cdcc |

## Pruebas y alcance

La regresión CSS repite las 16 combinaciones de navegador, fuente publicada/candidata y altura de ventana, además de las máscaras originales de ocultación. Chromium 156.0.8078.4 y Firefox 157.0 con Playwright 1.64.1: **PASS**. El baseline reproduce altura cero en Gecko; la candidata conserva dimensiones, recorte y carga de imágenes. No se fuerzan visibles las barras durante las cámaras ni en `c_nightmare`.

`local-native/result.json`: **PASS**, servidor WASM real de `c_apartment1`, imágenes originales cargadas, barras visibles y guardado/restauración nativos con las barras conservadas; `errors: []`. Los tests mantienen el audio silenciado y no modifican el perfil del usuario.

Se conserva una sesión pública anterior al despliegue para comprobar el aviso y el botón real de actualización. La investigación previa de `registration.update()` conserva su límite de 30 s y su causa no confirmada: este cambio de CSS no se presenta como solución de ese atasco.

El contador original de munición sigue pendiente. No se introduce el HUD de Half-Life quitando la condición de traje HEV ni se inventa una interfaz de cargadores. El diagnóstico completo de esta corrección está en [HUD_GECKO_2026_11_04.md](HUD_GECKO_2026_11_04.md).

Evidencias propias de publicación: `build/validation/hud-publication-2026-11-04/`. Los resultados de Actions, comprobación de bytes públicos, sesión anterior y prueba pública nueva se añaden al completar el despliegue.
