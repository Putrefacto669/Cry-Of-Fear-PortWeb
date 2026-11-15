# Teléfono + navaja/Glock a dos manos — Claude Code, 14/11/2026

**Qué vio el usuario.** Al usar DUAL WIELD con el teléfono y la navaja aparecía una mano de más, superpuesta al
teléfono. Además, la navaja no tenía la postura del original.

**Relevo.** Codex abrió la investigación el 13/11 en su checkout aislado (`phase5-20261109`, sin commits) y se quedó
atascado midiendo la rasterización de la hoja. Este trabajo continúa desde ahí en la rama
`claude/nightmare-customize-20261111`, sobre el código publicado (`1fbb5a4`).

- **No se modificó nada del checkout de Codex.** Su `cof_hands.cpp` con el filtro `l_` se tomó como base.
- Sus informes y pruebas siguen en `phase5-20261109`: `docs/CORRECCION_MANO_SUPERPUESTA_2026_11_13.md`,
  `docs/CLAUDE_DUAL_*` y `build/validation/dual-*`.

## 1. Contrato del original

**Referencia visual.** El usuario aportó una captura del juego original con teléfono + Glock
(`build/validation/claude-manos-duales-2026-11-14/original-telefono-glock-usuario.webp`):

- la **Glock** está **reflejada**, a la izquierda del centro;
- el **teléfono** está **sin reflejar**, a la derecha (es el agarre normal de su viewmodel, con los dedos por el borde
  izquierdo);
- la barra de munición queda debajo del teléfono.

**Papeles en `hl.dll`** (análisis de solo lectura):

| Función | Qué hace |
|---|---|
| `100de990` (DUAL WIELD del bolso) | Obtiene los IDs y llama a `100e08b0` |
| `100e4bf0` | Fuentes de luz: IDs 1, 2 (teléfono), 10 y 13 |
| `100e08b0` | Pone la fuente de luz en segundo lugar: el arma en `iuser2` y el teléfono en `iuser3` |
| `Spawn` del arma dual | `this+0x204 = iuser2` (el arma) y `this+0x200 = iuser3` (el teléfono) |
| `10031020` (Deploy) | Manda el modelo de `+0x204` con `10038f40` (escribe `+0x128` y llama a `100f2e10`) y su secuencia con `10038f10` (escribe `player+0x418` y llama a `100deec0`). Caso 6, navaja: `p2draw` 6, reposo 5. Caso 3/7, Glock/P345: 6 o 7 (`draw`/`draw_noshot`), reposo 0 |

**Papeles en `client.dll`:**

- El cliente recibe ese modelo en `10090780` (nombre) y `10090670` (índice de animación), y lo dibuja como modelo extra
  en `1008c7e0`.
- Por tanto, **el arma de `+0x204` es el modelo extra reflejado**, y el teléfono es el viewmodel normal.
- Esto encaja con la captura del original.

**Corrección de una lectura previa.** Una versión anterior de esta investigación supuso que `10038f40` instalaba el
viewmodel del motor y reflejaba el teléfono. La captura lo desmiente. Esa candidata se retiró; su prueba sigue en
`dualhands-181643` y `dualhands-184350`. **El reparto en pantalla de la candidata pov3 de Codex (arma a la izquierda,
teléfono a la derecha) era el correcto.**

**`client.dll` en detalle:**

- **Modelo extra** (`1008c7e0`, modo 3, arma 15):
  - origen = `DAT_10559638`, ángulos = `DAT_1055962c` con el pitch × −1. `100af790` (`V_CalcNormalRefdef`) escribe ahí
    `pparams->vieworg` y `viewangles` finales, así que va **en la cámara, sin el balanceo del viewmodel**;
  - la columna Y de la matriz × `DAT_1013e428` (−1,0): **reflejo**;
  - `DAT_101b2750+0x28` con 1: `TriAPI->CullFace(TRI_NONE)`. Las 275 referencias a `DAT_101b2750` siguen la tabla
    `triangleapi_t`.
- **Filtro de brazo** (`10066e40`): en el modelo extra y en el viewmodel omite los vértices de huesos con `l_` (con el
  arma 13, la bengala, `r_`).

**p1 y p2** son dos agarres de la **mano derecha**: la pose del MDL pone la navaja junto a `r_wr` en ambos, y en p2 la
hoja apunta hacia abajo. Al reflejar el modelo, esa mano aparece a la izquierda.

## 2. Contrato aplicado en el port

En el port, el servidor deja el arma como viewmodel del motor y el cliente dibuja el teléfono aparte. Para igualar el
original se intercambian las transformaciones:

| Modelo | En el port | Transformación | Secuencias | Filtro |
|---|---|---|---|---|
| Navaja / Glock | Viewmodel del motor | **Reflejada**, sin culling, **en la cámara** (`vieworg`, `(−pitch, yaw, roll)`) | Navaja: p2 (6/5/7, ataques 8/18/19). Glock: las suyas | `l_` |
| Teléfono | Dibujado por `CoF_DrawOffhand` | **Sin reflejar**, con la transformación con balanceo que tenía el viewmodel | Las suyas | `l_` |

## 3. Cambios

**`game/cof-logic/client/cof_hands.cpp`**

- `DualWeaponView()` identifica el viewmodel de la navaja o la Glock en dual.
- `CoF_HandsView()` corre tras `V_CalcNormalRefdef` (desde `CoF_ClientFlashlightView`; el parche de hlsdk no cambia).
  Guarda la transformación con balanceo para el teléfono y pone el arma en la cámara.
