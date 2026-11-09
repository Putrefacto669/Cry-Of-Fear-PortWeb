# Intermitencias de regresión y conservación de Studio 3 — Claude Code, 9 de noviembre de 2026

**Alcance:**
- Investigación de las dos intermitencias abiertas: `changelevel_entities` y `extras_interactions`.
- Conservación de la candidata Studio 3 (`780fe1662f90`).
- Lista de verificación para integrarla si Codex la aprueba.

**Lo que no se ha hecho:**
- No se modificaron `patches/` ni `dist/` del repositorio principal.
- No se tocaron los archivos de iluminación que audita Codex.
- No hay commits, pushes ni despliegues.

## 1. Identidad de árboles y módulos

| Elemento | Identidad |
|---|---|
| Repositorio principal | `a7e7be9` = `portweb/main`; Pages sirve `511886d6b3de` |
| Candidata Studio 3, congelada | `/root/cof-audits/frozen-780fe1662f90` (solo lectura, 145 SHA-256 en `SHA256SUMS`): distribución `780fe1662f90`, renderer `0a45f834b49f76d0715d15c8c1ed71fb2506d2a8a5aa39f711a7eca2acc79d49`, `candidate.json`, diff completo del árbol (`xash3d-tree.diff`), herramientas sin commit (`patches.sh`, `patches_guard.py`, `test_patches_guard.sh`, `studio_selection_contract.py`, `model_light.mjs`), evidencia e informes |
| Árbol de Studio 3 | `/root/cof-audits/claude-render2-20261109`, intacto; no se ha compilado en él desde la congelación |
| Worktree de esta investigación | `C:\Users\josue\cof-audits\claude-persist-20261109`, rama `claude/persist-intermittent-20261109` desde `a7e7be9`, sin commits |
| Árbol de compilación de la investigación | `/root/cof-audits/claude-persist-20261109`: hlsdk copiado del canónico más la instrumentación; motor ya compilado del canónico; `stage/` del canónico enlazado en solo lectura |
| Build instrumentada | manifiesto `3538f15e835a`, servidor `de5ca35b…` (instrumentado), cliente `e0b2b6cc…` (igual al publicado), renderer `9e792b0e…` (el del canónico); puerto 8095 |

El renderer no interviene en estas pruebas. Codex reprodujo ambas intermitencias también sobre `511886d6b3de`, con
otro renderer.

## 2. Instrumentación

Toda la traza va condicionada a `sv_cheats` (las pruebas lo activan; en partida normal no imprime nada) y no cambia
ninguna regla:

- **`trigger_changelevel`** (`dlls/triggers.cpp` del hlsdk aislado, `scripts/patch_cl_diag.py`): cada `Use` y
  `Touch` imprime `COF/DIAG changelevel use|touch` con el índice, el nombre, quién lo dispara (clase, modelo e
  índice), el activador, la posición de Simon y el tiempo del servidor.
- **`inter_door`** (`game/cof-logic/cof/doors.cpp` del worktree): cada `Use` imprime `COF/DIAG door` con su
  resultado (`use=pass`, o `use=ignored` con el motivo `activator`, `disabled` o `nextuse`) y `think=pass` en
  `PassThink`. Incluye el tiempo del servidor, `ltime`, `nextthink` y `m_flNextUse`.
- **Arneses de diagnóstico** (`tools/e2e/changelevel_diag.mjs` y `extras_diag.mjs` del worktree): siguen la misma
  ruta que las regresiones y registran tiempos monótonos del navegador (`performance.now`) y del servidor (un fence
  tras cada acción). Tienen variantes que aíslan la causa.

## 3. `changelevel_entities`

### Hallazgos confirmados
- **Geometría de los BSP originales.** `haehecl` (`trigger_changelevel`) y el landmark `hahaland` están en el mismo
  sitio en `c_start` y `c_start2`. Además, cada mapa tiene un `trigger_multiple` que dispara `haehecl` por `Use`:

  | Mapa | Entidad | Volumen |
  |---|---|---|
  | `c_start` | `*100` | x 2380–2466, y −904…−831 |
  | `c_start2` | `*3` | x 2381–2467, y −987…−914 |
- **Punto de partida de la prueba.** Carga `c_start2` directamente, así que Simon empieza en su `info_player_start`,
  (2428, −883, −728), que **cae dentro** de `*100` al pasar a `c_start`.
