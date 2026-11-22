# Campaña: `c_sewer` — informe y candidata (Claude Code, 15/11/2026)

Continúa `docs/CLAUDE_CAMPAIGN_PROGRESSION_NEXT_MAP_20261115.md` (`c_basement`, secciones 1–15). Mismo worktree
(`claude-campaign-20261115`), sin commits ni publicación.

## 1. Transición `c_basement` → `c_sewer`

**Prueba:** `tools/e2e/campaign_sewer_probe.mjs` (`sewer-probe-205204`, candidata `cand-sew`, manifiesto
`4f8b4cc79c52`): **4/4 PASS**.

- **Cómo se llega:** con `cof_goto` al `trigger_multiple *102` de `c_basement`, que dispara `chsw1`
  (landmark `swheh1`). Es un *fixture*; el recorrido guiado de `c_basement` la alcanza andando.
- **Comprobado:**
  - llega a `c_sewer`;
  - **la porra llega en la mano y golpea**;
  - tras guardar y cargar sigue en `c_sewer` con la porra.
- **Landmark:** el desplazamiento es (0, 40,5) en planta. En altura cambia 36 unidades porque el `cof_goto` dejaba al
  jugador en el aire y el motor lo posa en el suelo al llegar.

**Arreglo necesario: la porra en los mapas siguientes.**

- Su modelo solo se empaquetaba con los mapas que la colocan. Sin él, `weapons_cof.cpp` no la registra, por su
  precarga condicional.
- `stage_map.py` tiene ahora `CARRIED_INTO = {"c_sewer": ["weapon_nightstick"]}`. **Hay que añadir cada mapa nuevo de
  la campaña.**
- El paquete de `c_sewer` mide 20,5 MiB (SHA-256 `01916d19…`) y lleva su modelo de vista, el de mundo y sus sonidos.

## 2. Entidades

`c_sewer` tiene 251 entidades de 29 clases. Faltan en el port, según los `No spawn function` del arranque:

| Clase | Cuántas | Bloquea | Notas |
|---|---|---|---|
| `monster_sewmo` | 9 | No el paso, pero el tramo queda sin enemigos | `models/sewmo.mdl`, `sound/sewmo`. Ver el desglose abajo |
| `func_fogfield` | 4 | No | Niebla en el canal inferior (y 1952–2869), `targetname fogfield`, `axis -1`, spawnflags 2. Sin ella cambia el aspecto, no el recorrido |
| `info_texlights` | 1 | No | Solo sirve al compilar |

**Desglose de `monster_sewmo`:**

- 6 junto al canal y la primera sala (spawnflags 160);
- 3 en la zona de la puerta `*36` (spawnflags 32);
- `skill.cfg`: salud 40 / 60 / 90 / 140; golpe 4 / 6 / 9 / 16.

**Sí existen:**

- 4 `inter_door`;
- 2 `trigger_checkbrush`: «I can hear a radio inside. However, the door is wrecked.» y «There's something moving on
  the table. What the hell is it?»;
- `func_breakable`, la grabadora «City Sewers» y la lluvia.

## 3. Recorrido crítico (rutas del casco del BSP)

`tools/bsp_walk.py` sabe ahora agacharse, saltar, saltar agachado y caer en agua, y trata como sólidos los pinceles
sólidos. Rutas en `sewer-route/`.

1. **Llegada** (894, 0, −64) por la escalera de entrada.
2. **Conducto bajo:** desde x 1022 solo se cabe **agachado** (suelo −124, luego −140).
3. **Caída al canal:** 368 unidades hasta el agua (`func_water *9`, −492). En hlsdk, `PostThink` no aplica daño de
   caída al aterrizar en agua. Fuera del agua serían unas 42 de daño.
4. **Salir del canal** (y 944 → 956): el suelo sube 32 unidades, más que un escalón, y el techo está bajo. Hay que
   **saltar agachado** (hull de 36 de alto) y seguir agachado hasta y ≥ 968.
