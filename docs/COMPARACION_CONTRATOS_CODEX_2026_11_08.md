# Comparación: implementación de Claude frente a los contratos de Codex — 8/11/2026

Documento preparado a petición del usuario mientras se espera la auditoría independiente de Codex y Craft
Anything. **No se ha modificado ningún punto de iluminación discutido** desde la candidata `7d2f04e9649f`.

## 0. Aviso sobre el estado de publicación

La candidata `7d2f04e9649f` **ya está publicada** en GitHub Pages:
- commits `1380d33` y `1acdfe8`;
- despliegue `42551898163`;
- archivos públicos comprobados byte a byte.

El usuario autorizó publicarla antes de pedir que se conservara sin publicar. Después decidió revertir:
- commit `a7e7be9`, `git revert` solo de `1acdfe8`;
- `dist/` es otra vez idéntico al de `598da25`;
- Pages (despliegue `42553146088`) sirve de nuevo **`511886d6b3de`**, con los hashes públicos comprobados.

**Estado resultante:**
- `patches/xash3d/0001-root.patch` y el árbol canónico **contienen el código de la candidata** (commit `1380d33`):
  texturas `fullbright` y selección de luces. `dist/` publicado **no** lo contiene.
- Cualquier compilación desde `patches/` reproduce la candidata, no lo publicado.
- La guarda de `patches.sh` sigue en `1380d33`.

## 1. Candidata congelada

Copia en solo lectura: `/root/cof-audits/frozen-7d2f04e9649f`, con los hashes en `FROZEN.json`. SHA-256 completos:

| Archivo / módulo | SHA-256 |
|---|---|
| `libref_gles3compat.wasm` (renderer) | `9e792b0ef8b84fe60c6963074438612b895cf0e00ce9f566fac271532db42e56` |
| `client.wasm` | `e0b2b6cc926ac1ba8564512fd493148f2748a959becb7a8e494391ac2b8b6ab1` |
| `server.wasm` | `91ca7418dcdcb520cd1479d77ca6646af79e455158c23f179661a1f46f7954f4` |
| `filesystem_stdio.wasm` | `85e8f987a23b86f6dcabc92acda5e2818653bb155e84b7fab25fdbd3ec507a95` |
| `menu.wasm` | `bbde8c4bcdfc8b61ed538fbcd86c5d92693a35277a7955fa502f5232285e6051` |
| `xash3d.wasm` | `8a7ca0515bf81ac8bc3eacb8a5aa87b2a06b52d2ef6acfcb8c46193fb18eee6b` |
| `packs/engine.data` | `bcbbbc14f1bc78d7c6b489fe36aeaebf74c49af48e669f6027433365c6e19ecf` |
| `packs/engine.data.gz` | `747bdb29728159ad2357e80cb1f9418254fbd5d32c3eba090388e9fcb0ab6236` |
| `packs/engine.js` | `f145d7dea95c58f802056f9d3f9bc7bc4d76a05d0a24425420e7731d711da8f1` |
| `sw.js` | `acf695b773f40ee4c6ed46eafb5d4dbc931ac3dc80cfa0f3508bb0389602ebd7` |
| `sw-manifest.js` | `2041d5b30e058c21a9589ca30be6c2496ba9ac2fafbc11dbf2a19f742c65748a` |

**Fuentes:**
- el árbol canónico `/root/cof-audits/audit-D3Kl5uly` coincide con `patches/` (`patches.sh check`: 0/0);
- el renderer compilado desde él es el de la tabla.

## 2. Contratos de Codex considerados

1. **Revisión independiente de Studio** (nota del 8/11 al usuario): gamma, `renderfx` 101/167, composición y
   materiales especiales, cobertura de luces.
2. **`tools/e2e/studio_numeric_contract.py`:** compila las funciones reales `R_CofCurve` y `R_CofModelLighting` con
   valores derivados del desensamblado.
3. **`tools/e2e/studio_runtime_contract.mjs`** y **`docs/VALIDACION_STUDIO_PUBLICADA_2026_11_08.md`:** escalas de
   dibujo 1 y 2, ciclo de la linterna, guardado y carga, sobre `511886d6b3de`.
4. **Contrato de materiales** (misma nota):
   - carga en `10069410` y mipmaps de normales en `1006a310`;
   - rutas ARB en `1018f858`/`1018faf0`: especular bajo con potencia 4; alto con half-vector, potencia 16 y gloss.
5. **`FIDELIDAD_GRAFICA_2026_11_07.md`:** capas 61/62/63 del mundo, ruta plana y ruta con relieve.

## 3. Comparación punto por punto

Estado: **Coincide** / **Parcial** / **Difiere** / **Ausente**.