- **Mecanismo, reproducido de forma determinista.** Con Simon sin moverse (`COF_WALK=none`), 2/2: al llegar a
  `c_start`, la traza muestra `caller=trigger_multiple:*100` disparando `haehecl` a 1,02–1,03 s de nivel, y Simon
  vuelve a `c_start2`. Es exactamente la firma del fallo histórico: llegada a `c_start` y `CHANGE LEVEL: c_start2`
  en el mismo segundo. El comando de la prueba se pierde en el cambio y vence su plazo de 30 s.
- **Fuera de la caja no hay rebote:** 0 rebotes en 10 rondas (2 con caminata verificada, 2 con la caminata de
  700 ms, 6 con la ruta completa de guardar, cargar y caminar 700 ms). En todas Simon llegó a y = −800.
- **No es un fallo del juego.** El rebote es la lógica del mapa original: entrar en ese `trigger_multiple` dispara
  el cambio. El punto de partida de la prueba no se alcanza en el recorrido natural, porque se llega a `c_start2`
  desde `c_start`.

### Hipótesis
- **Causa del episodio histórico (más probable, no demostrada).** La caminata de 700 ms reales no sacó a Simon de
  la caja: necesita más de 68 unidades. El registro histórico no guardó su posición, y en 10 rondas nuevas la
  caminata siempre bastó. Queda como la única explicación compatible con su firma, sin demostrar.

### Hipótesis descartadas
- **Aparecer dentro del trigger del cambio de nivel (`*97`/`*4`):** la posición de Simon queda fuera en x.
- **Un `Use` repetido por la consola:** la traza muestra un único `Use` del jugador por transición.
- **Reproducción frenando la CPU** (`Emulation.setCPUThrottlingRate` ×4 y ×8): el motor se vuelve demasiado lento
  y aparecen otros fallos (transiciones de más de 60 s, fences agotados). La caminata seguía llegando a y = −800.
  No sirve como reproducción y se descarta como método.

### Corrección experimental (solo la prueba)
`tools/e2e/changelevel_entities.mjs` del worktree:
- mantiene W pulsada hasta que el servidor informa de que Simon salió de la caja de `*100` (sondeo cada 100 ms,
  con el mismo plazo de estado de 60 s);
- antes de cada `Use` comprueba esa posición y, si falla, lo dice: «harness: Simon … is inside c_start's arrival
  trigger_multiple».

Así un fallo del arnés no se confunde con uno del juego. No cambia el juego ni los plazos.

## 4. `extras_interactions`

### Hallazgos confirmados
- **Quién congela a Simon:** solo la `inter_door`. `CInterDoor::Use` pone `FL_FROZEN`, funde a negro (0,35 s) y
  programa `PassThink` en `ltime + 0,40`. `PassThink` lo retira y lleva a Simon a la salida.
  - El candado (`padlock.cpp`) también congela, pero no interviene aquí.
  - `cof_unfreeze` es un comando de diagnóstico.
- **Bloqueo tras el desbloqueo.** Usar la llave (`UnlockWith`) bloquea la puerta 1 s (`m_flNextUse`). Se guarda en
  la partida como `FIELD_TIME`, así que sigue tras cargar: en 4 de 5 ejecuciones, la primera E después de cargar se
  ignora (`use=ignored reason=nextuse`).
- **Duración del cruce:** `PassThink` llega siempre entre 0,34 y 0,37 s de juego después del `Use` aceptado (5/5).
- **Observación temprana, reproducida de forma determinista** (`COF_OBSERVE=early`), 2/2: justo después del `Use`
  aceptado, Simon está en (36, −155, 164) con `frozen=1`, la firma del fallo histórico. Entre 0,2 y 0,36 s de juego
  después, ya está en (−312, 480, 177) con `frozen=0`.
- **Reconstrucción del fallo histórico con los tiempos medidos:**
  1. el desbloqueo fue a ≈22,45 s, así que el bloqueo duraba hasta ≈23,45 s;
  2. el motor iba a ≈0,45× del tiempo real, y las tres E (600 ms de espera reales) ocuparon solo ≈0,65 s de juego:
     ≈23,22, 23,55 y 23,87 s;
  3. las dos primeras caen en el bloqueo o en su borde; la tercera usa la puerta y el cruce acaba en ≈24,21 s;
  4. la prueba miró a los 24,03 s, a mitad del cruce.

### Conclusión
- **Qué es `frozen=1`:** el estado legítimo de mitad de cruce, no un callback perdido.
- **Qué falla:** la prueba lee el estado en un instante de tiempo de pared, y el resultado depende de la velocidad
  del motor.
- **No se toca:** `frozen`. No hay nada que corregir en el juego con la evidencia actual.

