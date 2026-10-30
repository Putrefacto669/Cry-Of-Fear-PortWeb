# Cinemáticas y guardado: investigación del 26 de octubre de 2026

Seguimiento posterior: [comparaciones de audio y corrección de Pointer Lock](CINEMATIC_FOLLOWUP.md).

## Alcance y estado

La causa de los timeouts históricos de 30 segundos sigue sin confirmarse.
No se aplica una corrección especulativa ni se declara resuelto el problema.
Se restituye el escenario original de `manager_entities.mjs`: permanecen las
cuatro instancias de `multiscene1`, las aserciones y el fence de 30 segundos.
Los resultados anteriores con eliminación de managers eran pruebas aisladas,
no evidencia de estabilidad de esta cinemática.

## Reconstrucción

Se inspeccionaron Git y los cambios pendientes, los informes MULTI_MANAGER y
TRIGGER_SOUND, los registros de `build/validation/sound/`, el BSP preparado de
c_start, el test y su runner, player_cof.cpp, debug.js y loader.js. En el SDK se
examinaron CMultiManager, CTriggerCamera y CSave::WriteFields/WriteFunction; en
el motor, Xash_Cmd, el bucle y el renderizador. También se revisaron las capas
Web Audio, HUD, postfx y gpustats para contrastar las pausas observadas.

El trigger_once `*34` activa las cuatro instancias con el mismo nombre. Sus
eventos abarcan 0–46 segundos de juego: cámaras, modelos, sonidos, subtítulos,
inventario, fundidos y teletransportes. El inventario detallado queda en
`build/validation/cinematics/scene-contract.json`, sin modificar el BSP.
El manager conserva índice, reloj, nextthink, activador y callbacks mediante
la corrección previa de CMultiManager. Otras clases del SDK todavía pueden
emitir `Invalid function pointer in entity!`; esto no demuestra que causen
los timeouts, ni garantiza que toda la escena se restaure correctamente.

Los fallos históricos ocurrieron después de cuatro o cinco casos aprobados:
`save manager_activator` y `cof_count multi_manager`. El registro original no
separaba tiempo de envío, ejecución y entrega de confirmación. No permite
atribuir ambos fallos al guardado ni a concurrencia entre hilos.

## Fence e instrumentación

CoFDebug.cmd llama a Xash_Cmd, que añade texto al buffer del motor. El test
registra primero un listener de consola y envía el comando seguido de un
`cof_fence` con identificador único. El servidor imprime el identificador y
gpGlobals->time; la consola del navegador lo entrega a Playwright. El fence
prueba procesamiento del comando, no finalización de todos los eventos
retardados de la escena. Se sigue esperando `client connected` para las cargas.

Opciones del test, desactivadas por defecto:

- `COF_MANAGER_DIAGNOSTICS`: JSONL con envío, encolado, fence recibido,
  comienzo/final de carga, errores JavaScript y pausas del event loop >1 s.
  Habilita `cof_manager_trace 1` con sv_cheats para registrar los cuatro managers.
- `COF_MANAGER_PROFILE`: perfil CPU de Chromium.
- `COF_MANAGER_TIMELINE`: traza de Chromium; exige una ruta nueva. Puede producir
  archivos grandes y alterar tiempos, por lo que se usa solo para diagnóstico.

El comando nuevo del servidor registra estado al guardar/restaurar y entrada/
salida de cada destino real de multiscene1, con índice e identidad de entidad.
No registra cada frame, no cambia campos serializados y no modifica callbacks,
retardos ni destinos. Requiere sv_cheats; las funciones de depuración previas
se conservan. La instrumentación reside en player_cof.cpp y el parche del SDK.

## Observaciones y límites de inferencia

La primera ejecución diagnosticada falló por `[2,3,3,4]` frente a `[2,3,4]`:
multiscene1 y slower_cam2_mm comparten sub1. Una activación adicional legítima
puede contaminar una aserción basada solo en líneas del HUD. Se conserva la
aserción original y el fallo; no se elimina la escena para hacerlo pasar.
Esa primera instrumentación escribía también todos los avisos del motor de
forma síncrona en el disco Windows y perturbaba la prueba (guardado 17 s).
Se retiró ese registro redundante; los avisos siguen en el log normal del test.

Las dos ejecuciones siguientes pasaron todas las aserciones originales.
Sus máximos de comando fueron 1,327 s y 0,257 s, pero hubo pausas del event loop
de 13,952 s y 15,655 s. Una carga duró 17,897 s. Una ejecución conjunta posterior
observó aproximadamente 20 s para un fence de guardado, incluyendo espera antes
de encolar el comando: esa demora no puede atribuirse exclusivamente a Save.

El perfil CPU acumula 78 s bajo `(program)`, 17,848 s inactivo, 2,451 s en log
y 2,024 s en glGetError. `(program)` no identifica una función culpable. Las
trazas muestran trabajo del bucle, GPU, layout y composición. Esto orienta una
investigación de pausas de navegador/renderizado, pero no confirma un defecto
de WebGL, audio, temporizadores o callbacks. No se observó una prueba concluyente
de pérdida de fences ni un deadlock. Pasar algunas repeticiones no descarta un
fallo intermitente. Los tiempos son de Chromium headless/SwiftShader en WSL,
no una medición de rendimiento del juego en una GPU física.

