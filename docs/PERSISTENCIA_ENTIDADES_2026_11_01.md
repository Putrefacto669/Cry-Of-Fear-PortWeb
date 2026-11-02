# Auditoría de persistencia de entidades — 1 de noviembre de 2026

## Resultado

**Los 39 avisos documentados siguen reproduciéndose en la build actual anterior a esta corrección y representan pérdidas reales de callbacks.** Son 39 funciones de **27 entidades**, no 39 entidades. La corrección verificada conserva esos callbacks y elimina sus avisos sin desactivar entidades. También se corrigió una pérdida adicional de estado en `cof_camerazoom`.

Queda un aviso independiente al guardar casi inmediatamente después de cargar el mapa: el constructor temporal y anónimo de nodos `CTestHull`. Se conserva el aviso. No se ha demostrado que su omisión al restaurar sea inocua para todos los casos de navegación y no se presenta esta etapa como una solución universal de persistencia.

Repositorio inicial limpio, HEAD `ed102e3`. Se conservaron los cambios de Claude/Codex, incluidas linterna, Glock, candado, traza de E y guardados IndexedDB. **No se modificó dist/; no se hicieron commits, pushes ni despliegues.**

## 1. Reproducción actual

Fuente histórica: `CONTINUATION_2026_10_31.md`, sección de guardados IndexedDB. Se leyó su descripción pero no se reutilizó como diagnóstico vigente.

La reproducción inicial usa el servidor de dist/, SHA-256 `6d7d62e59aed0311d14028ed110b0dc3b38e4fab188638017271fc6c60d94432`, antes de modificarlo:

| Ensayo | Momento tras conexión | Avisos al guardar |
|---|---:|---:|
| baseline/at-1 | 1 s | 40 |
| baseline-three/at-3 | 3 s | **39** |
| diagnostic/at-20 | 20 s | 40 |
| diagnostic/at-55 | 55 s | 40 |

Los tiempos son espera de preparación después de conectar; el reloj real del servidor se registra en cada fence y snapshot. El grupo persistente es el mismo. El aviso adicional temprano corresponde al constructor de nodos; el adicional posterior corresponde a `cof_camerazoom::ReturnFOV`, que la cinemática deja asignado incluso con `nextthink=0`.

Entorno: Xash3D FWGS y hlsdk-portable canónicos en `/root/cof-audits/audit-D3Kl5uly`, Emscripten 4.0.11, Playwright 1.64.1 y Chromium 156.0.8078.4. Servidores HTTP con carpeta explícita. Los ensayos de servidor usan `r_norefresh 1` después de conectar: no son una validación visual de GPU. Se conservaron las cinemáticas y entidades originales; no se aumentaron los fences de 30 segundos.

Evidencia nueva separada: `build/validation/persistence-2026-11-01/`. Se conservan los intentos fallidos y las builds de diagnóstico, primera corrección y corrección ABI.

## 2. Entidades identificadas

[Anexo por instancia: las 27 entidades, sus índices de diagnóstico, posiciones, modelos/nombres y funciones](../build/validation/persistence-2026-11-01/AFECTADAS_C_APARTMENT1.md). Datos procesables: `affected-entities.json`.

| Classname | Instancias | Campos afectados | Funciones originales asignadas | Consecuencia observada/requerida |
|---|---:|---|---|---|
| env_fog | 1 | Think | CEnvFog::FogThink | Pierde su actualización periódica. |
| monster_child | 3 | Think, Use | CBaseMonster::CallMonsterThink, MonsterUse | Se pierde el ciclo de IA/animación y la función de uso. |
| monster_baby | 2 | Think, Use | Las mismas dos funciones de CBaseMonster | Igual pérdida; después de corregir avanzan las animaciones. |
| ammo_glock | 4 | Touch | CBasePlayerAmmo::DefaultTouch | La munición deja de recogerse por contacto después de cargar. Reproducido. |
| weapon_syringe | 2 | Touch | CBasePlayerItem::DefaultTouch | Se pierde la recogida nativa; verificada después de corregir. |
| monstermaker | 7 | Think, Use | CBaseEntity::SUB_DoNothing, CMonsterMaker::ToggleUse | Perder SUB_DoNothing con nextthink=0 es inocuo por sí solo; perder ToggleUse impide activar los generadores. |
| env_spark | 4 | Use | CEnvSpark::SparkStart | Se pierde la activación. También se probó el estado activo SparkThink/SparkStop. |
| env_dynlight | 3 | Think | CEnvDynLight::LightThink | Se pierde el seguimiento/actualización del efecto. |
| trigger_cofteleport | 1 | Touch | CCofTriggerTeleport::TeleportTouch | Pierde la reacción al contacto. Se verificó el teletransporte real tras restaurar. |
| **Total** | **27** | **39 callbacks** | | |

