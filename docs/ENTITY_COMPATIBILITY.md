# Campaign entity compatibility

This iteration implements observed operations, not the entire original DLL.
No game binaries, BSPs, models, textures or decompiler output are distributed.
Cry of Fear remains credited to Team Psykskallar and Andreas Rönnberg.

## Evidence and scope

Inspected prepared `c_start`, `c_start2`, `c_apartment1`, `c_apartmentsick`
and `c_intro` BSPs, their related entities, the existing CoF server/client
sources, HLSDK entity dispatch/save/restore, and a read-only copy of the user's
existing Ghidra project for `hl.dll`. The original project and DLL were not edited.
The implementation uses the portable SDK interfaces and contains no native DLL
dependency. Generated analysis stays in ignored `build/entity-analysis/`.

## trigger_changevalue: every c_start instance

All five have classname `trigger_changevalue`, angles `0 0 0`, no explicit
spawnflags, and the properties shown below. `netname` is the property to replace;
`m_iszNewValue` is its new value. `target` selects the destination's targetname.

| targetname | origin | target | netname | m_iszNewValue | Activation found in BSP |
|---|---|---|---|---|---|
| bchange1 | 1710.19 -1749.41 -767 | sub1 | linenumber | 13 | multi_manager multiblack at 0 s; sub1 at 1 s |
| cchange2 | 3080.19 -2348.41 -767 | simon3 | body | 1 | No incoming BSP reference found; tested by direct activation |
| slower_subbchange1 | 3150.63 -3123 -703 | sub1 | linenumber | 2 | slower_cam2_mm at 1 s; sub1 at 1.1 s |
| slower_subbchange2 | 3150.63 -3123 -687 | sub1 | linenumber | 3 | slower_cam2_mm at 3 s; sub1#1 at 4.5 s |
| slower_subbchange3 | 3150.63 -3123 -671 | sub1 | linenumber | 4 | slower_cam2_mm at 5 s; sub1#2 at 7.5 s |

`sub1` is a `subtitle_main`, initially `linenumber=9`. Its existing KeyValue
handler stores the new line, and its Use handler emits `COF/HUD SUB` when fired.
Changing the value must not display the subtitle by itself.

`simon3` is an `env_model` using `models/cutscene/player3.mdl`, sequence 4.
`body` changes the encoded studio body value; this is not an animation or skin
change. No reference to `cchange2` was found in the prepared c_start model files.
This does not establish whether another original runtime subsystem activates it.

The local original's factory/KeyValue/Use routines corroborate the property
names and lookup of a **single first matching destination**. This is not a
broadcast operation. The portable implementation preserves this behavior.

Supported replacements are nonnegative integers through INT_MAX, for
`linenumber` on `subtitle_main` and `body` on `env_model`. Invalid numbers,
unsupported keys and incompatible destination classes are rejected. A missing
destination has no effect. Configuration is saved/restored. Strings, arithmetic,
relative target expressions, generic field mutation and other entity classes
remain unsupported rather than receiving guessed behavior.

## Additional entities

| Entity | Observed behavior implemented | Limits |
|---|---|---|
| trigger_checkbrush | Solid BSP brush; player Use displays message and optional usesound, honors master and checkdelay; default delay 2 seconds; saves cooldown | Flag 1's special repeated-video interaction remains explicitly unsupported |
| cof_triggeron | First trigger_once/trigger_multiple destination gets iuser1=0 | No guessed toggle/off mode; these maps use iuser1=1 for initially disabled triggers |
| func_stairs | Nonblocking staircase volume; overlapping player hull selects speed 50 and normal speed returns on exit | 50 is the inspected sk_stair_speed in every skill tier; arbitrary custom skill overrides are not implemented |
| trigger_cofteleport | Player touch, master check, destination position/angles, standing hull height adjustment, cleared velocities; flag 1 removes after successful teleport | No monster or cooperative extensions |
| inter_door_disable | First inter_door destination; frags=0 disables and nonzero enables; flag 4 starts a door disabled; state saved/restored | Cooperative variant not implemented |
| cof_bosshealthbar | Uses message to locate the boss, reports maximum/current health to the browser, updates on damage, hides when dead/missing; saved boss handle | Browser presentation is reconstructed; original artwork is used when staged, with a visible color fallback otherwise |

The original `func_stairs::StairThink` and player speed selection, together with
`skill.cfg`, distinguish a speed volume from a solid staircase. Its detection
uses all overlapping volumes to avoid one empty volume clearing another's state.

The CoF trigger gate is implemented in a small HLSDK patch at
`CBaseTrigger::ActivateMultiTrigger`. `iuser1` is also added to the SDK entvar
descriptor, which reads map keys and saves/restores entvars. The original
portable SDK silently ignored that map key. Without both changes, merely
implementing `cof_triggeron` would leave disabled map triggers active from the start.

Boss textures are dependencies of `fulltga`/`emptytga` in `stage_map.py`.
The prepared assets available for these tests do not include the two Sawer bar
images, so their original visual appearance cannot be validated with that staging.

## Regression commands

Build the engine and game with the repository scripts, apply the updated HLSDK
patch to a clean matching SDK, stage authorized assets, then package and serve the
result. Do not run the browser tests against an old dist and interpret that as
validation of the new source.

```sh
python3 -B tools/e2e/test_entity_maps.py
COF_WORK=/path/to/work bash tools/wsl/test_entities.sh http://127.0.0.1:8080/
```