### Hipótesis descartadas
- **`PassThink` perdido tras restaurar:** se ejecutó en todas las ejecuciones, también en la observación temprana.
- **`ltime` que no avanza tras cargar:** avanza (19,45 → 19,85 entre el `Use` y el `PassThink`).

### Pendiente
- Si el bloqueo de 1 s tras desbloquear y la duración del fundido son los del original (`hl.dll` `FUN_10048e40` y
  `FUN_10048f70`, que el código cita). La investigación no los cambia.

### Corrección experimental (solo la prueba)
`tools/e2e/extras_interactions.mjs` del worktree:
- tras las tres E reales, espera a que el servidor informe del cruce (`frozen=0` y otra posición);
- usa el plazo de estado de 60 s que la prueba ya tenía, en vez de leer en un instante fijo.

Si la puerta no se usa, sigue fallando por plazo.

## 5. Resultados

Ver la sección 9 (pruebas originales frente a corregidas sobre la misma build).

## 6. Fallos conservados

En `build/validation/intermitencias-2026-11-09/` del worktree:
- `historical/`: los registros completos de los fallos de `changelevel_entities` (`regressions-201118`) y
  `extras_interactions` (`regressions-185725`), con `SHA256SUMS`;
- `diag/`: todas las ejecuciones de diagnóstico, también las fallidas por frenar la CPU.

## 7. Estado de Studio 3

- Congelado sin cambios, tal como se describe en la sección 1.
- Codex lo está auditando; no se ha modificado ningún archivo de iluminación.
- Las correcciones de esta fase (instrumentación del servidor y pruebas) no tocan el renderer.

## 8. Lista de verificación para integrar Studio 3 (solo con dictamen favorable de Codex)

No se ejecuta sobre la rama principal ni sobre la distribución pública hasta que el usuario lo autorice.

1. **Partida:**
   - HEAD = `portweb/main` y árbol limpio;
   - `patches.sh check` sobre el canónico: «sin pérdidas; la serie nueva reproduce el árbol».
2. **Herramientas:** integrar primero la guarda nueva (`patches.sh`, `patches_guard.py`, `test_patches_guard.sh`,
   desde `frozen-780fe1662f90/tools`). `test_patches_guard.sh` debe dar PASS.
3. **Aplicación limpia:** copiar el canónico a un árbol nuevo y aplicar `patch_studio3.py`. Los archivos
   resultantes deben coincidir con los de `/root/cof-audits/claude-render2-20261109`, comparados con `cmp`.
4. **Revisión de sustituciones:**
   - `patches.sh check --diff` debe listar solo las líneas sustituidas a propósito: la selección y el foco
     anteriores, el doblado de las aditivas, la escala de las aditivas, las estadísticas y el corona por normal;
   - después, `export --allow-drop` y otra vez `check`: 0 pérdidas y la serie reproduce el árbol.
5. **Compilación limpia:** a partir de los parches exportados, en una copia nueva (`clean_build.sh`):
   - renderer = `0a45f834…`;
   - `xash3d.wasm` = `8a7ca0515bf81ac8…`;
   - cliente, servidor, filesystem y menú iguales a los publicados.
6. **Coherencia de módulos:**
   - extraer los módulos de `packs/engine.data` y comparar con `candidate.json`;
   - el manifiesto puede cambiar por la disposición del paquete, pero los cinco módulos deben ser byte a byte los
     de la candidata.
7. **Integridad de recursos:**
   - comprobar los hashes de los 95 recursos del manifiesto contra los archivos;
   - los `.gz` deben descomprimirse igual que su original;
   - solo deben cambiar `packs/engine.*`, `sw-manifest.js` y `sw.js` frente a `511886d6b3de`.
8. **Regresiones:**
   - las 18 de Codex y las pruebas de reloj, niebla, linterna (`COF_EXPECT_FIXED`, `COF_PERSISTENCE`) y Pointer
     Lock;
   - `test_cof_lighting.py`, `studio_numeric_contract.py`, `studio_selection_contract.py`,
     `studio_fullbright_review.mjs` y `studio_runtime_contract.mjs`;
   - `model_light.mjs` (teléfono y linterna);
   - con las versiones corregidas de `changelevel_entities` y `extras_interactions`, si el usuario las aprueba.
9. **Guardados existentes:**
   - cargar en la candidata partidas guardadas con `511886d6b3de` en `c_apartment1`, `c_start` y `c_nightmare`;
   - comprobar la conexión, la posición, el bolso y la linterna;
   - con `cof_callbacks`, 0 avisos de callbacks.

   El renderer no forma parte del guardado, pero se verifica.
