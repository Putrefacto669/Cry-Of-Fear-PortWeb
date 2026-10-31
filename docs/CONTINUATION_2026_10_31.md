# Continuación de la validación de c_start — 31 de octubre de 2026

Estado: investigación y pruebas en curso. No acredita todavía la escena de la
puerta mediante E ni la reproducción audible de las voces.

## Estado recuperado

- HEAD: `4000b6a`; árbol limpio al iniciar. Rama activa:
  `codex/c-start-padlock`, distinta de `main` reportada en el relevo. No se cambió.
- Se consultaron CLAUDE.md, README y los informes de partículas WebGL, HUD,
  teléfono, envpos, referencia audiovisual y candado; también la auditoría de
  continuidad y los resultados históricos de regresiones.
- Se examinaron los cambios de `4e1a1ec`, `781c235`, `e35a224`, `3affd37`,
  `ea500b5` y `4000b6a`. Los dos últimos actualizan distribución y registro;
  no añaden pruebas funcionales de interacción con E.
- Entorno: Emscripten 4.0.11, Node 24.19.0, Playwright 1.64.1 en
  `/root/cof-audits/browser-1.64.1`. La carpeta auxiliar `e2e` del árbol de
  compilación tiene Playwright 1.56.1: no se utiliza para esta validación.
- Los SHA-256 del servidor, cliente y renderer extraídos del paquete servido
  coinciden con las salidas de compilación del árbol canónico. Evidencia:
  `published-modules.json` y `built-modules-verified.sha256`.
- Se sirve el dist existente en el puerto 8096, sin escribir en él. No se ha
  recompilado ni cambiado código del producto durante esta recuperación.

## Escena de la puerta: contrato encontrado en el BSP

`doorclose2` es `func_door_rotating`, modelo `*42`, origen
`3127 -2457 -727`, spawnflags 19. Existe además un ambient_generic con el
mismo nombre y el sonido `cutscene/start/doorclose.wav`.

El BSP contiene dos multi_manager llamados `multiscene3`, además de:

- `trigger_once *35`, destino `multiscene3`, límites mundiales
  `(3065,-2448,-766)` a `(3133,-2415,-624)`.
- `trigger_once *43`, destino `doorclose2`, límites
  `(2946,-2093,-766)` a `(3185,-2083,-683)`.
- Cámaras `ckamera1`, `ckamera2` y `ckamera3`.
- `simon3`: **env_model**, modelo `models/cutscene/player3.mdl`, origen
  `3084.43 -2426.62 -775`, secuencias `idlegetsms2` y `getsms2`.
- `sms3hehe`: trigger_cofmobile, bodynumber 1, silencioso; programado a 6,5 s.
- `whatthesub`: ambient_generic con `subtitles/start/sub1.wav`, programado a
  1,5 s; `simon3` se activa a 1 s. La secuencia también programa cambios de
  vista, visibilidad y teletransportes originales del mapa a 15,4 s.

El cambio `3affd37` intercepta cualquier Use de la puerta por su nombre y
dispara multiscene3 una vez, mediante un `static BOOL` global. No guarda ese
indicador por entidad ni por partida. Son riesgos por comprobar en ejecución:
activación indirecta desde *43, persistencia y reinicio de campaña. La lectura
del código por sí sola no acredita que estos riesgos expliquen el síntoma.

El modelo inspeccionado contiene eventos 1004 de sonidos de manipulación;
`getsms2` incluye lockeddoor y pickmobile. No se ha demostrado que el personaje
inmóvil reportado por el usuario corresponda a simon3 ni a un enemigo distinto.

## Voces

Se inventariaron nueve archivos WAV de `sound/subtitles` en el staging de
c_start: PCM, mono, 22.050 Hz, 16 bits. Sus tamaños y hashes están en
`voice-resources.json`, sin copiar sonidos al informe. La presencia y el formato
no demuestran emisión ni audibilidad. La ruta de ambient_generic, mezclador y
WebAudio todavía requiere pruebas específicas y escucha real.