`COF_STAGE` overrides the prepared BSP location for Python tests. Tests explicitly
skip unavailable BSP fixtures; skips do not establish runtime compatibility.
Playwright is installed through the existing `e2e_setup.sh`.

The browser tests use fresh contexts, `sw=0`, `prefetch=0`, the real WebGL 2
engine and real server WASM. After initial frames they request `r_norefresh=1`
to reduce software-rendering cost. These are logic tests, not a frame-rate or
full visual-fidelity test. Live console events synchronize server commands:
the engine's buffered log file is unsuitable as an immediate command fence.
Timer polling is used for browser presentation checks instead of foreground rAF.

Cheat-gated inspection helpers supplement existing debug commands:

- `cof_inspect <targetname|*brush|!player>`: state snapshot.
- `cof_setkey <targetname|*brush|!player> <key> <value>`: SDK key dispatch.
- `cof_touch <targetname|*brush>`: dispatch a player touch.
- `cof_unfreeze !player`: release a cinematic freeze without replacing player flags.
- `cof_fence <token>`: command-completion marker and server time.
- `cof_spawn <classname> [targetname]`: existing spawn command with optional name.

No debug functions were removed. These helpers require sv_cheats and do not
change BSP files or resource files.

## Remaining work

`motion_manager` now has a tested literal-vector subset; see
[`MOTION_MANAGER.md`](MOTION_MANAGER.md) for its actual BSP instance, supported
modes, lifecycle and restrictions. Its expression and path modes remain pending.
Other unimplemented map entities, cooperative
features, animation callbacks and a complete campaign walkthrough remain outside
the validation achieved by these controlled activations. Loading a map is not
proof that all its narrative events or routes work.

No commits, pushes, asset publication or deployment are performed by this iteration.

La continuación incorporó las secuencias y acciones de `env_model`, comprobadas
con los modelos reales de `c_start`; véase [`ENV_MODEL.md`](ENV_MODEL.md).
Su informe distingue la animación restaurada del fallo observado al restaurar
callbacks de `multi_manager`, corregido en la etapa posterior documentada en
[`MULTI_MANAGER.md`](MULTI_MANAGER.md). Los registros conjuntos de
esa etapa están en `build/validation/models/` (cinco contratos BSP y cuatro
pruebas de navegador satisfactorias).

La etapa de zonas acústicas se documenta en [`TRIGGER_SOUND.md`](TRIGGER_SOUND.md):
trigger_sound usa el protocolo y el DSP existentes del motor, con comprobaciones
del servidor, del cliente y de los contactos geométricos de c_start.

## Resultado de la validación local — 25 de octubre de 2026

- Emscripten 4.0.11: servidor WASM compilado y enlazado correctamente.
- Las siete factorías aparecen entre las exportaciones del módulo WASM.
- Tres pruebas de contratos de BSP y staging: satisfactorias, sin omisiones.
- `entities.mjs`: satisfactorio en `c_start`, incluidas las cinco instancias,
  ambos multi_manager, entradas inválidas, primer destino, cero, ausencia de
  destino y tipo incompatible. También pasaron uso/cooldown del brush, gate del
  trigger real, velocidad dentro/fuera de escaleras e inventario/guardado/carga.
- `campaign_entities.mjs`: satisfactorio en `c_start2` y `c_apartmentsick`.
  Puerta: deshabilitación inicial, habilitación, salida real y bloqueo posterior.
  Teletransporte: posición exacta dentro del callback, ajuste del hull, orientación
  y velocidad cero. Barra: máximo, mitad de salud y ocultación con salud cero.
- Restauración comprobada de `m_iszNewValue`, datos de subtítulos, inventario e
  `iuser1`. Sin errores JavaScript en las dos pruebas de navegador.
- Sintaxis JavaScript/Bash y comprobación inversa del parche contra el SDK
  utilizado: satisfactorias. La suite conjunta terminó con código de salida 0.

Los registros y el módulo resultante se conservan localmente en el directorio
ignorado `build/validation/`. El paquete de prueba aislado está en
`/root/cof-audits/audit-D3Kl5uly/dist` dentro de WSL. El `dist/` anterior del
repositorio no se sobrescribió. Este paquete aislado usa `sw=0` durante las
pruebas; su manifiesto de caché debe regenerarse con `package.sh` antes de usar
Service Workers o distribuirlo.

No se validó la activación natural de `cchange2`, la apariencia de las texturas
originales de la barra, la campaña completa ni una partida completa contra el
jefe. La prueba de barra cambia su salud mediante un auxiliar de depuración;
no sustituye una prueba de combate. Persisten avisos anteriores del SDK y de
otras entidades. No se declara terminado el port ni `motion_manager`.

## Archivos de esta iteración

- Nuevos servidores: `game/cof-logic/cof/changevalue.cpp`, `checkbrush.cpp`,
  `triggeron.cpp`, `stairs.cpp` y `bossbar.cpp`.
- Servidores existentes: `game/cof-logic/cof/player_cof.cpp`, `doors.cpp`
  y `teleport.cpp`.
- Integración: `patches/hlsdk/0001-root.patch`.
- Presentación y recursos: `platform/web/hud.js`, `tools/stage_map.py`.
- Regresión: `tools/e2e/entities.mjs`, `campaign_entities.mjs`,
  `test_entity_maps.py` y `tools/wsl/test_entities.sh`.
- Documentación: este informe.
