# Progresión de la campaña: siguiente mapa — Claude Code, 15/11/2026

**Alcance de esta etapa.** Primera entrega de la fase «ampliar la campaña original mapa por mapa».

- **Worktree independiente:** `C:\Users\josue\cof-audits\claude-campaign-20261115`, rama
  `claude/campaign-next-map-20261115`, cortada de `portweb/main`.
- **Árbol WSL propio:** `/root/cof-audits/claude-campaign-20261115`, con una copia del `stage` canónico. El canónico
  no se modificó.
- **Sin tocar:** el juego de Steam, `dist/`, la Alpha publicada y el trabajo de otros. Sin commits, push ni despliegue.
- **Análisis de las DLL:** solo lectura; los volcados quedan fuera del repositorio, en
  `C:\Users\josue\cof-audits\private-native\claude-campaign-2026-11-15\`.

## 1. Estado real de la versión actual

| Elemento | Estado |
|---|---|
| `portweb/main` (público) | `ed21f7d`; `dist/` publicado en `09f09c5` |
| Manifiesto público | `b902da18e9f1` (comprobado en el sitio) |
| Repositorio principal local (OneDrive) | `f683f0a`, rama `codex/c-start-padlock`: **no** es lo más reciente |
| Manos duales | Integradas y publicadas (`8590410`, `0140a63de3d5`); recarga dual como el original en `b902da18e9f1` |
| Escaleras originales | Integradas y publicadas en `b902da18e9f1` (`09f09c5`); el usuario las comprobó en juego real |

**Trabajo ajeno sin integrar, que se conserva tal cual:**

| Worktree | Contenido |
|---|---|
| `codex-ladder-continuity` (base `4949911`) | Candidata de continuidad de la cámara de escalera `b4d9c4ba55ac`, con cambios en `cof_client`/`cof_hands`/`atmosphere`/`puzzles` y un parche `patches/hlsdk/0002-ladder-camera-visibility.patch`. Codex no recomienda integrarla todavía y señala que el motor puede devolver al jugador a `MOVETYPE_WALK` durante la escalada |
| `phase5-20261109` | Investigación de manos duales de Codex |

**Los once mapas empaquetados:** `c_game_menu1`, `c_intro`, `c_nightmare`, `c_start`, `c_start2`, `c_apartment1-5`,
`c_apartmentsick`.

## 2. Último punto de campaña jugable

**Final del capítulo 1, en `c_apartmentsick`:** el `trigger_once` `*227` dispara el `trigger_changelevel changekuk`
hacia `c_basement` por el landmark `landkuk`.

En la versión publicada ese cambio no se completa. El motor responde `changelevel: map c_basement doesn't exist`, y
`loader.js` solo reintenta con mapas empaquetados, así que **el jugador se queda al final del capítulo 1**.

No se ha certificado una partida natural completa del capítulo 1 hasta `*227`: hay recorridos parciales documentados,
pero ninguno de principio a fin. En esta etapa `*227` se alcanza con `cof_goto`, que es un atajo de prueba.

## 3. Grafo de transiciones

Se extrajo de los 235 BSP originales (todos los `trigger_changelevel` y los cambios por `trigger_command`):
`build/validation/claude-campaign-2026-11-15/transitions-all-maps.json`. Todas las aristas de la tabla están
**demostradas** por un `trigger_changelevel` del BSP con su `map` y su `landmark`.

