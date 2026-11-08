# Cierre de regresiones — 8 de noviembre de 2026

## Resultado

La candidata **61bebcaccb10** supera la suite de 18 regresiones existente y las comprobaciones complementarias enumeradas abajo. Los contratos BSP terminan con **11 pruebas satisfactorias, sin omisiones**. No se modificó código de producción para conseguir estos resultados.

La suite completa de Claude ya estaba en ejecución al comenzar la revisión: se dejó terminar, se verificó su procedencia y se conservaron sus resultados. No se presenta como una segunda ejecución independiente de las 18 pruebas. Codex ejecutó las comprobaciones complementarias sobre una copia privada congelada de esa misma build.

Evidencia: `build/validation/regresiones-2026-11-08/`. Resumen verificable: `final-summary.json`; procedencia de la suite: `suite-provenance.json`; identificación de módulos y fuentes: `candidate.json`.

## Build y aislamiento

- Servidor original de la suite: `http://127.0.0.1:8091/`, `/root/cof-audits/claude-launcher/merge`.
- Copia congelada: `/root/cof-audits/codex-regressions-20261108/candidate`; complementos ejecutados en `http://127.0.0.1:8155/`.
- Chromium **156.0.8078.4**, Playwright **1.64.1**, Firefox **157.0**. Pruebas gráficas bajo renderizado por software; Firefox con Xvfb.
- Los 94 recursos enumerados por el manifiesto conservan sus digestos declarados (prefijos SHA-256 de 12 caracteres). Los módulos extraídos del paquete tienen SHA-256 completo, contrastado con los módulos realmente montados en las pruebas que los inspeccionan.
- Se conservaron los contratos y límites existentes, incluidas las confirmaciones de 30 segundos. No se retiraron entidades `multiscene1`.
- Audio silenciado en el navegador de pruebas; no se anuló el volumen interno para simular una señal inexistente en las comprobaciones de mezcla.

| Módulo | SHA-256 |
|---|---|
| Cliente | `e0b2b6cc926ac1ba8564512fd493148f2748a959becb7a8e494391ac2b8b6ab1` |
| Servidor | `91ca7418dcdcb520cd1479d77ca6646af79e455158c23f179661a1f46f7954f4` |
| Renderer | `3d0d9d88162ed8e548df2ec236dd19a32d4076985db341619a26abf5737fc1d3` |
| Filesystem | `85e8f987a23b86f6dcabc92acda5e2818653bb155e84b7fab25fdbd3ec507a95` |
| Menú | `bbde8c4bcdfc8b61ed538fbcd86c5d92693a35277a7955fa502f5232285e6051` |

## Suite existente: 18/18

Origen: `/root/cof-audits/claude-launcher/regressions-153416`. Copia preservada en `suite-18/`. Se comprobó la igualdad de los contratos actuales con las copias ejecutadas, descontando únicamente el adaptador de lanzamiento de Chromium y silencio. Cada suite devolvió código 0.

| Suite | Resultado |
|---|---|
| campaign_entities | PASS |
| manager_entities | PASS |
| sound_entities | PASS |
| camera_entities | PASS |
| train_entities | PASS |
| track_entities | PASS |
| envpos_entities | PASS |
| button_entities | PASS |
| changelevel_entities | PASS |
| trigger_persistence | PASS |
| ambient_persistence | PASS |
| callback_behavior | PASS |
| extras_persistence | PASS |
| extras_interactions | PASS |
| phone_singleplayer_punch | PASS |
| dual_hands | PASS |
| ammo_hud | PASS |
| voice_mix_probe | PASS |

## Complementos ejecutados por Codex

| Comprobación | Resultado y alcance | Evidencia |
|---|---|---|
| Contratos BSP | 11/11; paquetes actuales y cotejo de recursos con instalación original | `maps-final.log` |
| Reloj que retrocede | PASS al retroceder `Date.now()` 2000 ms; conexión completada, sin desbordamiento; carga en 1,65 s | `clock-backwards/` |
| Niebla de entidades | PASS en c_start, c_nightmare y c_apartment1: activación, desactivación, restauración y uniformes GPU | `fog/` |
| Niebla de shaders | PASS Chromium/Firefox: inicio, mitad, final y distancia ocular; fallo histórico reproducido y camino exponencial conservado | `linear-fog/` |
| Grises originales | PASS Chromium/Firefox: pesos 0,32/0,59/0,09 y mezclas 0/0,5/1; los pesos históricos fallan el control | `grey/` |
| HUD CSS | PASS Chromium/Firefox: geometría de vida/energía y control del colapso anterior | `hud/` |
| Ropa Chromium | PASS de launcher, preview y coherencia de los cinco módulos | `clothes-chromium/` |
| Ropa Firefox | PASS: doce opciones reales, rechazo de prendas bloqueadas, desbloqueo HLC, selección, IndexedDB, guardado/carga y captura de ratón al iniciar partida | `clothes-firefox/` |
| Lightmaps CoF | PASS de 11 fixtures sobre las funciones C reales; compilación local de fixture satisfactoria | `lightmaps-cof-unittest.log` |
| Lightmaps anteriores/linterna | PASS del camino corregido; el control anterior falla como se esperaba | `lightmap-legacy.log` |
| Pointer Lock | PASS de entrada directa, alternativas compatibles y rechazos | `pointer-lock.log` |