## Evidencia nueva

Directorio separado: `build/validation/continuation-2026-10-31/`.

- Pointer Lock: satisfactorio.
- Contratos BSP: siete generales, uno envpos y uno candado, satisfactorios.
- Suite original de doce pruebas de navegador: **12/12 satisfactorias**, antes
  de modificar el producto. Resultados y duraciones en `baseline/summary.txt`.
  Esto no sustituye la prueba de recorrido ni certifica las novedades de armas.
- El recorrido previo natural-9 terminó obstruido al entrar al café. No se
  considera una prueba satisfactoria del acertijo ni de la puerta posterior.

## Defecto reproducido y corrección en validación

La prueba `trigger-save-baseline/comparison.json` registra los disparadores
reales *35 y *43 con `touch=1` antes de guardar y `touch=0` tras restaurar. No se
activaron artificialmente. No hubo errores JavaScript. La puerta pierde también
Touch y cambia su estado toggle. Esa pérdida se corrigió después con un bloque
de callbacks de CBaseDoor y conservación de los sentinelas de su reloj local.

La causa de la pérdida del disparador es el contrato FIELD_FUNCTION en el módulo
WASM: los callbacks no resuelven nombres exportados y el bloque BASE puede dejar
de coincidir con el número de campos declarado. CTriggerMultiple no tenía una
serialización específica, y CTriggerOnce hereda de esa clase.

Se añadió un bloque de identidades de callbacks para esas dos clases en
`dlls/triggers.cpp`, incorporado a `patches/hlsdk/0001-root.patch`. Conserva por
separado MultiTouch, MultiWaitOver, SUB_Remove y estados nulos; al escribir limpia
temporalmente los punteros, los restaura inmediatamente en la instancia viva y
los vincula al cargar. No llama Spawn ni Use, no reinicia relojes y rechaza
callbacks desconocidos. Las plataformas nativas conservan su implementación.

Compilación Emscripten satisfactoria (`trigger-build.log`), con el aviso previo
de memcpy sobre entvars_t en CMultiManager. Empaquetado aislado satisfactorio:
`/root/cof-audits/continuation-20261031/dist`. El servidor empaquetado coincide
exactamente con el compilado y contiene el nuevo bloque CTriggerMultiple;
SHA-256 `6d58184af083a6c8721265afaeb829e33cb8f4cac74749bf17caaa27ee23372e`.
La comprobación inversa del parche sobre el SDK actual pasó. `git diff --check`
señala dos líneas de contexto vacías del parche anidado; no son espacios
añadidos al código C++.

La nueva prueba `tools/e2e/trigger_persistence.mjs` exige que *35, *43 y *157
conserven MultiTouch, reposo y plazo cero durante tres guardados/restauraciones.
Su resultado y las regresiones posteriores se deben comprobar antes de dar la
corrección por validada. Los guardados anteriores que perdieron callbacks no se
declaran reparados ni migrados.

El análisis de solo lectura del original (`native-door-full.txt`, función
1008dfb0) exige la bandera 256 para ofrecer uso directo. La puerta *42 tiene
spawnflags 19. Su Use original (1008f2f0) no contiene la activación especial de
multiscene3 añadida por el port. Por eso no se presupone que pulsar E deba ser el
mecanismo original de esta escena: hay que observar también el disparador de
proximidad y el momento exacto de activación durante el recorrido.

## Recorrido y pruebas de continuación

`natural-1/natural-result.json` acredita el recorrido normal hasta la nota,
contraseña correcta en el ordenador y regreso: combinación 9974, nota pass5.
`operations-2/result.json` acredita rechazo de 1974, cuatro ruedas y controladores
de cliente, cancelación, restauraciones antes/activa/apertura/resuelta, cambios
visibles y cruce de la puerta del candado mediante E. Se utilizaron exclusivamente
guardados nativos obtenidos de ese recorrido. El primer ensayo de reentrada
falló por pulsar E durante el retorno del botón; la prueba ahora espera su reposo
real, sin ampliar el límite. Los fallos y recorridos obstruidos se conservaron.

