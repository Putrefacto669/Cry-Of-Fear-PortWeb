# Linterna dinámica — investigación y correcciones de Codex

Fecha: 31 de octubre de 2026. Estado: dos defectos corregidos y verificados; **no se acredita todavía un reemplazo visual completo de la linterna del original**. Se conserva el filtro anterior.

## 1. Estado recuperado y procedencia

Repositorio de Windows: `C:\Users\josue\OneDrive\Desktop\Cry Of Fear Web Alpha Version\Cry-Of-Fear-Port-Web`.
Rama: `codex/c-start-padlock`. HEAD al comenzar y terminar: `2d1896c`, del 31/10/2026 a las 17:10:40 -0600. No se hicieron commits, pushes ni despliegues.

Se leyeron CLAUDE.md, README.md, CONTINUATION_2026_10_31.md e INFORME_MEJORAS_2026_10_31.md; se inspeccionaron Git, los parches y los árboles de WSL. El cambio inicial sin confirmar en `patches/hlsdk/0001-root.patch` era una reordenación del bloque de sound.cpp: 62 líneas desplazadas sin cambiar su contenido. Se conservó, junto con los cambios anteriores de Claude.

WSL canónico: `/root/cof-audits/audit-D3Kl5uly`; no se utilizó el árbol antiguo `/root/cof-web`.

Claude había dejado las llaves desde el bolso, idiomas, launcher y el foco parcial de servidor/cliente/renderer. Los hashes demuestran que el paquete local `claude-launcher/dist` y el `dist/` principal contienen esos mismos módulos. **No se verificaron por red los bytes del sitio publicado.**

Distribuciones de esta investigación, separadas de la principal:

- `/root/cof-audits/flashlight-20261031/dist`: corrección del índice de luxel solamente; servidor de prueba en 8097.
- `/root/cof-audits/flashlight-20261031/dist-view`: ambas correcciones; servidor de prueba en 8098.
- Referencia local anterior de Claude: `/root/cof-audits/claude-launcher/dist`, 8091, conservada intacta.

## 2. Problema, entorno y referencia original

El informe de Claude describía una variación global de 58,9 a 60,2, insuficiente para acreditar luz sobre el mundo. No se conservaron aquí las condiciones exactas de aquella captura; se construyó un escenario propio y reproducible.

Entorno comprobado: Xash3D FWGS, Emscripten 4.0.11, WebAssembly, WebGL 2, Playwright **1.64.1**, Chromium **156.0.8078.4**, ANGLE/SwiftShader. Ventana 800×600; framebuffer del motor 800×347. Son pruebas de navegador sin interfaz, no una inspección manual con GPU física.

Se releyeron las funciones originales `FUN_100aea10` y `FUN_1005ab50` mediante Ghidra en modo **-readOnly -noanalysis**, sobre el proyecto local autorizado del cliente. Se corroboraron el alcance 700, el patrón `gfx/flashlight.tga`, color 0,46/0,46/0,51, traza de 150, apertura 50 más hasta 30 y suavizado con factor 10. La generación original de la textura de atenuación es cuadrática. Hay también ramas de luz reducida y `gfx/low_flashlight.tga`, cuya equivalencia completa no se implementó ni se acredita.

Los volcados originales quedan privados e ignorados por Git en el directorio de validación. No se copiaron DLL, BSP, modelos ni texturas al repositorio para esta tarea. No se ejecutó el juego nativo ni se dispone de una captura equivalente del original para calibración visual.

## 3. Reproducción e instrumentación

Mapa real: `c_apartment1`. Se deja terminar su introducción. La carga directa no entrega el inventario de la campaña: el fixture entrega teléfono y navaja mediante los comandos existentes y equipa la navaja. Así se satisface la condición real del comando `flashlight`. Esto **no acredita progresión natural**.

Se desactivan grano, viñeta, gris y desenfoque para las mediciones. El filtro de linterna anterior se activa únicamente en su captura de comparación. El foco del servidor se conmuta por separado.

Posición de vista: aproximadamente `(-818.969, -159.969, 346.062)`. Se compara primero el pasillo, mirando a yaw 0, y después una pared del BSP, a yaw 90,0165 y pitch prácticamente 0. El giro utiliza eventos relativos de ratón que pasan por SDL; no se teletransporta ni se fijan ángulos con comandos en las pruebas finales.

