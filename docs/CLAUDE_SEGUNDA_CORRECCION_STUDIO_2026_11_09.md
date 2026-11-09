# Segunda corrección experimental de Studio — Claude Code, 9 de noviembre de 2026

Respuesta a la revisión de Codex de la candidata `7d2f04e9649f`, cuyo dictamen fue «no apta para publicar como
candidata integrada».

**Estado:**
- Todo está en un **árbol y una build aislados**.
- No se integró en `patches/` ni en `dist/`.
- No hay commits, pushes ni despliegues.
- Pages sigue sirviendo `511886d6b3de`, tras el revert `a7e7be9`.

## 1. Punto de partida

- **Repositorio:** HEAD `a7e7be9`, igual al público.
- **Candidata anterior:** `7d2f04e9649f`, congelada en `/root/cof-audits/frozen-7d2f04e9649f`. Su código sigue en
  `patches/` (commit `1380d33`).
- **Árbol nuevo:** `/root/cof-audits/claude-render2-20261109`, copia del canónico (`patches.sh check`: sin
  cambios). Compila en su propia carpeta `build/` y no usa ningún directorio de Codex.

## 2. Correcciones, una por cada hallazgo de Codex

Diff completo: `build/validation/claude-render2-2026-11-09/render2-studio3.patch` (+88/−25), generado por
`scripts/patch_studio3.py`.

| # | Hallazgo de Codex | Corrección |
|---|---|---|
| 1 | La traza leía `allsolid`; el original lee `startsolid` (`pmtrace_t +4`, en `1005bf99`) y la fracción | Ahora rechaza si `trace.startsolid` o `trace.fraction < 1` |
| 2 | Un foco fuera de su cono ocupaba un hueco (falta el filtro `10084e40`/`10084b30`) | Función nueva `R_CofSpotTouchesBox` en `gl_rsurf.c`: el volumen del foco de `R_SpotAt` (de 1 a 700 unidades, la tangente de `r_cofspot_fov`) contra la caja del modelo (`origin + mins/maxs`), descartando la caja que queda fuera de uno de los 6 planos. Si no la toca, la luz no ocupa hueco (contador `cone`) |
| 3 | La excepción −666/−665 es para el **viewmodel**, y su foco está −13 hacia delante y +5 a la derecha (`100678d0`) | La excepción usa `tr.viewent` en lugar de `RP_LOCALCLIENT`. Para el arma en mano, el origen del foco se desplaza −13·`vforward` +5·`vright`; la dirección y el cono por hueso usan ese origen (`R_CofSpotFactorFrom`) |
| 4 | Las mallas aditivas hacían `textura × min(2·color, 1)` y el original `min(textura × color × 2, 1)` | Las aditivas se dibujan también con escala 2 y su color sin doblar. El shim ya recorta a 1 después de multiplicar por la textura. Solo `STUDIO_NF_FULLBRIGHT` mantiene la escala 1 |
| 5 | `corona_` sorteaba el parpadeo por normal, no por vértice emitido | El sorteo de ±0,1 se hace en `R_StudioSetColorArray`, para cada vértice que se emite. Es el mismo valor en los tres canales, como el original, que lo suma al escalar |
| 6 | `fullbright_mess` con el byte `1018cb49` distinto de cero | **Sin cambio:** sigue sin conocerse quién lo escribe |
| 7 | La lista de luces del port (`tr.elights`) no es la del cliente | **Sin cambio:** es una diferencia estructural, documentada |

No se ha tocado la fórmula de luz (`R_CofModelLighting`, `R_CofCurve`) ni el muestreo, porque Codex no les
encontró divergencias.

## 3. Guarda de `patches.sh` reforzada

Codex demostró que el criterio de multiconjunto aceptaba:
- mover un cambio a otro archivo;
- intercambiar líneas;
- mover una línea a otro punto del mismo archivo;
- deshacer una eliminación;

y que un fallo de `cp` durante el export borraba la serie anterior.

**Cambios:**
- **`tools/wsl/patches_guard.py`** (nuevo): por archivo (repositorio y ruta), alinea en orden las líneas
  añadidas, cada una con su línea de anclaje (la anterior en el hunk que el parche no añade), y las eliminadas
  (`difflib.SequenceMatcher`, que trata bien los duplicados). Informa de lo que se pierde, se mueve o se deshace.
  `check --diff` imprime además el diff entre las dos series.
- **`patches.sh` comprueba la reproducción:** cada parche nuevo se aplica sobre una copia limpia de `HEAD` de su
  repositorio (`git archive`), y los archivos resultantes deben coincidir byte a byte con el árbol de trabajo.
- **Sustitución segura:** la serie nueva se escribe al lado (`.<proyecto>.new`) y se compara byte a byte. Solo
  entonces se aparta la serie actual y se coloca la nueva; si algo falla, se restaura la anterior. Un fallo de
  `cp` ya no deja `patches/` sin parches.
- **`tools/wsl/test_patches_guard.sh`**, ampliada: los seis contraejemplos de Codex ahora se **rechazan** sin
  tocar `patches/`, la copia fallida conserva la serie, y `check` confirma que la serie reproduce el árbol.
  **PASS.**

**Comprobación real:**
- **Canónico:** sin pérdidas, y la serie reproduce el árbol.
- **Árbol nuevo:** lista exactamente las líneas que esta corrección sustituye a propósito: la selección y el foco
  anteriores, el doblado de las aditivas, la escala de las aditivas, las estadísticas y el corona por normal.
  Para integrarla haría falta `--allow-drop` tras revisarla.

## 4. Compilación

