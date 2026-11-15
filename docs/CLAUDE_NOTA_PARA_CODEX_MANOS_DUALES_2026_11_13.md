# Nota para Codex: teléfono + navaja en doble empuñadura — Claude Code, 13/11/2026

> **14/11/2026, corregido:** la «lectura que propongo» de esta nota era **errónea**. La captura del original
> (teléfono + Glock) muestra el arma reflejada a la izquierda y el teléfono sin reflejar a la derecha. El arma de
> `+0x204` es el modelo extra reflejado; el teléfono es el viewmodel normal. Ver
> `docs/CLAUDE_MANOS_DUALES_2026_11_14.md`. Esta nota se conserva tal como se escribió.

Análisis de solo lectura, a partir de tus volcados (`phase5/native-private`, `studio4-integration-review-20261109/
native-private`) y de los MDL originales. **No toqué tu checkout** (`phase5-20261109`) y **no compilé ni probé
nada**: la sesión llegó al límite de uso antes. Todo lo de abajo es lectura de código y de modelos, pendiente de
comprobar en el juego.

## 1. Hallazgo que cambia el planteamiento: la navaja siempre va en la mano derecha

Pose calculada del MDL original (fotograma 0; x adelante, y izquierda, z arriba):

| Secuencia | `r_wr` | `l_wr` | `grippity` (empuñadura) | `blade` |
|---|---|---|---|---|
| `p1idle` (0) | 14,8 / −12,2 / −13,0 | 17,7 / 17,4 / −14,5 | 23,2 / −13,2 / −13,2 | 24,5 / −8,7 / −11,6 |
| `p2idle` (5) | 17,8 / −16,2 / −10,8 | 17,7 / 17,4 / −14,5 | 18,5 / −8,1 / −8,8 | 21,5 / −9,1 / −12,5 |

- En **p1 y en p2 la navaja está junto a `r_wr`** (y negativa = derecha). `l_wr` no se mueve: es la mano izquierda
  vacía.
- **p1 y p2 no son «mano derecha / mano izquierda»: son dos agarres con la misma mano derecha.** En p2 la hoja queda
  por debajo de la empuñadura (agarre invertido).
- `grippity` y `blade` son huesos raíz (padre −1), no cuelgan de ninguna mano. El filtro `l_` no los toca.

Con esto, filtrar `l_` deja siempre la mano derecha con la navaja. Para que la navaja aparezca a la izquierda hay que
reflejar el modelo, no cambiar de secuencia.

El teléfono (`v_mobile.mdl`) también va en la mano derecha (`phone` cuelga de `r_sphr`, junto a `r_wr`); su `l_wr`
queda abajo y atrás (−1,5 / 15,3 / −25,0).

## 2. Qué hace el original, según el código

**Modelo extra reflejado** (`client.dll` `FUN_1008c7e0`, tu `client.txt`, líneas 185-190). Con `DAT_105458b0 == 3`
(modelo extra con nombre recibido por mensaje) y arma activa `0xf`:

- multiplica por `DAT_1013e428` los elementos `+4`, `+0x14` y `+0x24` de la matriz (la columna Y);
- llama a `(*(DAT_101b2750 + 0x28))(1)`.

Falta confirmar que `DAT_1013e428` vale −1 (`DumpFloats`) y que esa llamada es el cambio de cara visible. Si es así,
**el reflejado es el modelo extra**, no el viewmodel del motor.

**Filtro de brazo** (`FUN_10065ef0`, rama `10066e40`, tu `left-arm-refs.txt`, líneas 412-440):

| Pasada | Condición | ID que mira | Qué omite |
|---|---|---|---|
| Modelo extra | `DAT_105458b0 == 3 && DAT_10556b48 != 0` | `DAT_10545864` | `r_` si el ID es 13; si no, `l_` |
| Viewmodel | la entidad es el viewmodel | `DAT_10545868` | `r_` si el ID es 13; si no, `l_` |

- **Las dos pasadas omiten `l_`**, salvo con el arma 13. El 13 parece la bengala (`weapon_flare`): en `FUN_10031020`
  el caso `0xd` consulta `FUN_100e0310(0xd)` y `+0x248 == 1`.
- Los dos IDs llegan en el mismo mensaje que el nombre del modelo extra (`FUN_10090780`).

**Papeles** (`hl.dll` `FUN_10031020`, `dual-weapons.txt` líneas 287-416):

- `+0x204` es el arma cuyo modelo se pone como **viewmodel** (`FUN_10038f40` con `FUN_10031f00(+0x204)`), y el primer
  `switch` le envía la animación con `FUN_10038f10`. **Caso 6 (navaja): secuencia 6 (`p2draw`), reposo 5 (`p2idle`).**
- `+0x200` es la otra arma; el segundo `switch` solo elige su secuencia (teléfono: 2 o 7; por defecto 6).

**Lectura que propongo, sin demostrar del todo:** en teléfono + navaja, la navaja es `+0x204` (viewmodel, sin
reflejar, mano derecha, agarre p2) y el teléfono es `+0x200` (modelo extra, reflejado, queda a la izquierda). Coincide
con el comentario original de `cof_hands.cpp` («draws a second studio viewmodel, mirrored») y con que el caso 6 esté en
el `switch` del viewmodel.

**Contradice dos pasos de tu informe:**

- «el teléfono es principal (ID 2) y la navaja secundaria (ID 6) con p2»: el caso 6 con p2 está en el `switch` de
  `+0x204`, el del viewmodel.
- La candidata pov-third (navaja reflejada a la izquierda, teléfono a la derecha) sería **el reparto inverso** al del
  original.

Para cerrarlo falta ver qué arma va a `+0x204` y cuál a `+0x200` al crear `weapon_dualweapon` (`hl-dualcreate`:
`local_114` y `local_110`, cerca de la línea 148 de mi volcado; en `server.txt`, línea 173).

## 3. Qué probaría (no lo he hecho)

1. **Navaja = viewmodel del motor, sin reflejar**, con el filtro `l_` (tu `MaskKnifeLeftArm` ya lo hace) y con las
   secuencias **p2** en dual.
   - Equivalencias: 0→5, 1→6, 2→7, 3→8, 16→18, 17→19, 20-22→23-25, 10-12→13-15.
   - El `p2draw` y el `p2idle` están respaldados por `FUN_10031020`; el resto de equivalencias es por nombre y hay
     que confirmarlo.
2. **Teléfono = modelo extra (`CoF_DrawOffhand`), reflejado en Y**, con la cara visible invertida y **también con el
   filtro `l_`**. Ahora el filtro solo se aplica a la navaja.
3. `CoF_HandsMirror`: reflejar cuando `g_drawing` (teléfono), y no el viewmodel de la navaja. Es lo contrario de la
   rama `g_kind == 1` actual.
4. Comprobar la captura con la referencia del usuario: teléfono a la izquierda, navaja a la derecha en agarre invertido.

**Sobre tus ensayos fallidos con p2:** si p2 se probó con el viewmodel reflejado y filtro `l_`, la navaja debería seguir
en la mano que queda. Que saliera «una mano sin navaja» apunta a otra cosa: el cuerpo `blood` (submodelos
`reference1-4`, la hoja) o el tiempo de animación al cambiar de secuencia. No lo he reproducido.

## 4. Límites

- No hay compilación, captura ni prueba: es solo lectura.
- El reparto `+0x204`/`+0x200` para teléfono + navaja no está demostrado.
- No hay comparación con el juego nativo.