Los edicts se renumeran al restaurar. Una primera correlación solo por índice produjo falsos positivos en sonidos y otras clases. El análisis definitivo usa classname, targetname/model y proximidad de origen; los fixtures funcionales verifican además las operaciones. No se atribuyen aquellos falsos positivos a nuevos defectos de cámaras o sonidos.

### Avisos adicionales

**cof_camerazoom, zoomuknw.** Tiene configuración original FOV 60, zoomtime 666 y returntime 5. Su ReturnFOV inactivo no produce un fallo inmediato al perderse. En cambio, guardar con el retorno pendiente dejó de emitir UNZOOM y perdió la configuración para usos posteriores. Además del callback faltaban Save/Restore de sus tres valores de configuración y del EHANDLE del jugador. La prueba antes/después demuestra ambas pérdidas y su corrección.

**CTestHull.** Auxiliar de generación de la red de nodos de HLSDK, no una instancia del BSP ni un monstruo de la campaña. Se detectaron DropDelay/CallBuildNodeGraph según el instante. El objeto no tenía classname registrado en sus entvars. En `early-fixed-abi/at-0` continúa un aviso y la instancia anónima con modelo player no reaparece en el snapshot restaurado; el registro también muestra actividad posterior del constructor de nodos. No basta para certificar todos los caminos de reconstrucción de la red. No se le asignó un classname inventado, no se excluyó del guardado para silenciarlo y no se reinició mediante Spawn.

## 3. Causas técnicas demostradas

### Resolución de nombres

`CSave::WriteFunction` delega en NAME_FOR_FUNCTION. Las funciones miembro internas del módulo WASM no reciben un nombre mediante ese mecanismo. El código emitía el aviso y no escribía el campo. Al restaurar, Think/Touch/Use quedaban nulos.

El contador de `WriteFields` ya incluía esos campos antes de que WriteFunction los omitiera. Eso podía desalinear la lectura del bloque BASE y de los bloques derivados, además de perder el callback. No era suficiente cambiar el texto del aviso ni reactivar la entidad después de cargar.

### Tamaño del puntero a método

`gSizes[FIELD_FUNCTION]` seleccionaba dos palabras solo con `#if GNUC`. Las opciones reales de esta compilación definen `__GNUC__`, pero **no GNUC**: se seleccionaban 4 bytes, aunque los punteros a método de este WASM ocupan 8, incluyendo el ajuste de this.

Prueba conservada: `abi-preprocessor.json`, obtenida usando el comando real de compilación de util.cpp: GNUC ausente, __GNUC__=4, __EMSCRIPTEN__=1 y sizeof(void*)=4. Los snapshots y registros usan la representación de dos palabras de los callbacks reales. La primera solución de nombres compiló pero siguió fallando porque comparaba cuatro bytes con entradas de ocho; quedó conservada en fixed/ y build-fixed.log. Corregir el tamaño hizo que la resolución y la restauración funcionaran. Esto demuestra por qué compilar o pasar la suite antigua no bastaba.

### Estado omitido del zoom

CCofCameraZoom heredaba la serialización base, sin guardar m_flZoomFov, m_flZoomTime, m_flReturnTime ni m_hPlayer. Restaurar solo el puntero ReturnFOV tampoco podía recuperar la relación con el jugador o los valores originales. Se añadieron sus campos con tipos FLOAT y EHANDLE; los tiempos de configuración son duraciones, mientras que nextthink mantiene la serialización temporal normal de entvars.

## 4. Corrección realizada

1. Para WebAssembly, FIELD_FUNCTION usa `sizeof(BASEPTR)`, sin modificar la rama de plataformas nativas.
2. Se añadió un fallback de nombres semánticos explícitos, como `cof::CBaseMonster::CallMonsterThink`, para las funciones comprobadas y los estados relacionados de esas clases.
3. El registro se inicializa en GameDLLInit antes de cargar una partida. No depende de que el método haya sido ejecutado antes ni de que el mapa haya pasado por Spawn. La restauración en un contexto nuevo desde c_game_menu1 lo comprueba.
4. El archivo de guardado contiene nombres, no índices de tabla ni direcciones del proceso. `saved-symbols.json` verifica los nombres realmente encontrados en los archivos generados. Las representaciones de puntero solo se usan en memoria y en diagnósticos.
5. Las funciones desconocidas conservan el aviso original. Se escribe un campo nulo explícito para mantener alineado el contador; eso evita dañar otros campos, **no recupera una función desconocida**.
6. Se guardan/restauran los campos propios y el EHANDLE de cof_camerazoom.

