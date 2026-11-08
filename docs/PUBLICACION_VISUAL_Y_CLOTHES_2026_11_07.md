# Publicación de Items / Clothes y avances visuales — 7 de noviembre de 2026

El usuario autorizó en esta sesión los commits de todo el trabajo, el push, la actualización de GitHub Pages y los cambios locales de launcher/distribución. Esta autorización es posterior a la prohibición de publicar que consta como estado histórico en [el informe técnico](FIDELIDAD_VISUAL_Y_CLOTHES_2026_11_07.md).

La build de publicación tiene manifiesto **`a9ef5b6f7e9c`**, conserva exactamente el cliente y servidor validados en el informe y añade un bloque de novedades fechado en el launcher, traducido a sus siete idiomas. El texto anuncia el modelo original de Simon, la selección persistente de prendas y el ruido original; mantiene explícitamente pendiente la comparación de iluminación. También se actualizó la lista de trabajos pendientes, que todavía mencionaba el HUD de munición ya reconstruido.

Antes de copiar a `dist/`, se ejecutaron satisfactoriamente:

- El selector y las novedades en los siete idiomas, persistencia y acceso mediante teclado en Chromium y Firefox (`launcher-release/`). Elegir idioma no descarga el motor y mantiene independiente la preferencia de subtítulos.
- Instalación limpia del Service Worker, confirmación del manifiesto nuevo, modelo de ropa desde el menú, prendas bloqueadas, cierre de interfaz y SHA-256 del cliente/servidor realmente montados (`release-local/`). Sin errores JavaScript.
- Las verificaciones históricas del informe técnico: 18 suites de regresión, pruebas finales de ropa en ambos navegadores, persistencia, recursos y contratos BSP. No se presentan esas ejecuciones como nuevas pruebas realizadas en el sitio público.

`publish_candidate.py` comprueba todos los hashes del manifiesto, cada pareja gzip/datos y la versión del worker antes de copiar la candidata a la carpeta local `dist/`. Después comprueba igualdad de los archivos copiados. Preserva los archivos de verificación de buscadores y el trabajo anterior. No modifica fuentes originales del juego. Las partidas de pruebas y volcados del análisis nativo permanecen ignorados por Git.

Destino autorizado: rama `main` de `Putrefacto669/Cry-Of-Fear-PortWeb`, despliegue por el workflow existente GitHub Pages, sin modificar su arquitectura. Sitio: https://putrefacto669.github.io/Cry-Of-Fear-PortWeb/.

La publicación no convierte la investigación visual parcial en una reconstrucción completa. El fallo aislado de conexión y las limitaciones de captura nativa siguen documentados. La prueba de instalación limpia no demuestra que el antiguo bloqueo intermitente de `registration.update()` haya desaparecido.

## Publicación confirmada

- `051e81f`: implementación, launcher, pruebas e informes, conservando también las ejecuciones fallidas.
- `44d423c`: actualización local de `dist/` y paquete publicado. Comprobados **94 recursos y 15 archivos gzip** antes de copiar; todos los bytes copiados coinciden.
- Ambos commits se enviaron a `portweb/main` sin forzar la historia.
- [GitHub Actions 42443179436](https://github.com/Putrefacto669/Cry-Of-Fear-PortWeb/actions/runs/42443179436): **success**, job deploy en 2 min 54 s, sobre `44d423cf228cb624ab9d3fe0652e08a3a91eec33`.
- `release-public/`: **PASS** contra la URL pública con Chromium 156. Se seleccionó español en el launcher, se verificó el bloque de novedades y se abrió el menú del juego con una instalación limpia de Service Worker. El controlador confirmó `a9ef5b6f7e9c`; Items / Clothes mostró la preview y solo la ropa predeterminada estaba habilitada en ese perfil nuevo. El cierre dejó operativo el menú y no hubo errores JavaScript.
- Los SHA-256 de cliente, servidor, renderizador, filesystem y menú leídos del filesystem del runtime público coinciden con los cinco valores esperados. No se infiere esta integridad únicamente de que Actions finalizara.
- `launcher-public/`: **PASS en Chromium y Firefox** para los siete idiomas, novedades traducidas, persistencia, navegación por teclado y diseño estrecho, sin descargar el motor al elegir idioma y sin errores JavaScript.

La comprobación pública conserva capturas de launcher y ropa, estado del worker, hashes y log. No se modificaron perfiles de usuarios existentes ni se borraron sus cachés o IndexedDB; los ensayos usan contextos nuevos de navegador.

GitHub aceptó el push con avisos por los paquetes de más de 50 MB, inferiores al límite de 100 MB. Actions dejó avisos de deprecación de versiones de sus acciones e imagen Ubuntu; el despliegue no falló y no se cambiaron los workflows dentro de esta actualización.
