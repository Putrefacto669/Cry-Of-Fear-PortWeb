# Continuación de render — Claude Code, 8 de noviembre de 2026

Etapa autónoma de fidelidad gráfica y estabilidad, en paralelo a Codex.

**Estado de los cambios de render:**
- Se probaron en un árbol y una build aislados.
- El usuario autorizó la integración, que está en `patches/` y `dist/` (sección 9).
- Sin push ni despliegue hasta nueva autorización.

**Cambios en el repositorio:**
- `tools/wsl/patches.sh` (guarda) y su prueba `tools/wsl/test_patches_guard.sh`;
- una opción nueva en `tools/e2e/model_light.mjs`;
- este informe;
- la evidencia en `build/validation/claude-render-2026-11-08/`.

## 1. Estado inicial

- **HEAD:** local y público en `598da25`, el commit de documentación de Codex «Valida Studio en Pages».
- **Árbol:** sin cambios pendientes.
- **Manifiesto:** local y público `511886d6b3de`; renderer publicado `f440e4a16db8083f…`.
- **Árbol canónico** (`/root/cof-audits/audit-D3Kl5uly`): idéntico a `patches/`, con 0 líneas nuevas y 0 perdidas.
- **Codex:** su validación independiente (`VALIDACION_STUDIO_PUBLICADA_2026_11_08.md`) da 14/14 casos numéricos y
  Chromium/Firefox satisfactorios sobre lo publicado.

## 2. Reproducibilidad: guarda contra pérdida de parches (prioridad 4)

**Problema:** `patches.sh export` borraba `patches/` y lo reescribía desde el árbol, sin comprobar nada. Un árbol
desfasado o al que le faltara un parche suelto perdía trabajo sin aviso.

**Cambio** (`tools/wsl/patches.sh`):
- `export` genera primero en una carpeta temporal.
- Compara las líneas añadidas (`+`) con las de los parches actuales, como multiconjunto (`comm`).
- Si alguna desaparece, **no toca `patches/`**, la lista y termina con error.
- `check` solo informa.
- `export --allow-drop` permite un reemplazo intencionado después de revisarlo.

**Prueba** (`tools/wsl/test_patches_guard.sh`, con un repositorio git temporal): **PASS**. Comprueba que:
- rechaza un árbol que perdió una línea;
- deja `patches/` intacto;
- `check` detecta la pérdida;
- acepta un árbol que añade cosas;
- `--allow-drop` sustituye.

**Comprobación real:**

| Árbol | Líneas que desaparecerían | Resultado |
|---|---|---|
| Canónico | 0 | Se acepta |
| `~/cof-web` (el desfasado de octubre) | 934 en Xash y 889 en hlsdk | El export se cancela |

**Árbol aislado de esta etapa:**
- `/root/cof-audits/claude-render-20261108`, copia del canónico (`check`: 0/0);
- compilación en su propia carpeta `build/`;
- dist en `claude-render-20261108/dist`, combinada sobre el `dist/` publicado en `…/merge`.
- No se usa el árbol de Codex ni sus salidas.
- El proyecto de Ghidra del repositorio estaba bloqueado (en uso, probablemente por Codex). Se trabajó sobre una
  **copia** en el directorio temporal, en modo `-readOnly`, sin tocar el bloqueo.

## 3. Iluminación Studio (prioridad 1)

### 3.1 Evidencia nueva del original (`client.dll`)

**`FUN_10065ef0`** (dibujado de mallas):
- **Texturas `*fullbright*`:** si el nombre contiene `fullbright` y la cvar `cof_fullbrighttextures` (valor por
  defecto **"0.5"**, registrada en `FUN_10060690`) es distinta de 0, el color de vértice es ese valor, sin luz.
  Con el ×2 del modelo, eso da la textura a pleno brillo.
- **`corona_`:** suma un aleatorio de ±0,1 por vértice.
- **`fullbright_mess`:** igual, salvo si un indicador (`DAT_1018cb49`) está activo. En el binario no se encontró
  quién lo escribe.