No se modificaron movimiento, física, daño, animaciones, recursos, dist/ ni el renderizador. El mecanismo no llama Spawn/Use para reconstruir estado.

### Relación con las correcciones anteriores

Se revisaron sound.cpp y las serializaciones existentes de puertas, botones, trigger_camera, trenes, triggers, multi_manager y entidades personalizadas. Conservan sus IDs de callbacks y su tratamiento de tiempos. Esas clases ya ponen temporalmente a cero los punteros de BASE al escribir y los recuperan por su mecanismo propio: el fallback nuevo no los duplica ni sustituye.

La instrumentación agrega `cof_save_debug` (0 por defecto) y `cof_callbacks !all` bajo la barrera de depuración existente. Registra entidad, campo, representación y etiquetas conocidas, y permite snapshots de estado. No imprime por frame. Un registro acotado de etiquetas recoge asignaciones para diagnóstico; ese registro observado **no se usa para resolver guardados**.

## 5. Compilación e integración real

Build final aislada: `/root/cof-audits/persistence-20261101/dist-fixed-abi`, puerto 8108.

- Compilación final: **PASS**, 3,560 s; `build-fixed-abi.log`.
- La primera compilación completa incorporó `cof/persistence.cpp` al enlace del servidor; se conserva en build-fixed.log.
- Empaquetado: **PASS**, manifiesto `bd870fbe34e6`.
- Servidor WASM final: `622c1fdf54279da29ed0cfc458e720e58937b1bf496884ba803a35f93d520ef0`.
- Los fixtures registran el SHA-256 de `/lib/server.wasm` realmente montado en el navegador, no solo el archivo de salida del compilador.
- El parche completo hlsdk pasa `git apply --check --reverse` contra el árbol canónico. Los avisos de compilación anteriores no se suprimieron.

## 6. Validación funcional

### Antes de corregir

- 39 avisos en la build vigente al guardar a los 3 s.
- 39 callbacks del grupo principal ausentes después de restaurar, correlacionando las entidades correctamente.
- `behavior-before/`: el contacto con munición después de restaurar no aumenta la reserva. La misma operación sí funciona tras corregir.
- `zoom-before-quiet/` y `zoom-reuse-before/`: el control sin restauración emite UNZOOM; al restaurar una secuencia activa no lo emite y un nuevo uso no conserva la configuración 60/666.

### Después de corregir

| Prueba | Resultado |
|---|---|
| fixed-abi, 3/20/55 s | **0 avisos y 0 callbacks perdidos**, incluidas fases de cinemática y reposo. |
| Guardado vivo | Los punteros observados siguen presentes después de guardar; no se destruye el comportamiento de la partida que continúa. |
| Restauración en sesión | 39 callbacks comprobados; cinco monstruos reanudan la animación. |
| Restauración en frío desde menú | 39 callbacks comprobados sin haber creado antes las entidades de c_apartment1 en ese navegador. |
| Munición | DefaultTouch aumenta la reserva de Glock de 0 a 15 tras restaurar. |
| Jeringa e inventario | Recogida nativa; se conservan bolsa, reserva de Glock y arma activa al volver a guardar/cargar. La selección automática de jeringa se respeta. |
| Chispas activas | SparkThink/SparkStop se conservan; apagar y volver a encender funciona después de restaurar. |
| Generador spawnm3 | Crea exactamente un baby, como indica monstercount=1; después de guardar/cargar no se repite y conserva el estado terminado. |
| trigger_cofteleport *127 | Touch real tras cargar: llega a hiss1_land1 en (−778,−288,460), con ajuste de hull y velocidad cero. |
| Continuidad | Use original de changelevel1 después de restaurar lleva a c_apartment2 con la Glock conservada. |
| Zoom activo y reutilización | Retorno UNZOOM y configuración 60/666 conservados. |
| Guardado inmediato | Persiste **1 aviso auxiliar CTestHull**; no se declara solucionado. |