Medición: `gl.readPixels` al terminar el frame. La región central ocupa x/y entre el 35 % y el 65 % del framebuffer. Se calcula luminancia de los bytes RGB como `0,2126R + 0,7152G + 0,0722B`, escala 0–255. Es una medida comparativa del framebuffer, no luminancia física ni una medición lineal calibrada. Las capturas PNG incluyen la interfaz; los cálculos usan exclusivamente el framebuffer del motor.

Se registran posición/orientación, cvars, intervalos del bucle, errores JavaScript, `gl.getError()` y llamadas `texSubImage2D`. Los formatos observados fueron RGBA/UNSIGNED_BYTE (6408/5121). El contador es global: no se atribuyen todas sus llamadas exclusivamente a lightmaps.

Control causal: con el foco encendido se pone `r_dynamic=0`, se captura, se restaura a 1 y se captura otra vez. Así se distingue iluminación del mundo de efectos sobre modelos y del filtro web.

Las confirmaciones `cof_fence` conservan su límite de **30 segundos**. No se retiraron las cuatro instancias de `multiscene1` ni se editaron mapas o condiciones de las regresiones existentes.

## 4. Causas demostradas y correcciones

### A. Índice de lightmap equivocado

En `R_BuildLightMap`, el bucle de filas declara `t`, pero el bucle interior de canales declara otro `int t` para el brillo. La suma del foco indexaba `r_spotlight[(s + t * smax) * 3 + i]` usando **brillo como fila**. Leía otras muestras en lugar del luxel actual.

Corrección mínima: obtener el puntero al luxel antes de entrar al bucle de canales y sumar `spot[i]`. No se alteran la gamma, el brillo global, el alcance ni el color del foco.

Prueba del bucle C real, extraído del renderer: el código anterior falla en luxel 3/canal 0, obteniendo 3 en lugar de 26. El corregido pasa muestras RGB distintas por luxel, superficie negra e iluminada, foco apagado/encendido, las dos ramas de gamma con tabla de prueba no idéntica, saturación y alfa.

### B. Renovación después de dibujar el mundo

`CoF_ClientFrame` era llamado desde `HUD_DrawNormalTriangles`. En Xash, `R_PushDlights` y `R_DrawWorld` ya se habían ejecutado en ese punto. El mundo utilizaba la luz del frame anterior; si pasaban más de 0,1 segundos de tiempo de cliente, caducaba antes de volver a marcar las superficies.

Reproducción independiente del defecto A: con el índice ya corregido se instala, únicamente en el fixture, una pausa de 160 ms por iteración. La mediana observada fue 326,57 ms. La pared deja de recibir luz: 100,125945 tanto apagada como encendida. `fps_max 5` no era una reproducción suficiente: el motor limita esa cvar a un mínimo de 20 FPS.

Corrección mínima: renovar el foco desde `V_CalcRefdef`, después de calcular la vista y **antes de renderizar el mundo**. Se usan origen y ángulos de la vista final para que el marcado y la proyección correspondan a la misma cámara. Fog y partículas mantienen sus callbacks anteriores. No se aumenta la duración de la luz ni se cambian límites de prueba.

Con la misma pausa diagnóstica y ambas correcciones, la mediana fue 301,97 ms y la pared recupera el incremento de 13,348047. La pausa no existe en el producto; solo se instala cuando se especifica `COF_FRAME_DELAY_MS` en la prueba.

## 5. Resultados gráficos y persistencia

Región central sobre la pared real del BSP; `gl_overbright=1`, `gl_vbo=0`:

| Variante / registro | Apagada | Encendida | r_dynamic=0 | Reactivada |
|---|---:|---:|---:|---:|
| Claude, `claude-wall90` | 100,126056 | 100,126045 | 100,126056 | 100,126056 |
| Solo índice, `index-wall90` | 100,125945 | 113,473992 | 100,125945 | 113,473992 |
| Ambas, `view-wall90` | 100,136188 | 113,518902 | 100,136188 | 113,518902 |
| Solo índice, pausa 160 ms | 100,125945 | 100,125945 | 100,125945 | 100,125945 |
| Ambas, pausa 160 ms | 100,125945 | 113,473992 | 100,125945 | 113,473992 |
| Ambas, repetición `view-repeat` | 100,125945 | 113,473992 | 100,125945 | 113,473992 |

