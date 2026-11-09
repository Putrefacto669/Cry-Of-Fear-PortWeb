# Studio 4, guarda de parches y pruebas corregidas — Claude Code, 9 de noviembre de 2026

Correcciones autorizadas por el usuario a partir de las dos revisiones de Codex del 9/11
(`CLAUDE_INTERMITENCIAS_Y_STUDIO3_2026_11_09.md`, sección 9 bis).

**Estado:**
- Todo está en árboles aislados o sin commit.
- No se han tocado `patches/` ni `dist/`.
- No hay commits, pushes ni despliegues; Pages sigue en `511886d6b3de`.
- Studio 3 sigue congelado e intacto.

## 1. Identidad

| Elemento | Identidad |
|---|---|
| Studio 3 (sin cambios) | `/root/cof-audits/frozen-780fe1662f90` y árbol `claude-render2-20261109` |
| Árbol de Studio 4 | `/root/cof-audits/claude-render3-20261109`, copia del de Studio 3 más `patch_studio4.py` |
| Renderer de Studio 4 | `3ea07f6b1c2726f366aab7f547321093b039df83f7663430cb13f477bc9831b2`; `xash3d.wasm`, cliente, servidor, filesystem y menú iguales a los publicados |
| Build combinada | manifiesto **`83e1d1c25aaf`**, metadata en `build/validation/claude-studio4-2026-11-09/candidate.json` |
| Diff | `studio4-vs-claude-render2-20261109.patch` (+55/−20 sobre Studio 3) y `studio4-vs-audit-D3Kl5uly.patch` (+125/−27 sobre el canónico) |
| Pruebas corregidas | worktree `C:\Users\josue\cof-audits\claude-persist-20261109` (rama `claude/persist-intermittent-20261109`, sin commits) |
| Guarda | `tools/wsl/patches.sh`, `patches_guard.py` y `test_patches_guard.sh` del repositorio principal, sin commit |

## 2. Correcciones de Studio 4 (`patch_studio4.py`)

| Punto de Codex | Corrección | Evidencia del original |
|---|---|---|
| E. RNG compartido | `corona_` usa `R_CofCoronaRandom`, un xorshift32 propio del renderer, y deja de llamar a `COM_RandomFloat`, que comparte `lran1` con el servidor. Es una llamada por vértice emitido, con el mismo valor en R, G y B | Defecto de aislamiento demostrado por Codex (`ref_common.c`/`sv_game.c` → `common.c`) |
| C. Linterna del arma en mano | Origen y ángulos de **la entidad del viewmodel** (`ent->origin`/`ent->angles`), con el pitch invertido: `origin − 13·forward + 5·right`, solo para la clave del foco. Por hueso: `1 − d²/700²` por una rampa `(dot − t)/(1 − t)` con `t = cos((a + b)·0,3°)` alrededor de la dirección de la luz, en lugar del factor de cookie | `100678d0` (`100682a8–10068392`; `10068254–10068264`) |
| B. Cono y caja | Descarte radial previo (700 u para el foco y el radio de la luz para las demás). Volumen sin plano cercano: cuatro planos laterales que pasan por la luz (forward girado ±(90° − apertura/2)) y uno lejano a 700 u | `1005bd90`, `10084e40`, `10084b30`, `10083e90` |

**Limitaciones que siguen:**
- **Aperturas de la linterna:** las del registro de luz original (a, b) no se conocen. Se usa `r_cofspot_fov` (50°)
  en las dos, así que el umbral queda en `cos(30°)`.
- **Alcance del foco:** 700 u, el del port. El del original tampoco se conoce.
- **Falso positivo del recorte:** el de Codex (caja que corta dos semiespacios sin intersección común) sigue siendo
  posible. El original también prueba plano a plano.
- **Dos llamadas a `COM_RandomFloat` en `gl_studio.c`** (líneas 628 y 635): son código de Xash anterior a este
  trabajo, sin relación con la luz CoF. Se documentan sin cambiar.
- **Sin corregir:** F (`fullbright_mess` con el byte `1018cb49` distinto de cero) y G (lista de luces del cliente),
  como se acordó.

## 3. Guarda de `patches.sh` (repositorio principal, sin commit)

- **Índice incluido:** la serie se genera con `git diff HEAD`, así que un cambio solo indexado se exporta. La
  verificación cubre todo lo que difiere de HEAD, y un repositorio con cambios sin parche es un error.
- **Dos anclajes por línea añadida** (`patches_guard.py`): la línea sin cambios de encima y la de debajo. Detecta el
  traslado entre bloques con la misma línea de encima. El límite que queda (encima y debajo idénticos) está
  documentado, y `check --diff` muestra todo.
- **Lote transaccional:** se preparan y verifican todos los proyectos (`.<p>.new.<id>`) antes de sustituir ninguno.
  Si una sustitución falla, se deshacen las anteriores.
- **Respaldos:** tienen nombre único (`.<p>.old.<id>`) y no se borran nunca los de otras ejecuciones. Si la
  recuperación también falla, sale con código 2 y los conserva.
- **Registro del cambio aprobado:** `--allow-drop` deja en `build/patch-approvals/<id>.txt` las pérdidas aprobadas,
  los SHA-256 de ambas series y el diff entre ellas.