Los fixtures nuevos comprueban RGB y stride, combinación ×2, estilos animados, capas 61/62/63, dirección negativa, saturación, límite de brillo, luz dinámica aditiva e indexación espacial de la linterna. Extraen las funciones reales `R_CofCurve` y `R_CofBuildLightMap` del checkout preparado, evitando una segunda implementación del algoritmo. Se utilizan valores esperados independientes, sin recursos del juego.

La prueba completa de ropa usa preparación diagnóstica y concesión aislada de desbloqueos para cubrir las doce prendas; **no acredita su obtención natural durante la campaña**. Las pruebas de entidades también usan comandos diagnósticos; no sustituyen un recorrido manual.

Además se conservó la prueba de linterna ya realizada por Claude para esta candidata en `flashlight-existing/` y `flashlight-existing.log`: es evidencia previa, no una ejecución adicional de Codex.

## Intentos fallidos conservados

1. `maps.log`: el staging antiguo no contenía `boot/cryoffear/sound/unlockables/nv_on.wav`. El paquete boot congelado sí lo contiene. Se reconstruyó un staging privado directamente de los paquetes exactos, sin editar recursos originales.
2. `maps-from-packages.log`: el descubrimiento de unittest incluyó accidentalmente el nuevo script llamado `test_cof_lightmaps.py`, que exigía `COF_WORK` al importarse. También se había usado `COF_GAME` donde el contrato requiere `COF_ORIGINAL`. Se corrigió únicamente la integración del nuevo test: nombre `test_cof_lighting.py`, entrada unittest y omisión explícita si falta el checkout. Se repitió el contrato BSP con `COF_ORIGINAL` correctamente definido.
3. `maps-final.log`: ejecución definitiva con **11/11, sin skip**. `lightmaps-cof-unittest.log`: nuevo test independiente satisfactorio con sus 11 fixtures.

No se ocultó ninguno de estos intentos ni se modificaron contratos existentes para omitir recursos.

## Archivos y compilación

- Nuevo `tools/e2e/test_cof_lighting.py`: regresión de las funciones reales del constructor de lightmaps, sin assets.
- Nuevo informe presente y carpeta de evidencia separada, con scripts de congelación, extracción privada, procedencia y verificación final.
- Sin cambios de producción realizados por Codex durante este cierre. No se repitió una compilación completa Emscripten: se comprobó la candidata WebAssembly ya compilada y se ejecutó en navegador. El fixture C se compiló y ejecutó localmente con `cc -std=c99 ... -lm`.
- El HEAD inicial observado fue `9d72ae2`; otra sesión de Claude incorporó sus cambios y actualizó dist durante la ejecución, terminando en `69721caca5bdc5c773a947fb3140596a1c2671fe`. Codex no escribió en dist ni ejecutó commits, pushes o despliegues. No se deshicieron esos cambios concurrentes.
- Los hashes de las cinco fuentes anotadas en `candidate.json` seguían iguales al cerrar, incluido el parche del motor y HUD.

## Reproducción

En WSL, desde el repositorio, conservando los paquetes privados indicados en `candidate.json`:

```sh
COF_WORK=/root/cof-audits/audit-D3Kl5uly python3 -B tools/e2e/test_cof_lighting.py
COF_STAGE=/root/cof-audits/codex-regressions-20261108/stage \
COF_ORIGINAL='/mnt/c/Program Files (x86)/Steam/steamapps/common/Cry of Fear/cryoffear' \
python3 -B -m unittest discover -s tools/e2e -p 'test_*maps.py'
```

Los scripts gráficos originales están en `tools/e2e/`: `clock_backwards.mjs`, `fog_entities.mjs`, `linear_fog.mjs`, `grey_weights.mjs`, `hud_css.mjs`, `clothes_release.mjs` y `clothes_menu.mjs`. Emplear carpetas de salida nuevas; las utilizadas aquí se conservan intactas. Las pruebas necesitan los módulos Playwright y navegadores señalados, además de Xvfb para Firefox.

## Límites y conclusión

La candidata pasa las regresiones cubiertas y conserva la coherencia de módulos. Esto no demuestra ausencia universal de fallos intermitentes ni igualdad visual completa con el juego nativo.

Faltan las comparaciones nativo/port de las cinco escenas bajo encuadres y condiciones idénticos, y siguen pendientes las limitaciones de materiales, normal/specular, iluminación de modelos y gamma no unitaria descritas en la auditoría de fidelidad. No se efectuó un recorrido manual completo de campaña ni validación física móvil en este cierre. No se modificaron el motor ni la jugabilidad para resolver las pruebas.
