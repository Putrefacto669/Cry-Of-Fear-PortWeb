# Publicación de la alpha — 2 de noviembre de 2026

El usuario autorizó expresamente commitear todo el trabajo y desplegarlo en GitHub Pages. Se promociona la build exacta validada `/root/cof-audits/dual-20261102/dist-phone-sp-predict` a `dist/`, conservando los archivos existentes y los informes anteriores. Destino de publicación ya establecido: `Putrefacto669/Cry-Of-Fear-PortWeb`, rama `main`.

Esta publicación incorpora los commits locales de extras (`9899747`), combinaciones/puñetazo (`820c739`), ruta visual por evento (`3ca72fc`) y rama interna SP persistente/prioridades de armas (`991cf2a`). No incorpora armas futuras de la lista como si estuvieran implementadas.

## Distribución

- Manifiesto: **03fd8c160749**.
- Servidor: **c2d9d984a416e6a8552f1a75939c065c0bd983263b0d8206e60c5f5d9e6a69a5**.
- Cliente: **fac7e66382a9915f33534030eab35ab0c8a9e846304e0200000bb300f8cde585**.
- Renderizador conservado: **8db286f9132d53133c1a9887ef78bf0735dd264962846f2db6b66350d11e0eec**.

`build/validation/publication-2026-11-02/plan.json` enumera los 42 archivos diferentes respecto de la publicación anterior. Incluye frontend, módulos portables empaquetados, el paquete de extras y los paquetes de recursos re-staged que requieren las entidades ya validadas. No se publican DLL nativas ni proyectos/volcados Ghidra, partidas, BSP, modelos o sonidos sueltos. Se conservan los créditos y las licencias existentes.

Se verificaron **109 archivos, 90 hashes del manifiesto y todos los pares gzip**, además del frontend frente a su fuente. La comparación inicial de index.html falló porque la plantilla contiene `__SOURCE_URL__`; package.sh lo sustituye por la URL del repositorio. Se corrigió el verificador para comprobar esa transformación prevista, sin modificar producto ni omitir contenido distinto. El primer intento se conserva en promotion.log; la verificación satisfactoria está en promotion-final.log y promotion.json. El segundo pase no necesitó copiar de nuevo los archivos ya promovidos.

Git conserva dist/ byte por byte mediante `.gitattributes` (`dist/** -text`), para que las revisiones del SW no cambien por conversión CRLF/LF.

## Pruebas locales de la distribución promovida

Se sirvió el dist/ real del repositorio en puerto 8126. Playwright 1.64.1 / Chromium 156, con audio silenciado. Se añadió a tres suites la opción COF_SW y el registro/comprobación del manifiesto y controlador; sus valores por defecto conservan el comportamiento anterior.

- `local-sp`: **PASS** con SW controlando la página. Impulso SP, evolución angular, vista y persistencia normal/fría. Módulos montados iguales a los promovidos.
- `local-hands`: **PASS** con SW, bolso real, celular/cuchillo y celular/Glock, disparo, recarga y restauraciones, sin duplicar inventario.
- `local-extras`: **PASS** con SW, perfil, partida antigua y transición pendiente de visión nocturna; se mantienen las escenas originales y sus tiempos.

La batería previa de 14 suites, nueve contratos BSP, Pointer Lock, audio, callbacks y partidas antiguas sigue documentada en los informes de desarrollo. Esta promoción no cambia código del juego respecto de aquella build.

## Publicación y comprobación pública

Se registrarán a continuación el commit subido, la ejecución de Actions y la verificación de recursos/módulos públicos. Una subida de Git no se considera por sí sola prueba de despliegue satisfactorio.

La prueba de actualización conserva una sesión pública con la versión anterior hasta que se verifique el despliegue. Comprueba el aviso y botón reales de actualización y la ausencia de mezcla de módulos antes de aceptarlo. Se preserva un primer arranque de ese arnés detenido para corregir la espera de navegación, antes de publicar; no fue un fallo del juego ni del despliegue.