## Archivos y preservación

Para reproducir en el entorno preparado, servir el dist aislado en 8095 y
ejecutar el runner con COF_WORK apuntando a `/root/cof-audits/audit-D3Kl5uly` y
COF_STAGE a `/root/cof-web/stage`. El runner copia la prueba actual al directorio
e2e con Playwright. Para diagnosticar solo managers, ejecutar allí:

```sh
COF_MANAGER_DIAGNOSTICS=/tmp/cof-investigacion-nueva.jsonl \
  node manager_entities.mjs http://127.0.0.1:8095/
```

Usar rutas nuevas y archivar el log de éxito o fallo antes de repetir. Sin esas
variables, no se instala el temporizador diagnóstico, no se captura perfil y
no se habilita la traza C++; las cuatro multiscene1 permanecen en ambos modos.

Cambios de esta fase: `tools/e2e/manager_entities.mjs`,
`game/cof-logic/cof/player_cof.cpp`, `patches/hlsdk/0001-root.patch`, la actualización
histórica en `docs/MULTI_MANAGER.md` y este informe.
Los demás cambios sin confirmar pertenecen a las etapas anteriores y se
conservan. Nuevos registros en `build/validation/cinematics/`; los de sound,
managers, motion y models no se sobrescriben. No se modifica el dist principal,
los recursos originales ni las licencias. No hay commits, pushes o despliegues.

## Resultados finales

| Ejecución | Resultado real |
|---|---|
| run1 | Falló la aserción de subtítulos por la línea adicional; no fue un timeout de fence. Instrumentación inicial demasiado costosa. |
| run2 | Managers completos, cuatro multiscene1 presentes, fence 30 s; perfil CPU conservado. |
| run3 | Managers completos, mismo escenario y límite; traza Chromium conservada. |
| suite | Seis contratos BSP y seis pruebas de navegador completos con el servidor previo y las cinemáticas presentes. |
| instrumented | Nuevo WASM: managers completos con traza C++; pausa máxima 31,826 s, sin timeout de fence en esa ejecución. |
| final-suite | Nuevo WASM, diagnóstico desactivado: seis contratos BSP y seis pruebas de navegador completos; managers y trigger_sound incluidos. |

En total, cinco ejecuciones completas de managers satisfactorias y una fallida
por interferencia de subtítulos. No se reprodujo exactamente la excepción
histórica de fence a 30 s en esta fase. Las pausas observadas impiden considerar
estos pases una demostración de estabilidad o una corrección del defecto.

Emscripten 4.0.11 compiló player_cof.cpp y triggers.cpp y enlazó el servidor
correctamente. Solo apareció el aviso previo de memcpy sobre entvars_t en Clone.
El SHA-256 del módulo compilado, empaquetado y archivado coincide:
`544d868446f6741cd05c57da9c6ac027bbfe268478d0a14876131885308570e2`.
Las cadenas diagnósticas están en el WASM y la ejecución instrumented demuestra
que ese código se ejecutó. Sintaxis JS, aplicación inversa del parche al SDK y
diff --check pasaron. Solo se reempaquetó el dist aislado de WSL.

La suite final cubre entidades anteriores, inventario, carga de mapas, movimiento,
animación, guardado/restauración, managers y las zonas acústicas. Sus pruebas
exigen ausencia de pageerror de JavaScript y completaron esas aserciones. Persisten
los avisos conocidos del motor por recursos faltantes y callbacks de otras clases.
No se verificó la campaña completa, la cinemática entera con fidelidad visual,
una GPU física ni la restauración funcional de todas las cámaras del SDK.

Pruebas principales: `final-suite.log`, `final-manager.log`, `final-sound.log`,
`instrumented.log`, `instrumented-engine.log`, `build.log`,
`module-sha256.log` y `wasm-diagnostics.log`. Los archivos con `stale` en el nombre
son copias de salidas anteriores recogidas al archivar; no se usan como evidencia
de éxito de esta fase. Se preservan identificados en lugar de descartarlos.

## Recomendación

La ejecución con el nuevo servidor instrumentado también pasó, pero registró
una pausa de 31,826 s y un comando de 21,809 s. Sus 24 destinos observados
terminaron en un máximo de 0,019 s. Se registraron 20 guardados y 20 restauraciones
de estado: los cuatro managers en las cinco cargas. Esto no valida los destinos
todavía no alcanzados al terminar el test ni la fidelidad visual de la escena.
El resumen exacto está en `instrumented-summary.json`.

No usar esta fase para declarar estabilizada la cinemática. Antes de implementar
envpos_world/envpos_sky conviene reproducir el timeout exacto con el diagnóstico
acotado, correlacionar el frame demorado con servidor y navegador y verificar
los callbacks de cámara aún no restaurables. La investigación documental de
esas entidades puede continuar, pero mezclar sus cambios de renderizado ahora
dificultaría comparar el escenario actual.