10. **Publicación controlada:**
    - commits separados para fuentes y `dist/`, con la autorización del usuario;
    - push y despliegue;
    - comprobar los hashes públicos frente a `dist/`.
11. **Reversión:** `git revert` solo del commit de `dist/`, como se hizo con `a7e7be9`, y verificación pública de
    la versión anterior. La candidata queda congelada para reintentar.

## 9. Pruebas originales frente a corregidas (misma build instrumentada)

| Prueba | Original (sin cambios) | Corregida (worktree) |
|---|---|---|
| `changelevel_entities` | 2/2 PASS | 2/2 PASS |
| `extras_interactions` | 2/2 PASS | 2/2 PASS |

Evidencia: `build/validation/intermitencias-2026-11-09/ab/`.

**Lectura:**
- Que pasen no demuestra nada sobre la intermitencia: el fallo original es poco frecuente y no apareció en esta
  máquina.
- La «prueba anterior fallida» son las reproducciones deterministas: `COF_WALK=none` rebota 2/2, y
  `COF_OBSERVE=early` da `frozen=1` en la misma posición 2/2.
- La «posterior satisfactoria» son las versiones corregidas, que por construcción ya no dependen de esas
  condiciones:
  - `changelevel_entities` no hace el `Use` hasta que el servidor confirma que Simon está fuera de la caja;
  - `extras_interactions` espera a que el servidor informe del cruce.
- Las dos intermitencias siguen **abiertas** en el repositorio principal hasta que el usuario y Codex decidan si se
  adoptan las pruebas corregidas.

**Resumen de causas:**

| Intermitencia | Causa | Estado | ¿Fallo del juego? |
|---|---|---|---|
| `changelevel_entities` | Rebote por el `trigger_multiple *100` | Mecanismo confirmado; episodio histórico sin demostrar | No |
| `extras_interactions` | Observación a mitad del cruce | Reproducida y explicada con los tiempos del registro histórico | No |

Ninguna corrección toca el juego.

## 9 bis. Revisión independiente de Codex (9/11/2026), documentada antes de corregir

Fuentes:
- `C:\Users\josue\cof-audits\persist-review-20261109\REVISION_INTERMITENCIAS_2026_11_09.md`;
- `C:\Users\josue\cof-audits\studio3-review-780fe1662f90\docs\CODEX_CRAFT_STUDIO3_REVIEW_2026_11_09.md`.

**Intermitencias:**
- **`changelevel_entities` corregida: apta para adoptar.**
  - Codex reprodujo el rebote 2/2 (`caller=trigger_multiple:*100:302`, Simon en (2428, −883, −731)).
  - La versión corregida completó los dos viajes.
  - Siguen sin conocerse la posición de Simon en el episodio histórico y si allí se perdió el comando o su
    confirmación.
- **`extras_interactions` corregida: necesita una aserción más precisa.**
  - **Falso positivo reproducido:** sin pulsar E, un desplazamiento de diagnóstico de una unidad, de
    (36, −155, 164) a (37, −155, 164), con `frozen=0`, da PASS en mi versión.
  - **Variante de Codex:** exige llegar descongelado a ocho unidades o menos de la salida de la puerta (`3_exit1`,
    `inter_door_exit` en (−312, 480, 141), con el origen de Simon en (−312, 480, 177)). Pasa con E real y rechaza
    el control sin E.
  - **Pendiente también:** sustituir la cadencia fija de las E por una comprobación, en tiempo de juego, de que el
    bloqueo ha expirado.
- **Bloqueo de 1 s tras desbloquear: confirmado en el original.** En `hl.dll`, `10048e40` escribe
  `time + DAT_101a1390` (= 1,0f) en +0x1a4 y `10048f70` rechaza el uso mientras no venza. La duración del fundido
  original (la ruta `10048cb0` pasa 0,5f y 2,0f al helper) **no** está establecida.

**Studio 3: dictamen de Codex, no apta para integrar ni publicar.**

| Punto | Dictamen | Diferencia con el original |
|---|---|---|
| A. Trazas | Corregido y comprobado | — |
| B. Cono y caja | Parcial | Ver detalle 1 |
| C. Linterna | Parcial | Ver detalle 2 |
| D. Aditivas | Corregido y comprobado en GPU | — |
| E. `corona_` | Parcial; **defecto de aislamiento confirmado** | Ver detalle 3 |
| F. `fullbright_mess` | Sin corregir | El caso con el byte `1018cb49` distinto de cero no se cubre |
| G. Lista de luces | Sin corregir | El límite de 4 está en el consumidor `100678d0`, no en el escaneo de `1005bd90` |
| Guarda de parches | Parcial | Ver detalle 4 |