- `CoF_HandsMirror()` refleja solo el arma; `CullFace(TRI_NONE)` se aplica mientras se dibuja.
- El filtro `l_` de Codex se aplica al teléfono, a la navaja y a la Glock.
- **Diagnóstico:** `cof_dual_armmask` (A/B del filtro) y `cof_dual_extraview` (0 = el arma conserva el balanceo).
  `cof_hands_render` muestra además `maskedview`, `viewseq` y `viewmodel`.

**`game/cof-logic/client/cof_client.cpp`:** llama a `CoF_HandsView`.

**`game/cof-logic/cof/weapons_cof.cpp`**

- La navaja tiene `Dual()` y `Hand()`, con la misma condición que `DualKind()`.
- En dual usa el juego p2; el reposo es solo `p2idle`. `m_iHand`, la mano del modo individual, ya no se fuerza a 1.
- Se corrigió el comentario del enum («p2 = mano izquierda»).

**`game/cof-logic/cof/player_cof.cpp`:** al salir del dual con la navaja ya en la mano, se vuelve a sacar con p1.
`SelectItem` ignora el arma activa.

**No cambia:** daño, alcance, tiempos, inventario, munición, guardados, HUD, renderer, MDL ni parche de hlsdk.

## 4. Candidata

**Árbol WSL:** `/root/cof-audits/claude-nightmare-20261111`, salida `cand-dh`.

**Base reproducida:** al compilar `1fbb5a4` sin cambios salen exactamente `server.wasm` `78a7f109…` y `client.wasm`
`e0b2b6cc…`, los publicados.

**Candidata:** el `dist/` publicado (`fdf221a95644`) con `server.wasm` `6e7bbf18…` y `client.wasm` `9cc63f56…`.
Manifiesto **`0140a63de3d5`**.

## 5. Pruebas

**`tools/e2e/dual_hands_contract.mjs`** (nueva, a partir de `hands_arm_mask.mjs` de Codex). Chromium 156,
`c_apartment1`, DUAL WIELD real desde el bolso. Recorre:

1. Navaja sola, en p1.
2. Dual: `p2draw` y luego `p2idle`, con la navaja reflejada en cada fotograma.
3. Linterna del teléfono.
4. A/B del filtro y A/B de la colocación: quieto, caminando y mirando hacia abajo.
5. Ataque p2 (8, 18 o 19).
6. Guardar y cargar.
7. Navaja sola de nuevo: p1, sin reflejo ni filtro.
8. Teléfono + Glock, con el A/B del filtro del viewmodel: 0 vértices desactivado y más de 0 activado.

**Resultado: PASS** en `dualhands-185409`.

**Fallos conservados:**

| Ejecución | Qué falló |
|---|---|
| `dualhands-181331` | Navaja sin volver a sacar al salir del dual |
| `dualhands-185210` | La prueba suponía un reflejo por fotograma. El viewmodel pasa dos veces por `StudioSetUpTransform` (eventos y render), y cada pasada rehace la matriz y la refleja una vez: 2 × `draws`, la misma proporción que la pov3 de Codex |

**Capturas de `dualhands-185409`:**

| Captura | Qué se ve |
|---|---|
| `9-glock-mask-on.png` | Glock reflejada a la izquierda del centro (~38 % del ancho) y teléfono a la derecha (~76 %). En el original, ~36 % y ~83 % |
| `2-dual-idle-flash.png` | Puño izquierdo con la navaja en agarre invertido y teléfono a la derecha, sin mano sobrante |

En el original el teléfono se ve algo más grande y alto. Puede deberse al fotograma o al campo de visión; no está
demostrado.

**Batería final** sobre `0140a63de3d5`, Chromium 156 con Service Worker y servidor `6e7bbf18…`
(`suite-final/dh-suite-185545`, `regressions-final` = `regressions-dh-190036`):

| Prueba | Resultado |
|---|---|
| `hands_arm_mask` de Codex | **PASS** |
| `hands_arm_regression` de Codex (teléfono + navaja/Glock, bolso, disparo, guardado) | **PASS** |
| `phase5_dual_rendered` de Codex | **PASS** |
| 18 regresiones históricas, incluidas `dual_hands`, `phone_singleplayer_punch` y `ammo_hud` | **18/18** |

**Publicación:** el usuario la autorizó el 14/11 tras ver el resultado. `dist/` pasa a **`0140a63de3d5`**; frente a
`fdf221a95644` cambian `packs/engine.*`, `sw-manifest.js` y `sw.js`.

## 6. Límites

- La única comparación nativa es la captura del usuario de teléfono + Glock. No hay una de teléfono + navaja: la pose
  de la navaja sale del código y del MDL.
- No se afirma equivalencia exacta de tamaño, FOV ni fotograma.
- En las poses capturadas, el brazo `l_` de la Glock no entra en plano. Sin revisar la recarga en dual, donde la mano
  izquierda maneja el cargador.
- No se probó Firefox.
- Los volcados de Ghidra de este trabajo (descompilaciones del `client.dll`) quedan **fuera del repositorio**, en
  `C:\Users\josue\cof-audits\private-native\claude-manos-duales-2026-11-14\`.
- En `build/validation/claude-manos-duales-2026-11-14/`, `dh-suite-181912` y `regressions-dh-182244` corresponden a la
  candidata retirada (`d798ec8511e8`, con el teléfono reflejado). Se conservan como historial.
- La batería sobre la candidata intermedia `df59428ee859` se detuvo al reemplazarla. Sus tres pruebas de manos pasaron.