Las pequeñas diferencias entre corridas normales corresponden a cuantización de pitch; dentro de cada comparación se verificó la misma posición y orientación. El resumen automatizado comprueba variación de pose inferior a 0,001 entre las capturas de cada secuencia.

En la repetición normal, el pasillo mirando al frente da 47,006 apagada, 222,868 con el filtro anterior y 49,421 con el foco. El filtro no representa una referencia del original: multiplica toda la imagen dentro del cono. El incremento sobre una pared dentro del alcance resulta más informativo que el promedio de un pasillo cuyo fondo queda lejos.

Guardar/cargar con la linterna encendida, sin volver a activarla tras cargar:

- Normal: 113,473992 antes y 113,474224 después.
- Con pausa: 113,473992 antes y 113,474224 después.
- Apagar tras restaurar: 100,126082; vuelve al valor de referencia.

Las comprobaciones de actualización, apagado, restauración y ausencia de errores GL/JavaScript pasaron para la configuración predeterminada. El cono ilumina una superficie BSP y responde al giro de la vista; no es únicamente iluminación del viewmodel.

**Prueba fallida conservada:** `view-overbright0`, con `gl_overbright=0`: 94,488424 → 99,387357, ganancia 4,898933. No supera el umbral de visibilidad de +5 del fixture. Desactivar `r_dynamic`, reactivarlo, apagar y guardar/cargar conservan los valores esperados; restaurada da 99,387360. No se redujo el umbral ni se cambió la intensidad para ocultar el resultado. Esto no demuestra por sí solo un defecto nuevo: el umbral se estableció para la configuración predeterminada, y falta calibración contra el original.

El camino de GL existente sube lightmaps dinámicas y compone las texturas. `gl2_shim` usa modulación en sus shaders y documenta limitaciones de TexEnv; `gl_overbright` también selecciona escalas y mezclas diferentes en Xash. No se reescribieron shaders ni blending: estas diferencias requieren contraste nativo antes de ajustar intensidad.

## 6. Compilación e incorporación efectiva

Compilación Emscripten del renderer: satisfactoria; registro `build-engine.log`. Advertencia preexistente: `nColinElim` asignada pero no usada.

Compilación del cliente: satisfactoria; `build-game.log` registra la compilación de view.cpp y cof_client.cpp y el enlace del SIDE_MODULE. Una compilación final desde las fuentes actuales (`build-game-final.log`) reproduce el mismo hash. El servidor no necesitó cambios.

Hashes SHA-256 del paquete aislado final, comprobados extrayendo los bytes según el índice de `packs/engine.js` y comparándolos con los artefactos compilados:

- Renderer: `96f0157663139112577fa451cf8e72cd09055786ae2c7187012630d354b90735`.
- Cliente: `e0bc9af55fa19c19b085c88da63eb425f8606976da408425db28fac2517b2222`.
- Servidor: `c204b3bba3995d73fc5910eb220c08c1e136f8d310950adc5d749dd523b05444`, idéntico al de Claude.

El renderer de la distribución principal sigue siendo `310474703cd34c13db710d8bfdeb1ca88b96d3460784e1212468d2c0fb268acf`; su cliente sigue siendo `bda334b92400eab37ea665bcba92c19725ab15218ec478d504c7ad5d17ec2b9c`. **No se sobrescribió el dist principal.**

## 7. Regresiones

Dos pasadas conservadas por separado: una con la corrección del índice y otra con ambas correcciones. Cada pasada obtuvo:

- **9/9 contratos BSP**: siete generales, uno envpos y uno candado.
- **Pointer Lock satisfactorio**.
- **14/14 pruebas de navegador**: entities, campaign, motion, model, manager, sound, camera, train, track, envpos, button, changelevel, trigger_persistence y ambient_persistence.

La segunda pasada está en `final-regressions/`. Incluye inventario, save/load, cámaras, trenes, audio, callbacks, cielos y cambios de mapa. La suite de manager conserva sus entidades y confirmaciones originales. No se detectaron errores JavaScript nuevos en esas pruebas ni se reprodujeron timeouts de confirmación. Estos resultados no equivalen a recorrer manualmente el capítulo completo.