| Módulo | Candidata anterior | Esta corrección |
|---|---|---|
| Renderer | `9e792b0e…` | `0a45f834b49f76d0715d15c8c1ed71fb2506d2a8a5aa39f711a7eca2acc79d49` |
| `xash3d.wasm` | `8a7ca0515bf81ac8…` | igual |
| Cliente, servidor, filesystem, menú | — | iguales |

**Build combinada** sobre el `dist/` publicado (`511886d6b3de`):
- manifiesto **`780fe1662f90`**;
- cambian `packs/engine.data`, su `.gz`, `packs/engine.js`, `sw-manifest.js` y `sw.js`;
- metadata con el formato de `candidate.json` de Codex en `build/validation/claude-render2-2026-11-09/candidate.json`.

## 5. Pruebas

| Prueba | Resultado |
|---|---|
| `tools/e2e/studio_selection_contract.py` (nuevo; los casos de Codex con las expectativas del original) | **PASS 8/8**: las 4 primeras en orden; caducidad, radio y bloqueo; `startsolid` con fracción 1 rechazada; foco fuera del cono sin hueco; foco dentro; linterna del viewmodel sin pruebas; la misma linterna sí se prueba en otro modelo; `r_dynamic 0` |
| Control: el mismo contrato sobre el bucle de `7d2f04e9649f` | No compila en el arnés: aquel bucle usa `RP_LOCALCLIENT`, que el fixture no define. No aplica como control |
| `studio_numeric_contract.py` (Codex) | 14/14 |
| `test_cof_lighting.py` (Codex) | 11/11 |
| `studio_fullbright_review.mjs` (Codex) | **PASS**: pantalla `fullbright_mess1` color 127/255 y escala 2; los botones aditivos ahora con escala 2 y color 0,5 (antes 1 y 1) |
| `studio_runtime_contract.mjs` (Codex) | **PASS**: 276.696 dibujos a escala 1 y 1.614 a escala 2, 0 inválidos; guardado/carga, cambios de mapa y lectura GL |
| `test_patches_guard.sh` | PASS (sección 3) |
| `pointer_lock.mjs`, `clock_backwards.mjs`, `fog_entities.mjs` | PASS |
| `flashlight_probe.mjs` (`COF_EXPECT_FIXED` + `COF_PERSISTENCE`) | PASS: pared 45,9 → 56,0; `r_dynamic 0` 45,9; recarga 56,0 |
| 18 regresiones de Codex | **18/18** (`regressions-221617`) |

**Mediciones** (`model_light.mjs`, `c_apartment1`, 800×600, mismo fotograma en pausa):

| Escena | Variante A | Variante B |
|---|---|---|
| Teléfono, inicio | `cof_fullbrighttextures 0,5`: 35,2 | `0`: 13,1 |
| Teléfono, giros | 36,9–39,0 | 11,6–20,5 |
| Navaja con linterna, inicio | `r_dynamic 1`: 14,87 | `r_dynamic 0`: 14,17 (+5 %) |
| Navaja con linterna, giro | 17,90 | 16,48 (+9 %) |
| Navaja con linterna, otro giro | 29,16 | 28,46 (+2 %) |

- **Navaja:** en la candidata anterior la misma comparación daba 0–1,5 %, con el foco en el ojo. Con el
  desplazamiento −13/+5 la linterna alcanza el arma, aunque es una medición port frente a port, sin captura nativa.
- **Contadores con la linterna encendida:** 27–47 luces aceptadas, 74–407 rechazadas por cono y 94–180 por la
  traza, por ventana de medición.
- **Capturas:** `measure/measure-222755` (teléfono) y `measure/measure-223002` (navaja).

## 6. Intermitencias

`extras_interactions` y `changelevel_entities` pasaron en esta ejecución. Siguen **abiertas**, porque no se ha
identificado su causa. Las pistas de Codex que quedan por instrumentar:
- **`changelevel_entities`:** retorno anticipado a `c_start2` antes del `Use` previsto.
- **`extras_interactions`:** Simon queda con `frozen=1` tras la E, y no se sabe qué callback lo pone.

## 7. Limitaciones

- **Prueba del cono:** es conservadora, como un recorte por pirámide (puede aceptar cajas cercanas a una
  esquina del volumen). Usa el ángulo de `r_cofspot_fov`, no la fórmula del original `(a+b)·0,3`, que no está
  confirmada.
- **Luces del port:** la lista sigue siendo `tr.elights`. El port solo tiene una clave de foco (no −666 y −665).
- **`fullbright_mess`:** el caso con el byte `1018cb49` distinto de cero no está cubierto.
- **Sin comparación nativa:** el efecto de la linterna en el arma está medido solo port frente a port.
- **Materiales** (relieve y especular): sin empezar, por indicación del usuario.

## 8. Recomendación

1. **Revisión de Codex** antes de integrar, sobre todo de:
   - la prueba de cono contra caja frente a `10084e40`/`10084b30` (planos, unidades, caja de entidad);
   - el desplazamiento −13/+5 y qué ejes usa (vista frente a ángulos de la entidad del viewmodel);
   - la escala 2 en las aditivas para colores distintos de 0,5;
   - la guarda nueva de `patches.sh`, con sus propios contraejemplos.
2. **Si la aprueba:**
   - aplicar `patch_studio3.py` al canónico;
   - `patches.sh check --diff`: deben salir solo las sustituciones listadas;
   - `patches.sh export --allow-drop`;
   - compilar limpio, combinar sobre el `dist/` publicado y repetir las pruebas;
   - publicar solo con la autorización del usuario.
