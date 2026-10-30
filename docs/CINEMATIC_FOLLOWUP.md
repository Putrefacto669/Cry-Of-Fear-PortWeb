# Seguimiento de estabilidad — 26–27 de octubre de 2026

## Conclusión

Se corrige el error JavaScript `Pointer is already locked` y se actualiza la
referencia de pruebas a Playwright 1.64.1/Chromium 156. La comparación controlada
reproduce demoras grandes al volver a Chromium 141 y tiempos mucho menores con
156, sin cambiar cinemáticas o límites. Son dos cambios distintos: Pointer Lock
no explica las pausas. El mecanismo interno preciso del navegador antiguo sigue
sin identificarse; los resultados y límites se detallan abajo.

## Comparaciones realizadas

Todas conservaron las cuatro multiscene1, las aserciones y el fence de 30 s.
Se usó el mismo WASM de la fase anterior, Chromium headless/SwiftShader y el dist
aislado de WSL. Los registros nuevos están en `build/validation/cinematics-audio/`;
los anteriores no se sobrescribieron.

| Caso | Resultado | Mayor pausa entre ticks del navegador |
|---|---|---|
| Audio habitual, observación de AudioContext | Managers completos, salida 0 | 9,857 s |
| snd_webaudio 0, solo comparación diagnóstica | Managers completos, salida 0 | 24,929 s |
| Audio habitual, hooks de frame y traza ampliada | Falló la aserción de errores JavaScript: Pointer is already locked | Véase JSONL conservado |

El reloj del AudioContext continuó avanzando y su estado fue running. En el primer
caso hubo 17 pausas observadas con cero voces activas; en el segundo, 20. Esto
debilita las hipótesis de acumulación de voces o contexto suspendido, pero no
descarta toda la capa de audio: WebAudio_Update aún actualiza el listener aunque
snd_webaudio sea cero. No se cambia la configuración de audio del producto.

Los hooks preMainLoop/postMainLoop acotan el tiempo dentro de la iteración del
motor. En la comparación con el mezclador alternativo no registraron iteraciones
superiores a un segundo pese a pausas entre ticks mucho mayores. Esto distingue
tiempo dentro del frame de tiempo entre callbacks; no identifica por sí solo si
la espera corresponde al planificador, a composición o a otra tarea del navegador.

La traza ampliada añade tareas internas y composición. Sus mayores tareas
individuales registradas fueron aproximadamente 2,874 s (RunTask inicial del
motor) y 1,150 s esperando completar un commit de composición. No hay evidencia
para atribuir todas las pausas a ninguna de ellas. El archivo es grande (unos
881 MiB) y su captura/exportación perturba tiempos: se conserva como diagnóstico,
no como benchmark ni como opción por defecto. Se analizó por líneas para no
cargar todo el árbol JSON en memoria. Resumen: `trace-tasks.txt`.

## Error concreto y corrección

El adaptador de requestPointerLock en loader.js reintentaba sin opciones cualquier
rechazo de la petición de movimiento sin aceleración. Un rechazo por estado
inválido no implica falta de soporte de esa opción. Además, SDL usa la API como
una función antigua sin esperar la promesa: el rechazo del reintento podía quedar
sin manejar y producir pageerror.

El cambio mínimo:

- Reintentar únicamente NotSupportedError.
- Añadir un observador del rechazo para el llamador antiguo que ignora la promesa.
- Devolver la misma promesa observada: los llamadores que hacen await siguen
  recibiendo el rechazo, no un éxito falso.
- Conservar el evento pointerlockerror y el aviso de la interfaz existente.

No se fuerza la captura del ratón, no se elimina el error de las aserciones del
test y no se toca el estado de las cinemáticas ni el guardado.

`tools/e2e/pointer_lock.mjs` ejecuta el adaptador extraído del archivo real con
implementaciones controladas de la API. Cubre éxito, opción no soportada, rechazo
por estado inválido, reintento fallido ignorado por SDL y API antigua síncrona.
El loader anterior falla porque efectúa dos intentos ante estado inválido; el
nuevo pasa y no genera unhandledRejection. La captura en navegador anterior
aporta además la reproducción real del pageerror. Logs: `pointer-before.log`
(salida 1) y `pointer-after.log` (salida 0).

## Archivos y alcance

- `platform/web/loader.js`: corrección de las promesas de Pointer Lock.
- `tools/e2e/pointer_lock.mjs`: regresión del adaptador real.
- `tools/wsl/test_entities.sh`: ejecuta esa regresión antes de las pruebas del juego.
- `tools/wsl/e2e_setup.sh`: fija Playwright 1.64.1 para la referencia Chromium 156
  comprobada en el seguimiento del 27 de octubre.
