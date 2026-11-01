# Integración local de la Alpha — 1 de noviembre de 2026

El usuario autorizó integrar los cambios y crear commits después de la investigación. El informe `CONSOLIDACION_ALPHA_2026_11_01.md` conserva el estado de aquella etapa, cuando dist/ todavía no se había modificado.

## Integración

- Código, pruebas e investigación: commit `3957099`.
- Se incorporó a dist/ la build validada `/root/cof-audits/alpha-20261031/dist-glock`.
- Se compararon por SHA-256 todos los archivos con `distribution-files.json`: coincidencia completa.
- Solo cambiaron 16 archivos: paquete de módulos compilados y su gzip, scripts de metadatos de empaquetado y sw-manifest.js. Los paquetes .data originales de mapas/boot permanecen iguales.
- Manifiesto: `11319dd82ec8`.
- Servidor WASM: `6d7d62e59aed0311d14028ed110b0dc3b38e4fab188638017271fc6c60d94432`.
- Renderizador WASM: `8db286f9132d53133c1a9887ef78bf0735dd264962846f2db6b66350d11e0eec`.
- Cliente WASM: `e0bc9af55fa19c19b085c88da63eb425f8606976da408425db28fac2517b2222`.

No se hizo push ni despliegue. GitHub Pages no cambia por crear un commit local.

## Verificación

Se conservan las pruebas previas de la misma build: 14/14 navegadores, 9/9 contratos BSP, Pointer Lock, iluminación en cinco apartamentos, voz espacializada antes/después de cargar y recorrido natural del candado.

Además se sirvió **el dist/ del repositorio** explícitamente en el puerto 8105 y se ejecutó una prueba nueva con Playwright 1.64.1/Chromium 156.0.8078.4: daño real de Glock, consumo de munición, conservación de arma/cargador/reserva al guardar y cargar, y disparo posterior satisfactorios. Se verificó el hash del servidor realmente montado en el navegador y no se registraron errores JavaScript. Evidencia: `build/validation/alpha-integration-2026-11-01/glock-smoke/`.

Los guardados generados y volcados nativos privados siguen excluidos. No se recompiló una versión diferente ni se modificaron reglas para integrar el artefacto probado.

## Qué falta, en orden de prioridad

1. Extender la prueba natural desde el candado hasta todos los apartamentos y sus acertijos. Todavía no se acredita completar el capítulo.
2. Probar adquisición natural y uso de la cinta de vídeo de c_apartment3 y de la llave del sótano de c_apartment4, incluyendo restauraciones. Separar fallos del juego de fallos del controlador automatizado.
3. Reconstruir COMBINE, DROP y el archivo de notas con las restricciones originales; validar el guardado durante la inyección de la jeringa antes de decidir una corrección.
4. Terminar la comparación visual con el original y una GPU física. La pared con overbright=0 sigue bajo el umbral histórico; conservar el filtro provisional. Comprobar teléfono cinematográfico, escala del screamer y escucha humana de voces.
5. Completar armas necesarias para la campaña y dual wield; varias clases actuales solo permiten recogida. No añadir modelos sin funcionamiento.
6. Centralizar las etiquetas de interfaz y declarar la cobertura real de idiomas; verificar controles táctiles y persistencia tras cerrar/reabrir el navegador.
7. Aprobar y ensayar la estrategia de alojamiento por capítulos antes de ampliar la distribución. c_basement aún no forma parte de los once mapas preparados.

La corrección de la Glock y este tramo del candado están validados; la Alpha completa sigue pendiente.
