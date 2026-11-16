# Alpha móvil · 15 de noviembre de 2026

La candidata `4e6cb6608ea9` parte de `ed21f7d`, la versión publicada con escaleras animadas y el ajuste de recarga dual. Contiene el selector de dispositivo, el HUD táctil, el menú en horizontal o vertical, el aviso de actualización, el acceso a escaleras y la restauración de la dirección de salida al cargar durante una escalada.

El anuncio del launcher está disponible en los siete idiomas existentes. Conserva las instrucciones de los modos PC y móvil. Se recompilaron los módulos Emscripten de cliente y servidor. Se conservó la geometría del BSP de la pesadilla y solo se añadió su ajuste de entidades. El manifiesto verifica los 97 archivos y las copias comprimidas de los dos paquetes modificados se contrastaron con sus datos crudos.

En Chromium emulado pasaron los controles simultáneos, la interacción con la trampilla, teclado y Pointer Lock, y la restauración al subir o bajar nerdclimb3. La prueba de los siete idiomas pasó en Chromium y Firefox. Las pruebas de grabadora y recuperación al reabrir el navegador se documentan en el informe de implementación. Quedan pendientes la validación física de Android y Safari iOS y el recorrido completo de campaña.