- `tools/e2e/manager_entities.mjs`: añade observación de AudioContext y duración
  del frame solo cuando COF_MANAGER_DIAGNOSTICS está habilitado.
- Este informe y su referencia en CINEMATIC_STABILITY.md.

Los tres scripts exactos de comparación se guardan junto con sus registros,
incluida la variante de mezclador que no se incorpora a la prueba normal.
No se recompila C++ en este seguimiento porque no se cambia: se utiliza el WASM
ya compilado y verificado de la fase anterior. Solo se actualiza loader.js en
el dist aislado para verificar el cambio web. No se toca el dist principal,
los recursos originales, licencias o créditos; no hay commits, pushes o despliegues.

## Verificación posterior — 27 de octubre de 2026

La suite conjunta con el loader corregido pasó la regresión de Pointer Lock,
los seis contratos BSP y las pruebas de entidades, campaña, movimiento y modelos.
Después falló managers esperando 60 s a que apareciese el subtítulo 4: solo se
recibieron 2 y 3. No fue el fence de 30 s. El diagnóstico registró una pausa de
19,956 s, sin frames medidos de más de un segundo. Se conserva salida 1 en
`fixed-suite.exit` y el detalle en `fixed-manager-failure.log`.

La repetición independiente de managers, sin ampliar límites ni eliminar
cinemáticas, terminó con salida 0. Sonido se ejecutó por separado porque la suite
fallida no había llegado a él: también terminó con salida 0, incluidas las zonas
reales de c_start y el guardado/restauración. Registros: `fixed-repeat.log` y
`fixed-sound-independent.log`. Esto no convierte la suite fallida en satisfactoria.
Los archivos cuyo nombre incluye `stale` son copias anteriores recogidas por el
archivado; no cuentan como validación nueva.

Se comparó además el mismo servidor y la misma prueba de managers en Edge
headless nativo de Windows, reutilizando Playwright instalado sin añadir paquetes.
Se cambió únicamente la importación local del paquete y el ejecutable/opciones
de lanzamiento en una copia de diagnóstico, conservada junto a los registros.
WebGL identificó NVIDIA GeForce RTX 4060 Laptop GPU mediante ANGLE/D3D11.

| Edge Windows / GPU | Resultado | Comando más lento | Mayor pausa observada |
|---|---|---|---|
| Primera ejecución | Completa, salida 0 | 303 ms | 1.557 s |
| Segunda ejecución | Completa, salida 0 | 360 ms | 1.474 s |
| Tercera ejecución | Completa, salida 0 | 240 ms | 1.396 s |

No hubo pageerror en esas tres ejecuciones. Las cuatro multiscene1 permanecieron
activas, se realizaron los cinco guardados/restauraciones y se conservaron las
aserciones y el límite original. El número de comandos varía por el polling de
estado, no por omitir casos. Se mantiene r_norefresh 1 de la prueba original:
esto valida lógica, no FPS ni fidelidad visual de la cinemática completa.
Evidencia: `windows/gpu-comparison.json` y los logs de cada ejecución.

La diferencia respecto a WSL es evidencia de sensibilidad al entorno, no prueba
por sí sola que la GPU sea la causa: también cambian sistema operativo y versión
de navegador. No se ha introducido una corrección especulativa en el motor.

Para separar parte de esas variables, se repitió en el mismo Edge de Windows
forzando SwiftShader mediante las mismas opciones de software de la prueba WSL.
El renderer confirmó `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)),
SwiftShader driver`. Esta cuarta ejecución completó todos los casos, salida 0,
sin pageerror, máximo de comando 383 ms y pausa observada máxima 1,889 s.
Evidencia: `windows/software/manager.log`, `manager.jsonl` y `summary.json`.

Por tanto, no está justificado culpar únicamente al renderizado por software.
La combinación WSL/Chromium usada sigue siendo la referencia con fallos y pausas
graves; todavía no se ha aislado qué diferencia de sistema, navegador o
planificación los provoca. No se cambia la prueba normal para ocultar esa
incidencia. El escenario original sí se ha comprobado repetidamente en Windows
sin eliminar escenas, alterar jugabilidad o aumentar límites.

## Comparación controlada de versiones en WSL — 27 de octubre