**Detalle de las diferencias:**
1. **Cono y caja.**
   - **El original** primero hace el descarte radial. Luego construye cuatro planos laterales desde el origen del
     foco, girando el eje forward ±(90° − apertura/2) con una apertura por eje, más un plano lejano con
     origen + forward × radio. **No** tiene plano cercano.
   - **Mi versión** usa los ejes de la cámara, un FOV cuadrado y planos a 1 y 700 unidades, sin el descarte radial.
   - Codex reprodujo un falso positivo de mi recorte (la caja de la cámara a yaw 45°).
2. **Linterna.**
   - **El original** toma `origin` (+0xb48) y `angles` (+0xb54) de la **entidad del viewmodel**, invierte el pitch y
     calcula `origin − 13·forward + 5·right`, solo para −666. Su umbral por hueso es
     `cos((a+b)·0,3·π/180)` con rampa `(dot − umbral)/(1 − umbral)`.
   - **Mi versión** usa `RI.vforward`/`vright` de la cámara.
3. **`corona_`.**
   - `COM_RandomFloat` del renderer y el RNG del servidor comparten el mismo `lran1` del motor.
   - Con semilla 4242, dos vértices corona cambian la siguiente tirada del servidor (184442 → 438565).
   - No se ha observado un cambio de IA en la campaña, pero el renderer altera la secuencia aleatoria del juego.
4. **Guarda de parches.** Codex encontró estos huecos:
   - no hay transacción para el lote: con dos proyectos, si falla el segundo, el primero ya quedó con la serie nueva;
   - un doble fallo de `mv` deja la serie solo en `.<proyecto>.old`, y la siguiente ejecución la borra;
   - un cambio solo indexado (*staged*) no genera parche ni se verifica;
   - un traslado entre bloques con el mismo anclaje textual se acepta;
   - con `--allow-drop` no queda ningún registro durable del diff aprobado.

**Correcciones propuestas** (no ejecutadas; esperan la autorización del usuario):
1. **`extras_interactions`:** adoptar la aserción de destino de Codex (`3_exit1`, ≤ 8 unidades, `frozen=0`) y
   reintentar la E según el bloqueo en tiempo de juego, sin cadencia fija.
2. **Studio 3, `corona_`:** un generador propio del renderer (estado local, sin `COM_RandomFloat`). Probarlo con
   semilla fija para demostrar que la secuencia del servidor no cambia.
3. **Studio 3, linterna:** −13/+5 desde `origin`/`angles` de la entidad del viewmodel, con el pitch invertido y
   solo para la clave del foco. El umbral por hueso, con la fórmula del coseno de `10068254`.
4. **Studio 3, cono:** el descarte radial previo y los planos del original (aperturas por eje, plano lejano en el
   radio, sin plano cercano). Las aperturas del port salen de `r_cofspot_fov`, a falta de las del original.
5. **Guarda:**
   - preparar y verificar todo el lote antes de sustituir nada, con recuperación de todo el lote;
   - no borrar los respaldos `.old` existentes;
   - generar la serie con `git diff HEAD`, para incluir el índice;
   - guardar el diff aprobado con sus hashes cuando se use `--allow-drop`;
   - documentar el límite del anclaje textual.
6. **Sin cambios:** F (`fullbright_mess`) y G (lista de luces), hasta tener evidencia nativa.

## 10. Recomendación

1. **Pruebas corregidas:**
   - revisión de Codex de las dos versiones del worktree (`tools/e2e/changelevel_entities.mjs` y
     `extras_interactions.mjs`);
   - si las aprueba, adoptarlas en la rama principal con la autorización del usuario;
   - conservar los arneses de diagnóstico y la evidencia.
2. **Instrumentación** (`doors-diag.patch`, `hlsdk-triggers-diag.patch`): es solo diagnóstico, con `sv_cheats`. No
   se propone para la rama principal salvo que el usuario quiera dejar la traza.
3. **Bloqueo de 1 s tras el desbloqueo:** contrastar con `hl.dll` (`FUN_10048e40`) para confirmar que es del
   original. Si no lo fuera, sería un cambio de jugabilidad y requeriría decisión aparte.
4. **Studio 3:** sigue congelado a la espera del dictamen de Codex. La lista de la sección 8 queda preparada.