No se volvieron a ejecutar smoke.mjs ni el sitio de GitHub Pages; sus fallos de caché/offline históricos siguen pendientes. Tampoco se acredita audición física de voces ni compatibilidad gráfica con todas las GPU y navegadores.

## 8. Archivos y reproducción

Cambios funcionales:

- `game/cof-logic/client/cof_client.cpp`: renovación del foco desde la vista final.
- `patches/hlsdk/0001-root.patch`: conexión en cl_dll/view.cpp; conserva la reordenación inicial de sound.cpp.
- `patches/xash3d/0001-root.patch`: índice correcto en ref/gl/gl_rsurf.c.

Pruebas y documentación:

- `tools/e2e/flashlight_probe.mjs`: fixture gráfico real, controles negativos, persistencia opcional y pausa diagnóstica opcional. Rechaza sobrescribir una carpeta de resultados existente.
- `tools/e2e/test_flashlight_lightmap.py`: regresión del bucle C original/corregido.
- `tools/wsl/test_entities.sh`: incorpora la regresión del bucle a la suite.
- Este informe y la nota de continuación en CLAUDE.md.
- `build/validation/flashlight-2026-10-31/`: resultados nuevos, sin sobrescribir históricos. Su .gitignore excluye volcados originales privados y partidas generadas.

Directorio absoluto de evidencias en Windows:

`C:\Users\josue\OneDrive\Desktop\Cry Of Fear Web Alpha Version\Cry-Of-Fear-Port-Web\build\validation\flashlight-2026-10-31`

Los registros `graphics-summary.json`, `module-hashes-view.json`, `lightmap-regression-final.log`, `view-repeat.log`, `view-wall90-delay160.log`, `view-overbright0.log` y `final-regressions/` sustentan los resultados. Los intentos preliminares se conservan: `baseline` se tomó durante una cámara móvil; `baseline-stable`/`fixed-stable` no tenían teléfono; `baseline-equipped`/`fixed-equipped` no lograron el giro solicitado. No se usan para acreditar las comparaciones finales.

En WSL, con el entorno de Playwright 1.64.1 preparado y un directorio nuevo por ejecución:

```bash
COF_WORK=/root/cof-audits/audit-D3Kl5uly python3 "$REPO/tools/e2e/test_flashlight_lightmap.py"
# Copiar flashlight_probe.mjs a un directorio que resuelva Playwright 1.64.1.
COF_EXPECT_FIXED=1 COF_PERSISTENCE=1 node flashlight_probe.mjs http://127.0.0.1:8098/ "$SALIDA_NUEVA"
# Reproducción lenta; no aumentar el timeout de fence:
COF_EXPECT_FIXED=1 COF_PERSISTENCE=1 COF_FRAME_DELAY_MS=160 node flashlight_probe.mjs http://127.0.0.1:8098/ "$OTRA_SALIDA_NUEVA"
```

Los scripts de ejecución completos y el resumen reproducible se conservan en el directorio de evidencias. La corrección del SDK portable también está aplicada en su árbol canónico de WSL; el parche exportado permite reconstruirla.

## 9. Conclusión y prioridad siguiente

Se demostraron y corrigieron dos causas concretas de falta de luz sobre el mundo: índice de luxel equivocado y renovación del foco después de dibujar las superficies. El foco funciona sobre el BSP y persiste tras restaurar, incluso con frames lentos. El servidor y las regresiones anteriores conservan su comportamiento comprobado.

**No se retira el filtro anterior ni se declara fidelidad visual completa.** Faltan capturas equivalentes del original, comparación de habitaciones oscuras de c_apartment1–5, calibración de gl_overbright=0, perfiles de luz reducida, resolución del patrón sobre lightmaps y medición de coste en GPU física. Los intervalos de SwiftShader y de la pausa artificial no son un benchmark del producto.

La siguiente prioridad es cerrar esa comparación visual y de intensidad antes de convertir el foco en reemplazo definitivo. Después continúan, por separado, inventario/llaves pendientes, armas y las demás prioridades de la transferencia. No se modificaron física, recursos, licencias ni créditos.