5. **Barrotes** `func_breakable *34` (1626–1670, y 1677–1680; 15 de salud, «gibmodel» `sewer_bar_gib.mdl`). **Es el
   único paso:** sin romperlos no hay ruta (`leg-S1.json` es `null` con los barrotes sólidos;
   `leg-S1-through-bars.json` los atraviesa).
   - Con la porra son 2 golpes (11 de daño); con la navaja, 3 (6 de daño).
   - Detrás hay una abertura baja que se pasa agachado y una bajada al canal inferior.
6. **Canal inferior** con la niebla (`func_fogfield`) hasta la **puerta `*36`** (3320, 2936), que se abre desde el
   este (x ≥ 3336). No tiene `lockedby`: «won't budge» es solo su mensaje alternativo.
7. **Al otro lado** (`swl_1_1`, −804, −1244): un pasillo recto de 350 unidades hasta la puerta `*43`. Luego
   `sw_exithaha1`, `*44` y **`chsw55` → `c_sewer2`** (landmark `kalalale`).

`trigger_once *40` y `*45` apuntan a `kattspark`, que no existe en el mapa. Tampoco hace nada en el original.

## 4. Riesgos

1. **`monster_sewmo` no existe:** el tramo es mucho más fácil que el original. No se debe publicar así como completo.
2. **Saltar agachado** para salir del canal: el teclado lo permite (Ctrl + Espacio). En móvil está la combinación de
   Codex (mantener Agacharse y deslizar hacia arriba). Falta comprobarlo en este punto concreto.
3. **Caída al agua sin daño:** depende de que el port deje `pev->watertype` en `CONTENT_WATER` al aterrizar. Hay que
   medirlo.
4. **Barrotes:** el `func_breakable` de hlsdk debería servir (material 2 = metal, `explosion 1`). Falta probar que el
   golpe de la porra lo rompe y que sale su `gibmodel`, que `stage_map.py` tiene que empaquetar.

## 5. Plan (una pieza cada vez)

1. **`monster_sewmo`:** análisis de `hl.dll` en solo lectura y, si encaja como con el cangrejo, una entrada en la tabla
   de `monsters.cpp` con sus valores originales y el paquete del mapa.
2. **`func_fogfield`:** la niebla del canal.
3. **Recorrido guiado de `c_sewer`**, con agacharse, salto agachado y romper los barrotes en el walker, más las
   pruebas negativas (los dos `checkbrush` y los barrotes sin romper).
4. **Después, `c_sewer2`.**

## 6. `monster_sewmo` (el monstruo de las alcantarillas)

### Qué hace el original (análisis en solo lectura; `hl.dll`, `CSewmo`, vtable `101b3cc4`)

- **`Spawn`** (`10059130`):
  - modelo `sewmo.mdl`;
  - casco ±`cof_monsterhumanscale` (4) × **72** de alto;
  - sangre roja, vista a 28, campo de visión 0,5.
- **Salud y daño:** `skill.cfg` `sk_sewmo_*` (`DAT_10226774..7c`, comprobado en la carga de `skill.cfg`):
  - salud 40 / 60 / 90 / 140;
  - golpe de un brazo y de dos: 4 / 6 / 9 / 16.
- **Con spawnflag 32** (los **9** del mapa lo tienen):
  - **no** llama a `MonsterInit`: se queda en `appearidle` y con `InactiveThink`.
- **`InactiveThink`** (`10058b30`):
  - cada 0,1 s busca un jugador a menos de 128 unidades;
  - al encontrarlo pone `appear`, suena `sewmo/out_water.wav` (canal del cuerpo, 0,8, tono 100 ± 5);
  - a los 0,8 s, `ActivateSewmo` (`10058600`) llama a `MonsterInit`.
- **`HandleAnimEvent`** (`100587f0`), alcance 55:
  - `claw_strike` contra un ser vivo, `claw_miss` al fallar y **nada** contra el mundo;
  - grito de ataque una de cada dos veces.
  - El evento 6 activaría un segundo ataque (`MELEE_ATTACK2`), pero **`sewmo.mdl` no tiene ningún evento 6**: solo
    ataca con `attack1`.
