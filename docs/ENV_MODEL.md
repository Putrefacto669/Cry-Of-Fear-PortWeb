# env_model: secuencias de las escenas

La clase existente mostraba modelos, conservando `sequence`, `body` y `skin`,
pero carecía de selección On/Off, avance de frames y activación. Se amplía esa
clase mediante `CBaseAnimating` del SDK portable, sin reescribir el renderizador
ni introducir dependencias de la DLL original. Se conservan los créditos a
Team Psykskallar y Andreas Rönnberg.

## Evidencia de c_start

Se inspeccionaron los BSP preparados, los metadatos de sus MDL, el código de
`env_model`, `env_customize`, `trigger_changevalue`, el SDK y una copia de solo
lectura del proyecto de análisis local del original. El material de análisis
permanece en `build/entity-analysis/`, ignorado por Git. Los recursos no se
incluyen en el código ni en las pruebas.

`c_start` contiene 177 instancias de `env_model`; 33 tienen claves de acción.
Las instancias usadas para comprobar las escenas son:

| targetname | Secuencia On | Secuencia Off | Acción On / Off | Activación en BSP |
|---|---|---|---|---|
| sequence1 | lieonground | getup1 | 1 / 0 | multiscene1, 12 s |
| sequence2 | look_idle | getsms1 | 1 / 0 | multiscene1, 26 s |
| simon3 | idlegetsms2 | getsms2 | 1 / 0 | se inspecciona configuración y se conserva body modificado por cchange2 |
| sblacker | idle | walk | 1 / 0 | multiblack, 0.1 s; killblack, 2 s |
| slower_arms | open_door | idle | 0 / 1 | slower_arms_mm, 0 s |

`slower_arms` empieza con spawnflag 1, en el estado Off. El estado Off selecciona
otra animación; por sí mismo no oculta el modelo. Otras instancias animadas
incluyen `hammer_floor`, `simon_attack`, `scsimon1_2`, `scsimon3`, `simonw` y
modelos decorativos. Las comprobaciones de cinco modelos no constituyen una
validación visual de las 177 instancias.

## Comportamiento implementado

- `m_iszSequence_On` y `m_iszSequence_Off` seleccionan la secuencia por su etiqueta
  del MDL. Una etiqueta ausente conserva la secuencia numérica y el estado de
  animación existente. Una etiqueta desconocida imprime un diagnóstico y usa
  la secuencia 0, como el comportamiento observado en el original.
- Seleccionar una secuencia con nombre reinicia frame a cero, calcula su tasa
  mediante el SDK y establece framerate a 1. La acción del estado determina
  el bucle, incluso si el MDL tiene otro flag de bucle.
- Acción 0: reproduce una vez, queda en frame 255 al finalizar y deja de pensar.
  Acción 1: bucle. Acción 2: al terminar, cambia de estado y selecciona su
  secuencia. La acción 2 también aparece en `simontrain` de `c_intro`.
- `Use` respeta `ShouldToggle`: un On repetido sobre el estado On, o un Off
  repetido sobre Off, no reinicia la animación. Toggle cambia de estado.
- Se usa `StudioFrameAdvance` y un tick de 0.1 s. `Think` y `Use` son métodos
  virtuales; no requieren serializar punteros de callbacks adicionales.
- Guardar/cargar conserva etiquetas, acciones, frame, datos de animación del
  SDK, estado On/Off, programación del tick, body y skin. Un modelo terminado
  permanece detenido y puede volver a activarse después de cargar.
- Los modelos sin canales con nombre conservan su comportamiento estático.
  Cambiar secuencias no reemplaza body ni skin.

Se mantienen el movimiento no físico y la ausencia de colisión de la clase
anterior. No se incorporan en esta etapa los efectos de otros flags del
original: caída al suelo, colisión, seguimiento de cabeza, lógica de cofres,
parenting ni efectos especiales de render. En particular, `simon_attack` usa
flags 36: la prueba de animación no establece compatibilidad completa de ellos.
Tampoco se inventa emisión de eventos de animación que no aparece en la rutina
de avance inspeccionada.

## Archivos y pruebas

Código: `game/cof-logic/cof/env_model.cpp`. Inspección bajo sv_cheats:
`cof_animation <targetname>` y `cof_use <targetname> on|off|toggle`, añadidos en
`player_cof.cpp`. No se eliminan los auxiliares anteriores.

`tools/e2e/model_entities.mjs` usa los BSP, MDL, WebGL y WASM reales. Obtiene las
etiquetas e índices directamente del MDL montado para contrastar el servidor.
Comprueba estados iniciales, avance, acciones 0/1/2, ambas direcciones de cambio
automático, uso idempotente, un prop estático, etiquetas ausentes/desconocidas,
guardado/carga de animaciones activas y detenidas, body/skin y activación de los
multi_manager reales `slower_arms_mm` y `multiblack` antes del guardado.
El contrato de claves y activaciones se incorpora en `test_entity_maps.py`.
La suite conjunta incluye también los casos anteriores de `c_start`, inventario,
escaleras, puertas, teletransporte, barra del jefe y `motion_manager`.

Las finalizaciones largas se aceleran mediante la propiedad framerate en las
pruebas; no se modifica el BSP. Tras los primeros frames se desactiva el
refresco gráfico para reducir el coste del renderizado por software. Se verifica
estado del servidor, no la apariencia completa de las escenas o sus sonidos.

## Limitaciones observadas

Durante una prueba se intentó disparar `slower_arms_mm` después de cargar una
partida y no actuó; el registro contiene errores `Invalid function pointer in
entity!` del serializador del SDK. Las pruebas de los managers reales se hacen
antes de guardar; después se prueba directamente `Use` del modelo restaurado.
La restauración de los callbacks de `multi_manager` requiere su propia
corrección y regresión. No se presenta la restauración completa de una escena
como resuelta por este cambio.

Actualización del 26 de octubre: la siguiente etapa corrigió la restauración de
`multi_manager` y añadió pruebas específicas de esas activaciones después de
cargar; véase [`MULTI_MANAGER.md`](MULTI_MANAGER.md). El párrafo anterior describe
el hallazgo y el alcance de la etapa original de animación.

La siguiente prioridad es la restauración de `multi_manager`, porque afecta a
la continuación de escenas guardadas. Después, `trigger_sound` sigue ausente
durante la carga de `c_start`: es necesario auditar sus claves y sus emisores
antes de ampliar el audio de las escenas.

## Resultado local — 25 de octubre de 2026

Emscripten 4.0.11 compiló y enlazó el servidor con los cambios. La suite conjunta
terminó con código 0: cinco contratos de BSP sin omisiones y cuatro pruebas de
navegador (`entities`, `campaign_entities`, `motion_entities`, `model_entities`)
satisfactorias, sin errores JavaScript. Se verificó la exportación `env_model`
y las factorías de las etapas anteriores en el servidor WASM final.

Los registros y el módulo quedan en `build/validation/models/`, ignorado por
Git. Se actualizó el paquete de prueba aislado de WSL; el `dist/` del repositorio
no se sobrescribió. No se realizaron commits, pushes, publicación de recursos
ni despliegues. Para distribuir el paquete se requiere regenerar normalmente
el manifiesto de caché con `package.sh`; las pruebas se ejecutan con `sw=0`.
