# Entidades móviles y persistencia de cinemáticas — 28 de octubre de 2026

## Alcance inspeccionado

Se revisaron los BSP preparados, `CFuncTrain`, `CFuncTrackTrain`, `CPathCorner`,
`CPathTrack`, `CBaseToggle::LinearMove/LinearMoveDone`, `DispatchSave/DispatchRestore`
y los campos de guardado del SDK. También se revisó su relación con trigger_camera.

| Mapa | func_train encontrados |
|---|---|
| c_start | fokus3 |
| c_nightmare | horafittakuk, cartrain |
| c_intro | trainunder, bilist00, bilist01, tja |
| c_game_menu1 | togasso, 2togasso, togasso2, 2togasso2 |

Son 11 instancias. Dos son focos directos de cámara: kamera3 → fokus3 en c_start
y kameraheh4 → horafittakuk en c_nightmare. El inventario de propiedades, rutas y
activadores se conserva en `build/validation/trains/map-trains.json` y
`routes-and-activators.json`. Estos archivos de análisis no se distribuyen.

Las 93 cámaras inspeccionadas apuntan a 88 info_target, dos func_train y tres
func_tracktrain. Estos últimos son de c_intro: inkamera1 → intarget1,
2inkamera2 → infokus2 y kkamera2 → kfokus1. Por ello se incluyó también la
persistencia de CFuncTrackTrain en esta etapa.

fokus3 utiliza el brush real *135, velocidad 6 y flag 8 (pasable). Su ruta real
1stopp1 ↔ 1stopp2 usa nodos **path_track**. CFuncTrain resuelve los destinos por
nombre y usa sus entvars, por lo que no se sustituyen por path_corner.
infokus2 usa startspeed 10, velocidad máxima 40, altura 4, longitud de ruedas 50
y un circuito diminuto instopp1 → instopp2 → instopp3 → instopp1.

## Estados necesarios

En func_train deben sobrevivir origen, velocidad, destino final de LinearMove,
ltime/nextthink, espera, flags de parada/retrigger, enemy, target/message,
m_pevCurrentTarget, m_activated y las propiedades de sonido del SDK. Los callbacks
de este SDK son Think nulo, Next o LinearMoveDone, y MoveDone nulo o Wait.

En func_tracktrain deben sobrevivir m_ppath y los enlaces de path_track, velocidad,
dirección, altura, longitud, controles y demás configuración ya serializada,
además de Think nulo, Next, Find, NearestPath o DeadEnd. No se cambia el algoritmo
de movimiento, el cálculo de ángulos o el tratamiento de colisiones.

## Fallos reproducidos

1. **func_train en movimiento:** tras cargar fokus3, Think pasó de LinearMoveDone
   a nulo, MoveDone de Wait a nulo, el destino final quedó a cero y el nodo actual
   cambió de 1stopp2 a 1stopp1, mientras la velocidad de entvars seguía siendo 6.
   Los campos privados desalineados permiten además que Activate pierda su guardia
   de inicialización. Evidencia: `baseline.log` y `baseline-engine.log`.
2. **Tren detenido:** después de corregir los callbacks, guardar/cargar convirtió
   nextthink=0 en 0.0266647. DispatchSave desplazaba el reloj local de todo pusher
   tratando cero como si fuese una fecha. El cero es el indicador de ausencia de
   programación. Evidencia: `expanded-first.log` y `expanded-first-engine.log`.
3. **func_tracktrain en movimiento:** infokus2 perdió Think Next, m_ppath y su
   configuración privada tras cargar, manteniendo velocidad de entvars.
   Evidencia: `track-baseline.log` y `track-baseline-engine.log`.

WriteFunction no puede resolver esos punteros de un SIDE_MODULE y omite su
contenido sin corregir el contador del bloque. func_train tiene ese problema
en **BASE y TOGGLE**, por Think y m_pfnCallWhenMoveDone, respectivamente.
func_tracktrain lo tiene en BASE. No basta con volver a asignar Think después
de leer un bloque que ya consumió los datos de la siguiente clase.

## Correcciones acotadas

La rama Emscripten guarda identidades enteras de los callbacks conocidos, omite
temporalmente los punteros al guardar sus clases base y restablece inmediatamente
los punteros de la entidad viva. Restore lee los bloques y vuelve a enlazar las
funciones correspondientes. Conserva nextthink, ltime, posición, velocidad,
destino final, referencias y m_activated. No llama a Spawn, Use, Next, Find o
NearestPath para reconstruir artificialmente el movimiento.

DispatchSave preserva nextthink=0 al desplazar el reloj **solo para func_train y
func_tracktrain en Emscripten**. Las fechas positivas siguen el ajuste original.
No se cambia la física del motor. El código nativo conserva las macros anteriores
y su comportamiento de DispatchSave. OverrideReset, incluido el tratamiento
original de entidades globales entre niveles, permanece intacto.

El guardado diagnostica callbacks desconocidos en estas clases; no se inventa
una identidad ni se persiste una dirección de función sin contrato estable.
No se reparan partidas antiguas cuyos bloques ya estaban desalineados.