| Desde | Hacia | Landmark | Disparador | Notas |
|---|---|---|---|---|
| `c_apartment3` | `c_apartmentsick` | `landfitta` | `changefitta` | Entrada al último mapa del capítulo 1 |
| `c_apartmentsick` | `c_apartment3` | `landfitta` | `changefitta` | Vuelta |
| **`c_apartmentsick`** | **`c_basement`** | `landkuk` | `trigger_once *227` → `changekuk` | **Salida del capítulo 1** |
| `c_basement` | `c_apartmentsick` | `landkuk` | `changekuk` | Bloqueada en el juego por `trigger_checkbrush` («I don't need to go back up again.») |
| **`c_basement`** | **`c_sewer`** | `swheh1` | `trigger_multiple` → `chsw1` | **Siguiente salida** |
| `c_sewer` | `c_sewer2` | `kalalale` | `chsw55` | Siguiente tramo; aquí solo como referencia |
| `c_sewer2` | `c_sewer3` | `swheh13` | `chsw13` | Referencia |
| `c_sewer3` | `c_city` | `swheh1` | `chsw1` | Referencia |

**Inferido, sin demostrar:** que `c_sewer` → `c_sewer2` → `c_sewer3` → `c_city` sea el orden lineal de la campaña.
Las aristas existen en los BSP, pero no se ha recorrido ese tramo, y hay ramas paralelas (`c_city` ↔ `c_avlopp`,
`c_buscity`…).

`maps.json` ya incluye `transitions.json` con estas aristas (`tools/gen_transitions.py`).

## 4. Siguiente mapa original confirmado: `c_basement`

Capítulo 2, «Who is that doctor?». Tiene 713 entidades.

**Recorrido según el BSP:**

1. **Entrada y escena.** Al entrar desde `landkuk` corre `multiirlap` (cámaras `irlkam*`, desenfoque, blanco y negro,
   música) y, a los 15 s, `multibass1`: 13 cámaras, sonidos, subtítulos `ch1–ch14`, fundidos, teletransporte
   `fittjaevel` → `landada` a los 49 s y `cof_chapter` «Chapter 2 - Who is that doctor?» a los 52 s.
2. **Sótano.** Grabadora `tape_recorder` («Basements»), jeringa, cargador de Glock y 4 `monster_crab` colocados.
3. **Porra.** Al cogerla (`weapon_nightstick` en 1085 1701 552), el `trigger_once` `fisteehslwo` hace aparecer 3
   `monster_crab` con `monstermaker` `crabspawn1-3`, más `crabwall`.
4. **Puzle de la puerta eléctrica:**
   - un `func_button` muestra la revista (`cof_document doc1`, `magazine.txt`, `rippedmagarticle.tga`);
   - el jugador llama desde el móvil al número de la revista: `cof_phonecheck` (`impulse 543214`, `iuser1 4096`) →
     `basementcall`;
   - `cof_phonecall basementcall` reproduce `subtitles/magphone.wav` con 12 subtítulos (286–296, 313) y dispara
     `addnotemm`;
   - `addnotemm` añade la nota de código (`cof_addcodenote phonecode`, `iuser1 4`) y activa `keypad4`
     (`cof_keypad4`, `target kaypanel3`, con esa ortografía en el BSP);
   - el teclado `cof_keypad keypanel3` → `multielecdoor` → `cof_interdooronoff unlockelec`, que desbloquea la puerta
     `lockedelec`.
5. **Salida.** Escalera `cof_ladder_manager nerdclimb5` (las secuencias estándar, ya implementadas) hacia abajo y
   `trigger_multiple` → `chsw1` → `c_sewer`.

## 5. Recursos necesarios

**Paquete de la candidata:** `map_c_basement`, 55 MiB (`.data`), 264 archivos.

- Generado con `tools/stage_map.py` y el `texcomp` del árbol canónico, sin cambios en el script.
- Sus SHA-256 están en `c_basement-pack-sha256.txt`.
- Música: 5 MP3 (4,5 MiB) en `mp3/`.
- Sin duplicados con `boot` ni `extras`. Los archivos que comparte con otros mapas (19 con `c_apartmentsick`, 43 con
  `c_apartment3`, como los cielos `gfx/env/black*`) los resuelve ya `loader.js`, que desmonta el repetido antes de
  crearlo.
- No se incluye nada de otros capítulos.

**Ya en el paquete:**

- `models/weapons/nightstick/w_nightstick.mdl` (la porra en el suelo);
- `sound/subtitles/magphone.wav` (la llamada);
- `models/Props/InomhusD/magazine_prop.mdl` y la textura `c2_keypad3`.

**Faltan, porque los precarga el código y no una clave del mapa:**

| Pieza | Recursos (`hl.dll`, solo lectura) |
|---|---|
| `weapon_nightstick` | `v_nightstick.mdl`, `nightstick_swing.wav`, `nightstick_hitbody1/2.wav`, `nightstick_hitwall1/2.wav` y los genéricos `weapon_fire_empty*.wav` |
| `monster_crab` | `models/slower2.mdl`, `models/slower_headgibs.mdl`, `sprites/head_burst.spr` |
| Revista | `gfx/vgui/notes/rippedmagarticle.tga`: `gfx/vgui` se excluye de `boot`, así que hay que ver cómo sirve `hud.js` las imágenes de notas de los mapas anteriores |

**Permisos.** El permiso de Andreas (Team Psykskallar) cubre el port con tres condiciones: créditos visibles, código
abierto (GPL-3.0) y sin fines de lucro. Sirve igual para estos recursos, que salen del mismo juego. Antes de publicar
el capítulo 2 hay que **confirmar contigo que ese permiso abarca más capítulos** y no solo los publicados hasta ahora.

## 6. Entidades nuevas o incompletas

Contrastado con las 328 clases registradas en el port (cof-logic + hlsdk). La sonda confirma en el juego que estas
clases quedan con 0 instancias:

| Clase | Instancias | Efecto en el tramo | Peso |
|---|---|---|---|
| `cof_phonecheck` | 1 | **Bloquea:** sin él no hay llamada | Medio–alto: marcar números en el móvil |
| `cof_phonecall` | 1 | **Bloquea:** da el código y activa `keypad4` | Alto: audio con subtítulos temporizados |
| `cof_keypad4` | 1 | **Bloquea:** asocia el código 4 al teclado | Medio |
| `weapon_nightstick` | 1 | Arma nueva; al cogerla aparecen 3 enemigos | Alto: arma, bolso, animaciones, daño |
| `monster_crab` | 4 + 3 por `monstermaker` | Enemigos del tramo | Alto: IA del original; base posible en el `monster_slower` del port |
| `info_texlights` | 1 | Ninguno (solo sirve al compilar) | — |

**Clases ya existentes que este tramo usa por primera vez o de otra manera** (hay que comprobarlas):

- `cof_addcodenote`: el cuaderno de códigos que pediste aplazar;
- `cof_keypad` (`keypanel3`), `cof_interdooronoff`, `cof_document` con la imagen de la revista, `cof_hint`
  (`usemobilephone`);
- `cof_ladder_manager` `nerdclimb5`, con las secuencias estándar ya implementadas;
- `cof_teleport`, `monstermaker` y `cof_developer_commentary` (3).

**Choque con una decisión anterior.** Me pediste dejar el cuaderno de notas y las llamadas de teléfono «para cuando tú
digas». **El camino crítico de `c_basement` depende de las dos cosas** (`cof_phonecheck` → `cof_phonecall` →
`cof_addcodenote` → `cof_keypad4`). No las he empezado.

## 7. Riesgos de progresión

1. **Bloqueo total en la puerta eléctrica.** Sin las llamadas ni `cof_keypad4`, el código no se puede obtener y no se
   llega a la escalera ni a `chsw1`. Es lo que pasa hoy en la candidata.
2. **Códigos aleatorios.** En el original los códigos de teclado son aleatorios por partida. Hay que confirmar si
   `keypad4` toma el código 4 del cuaderno o si la llamada lo dicta; no se puede fijar un código.
   **Resuelto (sección 11):** `cof_keypad4` (`100a7120`) escribe **5247 fijo**, como el propio original, y la escena
   de entrada `multibass1` ya lo dispara en el segundo 0.
3. **Persistencia entre mapas.** El cuaderno de códigos tiene que conservarse con los cambios de nivel y las partidas
   guardadas. Las partidas actuales no tienen ese estado, así que hará falta una migración justificada.
4. **Enemigos ausentes.** Con 0 `monster_crab`, el tramo es más fácil que el original. No se debe publicar así como si
   estuviera completo.
5. **`trigger_checkbrush`.** Hay cuatro con mensajes («I don't need to go back up again.», «The stairs has fallen
   apart…»): hay que comprobar que bloquean cuando toca.
6. **Error al guardar.** `Invalid function pointer in entity!` aparece al guardar en `c_basement`. También sale en
   `extras_persistence` de la batería publicada, así que es anterior a este trabajo, pero hay que investigarlo antes
   del capítulo 2.
7. **Rendimiento.** El paquete añade 55 MiB, que se descargan en segundo plano desde `c_apartmentsick` por la
   precarga.

## 8. Plan de implementación (por orden, una pieza cada vez)

1. **Teléfono: marcar y recibir llamadas.** Análisis en solo lectura de `cof_phonecheck`/`cof_phonecall` en `hl.dll` y
   de la interfaz del móvil en `client.dll`: cómo se marca, qué comprueba `impulse 543214` / `iuser1 4096` y cómo se
   temporizan los subtítulos.
2. **Cuaderno de códigos.** `cof_addcodenote` + `cof_keypad4`: el código de la nota 4, persistente entre mapas y
   partidas.
3. **`weapon_nightstick`.** Arma cuerpo a cuerpo con sus recursos, ranura del bolso, animaciones y daño originales.
4. **`monster_crab`.** IA del original (`slower2.mdl`), contrastada con `monster_slower`.
5. **Imagen de la revista** en `cof_document`.
6. **Recorrido natural** de `c_basement` hasta `c_sewer`, con pruebas negativas (puerta cerrada sin código, escalera y
   `chsw1` no alcanzables antes, `checkbrush`), guardar y cargar, y regresiones.
7. **Entonces, informe y candidata para `c_sewer`.**

## 9. Resultados de las pruebas

**`tools/e2e/campaign_basement_probe.mjs`** contra la candidata `cand-bas` (Chromium 156, SwiftShader;
`basement-probe-001826`):

| Comprobación | Resultado |
|---|---|
| Transición real `*227` → `changekuk` → `c_basement` | **PASS.** El loader monta el paquete y repite con `changelevel2` |
| Posición por landmark | **PASS.** Desplazamiento respecto a `landkuk`: (2, −1, −108) antes y (2, −1, −109) después |
| Inventario y munición | **PASS.** Teléfono, navaja y Glock en el bolso; Glock con 15 balas antes y después |
| Escena de entrada | **PASS.** Cámaras, figura en el pasillo, teletransporte `landada` a los ~65 s, título del capítulo 2 y subtítulo «Who was he? Nobody?» |
| Guardar y cargar en `c_basement` | **PASS.** Vuelve a `c_basement` con el mismo estado de arma |
| Entidades ausentes | `No spawn function` para `monster_crab`, `weapon_nightstick`, `cof_phonecheck`, `cof_phonecall`, `cof_keypad4` e `info_texlights` |
| Errores de JavaScript | 0 |

**Ruido conocido de todos los mapas:** los `Could not load model/sound` de armas de Half-Life (precarga de hlsdk).

**18 regresiones sobre `cand-bas`:** **18/18 PASS** (`regressions-bas-002518`), con Service Worker, manifiesto
`fd7cfcdd1d4d` y `server.wasm` `6d354715…`. Añadir el paquete y `maps.json` no rompe nada del capítulo 1.

**No hecho todavía:** recorrido natural de `c_basement` (imposible sin las piezas que bloquean), pruebas negativas y
Firefox.

## 10. Recomendación de integración

**No integrar ni publicar todavía.**

La candidata demuestra que el capítulo 2 **arranca bien** desde el capítulo 1 (transición, landmark, inventario,
escena, guardado). Pero el tramo **no se puede completar** sin el teléfono y el cuaderno de códigos, y le faltan la
porra y los cangrejos. Publicarla dejaría al jugador atascado en la puerta eléctrica, con el sótano vacío de enemigos.

**Candidata local reproducible:**

- Árbol: `/root/cof-audits/claude-campaign-20261115/cand-bas`, manifiesto `fd7cfcdd1d4d`.
- Es el `dist/` publicado más `map_c_basement`, los 5 MP3 y `maps.json`. El motor y los módulos no cambian.
- Script: `build/validation/claude-campaign-2026-11-15/cand-bas.sh`.

**Siguiente paso propuesto:** el punto 1 del plan, las llamadas de teléfono. Necesito que me confirmes que ya podemos
abordar el teléfono y el cuaderno, que antes pediste aplazar.

## 11. Fase 2: teléfono y cuaderno de códigos (autorizado con «Sí, empieza»)

### Qué hace el original (análisis en solo lectura; volcados privados en `private-native/claude-campaign-2026-11-15/`)

- **Marcar.** El panel del móvil de `client.dll` (`CPhone`, `10049d00`; imagen `gfx/vgui/640_phone.tga`, tonos
  `phone/tone_<cifra>.wav`) envía `phonenumber <cifras>` y reproduce `phone/tone_send.wav`.
- **Comprobar el número.** El `ClientCommand` de `hl.dll` (`10018d60` → `100e9ff0`) se lo pasa al **primer**
  `cof_phonecheck` del mapa:
  - con `frags 1` compara al momento (`100a1cd0`);
  - si no, solo con el jugador a menos de `max(iuser1, 32)` unidades (`10094270`).
  - Si coincide con `impulse`, dispara su `target` con el jugador como activador, suena su `noise` y se borra, salvo
    con el spawnflag 1.
- **La llamada.** `cof_phonecall` (`CPhoneCall`):
  - `WaitForCall` espera a que el jugador esté en el suelo y con el móvil.
  - Con `iuser1` ≠ 0 suena `phone_ringing` durante 3 s; si no, `phone_ringtone`.
  - `ChangeSubtitle` arranca el audio y la animación 12/13 (`raise_sms`/`raise_flash`). Luego muestra el subtítulo
    *i* y espera `subtitletime` *i+1*. Cuando el siguiente tiempo es menor que 0,1 s, `EndCall` llega 1 s después.
  - `EndCall` dispara el `target`, baja el móvil (15/16, `lower_*`) y suena `tone_send`.
- **El código.**
  - `cof_keypad4` (`100a7120`) pone el código del jugador a **5247 (`0x147f`) fijo**.
  - `cof_addcodenote` (`100a6790`) manda `AddNote` con la clase de nota (`iuser1` 4 = «Phone code»).
  - `keypadnumber` (`100e5890`) compara con ese código. Al acertar dispara el `target` con el jugador como activador
    y deja el código en **9999**: el teclado ya no vuelve a aceptar nada.
- **Hallazgo:** en `c_basement`, la escena de entrada `multibass1` ya dispara `keypad4` en el segundo 0. El 5247 vale
  desde el principio del mapa; la llamada (`addnotemm`) da la **nota** con el código y vuelve a fijarlo.

### Qué se ha implementado

- **`game/cof-logic/cof/phonecall.cpp` (nuevo):** `cof_phonecheck` y `cof_phonecall` con la lógica anterior, más los
  comandos `phonenumber` (el del original) y `cof_phonedial`.
  - **Desviación documentada:** si el jugador guarda el móvil a mitad de llamada, el port espera a que lo vuelva a
    sacar en vez de cortar.
- **`weapons_cof.cpp`:** durante la llamada, el móvil mantiene `raise_idle` (14, 50/30 s) y no atiende al disparo
  primario ni al secundario.
- **`puzzles.cpp`:**
  - `cof_keypad4` fija 5247;
  - `cof_addcodenote` envía también la clase de nota;
  - el teclado queda **usado una sola vez (9999)** como en `100e5890`, y dispara con el jugador como activador.
  - **Antes** se podía acertar dos veces y la segunda volvía a cerrar la puerta (`cof_interdooronoff` conmuta). La
    prueba `phone-probe-011307` lo reprodujo.
- **`hud.js`:**
  - **«*»** con el móvil en la mano abre el panel de números con la imagen original, tonos por cifra, teclado o clic,
    Retroceso y Enter.
  - El cuaderno muestra la nota 4 con la etiqueta «Código del teléfono».
- **`stage_map.py`:** `cof_phonecheck`/`cof_phonecall` añaden al paquete del mapa el panel y los sonidos del teléfono.
  Solo entran en mapas que tienen esas entidades.

### Pruebas: `tools/e2e/basement_phone_probe.mjs` (`phone-probe-012036`, candidata `cand-bas2`)

**15/15 PASS** con `server.wasm` `0b168e61…`, manifiesto `02c158063cbb` y Chromium con SwiftShader. Arranca con
`?map=c_basement` y da el móvil con `cof_give`, así que es un *fixture* y no un recorrido natural.

| Comprobación | Resultado |
|---|---|
| Puerta `elecdoor` cerrada al empezar | PASS |
| Código erróneo (1234) al empezar: denegado, puerta cerrada | PASS |
| Número equivocado (111111): sin llamada | PASS |
| «*» abre el panel; muestra `543214` | PASS (`02-phone-digits.png`) |
| Llamada: subtítulos 286–296 y 313 en orden | PASS. El primero llega a los 5,3 s de marcar (3 s de timbre); los intervalos siguen `subtitletime` (p. ej. 293→294: 5,5 s frente a 5,562) |
| `EndCall` → `addnotemm` → nota «Phone code» 5247 | PASS (`COF/HUD CODE 5247 4`, 1,4 s después del 313) |
| Volver a marcar 543214: no hay segunda llamada (la comprobación se borró) | PASS |
| Guardar y cargar tras la llamada; puerta sigue cerrada | PASS |
| Código erróneo tras cargar: denegado | PASS |
| 5247 tras cargar: concedido, puerta abierta | PASS |
| 5247 otra vez: denegado (9999) y la puerta sigue abierta | PASS |

**Pasadas fallidas, conservadas:**

| Pasada | Qué falló | Causa |
|---|---|---|
| `phone-probe-010536` y `-010603` | Error al buscar `keypanel3` | `cof_list` no imprime el `targetname` |
| `phone-probe-010731` | La comprobación de subtítulos | El diálogo de la escena de entrada (subtítulos 25–39) se mezclaba con la llamada |
| `phone-probe-010731` | El teclado tras cargar | El índice de entidad cambia al cargar (609 → 602); la prueba usaba el viejo |
| `phone-probe-011307` | Mi negativa «denegado antes de la llamada» | Premisa falsa: `multibass1` ya fija 5247 |
| `phone-probe-011307` | La segunda entrada correcta volvía a cerrar la puerta | Defecto real del port, corregido arriba |

**Sin verificar:**

- **Audio.** Las pruebas van silenciadas: no se ha comprobado que se oigan el timbre, `magphone.wav` ni los tonos.
- **Imagen durante la llamada.** El móvil no se ve en pantalla (`03-call.png`). Encaja con `raise_*` llevándolo a la
  oreja, pero no hay captura del original para comparar.
- **Teclado del juego.** El panel numérico del teclado de la puerta usa el diálogo existente del port. No se ha
  comparado con el original.

**Pendiente en `c_basement`:**

- `weapon_nightstick` y `monster_crab`;
- la escalera `nerdclimb5` y `chsw1` → `c_sewer` en un recorrido natural;
- Firefox.

### Regresiones sobre `cand-bas2`

**17/18** (`regressions-bas-012510`). Falla `voice_mix_probe`, sin haber cambiado ni la prueba ni sus límites.

**Investigación** (`voice-mix-investigation/`):

| Variante | Pasadas |
|---|---|
| `cand-bas2` (mi `server.wasm` `0b168e61`) | 1/10 en total |
| `cand-bas` (servidor publicado `6d354715`) | 1/2 hoy |
| `HEAD` compilado sin mis cambios (`153b6e77`) | 2/7 |
| `cand-bas2` con el `hud.js` publicado | 0/3 |

- **Pasadas intercaladas** (mi servidor / el de `HEAD`): 1/4 frente a 0/4.
- **Diagnóstico** (`voice_diag.mjs`, copia que no sustituye a la prueba):
  - `sub1.wav` arranca una sola vez y se conecta.
  - El reloj del `AudioContext` del Chromium sin interfaz casi no avanza: `currentTime` 0, o +0,02 s tras 400 ms
    de espera. La muestra sale entonces a 0.
  - Le pasa igual a la compilación de `HEAD`.
- **Conclusión:** la inestabilidad es del entorno de audio de esta sesión, no de los cambios del teléfono. Hoy tampoco
  la compilación sin mis cambios pasa de forma fiable.
- **Antes de integrar** hay que repetir `voice_mix_probe` en una máquina con el reloj de audio estable, o en Chrome
  con sonido real.

Las otras **17 pasan**, entre ellas `phone_singleplayer_punch`, `dual_hands`, `ammo_hud` y las de persistencia.

## 12. Fase 3: la porra (`weapon_nightstick`)

### Qué hace el original (análisis en solo lectura; `hl.dll`, `CNightstick`, vtable `101b4b78`)

- **`Spawn`** (`1005d330`): modelo `w_nightstick.mdl`, objeto del bolso `inventoryitems/weapons/weapon_nightstick.txt`.
- **`Precache`** (`1005d170`): `v_`/`w_nightstick.mdl` y los 5 sonidos `weapons/nightstick/*`.
- **`GetItemInfo`** (`1005ccc0`): ranura 2, sin munición, peso 1.
- **`Deploy`** (`1005cba0`): secuencia 1 (`draw`), animación de jugador `crowbar`.
- **`Holster`** (`1005cd20`): secuencia 2; el siguiente ataque, a +0,5 s.
- **`PrimaryAttack`** (`1005d210`):
  - animación de jugador `nightstick_attack`;
  - `attack1`/`2`/`3` (3/4/5) al azar;
  - el golpe 0,31 s después, en `CBasePlayer::MeleeHitThinkNightStick2`;
  - el siguiente golpe, 1 s después.
- **`MeleeHitThinkNightStick2`** (`100e7140`; volcado de instrucciones porque el descompilador perdía los
  argumentos):
  - línea de 32 unidades y, si falla, el casco de la cabeza refinado con `FindHullIntersection` (±16, ±16, ±18);
  - empujón de la vista `100f91b0(−3, −8, 0)`, ×20 sobre la velocidad de sacudida (`vuser3`), en cada golpe;
  - `nightstick_swing.wav` siempre (canal del arma, atenuación 0,8, tono 100);
  - si toca algo: daño `sk_cof_nightstick` (11 en los cuatro niveles), tipo `0x4001000`;
  - contra un ser vivo, temblor 5/0,25/0,1 y `hitbody1`/`2`;
  - contra el mundo o una máquina, temblor 5/0,25/0,15 y `hitwall1`/`2`.
- **Reposo y gestos** (`1005d400`, `1005cc00`): `idle1` durante su secuencia y, con todo en reposo, un gesto 6/7/9 con
  probabilidad 1/600 por fotograma.

### Qué se ha implementado (`weapons_cof.cpp`)

- `CCofNightstick` y `CCofNightstickHit` (el golpe diferido, guardable), con todo lo anterior.
- `sk_cof_nightstick1..4` registradas antes de `skill.cfg`: antes salían como `Unknown command`.
- `player_cof.cpp`: la porra es un arma real del bolso.
- **Precarga condicional.** Solo se registra donde existe `v_nightstick.mdl`. `stage_map.py` mete el modelo de vista y
  los sonidos únicamente en los mapas con `weapon_nightstick`, no en boot (+1,3 MiB en `c_basement`).

**No reproducido (documentado en el código):**

- las secuencias de correr y saltar 10–14 (`1005cd60`), que ninguna arma del port tiene todavía;
- la porra como mano derecha de las dos manos (`CDualWeaponRight::MeleeHitThinkNightStick`): el port solo combina el
  móvil con la navaja o la Glock.

### Pruebas: `tools/e2e/basement_nightstick_probe.mjs` (`nightstick-probe-092708`, candidata `cand-bas3`)

**14/14 PASS** con `server.wasm` `918e9979…` y manifiesto `5e484018a5e5`. Se recoge la porra del propio mapa
(`#286`) con `cof_goto`, así que es un *fixture*.

| Comprobación | Resultado |
|---|---|
| Aparece, sin `No spawn function` | PASS |
| `sk_cof_nightstick` reconocida | PASS |
| Entra en el bolso y en la selección rápida | PASS (`PICKUP …/weapon_nightstick.txt`, con la descripción original en pantalla) |
| Se equipa | PASS (`01-deployed.png`) |
| Con el ataque pulsado, un golpe por segundo | PASS (intervalos de 1,026 y 1,017 s, por el redondeo a fotogramas) |
| El impacto 0,31 s después de cada golpe | PASS (0,31 / 0,31 / 0,31) |
| Empujón de la vista en cada golpe | PASS (velocidad 60, −160, 0) |
| Agachado y mirando al suelo, golpea el mundo | PASS (`worldspawn`, daño 11) |
| Sigue en la mano tras guardar y cargar, y golpea | PASS |
| Sin errores de carga ni de JavaScript | PASS |

**Pasadas fallidas, conservadas:**

| Pasada | Qué falló | Causa |
|---|---|---|
| `nightstick-probe-092233` | Ningún golpe | La prueba enviaba `+attack` sin salto de línea y la consola no lo ejecutaba |
| `nightstick-probe-092401` | Ningún golpe | Se atacaba durante la escena de entrada, que controla las cámaras hasta el teletransporte `landada` (~65 s) |
| `nightstick-probe-092459` | La selección rápida | Llega un fotograma después de la recogida |
| `nightstick-probe-092459` | El golpe al suelo | El ratón simulado no inclinaba la vista; ahora se usan `+duck`/`+lookdown` del motor |

**Sin verificar:**

- **El golpe a un enemigo** (daño, sangre, sonido de cuerpo): `c_basement` no tiene más enemigo que `monster_crab`, que
  aún no existe. Se probará con el cangrejo.
- **El sonido**, porque las pruebas van silenciadas.
- **La porra en mapas posteriores:** al llevarla a `c_sewer`, ese paquete tendrá que incluirla.

### Regresiones sobre `cand-bas3`

**18/18 PASS** (`regressions-bas-092912`), con manifiesto `5e484018a5e5` y `server.wasm` `918e9979…`.

- Esta vez también pasó `voice_mix_probe`. Confirma que su fallo en `cand-bas2` era inestabilidad del reloj de audio
  (sección 11), no una regresión.
- Aun así, sigue siendo recomendable repetirla con audio real antes de integrar.

**Siguiente pieza de `c_basement`:** `monster_crab`. Con ella se podrá probar también el golpe de la porra a un
enemigo.

## 13. Fase 4: el cangrejo (`monster_crab`)

### Qué hace el original (análisis en solo lectura; `hl.dll`, `CCrab`, vtable `101ac5a0`)

Es el *slower* que se arrastra.

- **`Spawn`** (`1002b0e0`):
  - modelo `slower2.mdl`, o el `model` del BSP si lo tiene;
  - casco ±`cof_monsterhumanscale` × 36 de alto (0–36): el valor por defecto del cvar es **4**, un casco bajo y estrecho;
  - sangre roja, vista a 28, campo de visión 0,5.
- **Salud y daño** (comprobado en la carga de `skill.cfg`): **`sk_krypande_*`**, no los del *slower*
  (`sk_zombie_*`):
  - salud 20 / 30 / 50 / 80;
  - golpe de un brazo 2 / 4 / 8 / 24;
  - `skill.cfg` **no trae** `sk_krypande_dmg_both_slash`, así que el golpe con los dos brazos hace 0 en el original.
- **`HandleAnimEvent`** (`1002aa40`), con alcance de 55:
  - los eventos 1/2 golpean con un brazo y empujan la vista ±18 y hacia el lado;
  - el evento 3 golpea con los dos brazos;
  - sonidos `hammer_strike` contra un ser vivo, `hammer_strike_wall` contra el mundo o una máquina, y `hammer_miss` al
    fallar;
  - grito de ataque una de cada dos veces.
- **`SetYawSpeed`** (`1002b0a0`): `cof_monsterhumanyawspeed`, cuyo valor por defecto es **280**.
- **Sonidos:** los del *slower* (`slower/*`) y los arrastres `k_crawl*`, que dispara el propio modelo. No tiene sonido
  de muerte propio.

### Qué se ha implementado (`monsters.cpp`)

- **Una entrada más en la tabla** de enemigos del port, con los valores anteriores. Se añaden dos campos opcionales:
  - velocidad de giro;
  - sonidos contra la pared.
  - Valen 0 o vacío para los enemigos del capítulo 1, que no cambian.
- **`stage_map.py`:** `monster_crab` añade `slower2.mdl` y `sound/slower` a los mapas que lo tienen, incluidos los de
  los `monstermaker`.
- **`cof_inspect`** muestra ahora también `health=` y `dead=`, al final de la línea.

**No reproducido** (documentado):

- la cabeza que revienta (`slower_headgibs.mdl`, `head_burst.spr`), que el *slower* del port tampoco tiene;
- el empuje al recibir balas (`1002b4c0`);
- los controladores de hueso aleatorios (`1002aed0`);
- el empuje hacia delante del golpe doble;
- `monsterbody` de los `monstermaker`: el `monstermaker` del port es el de hlsdk y no lee esa clave, así que dos de
  los tres cangrejos de la valla salen con el cuerpo 0 en vez de 1 y 2. Arreglarlo exige tocar el parche de hlsdk.

### Pruebas: `tools/e2e/basement_crab_probe.mjs` (`crab-probe-095536`, candidata `cand-bas4`)

**13/13 PASS** con `server.wasm` `3ff6fe69…` y manifiesto `34ad93185488`. El acercamiento se hace con `cof_goto` y la
escena de la valla con `cof_fire`: son *fixtures*.

| Comprobación | Resultado |
|---|---|
| Aparecen los 4 cangrejos del mapa, sin actividades que falten | PASS |
| Cuerpos del BSP (2, 1, 0, 1) | PASS |
| Salud 20 en dificultad 1 | PASS |
| Delante de él, el cangrejo ve al jugador, se acerca y golpea | PASS. Salud 100 → 98 a los 2,7 s; el cangrejo avanzó de x −1169 a −1258 |
| La porra (11) lo mata en dos golpes, agachado | PASS. Es el golpe a un enemigo que faltaba en la sección 12 |
| La escena de la valla (`fisteehslwo`) crea un cangrejo en cada `monstermaker` | PASS (3) |
| Los cangrejos vivos siguen tras guardar y cargar | PASS |
| Sin errores de carga ni de JavaScript | PASS |

**Pasada fallida conservada:** `crab-probe-095301`. El cangrejo no atacó en 40 s porque la prueba ponía al jugador
**detrás** de él (mira a −x con campo de visión 0,5) y en silencio. Es el comportamiento esperado, no un fallo.

**Sin verificar:**

- **El aspecto.** En la captura el cangrejo apenas se distingue, por ser bajo y por la oscuridad. No he comparado
  animaciones ni tamaño con el original.
- **El sonido**, porque las pruebas van silenciadas.

### Regresiones sobre `cand-bas4`

**18/18 PASS** (`regressions-bas-095744`), con manifiesto `34ad93185488` y `server.wasm` `3ff6fe69…`. Añadir el campo a
`cof_inspect` y la entrada del cangrejo a la tabla no cambia nada del capítulo 1.

### Estado de `c_basement` tras las fases 2–4

**Ya existen todas las entidades que bloqueaban:**

- teléfono y llamada;
- cuaderno de códigos;
- `cof_keypad4`;
- la porra;
- el cangrejo.

**Falta, antes de proponer integrarlo:**

1. **Un recorrido natural** desde la llegada hasta `chsw1` → `c_sewer`, con la escalera `nerdclimb5`. Hasta ahora todo
   se ha probado por piezas, con *fixtures*.
2. Las **pruebas negativas** del tramo (`trigger_checkbrush`, salida no alcanzable antes de tiempo).
3. `voice_mix_probe` **con audio real**.
4. Firefox.
5. Las desviaciones documentadas en las secciones 11–13, que deberías revisar.

## 14. Recorrido guiado de `c_basement` hasta `c_sewer`

`tools/e2e/basement_natural_run.mjs` (`natural-run-200115`, candidata `cand-bas5`): **11/11 PASS**, en 327 s de
juego. (Antes lo di como 13/13 por error: el resultado tiene 11 comprobaciones.)

Se repitió con las rutas de la sección 15 (`natural-run-203507`): también **11/11**, 6 cangrejos y salud final 24.

**Con los controles normales:**

- W para andar, E en puertas, botón, teclado y escalera, S para bajar la escalera;
- las teclas 1–3 de selección rápida y C para agacharse;
- clic para atacar;
- «*», las cifras y Enter para el móvil;
- clics en el teclado numérico.

**Ayudas de depuración, todas declaradas:**

- el equipo del capítulo 1 al empezar (móvil, navaja y Glock; lo que trae `c_apartmentsick`);
- la vista girada con `cof_face`, hacia el siguiente punto, una puerta o un cangrejo. Para eso se añadió
  `cof_face x y z`;
- la lectura del estado con `cof_inspect` / `cof_list` / `cof_door` / `cof_ladder_view`.
- No se usa `cof_goto`, `god` ni `cof_fire`.

**Rutas:** dentro de cada zona salen del casco del jugador del propio BSP (`tools/bsp_walk.py`: A* por celdas y
niveles, escalones de 18, caídas de hasta 200, coste junto a las paredes y puntos centrados en el espacio libre). Se
guardan en `natural-route/leg-*.json`, con las versiones anteriores en `v1/` y `v2/`.

**Lo que se recorrió, por orden:**

1. Puerta `*4` (de la llegada al pasillo B).
2. Dos cangrejos del pasillo con la navaja, agachado.
3. Puerta `*7`, luego `*44` (de C a la zona D).
4. La escena de la valla y sus cangrejos.
5. Botón de la revista (`doc1`).
6. Llamada al 543214: subtítulos y nota 5247.
7. La puerta eléctrica, primero **cerrada**.
8. El teclado 5247, que la **abre**.
9. Puerta `*63`.
10. El sótano y el hueco de la escalera hasta lo alto de `nerdclimb5`.
11. La escalera **con su cámara**, de arriba abajo.
12. Puerta `*101`, que lleva a `chsw1`: `CHANGE LEVEL: c_sewer swheh1`. El port se queda en `c_basement` porque
    `c_sewer` todavía no tiene paquete.

En total: 6 cangrejos muertos y salud final ~36.

**Hallazgos por el camino** (cada pasada fallida se conserva):

| Pasada | Qué pasó | Qué se cambió |
|---|---|---|
| `101934`, `102345` | Murió por un cangrejo: las balas de la Glock dan contra las hitboxes del modelo, casi a ras de suelo (1 impacto en 24) y solo hay 15 balas | Contra el cangrejo, cuerpo a cuerpo agachado |
| `102720`, `102945` | La puerta B → C no se detectaba (está a 100 unidades) y luego no se activaba desde el lado | Se espera a la salida concreta; se va antes al punto delante de la puerta |
| `103229` | Atascado en una esquina | Llegada a 12 unidades y retroceso si se atasca |
| `103229` | Peleaba con cangrejos que estaban a 160–220 unidades | Solo se lucha a menos de 90 |
| `194802` | Cayó por la boca del hueco de la escalera: 184 unidades, sin daño en GoldSrc. Llegó abajo sin usar la escalera | La ruta para antes de la boca y la escalera es obligatoria |
| `195515` | Atascado en un marco de 12 unidades de holgura | Puntos centrados en el espacio libre |

**Observación de jugabilidad, sin cambiar nada:** se puede bajar sin la escalera dejándose caer por el hueco. La caída
de 184 unidades no hace daño. Falta comprobar si en el original pasa lo mismo.

**Pendiente antes de integrar `c_basement`:**

- `trigger_checkbrush` como prueba negativa;
- Firefox;
- `voice_mix_probe` con audio real;
- revisar las desviaciones de las secciones 11–13;
- el siguiente mapa, `c_sewer`.

## 15. Pruebas negativas de `c_basement`

`tools/e2e/basement_negatives.mjs` (`negatives-203135`): **15/15 PASS**.

**Por cada `trigger_checkbrush`** se comprueba:

- que E muestra su mensaje;
- que no lo repite antes del `checkdelay` (2 s);
- que no deja pasar empujando 2 s hacia él.

| Caso | Bloquea | Mensaje con E |
|---|---|---|
| `*3`, escalera de vuelta en la llegada | PASS: x se queda en −3236, la pared está en −3253 | «I don't need to go back up again.» |
| `*16`, puerta cerrada para siempre (`lockedby dsadas`, una llave que el mapa no da) | PASS: no hay teletransporte | «He locked the door. Better find another way.» |
| `*123`, un coche en la calle | PASS: no se sube | «The interior is destroyed. It's not going to work.» |
| `*124`, una cornisa en lo alto | PASS: no se sube | «It's too dark and dangerous to climb up there.» |
| `*87`, la escalera derrumbada | PASS: y se queda en 560, la pared está en 544 | «The stairs has fallen apart. I can't go up.» |

**Ya cubiertas en otras pruebas:**

- la puerta eléctrica cerrada antes del teclado y un código erróneo denegado (secciones 11 y 14);
- la salida `chsw1`, solo alcanzable bajando la escalera.

**Fixtures:** las zonas D y E se entran con `cof_goto` en la `inter_door_exit` que usa el mapa, y `notarget` aparta a
los cangrejos.

**Errores de la prueba, corregidos** (cada pasada fallida se conserva):

- Pulsar E después de empujar dejaba al jugador fuera de alcance: los pinceles en ángulo lo desplazaban hasta 240
  unidades.
- Comprobar el contorno de la caja no sirve para el coche ni la cornisa. Lo que prohíben es subir, así que se mide
  la altura.
- Otro marco de 12 unidades (x 1516–1528) en medio de un tramo recto. `bsp_walk.py` añade ahora un punto, centrado,
  a la entrada y la salida de cada paso estrecho (`doorways`). Las rutas anteriores quedan en `natural-route/v1..v3`.