| # | Punto | Contrato o evidencia de Codex | Implementación de la candidata | Estado | Prueba |
|---|---|---|---|---|---|
| 1 | Curva gamma | `pow(x, gamma)` (XMM0 = x, XMM1 = gamma en `10059627`) | `R_CofCurve`: `powf(x, gamma)`, luego × contraste + brillo; contraste ≤ 2, brillo ≤ 0,3 | **Coincide** | Contrato numérico **14/14** sobre las fuentes congeladas (`frozen-7d2f04e9649f-numeric-204836`) |
| 2 | Lambert 2, flatshade `a + 0,8d`, saturación por máximo, luz dinámica aditiva | `10068d70` (casos del contrato numérico) | `R_CofModelLighting`, sin cambios desde `511886d6b3de` | **Coincide** | 14/14 |
| 3 | Vértice `STUDIO_NF_FULLBRIGHT` = 1 | Caso «fullbright vertex» del contrato numérico | Color 1 y escala 1 | **Coincide con el contrato, pero el contrato no viene del original** | El original no trata ese bit en `10068d70` y ningún modelo de CoF lo usa (0 de 779). Ver la pregunta 1 de la sección 6 |
| 4 | `renderfx` 101 y 167 | Ambiente 0,1×3; difusa (0,15; 0,1; 0,1) o 0,1×3 | Igual | **Coincide** | Validación de Codex en `VALIDACION_STUDIO_PUBLICADA` |
| 5 | `renderfx` 137 (envpos) | Conservar su ruta | Excluido de la luz CoF | **Coincide** | — |
| 6 | Texturas `*fullbright*` y `corona_` (`10065ef0`) | Señaladas como pendientes («no declarar equivalente») | Color `cof_fullbrighttextures` (0,5) × 2; `corona_` ±0,1 por vértice. Las mallas aditivas, color doblado y escala 1 | **Parcial**: implementado; pendiente la validación de Codex | `model_light.mjs`: teléfono 35,8–38,8 frente a 11,6–20,4 (`claude-render-2026-11-08/measure`) |
| 7 | `fullbright_mess` | Pendiente | Igual que `fullbright`; el indicador `DAT_1018cb49` no tiene escritor encontrado y se asume 0 | **Parcial** | Ídem |
| 8 | `sleeve`/`glove` (atenuación temporal del modelo del jugador) | Pendiente | No portado | **Ausente** | — |
| 9 | Modelos especiales: `bookmenu`, máscara de gas, telescopio, luces del viewmodel (`100678d0`) | Pendientes | No portados | **Ausente** | — |
| 10 | Selección de luces dinámicas | «Faltan contratos de selección/orden de cuatro luces y conos» | Según `1005bd90`: distancia ≤ radio, traza de punto contra el mundo, las 4 primeras en orden; la linterna propia siempre en el modelo del jugador | **Parcial**: no hay contrato de Codex con el que comparar | Contadores: 20–306 aceptadas y 40–264 ocultas por la traza. Efecto en pantalla **no medido** |
| 11 | Orden de la lista de luces | — | `tr.elights` del motor, no la lista propia de 32 luces del cliente | **Difiere** por construcción; el impacto no está demostrado | — |
| 12 | Cono del foco frente a la caja (`10084e40`/`10084b30`) | — | No portado; se usa el cono de `R_CofSpotFactor` por hueso | **Difiere** | — |
| 13 | Posición de la linterna del jugador | — | Ojo de la vista; el original la pone −13 hacia delante y +5 a la derecha, con cono `(a+b)·0,3` | **Difiere** | Arma en mano apenas iluminada por la linterna |
| 14 | Escala del shim 1/2 sin valores inválidos | Instrumentación de Codex (271.673 dibujos a escala 1 y 1.006 a escala 2, 0 inválidos, en `511886d6b3de`) | Escala por malla; `fullbright` normal a 2; aditivas y `NF_FULLBRIGHT` a 1; vuelta a 1 tras cada malla | **Pendiente de repetir** sobre `7d2f04e9649f` | El contrato de ejecución exige los hashes de módulos de su metadata; necesita una metadata nueva |
| 15 | Linterna y guardado/carga | Contrato de ejecución (encendida, guardar, restaurar) | Sin cambios de lógica | **Pendiente de repetir** sobre la candidata | La prueba propia `flashlight_probe` con persistencia pasa |
| 16 | Materiales: relieve y especular | Contrato de carga y potencias 4/16 | No integrados, por indicación del usuario | **Ausente (aplazado)** | Auditoría en `CLAUDE_RENDER_CONTINUACION_2026_11_08.md`, sección 4 |
| 17 | Mundo: capas 61/62/63 | Ruta plana `10059660` y ruta con relieve `10059990` | Ruta plana; el relieve se aproxima con la media plana | **Parcial** | `test_cof_lighting.py`: 11/11 |

## 4. Elementos preservados

- **Guarda de `patches.sh`:** en `1380d33`; prueba `tools/wsl/test_patches_guard.sh` en PASS. Sin cambios desde
  entonces.
- **Intermitencias:** se mantienen **abiertas**, sin declararse resueltas:
  - `extras_interactions`: tras guardar y cargar, la E no movió a Simon (1 fallo; luego 2 PASS de Claude y 1 de
    Codex);
  - `changelevel_entities`: tiempo de espera de 30 s de un comando durante el cambio de nivel (1 fallo; luego 2
    PASS).
- **Relieve y especular:** no se ha empezado ninguna integración.

## 5. Qué no se ha tocado mientras tanto

- Ningún código de iluminación desde `1acdfe8`.
- Sin commits, pushes ni despliegues después de `1acdfe8`. Este documento queda sin confirmar.

## 6. Preguntas concretas para la auditoría de Codex

1. **`STUDIO_NF_FULLBRIGHT` (punto 3):** el contrato numérico pide color 1 para ese bit, pero `10068d70` no lo trata
   y ningún modelo de CoF lo usa. ¿Debe mantenerse el comportamiento de Xash o eliminarse del contrato?
2. **`fullbright_mess`:** ¿quién escribe `DAT_1018cb49`? Si se activa en alguna fase (por ejemplo, en una
   cinemática), la pantalla del teléfono debería iluminarse normal en ella.
3. **Luces:** contrato del orden de la lista de 32 del cliente, de las claves −666/−665 y del cono frente a la caja;
   ¿qué luces del motor (dlights, elights) entran en esa lista en el original?
4. **Linterna:** confirmar el desplazamiento −13/+5 y la fórmula del cono, para poder llevar la linterna del port al
   mismo sitio.
5. **Escala 2 en mallas `fullbright` no aditivas:** confirmar con la instrumentación de dibujo que se mantiene la
   proporción y que no aparecen escalas inválidas.