Se comprobó que e2e_setup.sh fijaba Playwright 1.56.1, con Chromium
141.0.7390.37. Edge instalado era 156.0.4314.42. Para no confundir un cambio de
sistema con uno de navegador, se instaló Playwright 1.64.1 y su Chrome Headless
Shell 156.0.8078.4 en `/root/cof-audits/browser-1.64.1`, separado de las
dependencias antiguas y del repositorio. No se actualizó el navegador antiguo.

Se usaron el mismo WSL, Node, servidor, loader, recursos, opciones SwiftShader,
cinemáticas, aserciones y fence de 30 s. Solo cambió el conjunto Playwright/
Chromium. Las pruebas fueron secuenciales, sin otros navegadores de prueba en
paralelo. Tras tres repeticiones nuevas, se volvió al entorno antiguo como control.

| Entorno WSL | Resultado | Máximo por comando | Mayor pausa entre ticks |
|---|---|---|---|
| Chromium 156, repetición 1 | Completa, salida 0 | 320 ms | 2,272 s |
| Chromium 156, repetición 2 | Completa, salida 0 | 414 ms | 1,705 s |
| Chromium 156, repetición 3 | Completa, salida 0 | 346 ms | 2,783 s |
| Control posterior Chromium 141 | Completa, salida 0 | 11 518 ms | 10,448 s |

El control antiguo también pasó, pero recuperó las demoras grandes: 19 pausas
superiores a un segundo. El mecanismo interno concreto de Chromium/Playwright
no se ha identificado, y no se reprodujo aquí el fence histórico exacto a 30 s.
La comparación sí justifica actualizar la versión fijada del entorno de pruebas,
conservando el escenario completo. No justifica cambiar la lógica de managers,
desactivar audio o eliminar entidades.

Evidencia en `build/validation/chromium156/`: las tres salidas, los JSONL,
`repetitions.json`, `old-control.log`, `control-summary.json`, el script exacto,
el package-lock de la instalación aislada y hashes de los artefactos del juego.
No se añaden estas herramientas a la distribución del jugador. Las instalaciones
antiguas siguen disponibles para reproducir la incidencia.

## Verificación final con la versión fijada

La suite completa con Playwright 1.64.1/Chromium 156 terminó con salida **0**:
regresión de Pointer Lock, seis contratos BSP y seis pruebas de navegador
(entities, campaign_entities, motion_entities, model_entities, manager_entities
y sound_entities). Managers se ejecutó sin instrumentación adicional en esta
pasada, conservando las cuatro multiscene1 y los plazos originales. Se verificaron
inventario, carga de mapas, subtítulos, entidades anteriores, guardado/restauración,
movimiento, modelos y audio. Las aserciones de pageerror finalizaron sin errores.

Esta pasada se suma a las tres repeticiones independientes en Chromium 156 y las
cuatro en Edge Windows. No se cuenta la suite fallida de Chromium 141 como éxito.
La sintaxis JavaScript/Bash y diff --check pasaron. El loader probado coincide
con el del repositorio; no hubo cambios C++ ni necesidad de recompilar el WASM
verificado de la etapa anterior. Persisten avisos conocidos de recursos ausentes
y callbacks de otras clases del SDK: ausencia de pageerror no significa ausencia
de todos los avisos del motor.

Resultados finales: `build/validation/chromium156/full-suite.log`,
`full-suite.exit`, `full-manager.log` y `full-sound.log`.

Para repetir usando la instalación aislada conservada y el servidor local en 8095:

```sh
PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers \
COF_WORK=/root/cof-audits/browser-1.64.1 COF_STAGE=/root/cof-web/stage \
bash tools/wsl/test_entities.sh http://127.0.0.1:8095/
```

Para instalaciones nuevas, e2e_setup.sh fija ahora la versión validada. No se
cambian versiones del navegador del jugador ni se añade detección que bloquee
navegadores antiguos. La diferencia de comportamiento permanece documentada.

## Pendiente final

El mecanismo interno del conjunto Chromium 141/Playwright 1.56.1 sigue abierto;
no se afirma haberlo corregido dentro del navegador ni validar todas las versiones.
No se considera estabilizada la campaña ni se valida visualmente la cinemática
completa. La referencia WSL actualizada y Windows permiten continuar las
comprobaciones funcionales manteniendo documentada la incidencia del entorno antiguo.
La siguiente prioridad propuesta es verificar directamente el guardado y la
restauración de trigger_camera y sus callbacks antes de añadir envpos_world y
envpos_sky; pasar managers no demuestra que todos sus destinos se restauren bien.