Evidencia funcional completa: `behavior-fixed-complete/` y `behavior-transition-use/`; zoom en `zoom-fixed-abi/` y `zoom-reuse-fixed/`. Son escenarios diagnósticos: se concedió una Glock y se posicionó al jugador para aislar contactos y transiciones. No certifican un recorrido natural del capítulo. No se llamó Spawn para reparar una entidad; los Use del ensayo son activaciones para verificar su comportamiento.

Se conservaron errores del propio ensayo: comparar una reserva de Glock con la munición de la jeringa seleccionada automáticamente, esperar que un generador de un solo uso siguiera activo tras agotarse, y activar el zoom mientras la cinemática todavía lo volvía a utilizar. Se corrigieron las expectativas conforme al código y a los eventos reales, sin cambiar las reglas del juego ni ampliar los fences.

El intento behavior-transition/ posicionó al jugador en el centro de las dos zonas recíprocas de cambio de nivel y provocó retornos automáticos y timeouts de comandos. Los BSP muestran zonas coincidentes y landmarks desplazados dos unidades. La prueba definitiva usa la activación Use prevista fuera del volumen de llegada, conserva todos los triggers y alcanza c_apartment2. No se presenta aquel intento como un defecto de serialización.

### Regresiones originales

Contra la build final 8108, carpeta `regressions-abi/`:

- **9/9 contratos BSP** (7 entity_maps, 1 envpos, 1 padlock).
- **Pointer Lock PASS**.
- **14/14 navegadores PASS**: entities, campaign_entities, motion_entities, model_entities, manager_entities, sound_entities, camera_entities, train_entities, track_entities, envpos_entities, button_entities, changelevel_entities, trigger_persistence y ambient_persistence.
- Se mantuvieron multiscene1, los límites originales y las pruebas originales. Cámaras, puertas, botones, trenes, audio, inventario y cambios de nivel conservan sus contratos comprobados.

A petición del usuario se silenció la salida de los navegadores de prueba (`--mute-audio`) y se cerró la referencia audiovisual. No se cambió volume ni la mezcla del producto. Las pruebas de audio comprueban emisión/PCM, no escucha humana.

## 7. Archivos y límites

Archivos modificados: `patches/hlsdk/0001-root.patch` (cbase, serialización, registro inicial y funciones de Spark/MonsterMaker), `game/cof-logic/cof/atmosphere.cpp`, `effects_cof.cpp`, `teleport.cpp` y `hud.cpp` (registro de métodos propios y estado del zoom), `player_cof.cpp` (observador). Nuevo: `cof/persistence.cpp`.

Pruebas nuevas: `entity_persistence_audit.mjs`, `callback_behavior.mjs`, `zoom_persistence.mjs`; auxiliares de análisis y datos por instancia en la carpeta de validación. Guardados generados excluidos por `.gitignore`. No se añadieron DLL, BSP, modelos ni sonidos originales.

Límites:

- No se reconstruyen callbacks ausentes de guardados antiguos defectuosos. No hay información suficiente para inventarlos.
- El registro de nombres cubre las clases y estados explícitamente investigados; un método nuevo no registrado debe seguir avisando. No se declara que todos los callbacks de toda la campaña estén implementados.
- El auxiliar de nodos sigue pendiente en el guardado inmediato. No se certifica toda la reconstrucción de navegación ni combate y rutas de todos los monstruos.
- El SDK reinicia rutas y tareas de IA al restaurar por su diseño previo; se comprobó reanudación de callbacks/animaciones y generación, no identidad de toda una ruta planificada.
- Los siete generadores reales son de un solo uso. Se probó la finalización sin repetición; no se inventó un generador cíclico para acreditar estados que el mapa no utiliza.
- En la prueba de continuidad permanecen mensajes previos sobre landmark land4 y campos de delta is_donator ausentes. La transición land1 comprobada funciona; no se ocultaron ni se corrigieron esos asuntos sin investigación.
- No se hicieron pruebas de escucha humana, GPU física ni recorrido natural completo como parte de esta auditoría.

## Conclusión

Los 39 avisos históricos vuelven a estar demostrados en el estado actual y no eran una alarma puramente cosmética. La corrección verificada recupera funciones de 27 entidades y el estado del zoom, con pruebas de operaciones reales y restauración en frío. El aviso temprano del constructor de nodos se mantiene identificado y pendiente; no se ha silenciado para declarar éxito.