- **`test_patches_guard.sh`: PASS.** Sus casos son:
  - 7 contraejemplos rechazados: línea perdida, archivo, orden, contexto, eliminación deshecha, duplicado y mismo
    anclaje de encima;
  - un cambio solo indexado se exporta;
  - una copia fallida conserva la serie;
  - un lote de dos proyectos con fallo en el segundo deja los dos como estaban;
  - un doble fallo sale con 2, conserva el respaldo y la siguiente ejecución no lo borra;
  - `--allow-drop` deja registro;
  - la serie reproduce el árbol.
- **Canónico:** sin pérdidas, y la serie reproduce el árbol.

## 4. Pruebas corregidas (worktree)

- **`changelevel_entities`:** sin cambios desde la versión que Codex consideró apta.
- **`extras_interactions`:**
  - **Destino:** adopta la condición de Codex. Simon debe llegar descongelado a ≤ 8 u de `3_exit1` (origen
    (−312, 480, 177)).
  - **Las E:** dejan de ir a cadencia fija. Espera, en tiempo de juego, a que venza el bloqueo de 1 s del original
    desde el desbloqueo (`10048e40`/`10048f70`, confirmado por Codex). Después pulsa E real hasta 3 veces y, tras
    cada una, espera 1,5 s de juego o la llegada.
  - **Plazos:** se mantienen los de estado (60 s) y de confirmación (30 s).

## 5. Resultados (build `83e1d1c25aaf`)

| Prueba | Resultado |
|---|---|
| `studio4_contract.py` (nuevo; compila `common.c`, `R_StudioSetColorArray`, el bloque del desplazamiento y `R_CofSpotTouchesBox` reales) | **PASS**: <ul><li>semilla 4242: la siguiente tirada del servidor es **184442 con y sin** vértices `corona_` (Codex midió 184442 → 438565 en Studio 3);</li><li>`corona_`: 118, 147 y 127 sobre 255, iguales en RGB;</li><li>desplazamiento de referencia de Codex **(94,34314; 187,27208; 30)** exacto, con el pitch invertido;</li><li>volumen: acepta delante y a 0,5 u, y rechaza detrás, más allá de 700 y fuera de los lados.</li></ul> |
| Control: el mismo contrato sobre Studio 3 | No compila: no existe `R_CofCoronaRandom` |
| `studio_selection_contract.py` | 8/8 |
| `studio_numeric_contract.py` (Codex) | 14/14 |
| `test_cof_lighting.py` (Codex) | 11/11 |
| `studio_fullbright_review.mjs` (Codex) | PASS |
| `studio_runtime_contract.mjs` (Codex) | PASS: 283.390 dibujos a escala 1 y 1.378 a escala 2, 0 inválidos |
| `pointer_lock`, `clock_backwards`, `fog_entities` | PASS |
| `flashlight_probe` (persistencia) | PASS: 45,8 → 56,0; `r_dynamic 0` 45,9; recarga 55,9 |
| 18 regresiones de Codex (versiones originales) | **18/18** |
| `changelevel_entities` corregida | PASS |
| `extras_interactions` corregida | PASS |
| Control negativo de Codex sobre la corregida (`cof_goto 37 -155 164` en lugar de E) | **Falla, como debe**: «player did not reach 3_exit1 unfrozen: origin=37,−155,164 … frozen=0» |

**Mediciones** (`model_light.mjs`, `c_apartment1`):

| Escena | Studio 4 | Studio 3 |
|---|---|---|
| Teléfono, `cof_fullbrighttextures 0,5` frente a `0` | 35,4–38,8 frente a 11,6–20,4 | Igual |
| Navaja con linterna, `r_dynamic 1` frente a `0` | 17,72/14,42 (+23 %), 21,54/16,74 (+29 %), 20,16/16,49 (+22 %) | +2–9 % |
| Contadores de selección con linterna | 34–42 aceptadas; 29–42 lejos, 70–420 fuera del cono, 68–145 ocultas | Sin descarte radial |

Es una comparación port frente a port, sin captura nativa.

Evidencia completa: `build/validation/claude-studio4-2026-11-09/` (diffs, scripts, metadata, contratos, mediciones
con capturas, regresiones, arneses de Codex, pruebas corregidas y control negativo, salida de la guarda).

## 6. Intermitencias

- **Pasan en esta ejecución, pero siguen abiertas en la rama principal:** se usan las versiones originales mientras
  no se adopten las corregidas.
- **Pendiente:** la posición de Simon en el episodio histórico de `changelevel_entities`, y si se perdió el comando o
  su confirmación.

## PENDIENTE DE REVISIÓN POR CODEX

1. **Studio 4:**
   - el desplazamiento desde la entidad del viewmodel (ejes de `AngleVectors` con el pitch invertido);
   - la rampa por hueso y la sustitución del factor de cookie;
   - el descarte radial de 700 u;
   - los planos sin plano cercano;
   - el generador propio de `corona_`;
   - el contrato `studio4_contract.py`.
2. **Guarda:** volver a ejecutar `guard_review.py` sobre la versión nueva. En especial el lote, el doble fallo,
   los cambios indexados y el registro de aprobación.
3. **`extras_interactions` corregida:** la espera del bloqueo en tiempo de juego y los reintentos de E.
4. **Si Codex da dictamen favorable,** seguir la lista de verificación de integración (sección 8 del informe de
   intermitencias), con Studio 4 en lugar de Studio 3.