- **`SetYawSpeed`** (`100590f0`): `cof_monsterhumanyawspeed` (280).
- **«Soltarse»** (`10058720`, con su tabla de rutinas y la tarea propia 94): en estado ALERTA, herido y con la mitad
  de salud o menos, una vez de cada dos suena `break_free.wav` y ejecuta una rutina con `horjavel` (ACT_SIGNAL1).

### Qué se ha implementado

**En `monsters.cpp`:**

- Una entrada en la tabla con los valores anteriores. La lista de «pared» es `common/null.wav`, como el silencio del
  original.
- El despertar con spawnflag 32, llevado por un **estado guardado** (`m_iAppear`) desde el `Think()` virtual. Así no
  hace falta guardar por nombre funciones nuevas, que es delicado en WebAssembly.
  - Las partidas anteriores no traen ese bloque y se leen igual: la lectura opcional retrocede si falta.
- La precarga de `out_water` y `break_free`.

**En `stage_map.py`:** `sewmo.mdl`, `sound/sewmo` y `common/null.wav` para los mapas con `monster_sewmo`.

**En `cof_inspect`:** añade `seq=` y `takedamage=` al final.

**No reproducido:** la rutina de «soltarse» (`break_free` + `horjavel`), porque no he descodificado su tabla de
rutinas.

### Prueba: `tools/e2e/sewer_sewmo_probe.mjs` (`sewmo-probe-211416`, `cand-sew2`, manifiesto `37ce44b94f61`)

**13/13 PASS.**

| Comprobación | Resultado |
|---|---|
| Los 9 aparecen dormidos: misma secuencia (`appearidle`, 20), sin recibir daño, salud 40 | PASS |
| A 250 unidades sigue dormido | PASS |
| A 100 sube (`appear`, 19) y a los 0,8 s es un monstruo (`takedamage` 2) | PASS |
| Delante de él, ataca: 100 → 96 a los 0,85 s | PASS |
| La porra lo mata en 4 golpes (40 → 29 → 18 → 7 → muerto) | PASS |
| Uno dormido sigue dormido tras guardar y cargar, y después sigue subiendo | PASS |

**Pasada fallida conservada:** `sewmo-probe-211219`, por errores de la prueba:

- el jugador estaba **detrás** del monstruo y en silencio, así que no lo veía;
- golpeaba con la porra a 100 unidades, y su alcance es 32;
- tras cargar no volvía a buscar el índice, que cambia al cargar.

**Fixture:** se coloca al jugador con `cof_goto` en sitios que `bsp_walk.py` da como transitables.

**Regresiones sobre `cand-sew2`:** **18/18 PASS** (`regressions-bas-211503`), con `server.wasm` `99a237ca…`.

**Siguiente en `c_sewer`:**

1. `func_fogfield`, la niebla del canal.
2. El recorrido guiado: agacharse, caer al agua, salto agachado, romper los barrotes, los monstruos que suben del agua
   y las puertas hasta `chsw55`.
3. Las pruebas negativas (los dos `checkbrush` y los barrotes sin romper).

## 7. Publicación (15/11/2026)

Autorizada por el usuario (el permiso de Andreas cubre todo el juego). Se integró `portweb/main` (`914b3ae`, la versión
móvil) en la rama de campaña y se publicó un `dist` con:

- `c_basement` y `c_sewer` (paquetes `map_c_basement` 60,8 MB y `map_c_sewer` 22,2 MB; música `basement1`, `basement2`,
  `basements`, `memories1b` y `sewers2`) añadidos a `packs/maps.json`.
