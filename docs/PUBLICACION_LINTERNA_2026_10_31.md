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
El workflow `.github/workflows/pages.yml` despliega la carpeta `dist/` al recibir el commit. Su resultado y la comprobación de la página se documentarán después de ejecutar el despliegue; este texto no presupone éxito de una operación pendiente.