`scene-baseline-3` llega caminando desde ese guardado legítimo a la puerta bajo
la lámpara amarilla y junto a los contenedores verdes. Antes y después de E,
ckamera1 sigue en estado 0 y simon3 en secuencia 5 (idlegetsms2); *35/*43 tienen
Touch=0. Posición real del jugador: `(3102.2,-2400,-739)`. Las capturas corroboran
el lugar descrito. No hubo errores JavaScript. Es una reproducción natural del
bloqueo tras el recorrido y las restauraciones, no una activación con cof_usemodel.

`trigger-fixed-2` pasa tres ciclos de guardado/restauración de los disparadores
reales y de la puerta en reposo; además, Use/guardado/carga de puerta termina en
el estado detenido esperado, sin activar ckamera1. El primer ensayo de este test
agrupaba un comando reenviado al servidor y el guardado del cliente: guardaba
antes de procesar Use. Se corrigió la secuencia de la prueba, manteniendo los
fences de 30 s, y se conservó su fallo.

La corrección de CBaseDoor conserva DoorTouch, DoorGoDown, LinearMoveDone,
AngularMoveDone, DoorHitTop/DoorHitBottom y sentinelas 0/-1. El static global
que activaba multiscene3 por nombre se retiró para conservar el contrato original.
Cambian únicamente las secciones SDK `doors.cpp`, `triggers.cpp` y `cbase.cpp`
del parche hlsdk. El último servidor aislado es
`8890359dc101e1ef81db83bd1a7ad0b82cfe16a4598faac39a0c0c3e602bf251`;
compilación, empaquetado y comprobación inversa del parche satisfactorios.
No se modificó el renderer.

La repetición natural con la corrección (`natural-fixed-1`) está en curso.
Las doce regresiones posteriores y la reproducción audible de voces siguen
pendientes. El éxito de las doce pruebas iniciales corresponde al dist anterior.

## Relevo a Claude Code: corrección de `cusse` y cierre de la validación

### Estado encontrado

La corrección de `body`/`skin` de `env_customize` ya estaba implementada por Codex y
no se repitió:

- `DispatchKeyValue` (`dlls/cbase.cpp`, exportado a `patches/hlsdk`) entrega `body`
  y `skin` al `KeyValue` de `env_customize` antes de que `EntvarsKeyvalue` los
  consuma como campos propios de la entidad. Solo afecta a esa clase.
- `CEnvCustomize` guarda los valores como `+1` (0 = no indicado, por lo que `-1`
  significa "no cambiar"), añade `m_iKeyValuesVersion` y migra partidas antiguas al
  restaurar sin inventar valores cero.
- Compilación y empaquetado aislados (`customize-build.log`,
  `customize-package.log`, `dist-customize`, 14:01).

Faltaba validarla: la prueba `scene-fixed-2` y la primera repetición
(`scene-claude-1`) se ejecutaron contra el puerto 8099, que seguía sirviendo
`dist-use` (12:36), una build anterior a la corrección. Por eso fallaban en la
aserción de `cusse`. No es un fallo del arreglo, sino de la build servida.

### Resultados con la corrección compilada (`dist-customize`, puerto 8097/8098/8095)

- `scene-claude-2`: recorrido natural desde una partida nativa tras el candado.
  Pasa completo. En el SMS, `simon3` tiene `seq=4 frame=110 body=1 skin=0`: `cusse`
  cambia el body de 0 a 1. Escena activa y terminada se restauran sin repetirse.
- E por sí sola no arranca la escena (`ckamera1 state=0` justo después). Arranca al
  entrar en `trigger_once *35`, delante de la puerta. Coincide con el análisis del
  original (el `Use` de `*42` no activa `multiscene3`).
- Voz de la escena (`sub1.wav`, `whatthesub`): se emite en la línea original y una
  vez en la restaurada; ganancia 0,70, maestro 0,8, a unas 80 unidades del oyente
  (alcance 800). No se repite al restaurar la escena terminada.
- `trigger-claude-1`, `ambient-claude-1` y `use-surface-claude-1`: satisfactorias.
- Suite original de doce pruebas: 12/12 (`regressions-claude/summary.txt`).
- Recompilación de control: Waf no recompila nada; el módulo de servidor no cambia
  (`0c3621beb26018d5`).

### Personaje inmóvil en la puerta

Detrás de `doorclose2`, a unas 50 unidades, hay un `env_model` sin nombre:
`models/cutscene/blacker.mdl` en `(3096,-2474,-775)`, secuencia `idle`. Es una
silueta de cinemática, no un monstruo: no tiene IA. Es la única instancia del
capítulo. La puerta empieza abierta (spawnflags 19) y la cierra `trigger_once *43`
cuando el jugador pasa a unas 360 unidades; en el recorrido correcto la puerta está
cerrada al llegar y la silueta no se ve.

Si `*43` no se dispara, como en las partidas restauradas con el fallo de
`MultiTouch` que Codex reprodujo, la puerta se queda abierta y la silueta queda a la
vista, inmóvil. Esa es la explicación más probable del "enemigo pegado" descrito por
el usuario. Está demostrada por los datos del mapa y la prueba de persistencia, no
por una captura con la build antigua.

### Voces del capítulo 1

Las voces de Simon son `ambient_generic` disparados por `multi_manager`. En el dist
publicado, al restaurar una partida se perdía su `Use` (`ToggleUse`) por el mismo
problema de `FIELD_FUNCTION` en WASM; Codex añadió su conservación en `sound.cpp`.
En una partida nueva la voz ya se emitía. La comprobación audible con altavoces
sigue pendiente: las pruebas miden la emisión en WebAudio, no la escucha.

### Voces de Simon en el capítulo 1: inventario y emisión (dist `3d08310`)

Reporte del usuario: en los apartamentos y en varias escenas de la puerta de la derecha
no se oye la voz de Simon.

- **Inventario del original.** Las únicas voces habladas de Simon en esta parte son
  `ambient_generic` con archivos de `sound/subtitles/`: 9 en `c_start`, 3 en
  `c_apartment5` (`sschub1..3`, escena `multibadkars`) y el vómito de
  `c_apartmentsick`. `c_apartment1..4` no tienen ninguna: allí los pensamientos de Simon
  son solo subtítulos de texto, también en el original.
- **Eventos de modelos.** Los modelos de `models/cutscene` llevan 83 eventos 1004 de
  sonido (pasos, toses, puertas, coger el teléfono). Ni el `CEnvModel::Think` original
  (`hl.dll`) ni el `client.dll` los procesan, así que el original tampoco los reproduce.
  No se activan en el port para no añadir sonidos inexistentes.
- **Volúmenes del mapa.** `subtitles1..3` (cinemática inicial) tienen volumen 5 y
  `whatthesub` (escena del SMS) volumen 7; el resto, 10. El port los reproduce con esos
  valores (ganancia 0,498 y 0,698 = volumen / 255 del canal).
- **Emisión medida en WebAudio** (contexto `running`, sin bucle):
  - `c_start`, cinemática inicial: tres voces a 16,9 s, 24,9 s y 32,9 s (2,19 s, 2,14 s y
    0,78 s), a unas 200 unidades de la cámara, alcance 800.
  - `c_apartment5`, `multibadkars`: tres voces a 9,3 s, 11,8 s y 14,8 s (0,78 s, 1,67 s y
    2,77 s), ganancia 1, a entre 75 y 145 unidades, alcance 800.
- **Mezcla.** En el original: `volume 0.6`, `fmod_volume 1`, `MP3Volume 0.7`. En el port:
  efectos 0,8 y música 0,8. La música no queda más alta que en el original.

Conclusión: no se ha encontrado ninguna voz de Simon que el port deje de emitir. La
pérdida tras cargar partida ya estaba corregida en `sound.cpp`. Falta la comprobación
auditiva y saber qué escena concreta oye en silencio el usuario.

## Monólogo de la introducción e idiomas de subtítulos

### Introducción de un jugador

**Causa.** `cof_introduction` mostraba un texto que no era el del prólogo. El servidor original
envía `pev->iuser1` como tipo (0 un jugador, 1 Doctor, 2 cooperativo); el SDK guarda la clave
`iuser1` del mapa en `entvars`, así que nunca llega a `KeyValue`. `c_intro` no la tiene (tipo 0),
`c_doc_city` pone 1 y `cof_campaign_01` pone 2.

**Corrección.** `CCofIntroduction::Use` (`game/cof-logic/cof/hud.cpp`) lee `pev->iuser1`;
`iuser2` e `iuser3` valen 1 en todos los mapas y se ignoran. hud.js abre
`gfx/vgui/introductions/<idioma>/<idioma>_<sp|doc|coop>.TGA`, con el inglés como respaldo.

### Selector de idioma con banderas

**Original.** La cvar `cof_subtitlelanguage` es del client (1 inglés por defecto, 2 neerlandés,
3 francés, 4 alemán, 5 noruego, 6 español, 7 sueco); el servidor solo la escribe con el comando
`subtitleset`. La pantalla es `gfx/vgui/language_settings.tga` (640x480), "SUBTITLE LANGUAGE",
con una cuadrícula de banderas de 157x115 px en x 83/241/399 e y 64/181/298:
English, Svenska, Norsk / Nederlands, Français, Deutsch / Español (bandera de España). Cada idioma
tiene `txtfiles/languages/<idioma>/` (9 archivos), `notes/languages/<idioma>/` (8) y sus
introducciones; el inglés usa los archivos de la raíz.

**Implementación.**
- `platform/web/hud.js`: Opciones → «Idioma de los subtítulos» abre la imagen original con 7 zonas
  pulsables sobre las banderas; la actual se marca. La elección se guarda en
  `localStorage.cofLanguage` (sin ella, el idioma del navegador) y cambia subtítulos, pistas, SMS,
  notas e introducción; se vacían las cachés de texto y se envía `cof_subtitlelanguage <n>`.
- `game/cof-logic/client/cof_client.cpp`: registra `cof_subtitlelanguage` (valor inicial 1). Antes
  no existía: la consola decía `Unknown command` y el servidor leía siempre 0.
- `tools/stage_map.py`: el paquete boot incluye `language_settings.tga`, la introducción `_sp` de
  los siete idiomas y `txtfiles/languages` entero (boot pasa de unos 78 a 83 MB). Las de Doctor y
  cooperativo de los idiomas nuevos se añadirán con esos mapas.

**Fallo encontrado en la prueba.** La regla `#cof-sheet button` (más específica) dejaba los botones
en `position: static` y las zonas no coincidían con las banderas; se resolvió con selectores
`#cof-sheet .cof-lang button`.

**Pruebas** (dist aislado `claude-launcher`, puerto 8091, `?sw=0`, clics reales):
- Las 7 zonas miden exactamente 157x115 en las coordenadas de la imagen; el español sale marcado.
- Al pulsar la bandera alemana: `cofLanguage = german`, Opciones muestra «Deutsch».
- `c_intro` muestra «EINLEITUNG» (alemán) y la consola da `"cof_subtitlelanguage" is "4" ( "1" )`.
- Los seis idiomas traducidos tienen sus 9 textos y su introducción en el sistema de archivos.

## Llaves: USE desde el bolso

**Síntoma (usuario, `c_apartment1`).** Con la llave del apartamento, USE en el bolso no abría la puerta.

**Causa.** El port hacía lo contrario que el original: `inter_door` y los `func_button` con
`lockedby` se desbloqueaban al pulsar E si la llave estaba en el bolso, y USE en el bolso solo
funcionaba con armas (con lo demás sonaba `inventory_no`).

**Original** (`hl.dll`, análisis de solo lectura con `tools/ghidra`):
- `inter_door` guarda `lockedby` en `+0x190`. Su `Use` (`FUN_10048f70`) no mira el bolso: si está
  cerrada muestra `lockedmsg` y suena `lockedsnd`.
- El comando de cliente `inventoryuse <ranura>` llama a `FUN_100e4410`, que toma el `map_name` del
  objeto y:
  - traza 80 unidades desde los ojos (`DAT_101a1f14` = 80.0); si choca con algo usable
    (`ObjectCaps & 0x38`), lo prueba con `inter_door`, `func_valve` y `func_button` bloqueado;
  - si no, recorre las entidades a 64 unidades del jugador (`0x42800000`) con las mismas pruebas;
  - si nada coincide, suena `inventory_no`.
- Desbloquear una puerta (`FUN_10048e40`): `unlockedsnd`, `unlockedmsg`, borra `lockedby` y
  `lockedmsg`, y no admite otro uso durante 1 s. **No la abre**: luego se usa con E.
  - El objeto se gasta salvo con la bandera 1 de la puerta.
- Botón (`FUN_10015a20`): quita el bloqueo, `unlockedmsg` y su sonido.
  - Con la bandera `0x800` lo pulsa en el acto.
  - La bandera `0x400` conserva el objeto.
- Tras usarlo bien suena `inventory_click` y el bolso se cierra.

**Corrección.**
- `game/cof-logic/cof/doors.cpp`: E sobre una puerta o un botón con llave solo avisa.
  `CoF_UseItemOn` reproduce el recorrido del original para `inter_door` y `func_button`.
  `func_valve` no se cubre: ningún mapa publicado lo bloquea con un objeto.
- `player_cof.cpp`: comando `cof_useitem <ranura>`, que responde `COF/HUD ITEMUSED 0|1`.
- `platform/web/hud.js`: USE sobre un objeto que no es arma envía `cof_useitem`. Con 1 suena el
  clic y se cierra el bolso; con 0 suena el "no".

Entidades afectadas en los 11 mapas (las demás `lockedby` son nombres que ningún objeto tiene):
`c_apartment1` puertas `*10` (`hallkey`) y `*66` (`apartmentkey`), `c_apartment3` botón `*133`
(`Videotape`), `c_apartment4` puerta `*96` (`basementkey`) y `c_apartment5` botón `*68` (`rope`,
bandera `0x800`).

**Pruebas** (dist aislado `claude-launcher`, puerto 8091, `?sw=0&timer=1`):
- **`c_apartment1`, puerta `*66`:**
  - E con la llave: "The door is locked." y la llave sigue en el bolso.
  - Clic en la llave → USE: "Has abierto la cerradura.", `ITEMUSED 1`, bolso vacío y cerrado.
  - E después: el jugador pasa a `3_exit1` (-312, 480).
- **Llave lejos de su puerta** (`hallkey`): `ITEMUSED 0` y la llave se queda.
- **`c_apartment5`, botón de la cuerda:**
  - E: "You will need a rope or something to climb down."
  - USE: "You have placed the rope.", la cuerda se gasta y se dispara `multiunlockedrope` (fundido).
- **Sin probar en juego:** el botón de la cinta de vídeo (`*133`, sin `0x800`: se desbloquea y luego
  se pulsa con E) y la puerta `*96` de `c_apartment4`.

## Límites de la validación

No se modificaron recursos originales, distribución principal, licencias ni
créditos. No se realizaron commits, pushes ni despliegues. Los registros antiguos
se conservaron. Este documento fue elaborado con asistencia de Codex; los
síntomas y prioridades proceden del usuario y el relevo de Claude Code.