- **`sleeve`/`glove`** en el modelo del jugador: dividen el color por un factor temporal. Sin portar.
- **Ropa de Simon:** `hoodie_grey`, `hoodie_blood`, `jeans`, `head_face`, `fingers` y `glove` cambian de textura
  según la ropa elegida. Es el sistema de ropa, no luz.
- **`renderfx` 92/93/94:** no dibujan el modelo a partir de cierta distancia. Sin portar.

**`FUN_1005bd90`** (luces dinámicas de un modelo):
- **Lista:** recorre las 32 luces propias del cliente en su orden y las añade al modelo hasta 4 (el corte lo pone
  `FUN_100678d0`).
- **Condiciones de cada luz:**
  - estar viva y tener radio;
  - estar a una `distancia ≤ radio` del origen;
  - si es un foco, su cono debe tocar la caja del modelo;
  - una traza **solo contra el mundo, de punto** (`EV_SetTraceHull(2)`, flag 8), desde el origen del modelo
    hasta la luz, con `!allsolid` y `fraction ≥ 1`.
- **La linterna del propio jugador** (claves −666/−665) entra siempre en su modelo.

**Inventario de modelos** (779 `.mdl` del juego):

| Tipo | Texturas | Ejemplos |
|---|---:|---|
| `*fullbright*` | 79 | Fogonazos (`flash1`/`flash2`), lámparas, `developer_commentary`, la linterna de `player.mdl` |
| `fullbright_mess` | 9 | Las **pantallas del teléfono**: `v_mobile.mdl` (7), `mobileprop`, `intro_customphone` |

Ningún modelo usa el bit `STUDIO_NF_FULLBRIGHT`.

### 3.2 Divergencias comprobadas en el port publicado (`511886d6b3de`)

| Divergencia | Original | Port publicado |
|---|---|---|
| Texturas `*fullbright*` | Sin luz, color 0,5 × 2 | Iluminadas como el resto: la pantalla del teléfono queda gris oscura |
| Elección de luces dinámicas | Distancia ≤ radio, visibilidad por traza, las 4 primeras en orden | Las 4 «más fuertes» de Xash, incluidas luces fuera del radio y tras paredes |

No se cambió la fórmula de luz reconstruida (secciones 2 y 10 de `ILUMINACION_MODELOS_Y_MATERIALES_2026_11_08.md`):
no hay divergencia comprobada en ella.

### 3.3 Cambios implementados (experimentales)

Diff completo: `build/validation/claude-render-2026-11-08/render-studio2.patch` (+60/−5), generado por
`scripts/patch_studio2.py`.

- **`gl_opengl.c` y `gl_local.h`:** cvar `cof_fullbrighttextures` ("0.5", 0 desactiva).
- **`gl_studio.c`, malla con `*fullbright*`:**
  - todos sus vértices toman ese valor; `corona_` suma ±0,1 (`COM_RandomFloat`);
  - se dibuja con el ×2;
  - si la malla es aditiva, se dobla su color y lleva escala 1;
  - `fullbright_mess` se trata igual, porque el indicador que lo desactiva no tiene escritor conocido.
- **`gl_studio.c`, luces dinámicas** (`R_CofModelSetupLighting`):
  - selección propia sobre `tr.elights` en su orden, hasta 4;
  - `distancia ≤ radio` (salvo el foco CoF, cuyo alcance es su cono de 700 u en `R_CofSpotFactor`);
  - traza `CL_TraceLine(origen, luz, PM_WORLD_ONLY)` con `!allsolid && fraction ≥ 1`;
  - la linterna del jugador local entra siempre en su modelo (`RP_LOCALCLIENT`);
  - respeta `r_dynamic 0`.
- **Diagnóstico:** `cof_model_light` añade los contadores `fullbright`, `lights`, `far` y `hidden`.