- Servidor (`939288f8…`) y cliente compilados sobre la fusión, con los parches de hlsdk 0002/0003.
- El botón móvil de marcar número (`dial`, el `*` del teclado), necesario para la llamada de `c_basement`.
- Manifiesto del Service Worker `9652cec08bdb`. Incluye también `94a339b` de Codex (resolución adaptable y giro
  táctil), publicado mientras corrían las pruebas: se fusionó y se recompiló el cliente (`01a0c539…`).
- Pruebas: 18/18 regresiones (15 + 3, la primera pasada se cortó al cerrarse la sesión), 4/4 de campaña y 5/5 de
  móvil, en `build/validation/release-ch2-2026-11-15`.

`c_sewer` todavía no tiene la niebla (`func_fogfield`) ni el recorrido guiado completo; su salida `chsw55` no cambia
de nivel porque `c_sewer2` aún no está en el paquete.

## 8. `func_fogfield`: la niebla del canal (17–22/11/2026)

**Datos del mapa.** Cuatro volúmenes en `c_sewer`: `*49` (1656, 1952, −489), `*50` (1728, 2652, −489), `*51`
(2095, 2826, −489) y `*52` (3036, 2869, −489). Todos llevan `targetname fogfield`, `axis -1`, `rendercolor 0 0 0` y
`spawnflags 2` («Start on» en el FGD). Nada los activa en el mapa.

**Original** (`hl.dll`, Ghidra en solo lectura; volcados en `private-native`, no se suben). No es una niebla del motor:
el volumen siembra sprites.

| Pieza | Dirección | Comportamiento |
|---|---|---|
| `func_fogfield` | `100124f0` | `CFuncFogField`, 0x180 bytes |
| Spawn | `10011340` | ángulos 0, `MOVETYPE_NONE`, `SOLID_NOT`, `SET_MODEL`, `EF_NODRAW`; spawnflag 2 → encendido; Use = `FogUse` |
| Encender / apagar | `10012240` / `100121e0` | piensa cada 0,1 s / deja de pensar |
| `FogUse` | `100101a0` | alterna con `ShouldToggle` |
| `SpawnThink` | `10011a30` | cada 0,1 s, `max(size.x, size.y) / 170` bocanadas |
| Bocanada | `1000ff30` | punto al azar en origen ± tamaño/2 (a la altura del origen) y solo si hay un jugador a menos de `sv_fogradius`. Crea `sprites/mist1..5.spr`: aditivo, blanco, escala 1, velocidad 3–7 / 3–7 / 2–5 |
| `SUB_StartFadeInAndOut` | `1008ac10` | opacidad 2, piensa cada 0,1 s |
| `SUB_FadeInAndOut` | `1008aaa0` | +3 cada 0,1 s hasta 32, espera 0–2 s, −3 cada 0,1 s; a 7 o menos, se borra a los 0,2 s |
| `sv_fogradius` | `cvar_t` en `.data` (`10214764`) | `"384"`, `FCVAR_SERVER` |

**Port:** `game/cof-logic/cof/fogfield.cpp`.
- `func_fogfield` y `cof_mist` (un `CSprite` con su propio desvanecido): el original lo tiene en `CBaseEntity`, con una
  bandera de un byte en +0x88.
- Los callbacks están registrados para las partidas guardadas (`persistence.cpp`).
- Los sprites ya iban en `boot`. `stage_map.py` los declara igualmente para `func_fogfield`.

**Prueba:** `tools/e2e/sewer_fog_probe.mjs`, 12/12 (`fog-probe-103921`):
- hay cuatro campos y `sv_fogradius` vale 384;
- en el punto de aparición no hay bruma;
- en el canal hay 123 sprites `mistN.spr` aditivos, a la altura de los campos y dentro de su huella;
- al guardar y cargar no aparece ningún callback desconocido y la bruma sigue;
- al salir del canal desaparece en menos de 6 s.

**Sin comprobar:** el aspecto. Las capturas sin GPU (SwiftShader) no permiten juzgar sprites aditivos con opacidad 32.
Falta compararlo con el original en una GPU real. Se crean unas 120 entidades a la vez cerca del jugador, como en el
original.
