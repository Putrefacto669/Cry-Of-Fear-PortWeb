# Pesadilla de Simon: cadáver de la X, escenas de `env_customize` y espejo — Claude Code, 11/11/2026

**Autoría y revisión.** Claude Code fue el único agente activo. Estas pruebas no equivalen a una revisión
independiente.

**Qué es.** Una candidata aislada, no una publicación:

- worktree `C:\Users\josue\cof-audits\claude-nightmare-20261111`, rama `claude/nightmare-customize-20261111`, desde
  `f683f0a`;
- árbol WSL `/root/cof-audits/claude-nightmare-20261111`;
- sin commits, push ni despliegue, y sin tocar `dist/`, `patches/` ni el juego original.

El análisis del `hl.dll` se hizo con Ghidra en modo de solo lectura (`build/entity-analysis`); sus volcados quedan
fuera del repositorio.

## 1. Lo que el usuario vio

1. Al fotografiar algunas X, en el original **aparece un cadáver** (captura del vídeo «Chapter 1 Lost In A City»); en
   el port no.
2. En uno de los espejos, **Simon se queda estático y no rompe nada**.

## 2. Cadáver de la X: `env_customize` sin `body`

**Cómo está hecho el mapa (`c_nightmare.bsp`).** Varias X «falsas» (`spott1`, `wrong6`…) disparan un
`multi_manager` (`multispott1`, `multiwrong6`) que:

1. en el instante 0 activa un `env_customize` (`spott1mc`, `cwrongm6`) sobre un `monster_generic` (`spott1m`,
   `wrongm6`);
2. 0,3 s después lo elimina con un `killtarget`.

**Los modelos** (`models/nightmare/1–4.mdl`) tienen un solo grupo de cuerpo con dos subpartes: `ref` y **`ref2`, con
0 vértices**. `spott1m` y `wrongm6` empiezan con `body 1`, es decir, invisibles.

**Los `env_customize` de esos cadáveres no traen la clave `body`.** Sí traen `skin -1` y el resto de claves con −1.

**El original** (`hl.dll`):

- `KeyValue` (`1010bfd0`) no trata `body` ni `skin`, así que el motor los guarda en `pev->body`/`pev->skin`, que
  valen 0 si la clave no está.
- El efecto (`10108f00`) aplica `body` salvo que sea −1, y aplica `skin` salvo que sea −1; con −2 alterna entre 0 y 1,
  y con −99 pone −1.

**Conclusión: una clave ausente vale 0 y se aplica.** Por eso el cuerpo pasa a la subparte visible durante 0,3 s y
luego desaparece. Los nombres que pusieron los autores en otros mapas lo confirman: `tvframe_b0` (body 0),
`rope_vis` (cuerda visible) y `skyblixt_0` (skin 0).

**El port** trataba la clave ausente como «no cambiar», una elección hecha en una corrección anterior sin evidencia del
original. El cuerpo se quedaba en `body 1` hasta ser eliminado.

**Escenas afectadas en los 11 mapas** (todos los `env_customize` sin `body` o sin `skin`; ninguno usa −2 ni −99):

| Mapa | `env_customize` | Objetivo | Efecto en el original |
|---|---|---|---|
| `c_nightmare` | `spott1mc`, `cwrongm6` | `spott1m`, `wrongm6` | El cadáver aparece con la foto |
| `c_apartment3` | `tvframe_b0` (×3) | `tvframe`, `tvframe2`, `tvframe3` | Los marcos de la TV vuelven a `body 0` |
| `c_apartment5` | `rope_vis` | `rope2` | La cuerda se hace visible (empieza en `body 1`) |
| `c_apartment5` | `badcustier2` | `badseq1` | Escena de la bañera, `body 0` |
| `c_intro` | `skyblixt_0` | `skyblixt` | El rayo del cielo vuelve a `skin 0` tras recorrer 1–7 |

**Corrección** (`game/cof-logic/cof/effects_cof.cpp`, `CEnvCustomize`):

- En `Spawn`, una clave no indicada se convierte en 0.
- `Use` sigue a `10108f00`: −1 no cambia nada; en `skin`, −2 alterna y −99 pone −1.
- `m_iKeyValuesVersion` pasa a 2. Las partidas de las versiones 0 y 1 se migran al restaurar: la clave no indicada
  pasa a 0, que es lo que hace el original. **El formato de guardado no cambia**: mismos campos.

## 3. Espejo: el destello de la cámara cancelaba el guion

**Cómo está hecho el mapa.** Al fotografiar `spot9`, `multispot9` hace lo siguiente:

| Momento | Entidad | Qué hace |
|---|---|---|
| 0 s | `wato8w` | Alterna las paredes y muestra el espejo |
| 1 s | `wrongm8s` | `scripted_sequence` que reproduce `action` en `wrongm8` (`models/nightmare/4.mdl`) |
| 1,7 s | `break8w` | Rompe el cristal |
| 1,7 s | `wato8w` | Alterna de nuevo |
| 2 s | `wato9` | Alterna otra pared |
| 2,5 s | `door9` | Rompe la puerta |

`action` dura 61 fotogramas a 30 fps (2,03 s); `idle`, en bucle, 3,64 s.

**Reproducción en la Alpha publicada:**

- Con la cadena disparada a mano, el guion dura lo previsto y Simon levanta el brazo.
- Con una **foto real**, `wrongm8` sale del guion (se borra `SF_MONSTER_WAIT_FOR_SCRIPT`, que hlsdk quita en
  `CineCleanup`) **0,21 s después de la foto**. Antes de la foto estaba en el guion (164) en todos los pasos.