**Fuera de alcance:** física, IA, daño, armas, inventario y guardados. El cambio está solo en el renderer.

### 3.4 Compilación

| Módulo | Publicado | Aislado |
|---|---|---|
| Renderer | `f440e4a1…` | `9e792b0ef8b84fe6…` |
| `xash3d.wasm` | `8a7ca0515bf81ac8` | igual |
| Cliente, servidor, filesystem, menú | — | iguales: se copiaron los del canónico porque hlsdk no cambia |

**Build combinada:**
- manifiesto `799a3b030e11`;
- solo cambian `packs/engine.data`, su `.gz`, `packs/engine.js`, `sw-manifest.js` y `sw.js`.

### 3.5 Mediciones

`tools/e2e/model_light.mjs` admite ahora:
- `COF_TOGGLE="cvar on off"`, para comparar cualquier cvar en el mismo fotograma pausado;
- `COF_PRE`, un comando previo (por ejemplo `flashlight`).

**Teléfono en mano** (`c_apartment1`, 800×600, `cof_fullbrighttextures 0,5` frente a `0`, máscara del arma).
Brillo medio (0–255) / porcentaje de píxeles por debajo de 16:

| Encuadre | Fullbright (original) | Iluminado (publicado) | Mundo |
|---|---|---|---:|
| Inicio | 35,8 / 64 % | 13,3 / 68 % | 25,4 |
| Giro 1 | 38,8 / 61 % | 16,1 / 64 % | 29,4 |
| Giro 2 | 38,8 / 56 % | 20,4 / 58 % | 19,0 |
| Giro 3 | 36,9 / 63 % | 11,6 / 69 % | 23,1 |

- **Capturas:** `measure/measure-195407/c_apartment1-weapon_mobile-spawn-{cof,previous}.png`. Con la corrección, la
  pantalla del SMS y el teclado naranja brillan y se leen; en la versión publicada la pantalla queda gris apagada.
- **Contadores:** 52–120 mallas `fullbright` por ventana de medición. En `c_start`, al empezar, no hay arma en mano.

**Linterna y selección de luces** (`COF_PRE=flashlight`, navaja en mano con el teléfono en el inventario):
- con la linterna encendida, la selección aceptó entre 20 y 306 luces y descartó por la traza entre 40 y 264 por
  ventana, según el encuadre; ninguna por distancia;
- el efecto en pantalla **no quedó medido**:
  - con el juego en pausa, `r_dynamic 1/0` no cambia ni el mundo;
  - en el arma en mano la linterna apenas actúa, porque el foco del port sale del ojo y el arma queda casi fuera de
    su cono. El original lo coloca 13 u por detrás y 5 a la derecha (`FUN_100678d0`);
- no se declara mejora visual por la selección de luces, solo correspondencia con el código original.

## 4. Materiales (prioridad 2): auditoría

| Punto | Port (Xash3D + gl2_shim, WebGL 2) |
|---|---|
| 1. Rutas | Mundo: textura × lightmap con la pasada ×2 (`gl_rsurf.c`). Modelos: color por vértice × textura con `GL_RGB_SCALE` emulado. No hay ruta de relieve. Existen las texturas de detalle de Xash (`R_RenderDetails`), sin recursos en CoF |
| 2. Atributos | El shim solo tiene posición, color, `texcoord0` y `texcoord1`. El código GLSL de `ATTR_NORMAL` existe pero no hay flag que lo active. No hay tangentes |
| 3. Normales disponibles | `gfx/bumpmaps` (1.219 archivos, 486 MiB) **no llega al navegador**: `tools/stage_map.py` lo excluye a propósito. Los BSP tienen 35–133 texturas con normales por mapa (sección 3 del informe de modelos) |
| 4. Shader | Programas generados por el shim (pipeline fijo emulado). Sin N·L ni especular por píxel |
| 5. Luz | Lightmap combinado (capas 61/62/63 resueltas en la CPU por la ruta plana). No hay texturas separadas de ambiente, difusa y dirección |
| 6. Diferencias demostradas | Ausentes: relieve por píxel y especular (bajo: potencia 4; alto: half-vector, potencia 16 × gloss; contrato de Codex). Aproximado: agua (Cg en el original). Corregido en esta etapa: el material excepción `*fullbright*` de modelos |