## Pruebas de navegador

Todas usan Playwright 1.64.1/Chromium 156, servidor WASM real y recursos locales.
Se mantienen los límites de fence de 30 s y esperas de estado de 60 s. La prueba
de c_start conserva sus 29 managers, incluidos los cuatro multiscene1.

- **Ruta real de fokus3:** guardar en movimiento, conservar callbacks, nodo,
  destino, velocidad y plazo local; continuar hasta llegar y comenzar el siguiente
  segmento. kamera3 conserva su referencia al tren durante la carga.
- **Parada manual:** guardar detenido, cargar conservando posición y nextthink=0
  y observar que sigue inmóvil sin ninguna activación de recuperación.
- **Espera temporizada y retrigger:** el brush real de fokus3 usa una ruta de
  fixtures path_corner creada en ejecución. Se verifica la espera de tres
  segundos, su plazo pendiente al cargar, el estado de parada por flag y los
  destinos de paso emitidos una sola vez. No se modifica ningún BSP.
- **Teleport:** guardar en el segmento anterior, cargar y comprobar la secuencia
  de dos destinos y la posición del salto original del SDK, seguida de parada.
- **infokus2 real:** guardar mientras se mueve, recuperar Next, configuración y
  referencia a su circuito; 2inkamera2 conserva foco y estado activo. Guardar
  detenido conserva exactamente el nodo y la posición, y un Use explícito de
  prueba posterior reactiva la ruta mediante el comportamiento normal.

La primera prueba de tracktrain corregido exigía el mismo nombre de nodo en dos
instantáneas tomadas mientras seguía moviéndose. Falló legítimamente al pasar de
instopp2 a instopp3. Se preserva `track-fixed.log`. El contrato BSP verifica el
circuito de tres nodos, separados por pocas unidades, y la prueba final acepta
su avance normal dentro de ese circuito, comprueba el plazo y exige identidad
exacta del nodo en estado detenido. No se amplían tiempos ni se elimina escena.

## Archivos de esta etapa

- `patches/hlsdk/0001-root.patch`: cambios en plats.cpp, trains.h y cbase.cpp.
- `game/cof-logic/cof/player_cof.cpp`: consulta `cof_train`, protegida por sv_cheats.
- `tools/e2e/train_entities.mjs`, `track_entities.mjs`: escenarios descritos.
- `tools/e2e/test_entity_maps.py`: contrato de focos y rutas reales.
- `tools/wsl/test_entities.sh`: integración de las nuevas pruebas.
- Este informe. El resto de cambios pendientes pertenecientes a etapas anteriores
  se conserva.

## Límites y siguiente etapa

Los casos de func_train en c_nightmare y c_game_menu1 se inventariaron, pero no se
recorrieron en ejecución. No se certifican todos los trenes, plataformas,
vehículos o combinaciones de colisión/carga de pasajeros de la campaña.
Las identidades Find, NearestPath y DeadEnd de tracktrain se reconstruyen según
el código del SDK; las pruebas de persistencia directa de esta etapa ejercitan
Next y estados detenidos. No se simulan todas las transiciones globales entre
mapas ni se valida la fidelidad visual o acústica completa de las cinemáticas.

Es apropiado continuar con la investigación de envpos_world y envpos_sky usando
esta referencia. Debe mantenerse la matriz de limitaciones anterior para no
atribuir un problema futuro de otra entidad móvil a los efectos de renderizado.

No se modifican el motor, renderizador, recursos originales, dist principal,
licencias o créditos. No hay commits, pushes ni despliegues.

## Resultado final

Emscripten 4.0.11 compiló y enlazó los componentes afectados. La última
compilación está en `build-track.log`; se conserva el aviso previo de memcpy de
entvars_t en el Clone de multi_manager. El módulo compilado, el empaquetado y la
copia archivada coinciden en SHA-256:
`868f303971b37250160111d3d56c06065180522703e9fd3e5d36e4d21e40c26f`.

La suite final terminó con **salida 0**: siete contratos BSP, regresión de Pointer
Lock y nueve pruebas de navegador (entities, campaign_entities, motion_entities,
model_entities, manager_entities, sound_entities, camera_entities, train_entities
y track_entities). Se ejecutaron las aserciones de ausencia de pageerror de todos
los escenarios. Las cuatro multiscene1 se conservaron en c_start y no se amplió
ningún límite. Persisten los avisos conocidos de recursos y callbacks de otras
clases del SDK; no se afirma que toda la campaña esté libre de avisos.

Evidencia principal: `regression.log`, `regression.exit`,
`final-train-engine.log`, `final-track-engine.log`, `final-camera-engine.log`,
`final-manager-engine.log`, `final-sound-engine.log` y `module-sha256.log`, todos
en `build/validation/trains/`. Los fallos previos y sus builds se preservan en
esa misma carpeta. Sintaxis JS/Bash, aplicación inversa del parche al SDK y
diff --check: satisfactorias. Solo se reempaquetó el dist aislado de WSL.
