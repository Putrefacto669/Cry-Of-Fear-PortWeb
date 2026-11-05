# Publicación de la Alpha: HUD de Glock y siete idiomas

Fecha: 4 de noviembre de 2026. El usuario autorizó expresamente todos los commits pendientes, push, actualización de `dist/` y despliegue en GitHub Pages.

## Contenido de la distribución

Lanzamiento **`636f6f29424d`**, promovido desde la candidata privada validada, sin recompilar ni sustituir módulos por otros distintos a los probados.

- HUD de Glock con sprites originales y estado real de cargador/reserva; sin requisito HEV.
- Selector inicial del launcher: español, inglés, francés, alemán, neerlandés, noruego y sueco. Elección persistente e independiente de los subtítulos originales.
- Corrección publicada de vida/energía para Gecko conservada.
- README con Simon, logo original, estado real de compatibilidad, controles y enlaces.

`dist-proof.json` compara todos los archivos contra la candidata. Los únicos cambios permitidos en `dist/` son `index.html`, `loader.js`, `launcher.js`, `sw.js`, `sw-manifest.js` y el par `packs/engine.js` / `packs/engine.data` más su gzip. Se verifican las 91 revisiones del manifiesto y los 15 gzip contra sus originales descomprimidos.

Solo cambia el cliente dentro del paquete del motor. Servidor, motor principal, renderizador, filesystem, menú, mapas y boot conservan los bytes publicados. El cliente esperado en ejecución es `5e9d0053e3d2baf50673362bfcf555e5667224838f223ebde01679d84fe38c26`.

Los informes y herramientas de investigación de Service Worker y distribución inmutable también se conservan en Git. Sus CAS, paquetes históricos privados y perfiles de navegador no se publican ni se incorporan a `dist/`. La distribución pública sigue usando su arquitectura actual.

## Validación previa

Compilación Emscripten 4.0.11 satisfactoria. En Playwright 1.64.1:

- Chromium 156: Glock real, disparo, recarga, bolso, teléfono + Glock, guardado caliente/frío, ocultación por cámara y cambio de mapa de diagnóstico.
- Firefox 157 con Xvfb: servidor WebAssembly, sprites de Glock, disparo, guardado/carga y barras. No acredita captura física del ratón en Gecko.
- Chromium y Firefox: siete idiomas, elección inicial, persistencia, teclado y diseño estrecho; barras de vida/energía y sus reglas de ocultación.
- Regresiones de dual wield, puñetazo de un jugador y adaptador Pointer Lock satisfactorias.

Evidencia detallada y ensayos fallidos conservados en [el informe de implementación](HUD_MUNICION_Y_LAUNCHER_2026_11_04.md) y `build/validation/ammo-hud-2026-11-04/`.

## Límites conservados

No se anuncia como completa la interfaz de cargadores individuales de `AmmoInv`, dos armas de fuego simultáneas, el HUD de todas las armas, toda la campaña o juego móvil. El cociente reserva/capacidad de Glock reproduce la operación comprobada del cliente original, sin convertir la recarga por cartuchos del port en un inventario físico de cargadores. No se declara resuelto el bloqueo intermitente de `registration.update()`.

## Seguimiento del despliegue

Sitio de destino: https://putrefacto669.github.io/Cry-Of-Fear-PortWeb/.

Se conserva una sesión pública de `b591c193f94d` anterior al despliegue para comprobar que la versión antigua retiene sus cinco módulos mientras la nueva espera, y que el botón de actualización monta el cliente nuevo manteniendo los otros cuatro módulos. Los resultados de Actions, bytes públicos y ejecución pública se registran al completar la publicación en `build/validation/publicacion-alpha-2026-11-04/`.


## Resultado público verificado

El commit de distribución **d1974839167a473d74bed182860d172af33b9cb3** se subió a `main`, junto con el commit **1dbfad5** de investigación y herramientas. [GitHub Actions 41958507514](https://github.com/Putrefacto669/Cry-Of-Fear-PortWeb/actions/runs/41958507514) terminó con **success**. Las advertencias del runner sobre Node/ubuntu-latest no impidieron el despliegue; no se cambió el workflow.

- `git-byte-proof.json`: los blobs del commit coinciden con los bytes de la candidata probada.
- `public-assets.json`: **PASS**, doce recursos públicos comparados byte a byte, incluidos el HTML, launcher, worker/manifiesto, HUD, par del motor, gzip y WASM principal.
- `readme-public.json`: **PASS**, README y ambas imágenes accesibles en el repositorio y coincidentes con los archivos de esta revisión.
- `launcher-public/result.json`: **PASS**, siete idiomas, persistencia, teclado y ancho estrecho en Chromium 156 y Firefox 157; sin errores JavaScript ni descarga del motor al elegir idioma.
- `upgrade-live/result.json`: **PASS**, sesión pública real de `b591c193f94d`; `registration.update()` confirmó dentro de su límite original de 30 s. Mientras el worker esperaba, los cinco módulos antiguos se conservaron. El botón real de actualización cargó `636f6f29424d`, con el cliente nuevo esperado y los otros cuatro módulos idénticos. `errors: []`. Este éxito no demuestra que el bloqueo intermitente histórico esté resuelto.
- `ammo-public/result.json`: **PASS**, Glock real en Pages: cámara original oculta el indicador; bolso, navaja sin cargador ficticio, teléfono + Glock, recogida de munición real, disparo 15→14, recarga guardada/restaurada y restauración fría. El cambio de mapa de diagnóstico sin landmark deja el inventario vacío y el HUD lo refleja; no acredita conservación de inventario en una transición natural. Los cinco módulos se registran por hash y `errors: []`.

Las pruebas usan contextos privados de automatización, con audio silenciado; no borran datos del perfil del usuario. Para una pestaña antigua, guardar mediante la mecánica original y aceptar el aviso existente de nueva versión. No hace falta borrar IndexedDB para recibir este lanzamiento.

- `native-public/result.json`: **PASS**, sesión pública nueva con controlador efectivo `636f6f29424d`; los cinco módulos coinciden con la prueba de munición y la sesión actualizada. Vida/energía visibles, imágenes originales cargadas, guardado nativo sincronizado con IDBFS y restauración con barras visibles, sin errores JavaScript.