**Por qué no se implementó el relieve ahora:** el defecto mejor documentado y más acotado de materiales era la
excepción `*fullbright*`, y está hecho. El relieve y el especular necesitan:
1. empaquetar normales y gloss por mapa, con su coste de descarga (hoy excluidos por tamaño);
2. subir aparte las capas 61/62/63 o la dirección por luxel;
3. un programa propio con tangentes por cara;
4. cerrar las pasadas originales (las rutas ARB de `1018f858`/`1018faf0`, según Codex).

Es un cambio general del renderer que afecta a todos los mapas: requiere decisión y pruebas aparte.

## 5. Validación visual (prioridad 3)

- **Escenas reproducibles:** `model_light.mjs` registra mapa, origen del jugador (`cof_inspect !player`), escena
  (inicio o giros hacia el monstruo o `env_model` más cercano), cvars de luz (`r_cof_lightmaps`, `gl_brightness`,
  `gl_contrast`, `gl_lambert`), contadores de luz de modelos y una captura PNG de cada variante. La resolución es
  800×600 (Chromium sin interfaz, SwiftShader). Las mediciones de la tabla salen de las lecturas del framebuffer.
- **Limitaciones:**
  - `c_intro` (cinemática) y `c_nightmare` (preludio) no tienen arma en mano;
  - Simon y los enemigos siguen sin entrar en encuadre: la tercera persona no es estable en pausa;
  - **no se ejecutó el juego original**, así que no hay equivalencia visual con el nativo. Todas las comparaciones
    son port frente a port, más la evidencia del binario.

## 6. Regresiones (prioridad 5), build aislada `799a3b030e11`

| Prueba | Resultado |
|---|---|
| `test_cof_lighting.py` (11 casos de Codex, renderer aislado) | OK |
| `test_patches_guard.sh` | PASS |
| `pointer_lock.mjs` | OK |
| `clock_backwards.mjs` | PASS |
| `fog_entities.mjs` | PASS |
| `flashlight_probe.mjs` (`COF_EXPECT_FIXED` + `COF_PERSISTENCE`) | PASS: pared 45,9 → 55,9; `r_dynamic 0` 45,9; recarga 56,0 |
| 18 regresiones de Codex | **17/18**: `changelevel_entities` falló por un tiempo de espera de 30 s esperando la respuesta a un comando de consola durante el cambio `c_start` ↔ `c_start2`. Repetida dos veces: PASS ambas |

Esas 18 regresiones cubren campaña, managers, sonido, cámaras, trenes, envpos, botones, changelevel,
persistencia, callbacks, extras, puñetazo del teléfono, doble mano, HUD de munición y mezcla de voces.

**Intermitencias abiertas**, con causa sin identificar y sin declararlas resueltas:
- `changelevel_entities`: tiempo de espera tras el cambio de nivel (esta etapa);
- `extras_interactions`: tras guardar y cargar, la E no movió a Simon (etapa anterior).

Los registros de ambos fallos están en `build/validation/`.

## 7. Limitaciones

- La selección de luces dinámicas sigue el código, pero su efecto en pantalla no se ha medido.
- El foco del jugador está en la posición del port, no en la del original (−13 hacia delante, +5 a la derecha).
- Sin portar:
  - el indicador de `fullbright_mess` (`DAT_1018cb49`);
  - `sleeve`/`glove` temporal;
  - `renderfx` 92/93/94, 31–40, 60, 99, 123, 165 y 245;
  - los modelos de menú y gafas.
- Materiales: relieve, especular, agua Cg, desenfoque y viñeta, pendientes.
- `gl_contrast 1.4` del `config.cfg` original: sigue pendiente de que el usuario confirme si lo puso él.