- Cuando el mapa pide `action` al segundo 1, Simon ya no está bajo el guion: **se queda estático**, y el cristal se
  rompe sin golpe.

**Causa.** `CoF_CameraFlash` (port) «deslumbraba» a todo monstruo vivo a menos de 300 unidades delante del jugador con
`bits_COND_LIGHT_DAMAGE`. Esa condición es una de las que interrumpen un `scripted_sequence`. Simon está a unas 100
unidades.

El efecto lo añadió el port en `a49fdd3`, sin referencia al original. La cámara del original (`10027280`):

- traza una línea y, en un radio de **64 unidades alrededor del punto de impacto**, dispara las X;
- a las entidades `monster_*` les da un golpe de **0 de daño** con un tipo propio (`0x10000000`);
- en el vídeo original, el reflejo completa su golpe.

**Corrección mínima.** El destello ya no afecta a un monstruo que ejecuta o espera un guion (`m_pCine`, o
`MONSTERSTATE_SCRIPT`). Para los enemigos normales no cambia nada.

**No se reproduce** el tipo de daño `0x10000000` del original. Hacerlo exigiría estudiar cómo reacciona cada monstruo
del original y queda fuera de esta tarea.

## 4. Candidata y pruebas

**Candidata `cand-nm`:**

- manifiesto `c83a0e4f86f0`;
- es el `dist/` publicado (`bdffd7b5dfe5`) con **solo el servidor cambiado**: `78a7f109…` en vez de `91ca7418…`;
- cliente (`e0b2b6cc…`), renderer y recursos, iguales.

La compilación base del worktree reproduce exactamente los módulos publicados.

**`tools/e2e/nightmare_customize_probe.mjs`**, la misma prueba en los dos builds:

| Parte | Alpha publicada | `cand-nm` |
|---|---|---|
| Cadáveres (`multispott1`, `multiwrong6`) | `body` sigue en 1 (invisible), eliminado a los 0,3 s | **`body 0` (visible)**, eliminado a los 0,3 s |
| Espejo, foto real de `spot9` | Guion cancelado 0,21 s después de la foto | **Guion hasta 3,23 s**: `action` completa; X y cristal rotos |
| `tvframe_b0` (×3), `rope_vis`, `badcustier2`, `skyblixt_0` | Sin cambio | **0, 0, 0; cuerda visible; bañera 0; rayo `skin 0`** |
| Partida guardada con la Alpha y cargada en `cand-nm` | — | **El cadáver se ve** (migración de versión 1 a 2) |

**Fallos conservados de la prueba:**

- `cof_use` necesita dos argumentos; la primera reproducción no disparó nada.
- `cof_inspect` no da ángulos ni secuencia, así que el estado del guion se midió con el bit de `spawnflags`.
- La primera métrica de movimiento no vio el brazo de Simon por la oscuridad, pero las capturas ampliadas sí.
- `tvframe_b0` se disparó con `cof_use`, que solo llega a la primera de las tres entidades; se repitió con `cof_fire`.

**Regresiones** sobre `cand-nm` (puerto 8113), sin nada en paralelo:

| Prueba | Resultado |
|---|---|
| `intro_to_nightmare` | **PASS**: el prólogo llega solo a la pesadilla (243 s) |
| `map_spawn_inventory` | **PASS**: solo `info_texlights`, que sirve únicamente al compilar mapas |
| 18 regresiones de Codex | **18/18** (`regressions-210301`), con el servidor nuevo comprobado por hash |

Evidencia: `build/validation/claude-nightmare-2026-11-11/` (con SHA256SUMS). Incluye las dos ejecuciones de la prueba,
las capturas del espejo y el estudio previo.

## 4 bis. Publicación

El usuario autorizó empaquetar, hacer commit y desplegar a GitHub Pages cuando las pruebas pasaran.

- `dist/` es `cand-nm`, manifiesto **`c83a0e4f86f0`**.
- Frente a `bdffd7b5dfe5` cambian solo 5 archivos: `packs/engine.data`, `packs/engine.data.gz`, `packs/engine.js`,
  `sw-manifest.js` y `sw.js`. El resto de `.gz` regenerados son idénticos.
- Se sube a `portweb/main` con un avance normal desde `8754144`, sin force push.
- La verificación del despliegue se registra a continuación, aparte del push.

**Despliegue comprobado (11/11/2026):**

- Commit `138163d`, subido a `portweb/main` (`8754144..138163d`).
- Workflow «GitHub Pages», run `43147378592`: **success**.
- El sitio público sirve el manifiesto `c83a0e4f86f0`. `packs/engine.data.gz`, `packs/engine.js`, `sw.js` y
  `sw-manifest.js` tienen el mismo hash que el commit.
- `nightmare_customize_probe` **contra GitHub Pages**: cadáveres PASS (`body 0` y eliminados), espejo PASS (guion
  hasta 3,2 s tras la foto; X y cristal rotos). Evidencia: `probe-public-*`.

## 5. Pendiente (no tratado aquí, por indicación del usuario)

- **Notas del bolso.** El original tiene un cuaderno de 16 notas guardado en el jugador. `cof_addcodenote`
  (`100a6790`) añade la imagen del código (`gfx/vgui/notes/code_%i.tga`, `codefrompc`, `codefromwindow`,
  `codefromvideotape`, `phonecode`). En el port, la contraseña se ve una vez y el código queda como objetivo. Es un
  sistema grande, que el usuario indicará cuándo abordar.
- **Teléfono.** `cof_phonecall` (llamadas entrantes) y `cof_telephone` (fijo con marcado, número correcto o
  incorrecto) existen en el `hl.dll`, pero **no aparecen en los 11 mapas publicados**.
- **Tipo de daño `0x10000000` de la cámara original.**
