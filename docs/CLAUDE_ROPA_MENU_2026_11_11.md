# Menú de ropa (Unlockables / Clothes) — Claude Code, 11/11/2026

**Qué vio el usuario.** En el menú principal, Unlockables → Clothes mostraba a Simon como una **silueta negra** y un
panel que no se parece al del original. La captura del original que aportó muestra la habitación del armario: Simon,
su reflejo en el espejo, la lista de trajes a la derecha y **Close**/**Reset** abajo.

Lo del tren del menú detenido no se reprodujo: el usuario indicó que luego avanzó. No se tocó.

**Qué es.** Rama `claude/nightmare-customize-20261111`, worktree `C:\Users\josue\cof-audits\claude-nightmare-20261111`.
Es una candidata local; su publicación necesita autorización.

## 1. Lo que hace el original

- **Dónde se cambia la ropa.** En partida, con `cof_clothesmenu` (en `c_start`, el armario del apartamento):
  - la cámara del mapa `clothescamera`;
  - `simonclothes` (`models/cutscene/simon_clothes.mdl`, secuencia `clothes_1`);
  - un segundo modelo, `simon_clothesm.mdl`, que es el reflejo del espejo.

  En el menú principal, los desbloqueables dicen «… – Equip in secret room.» (cadenas de `client.dll`). La vista previa
  del menú principal es un añadido del port del 07/11 (`docs/FIDELIDAD_VISUAL_Y_CLOTHES_2026_11_07.md`), que se
  mantiene.
- **La interfaz** (`CClothesMenu`, `client.dll` `1001f2b0`, analizado en solo lectura), sobre una pantalla de W×H:

  | Elemento | Posición y tamaño |
  |---|---|
  | Lista | 13 `ColorButton` en `x = W/2`, de `W/2 × H/12`, apilados desde arriba (caben 12) |
  | Close | `(0, H − H/12)`, `W/4 × H/12` |
  | Reset | `(W/4, H − H/12)`, `W/4 × H/12` |

  Estilo: fuente «credits», texto blanco con alfa 200, sin fondo, bordes negro y blanco con alfa 128, y el elegido
  con un tinte rojo de alfa 32. Para los bloqueados muestra «Locked» y «This item is currently locked.».

## 2. Causas y correcciones

1. **Silueta negra: regresión de Studio 4.**
   - El retrato del menú se dibuja con `EF_FULLBRIGHT`, solo en esa entidad de interfaz.
   - Desde el 08/11, la luz de modelos de CoF (`R_CofModel*`, `gl_studio.c`) se aplicaba a cualquier entidad y tomaba
     el luxel casi negro del mapa del menú.
   - **Corrección** (`patches/xash3d`, aprobación `20261111-215955-1195`): esa luz no se aplica a entidades con
     `EF_FULLBRIGHT`. Es una extensión de Xash que los mapas no usan, así que la luz de los modelos del juego no cambia
     (lo verifica `model_light`).
2. **Panel distinto del original** (`platform/web/extras.js`). Se rehízo con la disposición de `CClothesMenu`:
   - lista a la derecha, Close y Reset abajo a la izquierda;
   - sin recuadros ni título, con los colores y bordes del original.

   «Reset» envía `setclothes 0`, la ropa predeterminada, que antes era la primera entrada de la lista. «Custom hoodie»
   aparece bloqueado, porque el port no soporta el `custom_hoodie.tga` del jugador. Las órdenes al servidor no cambian.

**Lo que no se cambió:** la oscuridad de la habitación en partida. Usa la luz fiel del mapa, como el resto del juego, y
no se aclara sin evidencia.

## 2 bis. El tren «pegado» del menú (13/11/2026)

**Qué pasaba.** El usuario vio un tren parado en el menú. Pidió resolverlo antes de publicar.

**El guion del mapa** (`c_game_menu1.bsp`, `multimenu`):

| Momento | Qué ocurre |
|---|---|
| 14 s | `togasso` cruza de y = −3715 a y = 3666 (400 u/s, unos 18 s) |
| 32 s | `2togasso` cruza en sentido contrario |
| Hasta los 84 s | Los dos esperan **aparcados en los extremos de la vía** (`path_corner` con «esperar reactivación») |
| 84–85 s | Vuelven al inicio y el ciclo se repite |

**Medido en el port** (`cof_kinematics`, SwiftShader y RTX 4060): las posiciones siguen ese guion exactamente, también
con el menú de ropa abierto. En la GPU real no hubo ninguna pausa de más de 250 ms. **El tren no se atasca.**

**Por qué se veía parado.** La ventana del juego ocupaba todo el ancho de la página: unos 2,6:1 en un monitor 16:9,
entre cabecera, registro y pie. Xash amplía el campo de visión horizontal con el aspecto (medio ángulo de 62,9° frente
a 53,1° en 16:9), y así entraban en plano los dos trenes **aparcados** en los bordes durante 52 s. En el original, a
16:9 o 4:3, quedan fuera de plano.

**Corrección** (`platform/web/index.html`): el área del juego (`main`) tiene como máximo aspecto 16:9, centrada, con
bandas a los lados en ventanas más anchas.

- En ventanas más estrechas y en pantalla completa 16:9 no cambia nada.
- Todas las capas del HUD viven dentro de `main`, así que siguen alineadas.

**Comprobado** (`parked/`, capturas tomadas cuando el juego indica que los dos trenes están aparcados): antes se ven
en ambos bordes; después, ninguno.

**Descartado y conservado.** Las pausas de 2,5–3,6 s medidas con SwiftShader durante la precarga venían de la espera
de `glGetError` del renderizador por software (perfil de CPU: `(idle)` y `_glGetError`), no del loader. Un cambio de
caché de directorios en `loader.js` no las redujo y **se retiró**.

## 3. Candidata y pruebas

**Candidata `cand-cl`:**

- manifiesto **`e7cc6cdbd79d`**;
- es el `dist/` con el arreglo de la pesadilla (`c83a0e4f86f0`), más el renderer `8e8b0e19…` y el `extras.js` nuevo;
- cambian `extras.js`, `packs/engine.*`, `sw-manifest.js` y `sw.js`.

**Capturas** antes y después del menú y del armario: `build/validation/claude-ropa-2026-11-11/`.

**`clothes_menu.mjs` adaptada.** La ropa predeterminada ahora es Reset, así que los recuentos de entradas habilitadas
bajan en uno (1 → 0, 2 → 1, 12 → 11) y `choose(0)` pulsa Reset. Lo que se comprueba no cambia:

- modelo real y píxeles del retrato;
- 12 opciones con sus materiales;
- bloqueos;
- perfil tras recargar;
- partida nativa;
- Nueva partida.

**Resultados** sobre `cand-cl` (puerto 8114), sin nada en paralelo:

| Prueba | Resultado |
|---|---|
| `clothes_menu` | **PASS:** retrato nativo, 12 opciones originales, desbloqueo HLC original, perfil en frío y partida nativa |
| `model_light` (`c_apartment1`) | **PASS:** la luz de los modelos del juego no cambia |
| `nightmare_customize_probe` (cadáveres, escenas) | **PASS** |
| 18 regresiones de Codex | **18/18** (`regressions-cl-220443`) |
| `clothes_profile_compat` | Los **dos casos de la candidata** (lector nuevo con perfil antiguo, y preferencia bloqueada) **PASS** |

El tercer caso de `clothes_profile_compat` («una build antigua lee el perfil nuevo») falló en los dos intentos, y por
motivos ajenos a la candidata. Ambos fallos se conservan:

- Con el `dist/` actual como «histórico»: ya es un lector nuevo, así que devuelve `costume=6`.
- Con la build del 01/11 (`2f88e7b98c18`): aún no tiene `cof_extras_status`.

Ese caso solo valida builds anteriores al 07/11, y este cambio no toca el perfil ni el servidor.

**Candidata final `cand-cl3`**, manifiesto **`fdf221a95644`**: `cand-cl` más el `index.html` con el área 16:9.
Batería `cl3-suite-204522`, sin nada en paralelo:

| Prueba | Resultado |
|---|---|
| `clothes_menu` | PASS |
| `model_light` | PASS |
| `nightmare_customize_probe` (cadáveres, espejo, escenas) | PASS |
| `pointer_lock` | PASS |
| `intro_to_nightmare` | PASS (258 s) |
| 18 regresiones de Codex | **18/18** (`regressions-cl3-205557`) |

**Publicación.** El usuario la autorizó una vez resuelto lo del tren. `dist/` pasa a `fdf221a95644`; frente a
`c83a0e4f86f0` cambian `extras.js`, `index.html`, `packs/engine.*`, `sw-manifest.js` y `sw.js`.

**Capturas:** `before/` (silueta negra y panel antiguo) y `after/` (Simon iluminado y panel original), tanto en
`c_game_menu1` como en el armario de `c_start`.