## 8. Recomendaciones para integración

1. **Integrar primero las texturas `*fullbright*`:** corrigen un defecto visible (la pantalla del teléfono) con
   evidencia directa. La selección de luces puede ir en el mismo paso o esperar a medirse con la linterna en
   movimiento.
2. **Procedimiento:**
   - aplicar `scripts/patch_studio2.py` sobre el canónico, que ya tiene `patch_modellight.py`;
   - ejecutar `patches.sh check`: deben salir +60 líneas y 0 perdidas, salvo las 5 sustituidas, que exigen
     `--allow-drop`;
   - exportar, compilar limpio y combinar sobre el `dist/` publicado.
3. **Integrar la guarda de `patches.sh`** ya, porque no cambia el juego.
4. **Antes de publicar:** repetir las 18 regresiones y `model_light.mjs` (teléfono) sobre la build integrada.

## 9. Integración

- **Árbol canónico** (`audit-D3Kl5uly`): se comprobó con `check` (0/0) y se le aplicó `patch_studio2.py`.
  `gl_opengl.c`, `gl_local.h` y `gl_studio.c` quedaron idénticos a los del árbol aislado probado.
- **`patches.sh check` antes de exportar:** 63 líneas nuevas y 5 que desaparecen, exactamente las sustituidas: el
  comentario y la selección de luces anteriores, la estructura de estadísticas y su `printf`.
- **Export** con `--allow-drop`, revisado. `check` posterior: 0/0. hlsdk sin cambios.
- **Compilación:** renderer `9e792b0ef8b84fe6…`, idéntico al probado; `xash3d.wasm` `8a7ca0515bf81ac8`, igual.
- **`dist/`:** manifiesto `7d2f04e9649f`. Solo cambian `packs/engine.data`, su `.gz`, `packs/engine.js`,
  `sw-manifest.js` y `sw.js`.
  - Los cinco módulos de `engine.data` son byte a byte los de la build probada (`799a3b030e11`).
  - El manifiesto difiere solo por la disposición del paquete, no por su contenido.
  - Por eso las pruebas de la sección 6 aplican a esta build.

## PENDIENTE DE REVISIÓN POR CODEX

Antes de publicar, conviene validación independiente de:

1. **Texturas `*fullbright*`** (`FUN_10065ef0`):
   - que `cof_fullbrighttextures` valga "0.5" (`DAT_1014cc24`);
   - que `FUN_100d3cf0` sea `strstr` sensible a mayúsculas;
   - qué escribe `DAT_1018cb49` (el indicador de `fullbright_mess`): si está activo en alguna fase, el teléfono
     debería iluminarse normal en ella;
   - que la ruta aditiva (flag 0x20) del original también use ese color.
2. **Selección de luces** (`FUN_1005bd90`):
   - el orden de su lista de 32 frente al de `tr.elights` del port;
   - que la traza sea de punto y solo contra el mundo (`EV_SetTraceHull(2)` + flag 8 en `+0x3c`);
   - la prueba de cono y caja (`FUN_10084e40`/`FUN_10084b30`), no portada para el foco CoF;
   - la posición original de la linterna del jugador (−13 forward, +5 right) y su cono `(a+b)·0,3`.
3. **Guarda de `patches.sh`:** revisar que el criterio de «líneas añadidas como multiconjunto» no dé falsos
   negativos con líneas `+` repetidas o movidas entre archivos de la misma serie.
4. **Intermitencias:** buscar la causa común de `changelevel_entities` (tiempo de espera de 30 s) y
   `extras_interactions` (E sin efecto tras cargar). Las dos son de lógica, consola o entrada, no del renderer, pero
   no está demostrado.
5. **Medición:** confirmar con instrumentación de dibujo propia que las mallas `fullbright` llegan al shader con
   escala 2 y color 0,5, y que la escala vuelve a 1 tras cada malla.
