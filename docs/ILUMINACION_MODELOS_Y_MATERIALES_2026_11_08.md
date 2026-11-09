# Iluminación de modelos Studio y materiales — 8 de noviembre de 2026

Auditoría de la etapa de fidelidad gráfica avanzada y corrección experimental de la luz de los modelos.
Trabajo de Claude Code tras el cierre de regresiones de Codex (`REGRESIONES_2026_11_08_CODEX.md`).

**Estado:**
- La corrección se probó primero en un árbol y una build aislados (secciones 5–7).
- El usuario autorizó la integración, junto con dos correcciones de la revisión de Codex (sección 10).
- Está en `patches/xash3d/0001-root.patch` y en `dist/` con el manifiesto `511886d6b3de`.
- Sin push ni despliegue hasta nueva autorización.

## 0. Punto de partida

- **HEAD:** local y público en `b4e0289`, sin cambios locales.
- **Manifiesto publicado:** `5f2b25229a29`, igual al de `dist/`.

## 1. Reproducibilidad (prioridad 4)

**Procedimiento** (`scripts/clean_build.sh` en `build/validation/modellight-2026-11-08/`):
1. Se copió el árbol canónico (`/root/cof-audits/audit-D3Kl5uly`) a `/root/cof-audits/clean-20261108`.
2. Se devolvió la copia a sus commits de origen (`git reset --hard` + `git clean`, solo en la copia; también en
   los submódulos).
3. Se aplicaron los cuatro parches unificados del repositorio.
4. Se compiló desde cero.

**Resultados:**
- **Parches frente al árbol canónico:** los diffs del árbol limpio y del canónico son idénticos, tanto en Xash como
  en hlsdk. El canónico no tiene nada fuera de los parches, y estos conservan el trabajo de Codex: niebla lineal,
  grises, HUD de munición, ruido y linterna.
- **Módulos compilados:** los seis son idénticos byte a byte a los publicados.

  | Módulo | SHA-256 (prefijo) |
  |---|---|
  | `xash3d.wasm` | `8a7ca0515bf81ac8` |
  | renderer | `3d0d9d88162ed8e5` |
  | cliente | `e0b2b6cc926ac1ba` |
  | servidor | `91ca7418dcdcb520` |
  | filesystem | `85e8f987a23b86f6` |
  | menú | `bbde8c4bcdfc8b61` |

## 2. Auditoría de la iluminación de modelos Studio (prioridad 1)

Análisis de solo lectura del `client.dll` con Ghidra:
- volcados `cl-modelr.txt`, `cl-mlight.txt` y `cl-mlight2.txt`;
- constantes en `cl-mfloats*.txt`.

### Qué hace el original
CoF dibuja los modelos con **su propio renderer**, no con el del motor:
- **Activación** (`FUN_1008c650`): con `gl_renderer` y `gl_modelrenderer` (ambas "1" por defecto) no llama a
  `StudioDynamicLight`/`StudioEntityLight`/`StudioSetupLighting` del `IEngineStudio`, sino a `FUN_100678d0`.
- **Muestreo** (`FUN_10065710` → `FUN_10065890`):
  - recorre el BSP desde el centro de la caja del modelo (`origin + (mins + maxs) / 2`), 256 unidades hacia
    abajo (hacia arriba con `EF_INVLIGHT`);
  - toma el **luxel más cercano** (sin interpolar) de la primera superficie con lightmap;
  - lee las capas 0, 61, 62 y 63 **sin valor de estilo de luz**.
- **Fórmula** (con `c(x)` = la curva de la luz del mundo, `FUN_100595f0`):

  | Caso | Ambiente | Difusa | Dirección |
  |---|---|---|---|
  | Con capa 61 | `a·k` | `d·k` | la de la capa 63 en el mundo: `s·(r·2−1) + t·(g·2−1) + n·(b·2−1)` |
  | Sin capa 61 | `c(capa 0)·0,5` | — | — |
  | No toca nada | `c(sv_skycolor/255)·0,25` | igual | desde arriba |

  En el primer caso, `k = c(s)/s` con `s = 2·(a + d·z)`.
- **Casos especiales** (`FUN_100678d0`):
  - **por `renderfx`:** 100 → ambiente = `brightvalue`; 101–200 → ambiente = `(renderfx − 100)/100`; 137 → cielo;
    31–40 → oscurecer; 60, 99, 123, 165 y 245 → otros casos;
  - **por modelo:** `flash1`/`flash2.mdl` → ambiente 0,15; gafas de visión nocturna, máscara de gas, `tv_frame`,
    telescopio y `bookmenu` → sin dirección ni luces dinámicas.
- **Luces dinámicas:** hasta 4. Color `c(color)·0,5`; atenuación `1 − dist²/radio²` en cada hueso; los focos usan
  además un cono.
- **Color por vértice** (`FUN_10068d70`):
  - se parte de `ambiente + difusa`;
  - se resta `difusa·(cos + l − 1)/l` si es positivo, con `l = gl_lambert` (por defecto **2**);
  - se suman las luces dinámicas;
  - se divide por el canal máximo si pasa de 1;
  - `STUDIO_NF_FLATSHADE`: `ambiente + 0,8·difusa`.
- **Dibujado** (`FUN_100687d0`): **textura × color × 2** (`GL_COMBINE MODULATE`, `GL_RGB_SCALE 2`, o
  `GL_SCALE_BY_TWO_NV` con register combiners). Es la misma escala que el mundo.

**Conclusión:** en el original, mundo y modelos comparten las mismas capas, la misma curva y la misma escala ×2.
Ninguno pasa por la tabla de gamma del motor.

### Qué hacía el port (Xash, `gl_studio.c`)
- **Luz de entrada:** un valor gris (`ambientlight`/`shadelight`) de `R_LightVec`, que suma las capas 0 + 61 + 62
  como estilos normales.
- **Color:** Lambert 1,4954, después `LightToTexGamma` (la tabla que levanta las sombras) y luces dinámicas con
  `LinearGammaTable`/`ScreenGammaTable`.
- **Combinación:** textura × color, sin ×2.

### Diferencias por punto pedido

| Punto | Original | Port antes | Estado tras la corrección experimental |
|---|---|---|---|
| 1. Simon (modelo del jugador) | Luz CoF | Luz de Xash | Mismo camino que el resto; **no medido** (no se consiguió un encuadre en tercera persona) |
| 2. Enemigos | Luz CoF | Luz de Xash | Mismo camino; **no medido** (ninguno a la vista en los encuadres) |
| 3. Glock, navaja, teléfono en mano | Luz CoF + ×2 | Luz de Xash | Corregido y medido (sección 6) |
| 4. Objetos (`env_model`) | Luz CoF + ambiente por `renderfx` 100–200 | Luz de Xash; `renderfx` 100–200 ignorados | Corregido; muestreo y `renderfx` comprobados por estadística interna, sin medir en pantalla |
| 5. Ambiente y luz dinámica | Ambiente/difusa/dirección RGB; dinámicas con curva | Gris escalar; dinámicas con tablas de gamma | Corregido (linterna incluida, por hueso) |
| 6. Superficies oscuras | Sin levantar | Sombras levantadas por `LightToTexGamma` | Corregido: el arma pasa a tener 30–90 % de píxeles por debajo de 16, como el mundo |
| 7. Gamma en modelos | Ninguna tabla; solo la curva `gl_gamma/brightness/contrast` | `LightToTexGamma` + `ScreenGammaTable` | Corregido |

### Corrección de un dato del informe anterior
La sección 3 de `RELOJ_Y_CONSOLIDACION_2026_11_08.md` afirmaba que el `config.cfg` del usuario tenía la curva neutra.
**No es así:**
- los dos `config.cfg` del juego instalado tienen `gl_contrast "1.400000"`;
- el valor por defecto del cvar es "1" y se guarda en el `config.cfg` (`FCVAR_ARCHIVE`);
- ningún archivo del juego fija 1,4.

Así que el 1,4 es un valor guardado de origen desconocido, quizá un ajuste del jugador. El port usa 1, el valor por
defecto. Hay que confirmarlo con el usuario antes de cambiarlo.

## 3. Auditoría de materiales (prioridad 2)

| Efecto del original | Pruebas en el original | En el port |
|---|---|---|
| Combinación textura × lightmap × 2 (mundo) | `FUN_10061b40`, `GL_RGB_SCALE 2` | **Funciona** (08/11) |
| Curva brillo/contraste/gamma | `FUN_100595f0` | **Funciona** (08/11) |
| Combinación textura × color × 2 (modelos) | `FUN_100687d0` | **Experimental** (este informe) |
| Relieve (`gl_bump 1`): normales `gfx/bumpmaps/<textura>.tga` | 1.219 archivos; 49–133 texturas con normales por mapa (tabla abajo) | **Aproximado**: se usa la ruta plana, de media parecida; no hay N·L por píxel |
| Especular (`gl_specular`, `gl_highspecular`): `_gloss`/`_glosshi` | Programa de fragmentos ARB (`DP3_SAT specdot.a, eyevec, lightvec`), 1 `_gloss` y 129 `_glosshi` | **Ausente** |
| Agua (`!`): shaders Cg `water_vp`/`water_fp` (refracción por desplazamiento con máscara) | `cgshaders/`; en estos mapas solo `!sewage` en `c_start` | **Aproximado** (deformación de Xash); que el original use ese shader para `!sewage` es probable, sin confirmar |
| Escala de grises (`black_fp`) | `cgshaders/` | **Funciona** (pase propio en `postfx`, pesos originales) |
| Texturas de detalle (`gl_detailtex`) | Cvar presente, **sin recursos** en el juego | No aplica |
| Transparencias (`{`, `rendermode`) | Modos estándar; aditivo de modelo con `GL_SRC_ALPHA, GL_ONE` | **Funciona** en el mundo. En modelos aditivos (`kRenderTransAdd`) se mantiene el camino de Xash: el original también los ilumina con ×2, **pendiente** |
| Chrome de modelos | Coordenadas de entorno | **Funciona** (Xash); la luz pasa por el camino CoF |
| Cielo 3D (`envpos`, `renderfx` 137) | `skybrightvalue`/`skybrightcolour*` | **Funciona** a su manera (trabajo de Codex); la luz CoF no lo toca |
| Desenfoque y viñeta (`gl_screenblur`, `gl_blurtest`) | Cvars presentes | **Pendiente** (contrato sin cerrar, según Codex) |

Texturas por mapa:

| Mapa | Texturas | Con normales | Con brillo especular | Agua | Enmascaradas |
|---|---:|---:|---:|---:|---:|
| `c_intro` | 88 | 49 | 8 | 0 | 4 |
| `c_nightmare` | 110 | 61 | 12 | 0 | 2 |
| `c_start` | 136 | 87 | 22 | 1 | 7 |
| `c_apartment1` | 210 | 133 | 30 | 0 | 7 |
| `c_apartmentsick` | 59 | 35 | 9 | 0 | 4 |

No se añadió ningún efecto moderno.

## 4. Defecto elegido y causa verificada

**Defecto:** la luz de los modelos. Afecta a todos los mapas, a las armas en mano y a todos los personajes y
objetos. Tras corregir el mundo, los modelos quedaron con la luz «antigua»: más clara, gris y con las sombras
levantadas.

**Causa:** el port usa la ruta GoldSrc del motor (`R_StudioLighting` + `LightToTexGamma`), que el original **no**
usa (`gl_modelrenderer 1`, sección 2).

## 5. Código modificado (experimental)

Diff completo: `build/validation/modellight-2026-11-08/experimental-modellight.patch`, generado por
`scripts/patch_modellight.py` sobre el árbol aislado.

- **`gl2_shim/gl2_shim.c` y `fragment.glsl.inc`:**
  - el shim, que ignoraba todo `TexEnv`, atiende ahora solo `GL_RGB_SCALE` con un uniform `uRGBScale` (por
    defecto 1, fijado al crear cada programa);
  - el color se multiplica después de la textura y se recorta a 1 antes de la niebla, como el pipeline fijo;
  - con escala 1 el resultado es idéntico al anterior;
  - ningún otro código del motor fija `GL_RGB_SCALE`.
- **`gl_opengl.c` y `gl_local.h`:** cvars nuevas.
  - `r_cof_modellight` ("1"; 0 vuelve a la luz de Xash para comparar);
  - `gl_lambert` ("2", el nombre y el valor del original);
  - `brightvalue` ("1", el del `config.cfg` original).
- **`gl_rsurf.c`:** `R_CofCurve` deja de ser `static`, para que mundo y modelos usen la misma curva.
- **`gl_studio.c`:**
  - **Funciones nuevas:** `R_CofModelLightPoint` (muestreo), `R_CofModelSetupLighting` (`renderfx`, `flash1`/`2` y
    luces dinámicas por hueso) y `R_CofModelLighting` (color por vértice).
  - **Escala por malla:** ×2 en la textura, salvo las mallas `FULLBRIGHT` o aditivas, que llevan escala 1 con su
    color ya duplicado.
  - **Exclusiones** (siguen con el camino de Xash): el cielo `envpos`, `renderfx` 137, la concha brillante y el
    modo aditivo de entidad.
  - **Diagnóstico:** el comando `cof_model_light` muestra si está activa y los contadores de muestreo (encontradas
    / con capa 61 / cielo / `renderfx`) y los valores del último modelo.

**Fuera de alcance:** física, daño, inventario, IA, entidades y guardados. El cambio está solo en el renderer.

**Compilación:**

| Módulo | Antes | Después |
|---|---|---|
| Renderer | `3d0d9d88…` | `e6a0e59bce6c52d6…` |
| `xash3d.wasm` | `8a7ca0515bf81ac8` | igual |
| Demás módulos | — | iguales |

**Build aislada:**
- `/root/cof-audits/modellight/dist`;
- combinada con lo publicado en `/root/cof-audits/modellight/merge`, manifiesto `7befffc1bd8c`;
- solo cambian `packs/engine.data`, su `.gz`, `packs/engine.js`, `sw-manifest.js` y `sw.js`.

## 6. Mediciones

`tools/e2e/model_light.mjs` (Chromium + SwiftShader, 800×600):
- misma partida, mismo encuadre y juego en pausa;
- compara `r_cof_modellight 1` con `0`;
- máscaras por diferencia con `r_drawviewmodel 0` (arma en mano) y `r_drawentities 0` (otros modelos);
- ruido de película desactivado solo durante la captura;
- deriva entre dos capturas iguales: 0 (salvo 0,7 en una captura inicial).

Arma en mano: brillo medio (0–255) / porcentaje de píxeles por debajo de 16. «Mundo» es el resto del encuadre.

| Mapa · arma · encuadre | Luz CoF | Antes | Mundo | Arma/mundo: CoF / antes |
|---|---|---|---:|---|
| `c_apartment1` · Glock · inicio | 22,8 / 29 % | 42,6 / 10 % | 25,1 | 0,91 / 1,70 |
| `c_apartment1` · Glock · giro | 17,9 / 52 % | 34,8 / 14 % | 29,0 | 0,62 / 1,20 |
| `c_apartment1` · navaja · inicio | 17,1 / 55 % | 31,1 / 10 % | 20,9 | 0,82 / 1,49 |
| `c_apartmentsick` · Glock · inicio | 17,3 / 38 % | 34,9 / 5 % | 8,2 | 2,12 / 4,27 |
| `c_apartmentsick` · navaja · inicio | 11,5 / 90 % | 23,8 / 21 % | 5,8 | 1,97 / 4,09 |
| `c_start` · teléfono · giro | 4,1 / 100 % | 23,8 / 52 % | 8,8 | 0,46 / 2,69 |
| `c_start` · teléfono · otro giro | 5,8 / 96 % | 33,8 / 8 % | 13,4 | 0,43 / 2,52 |

- **Arma:** la luz CoF la oscurece entre un 47 y un 83 %, y la deja en la escala del mundo del mismo encuadre.
  Antes estaba entre 1,2 y 4,3 veces por encima.
- **Teléfono:** «antes» y «CoF» coinciden con la navaja en la misma escena. Puede que el cambio de arma no
  llegara a hacerse; se descarta como dato del teléfono.
- **Muestreo:** todas las llamadas encontraron superficie con capa 61. En `c_apartmentsick` la mitad cayeron al
  cielo (`sv_skycolor`), como haría el original desde ese punto.
- **`renderfx` 100–200:** entraron en el cálculo de 25–94 modelos por fotograma en `c_apartment1`, `c_apartmentsick`
  y `c_nightmare`.
- **Sin medir:**
  - `c_intro`: la cámara de la cinemática no dibuja modelos con esta luz (0 llamadas) y no tiene arma;
  - `c_nightmare`: los modelos están iluminados (hasta 900 muestreos con capa 61) pero ninguno entra en el
    encuadre, y en el preludio no hay arma;
  - Simon y los enemigos: los giros automáticos no los ponen a la vista y la tercera persona queda tras una reja.

**Capturas:**
- en `build/validation/modellight-2026-11-08/measure/`: `*-cof.png` frente a `*-previous.png`;
- ejemplo: `measure-164559/c_apartment1-weapon_glock-spawn-cof.png`.

**Qué demuestran y qué no:**
- esto es **comparación interna** entre el port anterior y la candidata, junto con la evidencia de la DLL;
- **no** es una comparación con el juego nativo: no hay capturas nativas equivalentes;
- no se declara fidelidad visual por verse más oscuro.

## 7. Regresiones

Build experimental, manifiesto `7befffc1bd8c`, renderer `e6a0e59b…`:

| Prueba | Resultado |
|---|---|
| 18 regresiones de Codex, contratos sin cambios | **18/18 PASS** (`modellight/regressions-172047`) |
| `clock_backwards.mjs` | PASS (`level loaded at 2.02 sec`) |
| `fog_entities.mjs` | PASS |
| `flashlight_probe.mjs` (`COF_EXPECT_FIXED`, `COF_PERSISTENCE`) | PASS: pared 45,9 → 56,0 con la linterna, `r_dynamic 0` 45,8, recarga 56,0, sin errores |

Los valores de la linterna sobre el mundo son iguales a los de la build publicada, como se esperaba: el cambio solo
afecta a los modelos.

**Build integrada** (manifiesto `511886d6b3de`, renderer `f440e4a1…`, con las correcciones de la sección 10):

| Prueba | Resultado |
|---|---|
| 18 regresiones de Codex | **17/18** en la primera pasada (`regressions-185725`) |
| `extras_interactions`, fallo de la primera pasada | Tras guardar y cargar, las tres pulsaciones de E no movieron a Simon (`origin` igual) |
| `extras_interactions`, dos repeticiones | **PASS** las dos (`rerun-extras-191743`, `rerun-extras-191815`) |
| `clock_backwards.mjs` | PASS |
| `fog_entities.mjs` | PASS |
| `flashlight_probe.mjs` | PASS: 45,9 → 56,0, `r_dynamic 0` 45,8, recarga 56,0 |
| `model_light.mjs` | Mismos valores que la build experimental: Glock 22,8 frente a 42,6 al empezar `c_apartment1`; navaja 14,1 frente a 28,6 |

Sobre el fallo de `extras_interactions`:
- se trata de lógica del servidor y de entrada de teclado, que el cambio (solo en el renderer) no toca;
- la misma prueba pasó 18/18 con la build experimental;
- se considera **intermitente**, con la causa sin demostrar; su registro se conserva en
  `build/validation/modellight-2026-11-08/final/`.

La escena «simon» (`thirdperson`) de `model_light.mjs` no es fiable: la cámara no queda quieta entre capturas y no
encuadra a Simon. Sus valores no se usan.

## 8. Diferencias pendientes

- **Luces dinámicas de modelos:** el original usa su propia lista (`FUN_1005bd90`), con el foco del jugador
  colocado a −13 hacia delante y +5 a la derecha y un cono por ángulo. El port usa las `elights` del motor y el
  foco de `R_CofSpotFactor` en cada hueso.
- **Casos especiales sin portar:** `renderfx` 31–40, 60, 99, 101, 123, 165, 167 y 245, y los modelos de menú y
  gafas. Ninguno aparece en los cinco mapas salvo 101–200.
- **Capa 61 sin 63:** el original lee un valor sin inicializar. Aquí se usa z = 0; no se ha visto en los mapas.
- **Modelos aditivos de entidad:** siguen con el camino de Xash.
- **Fullbright:** el original no lo trata en `FUN_10068d70`; se mantiene a pleno brillo como Xash. Sin verificar.
- **Validación visual nativa:** falta en las cinco escenas. Requiere ejecutar el juego original con la misma
  posición, orientación, resolución y fase.
- **Materiales:** relieve por píxel, especular (`_glosshi`), agua Cg, desenfoque y viñeta.
- **`gl_contrast`:** decidir si el 1,4 del `config.cfg` es del jugador (sección 2).

## 9. Riesgos de integración

- **Shim compartido:** el uniform `uRGBScale` entra en todos los programas. Con 1 el resultado es el mismo;
  conviene repetir las pruebas de niebla, grises y HUD. `TexEnv` sigue ignorando el resto.
- **Más oscuro:** las armas y objetos quedan más oscuros. Los jugadores lo compensarán con Opciones → Brillo, que
  también afecta a los modelos porque comparten la curva.
- **Linterna sobre modelos:** cambia su intensidad, porque ahora pasa por la curva ×0,5 y el ×2. Se debe
  confirmar a ojo.
- **Integración:** aplicar `patch_modellight.py` al árbol canónico y exportar con `patches.sh export`. Antes,
  comparar las líneas `+/-` y recompilar limpio.
- **Codex:** si trabaja en `gl_studio.c` o en el shim, coordinar antes de integrar.

## 10. Revisión de Codex e integración

Codex revisó por su cuenta la candidata `7befffc1bd8c` (rama `codex/studio-render-audit-20261108`, sin tocar las
fuentes de Claude). Antes de integrar se comprobaron sus hallazgos en el `client.dll`.

### Correcciones incorporadas
- **La gamma estaba invertida**:
  - **Qué hace el original:** en `FUN_100595f0`, `x` va a XMM0 y `gl_gamma` a XMM1, ambos convertidos a double y
    sin invertir, y se llama a `pow` (`100ff550`, base XMM0, exponente XMM1).
  - **Qué hacía el port:** `R_CofCurve` usaba `pow(x, 1/gl_gamma)` desde la luz del mundo del 08/11.
  - **Corrección:** ahora usa `pow(x, gl_gamma)`. Con `gl_gamma 1`, el valor por defecto, el resultado no cambia;
    sí cambia si alguien sube o baja `gl_gamma`.
  - **A tener en cuenta:** el defecto venía de la luz del mundo, no del cambio de modelos.
- **`renderfx` 101 y 167:** colores fijos del original (constantes en `0x1014dec0` y `0x1014deb0`).

  | `renderfx` | Ambiente | Difusa |
  |---|---|---|
  | 101 | (0,1; 0,1; 0,1) | (0,15; 0,1; 0,1) |
  | 167 | (0,1; 0,1; 0,1) | (0,1; 0,1; 0,1) |

  Ningún modelo colocado en los 11 mapas los usa.
- **`tools/e2e/test_cof_lighting.py`** (prueba de Codex): ahora acepta `R_CofCurve` sin `static`, porque la curva
  se comparte con `gl_studio.c`. Sus 11 casos pasan con el renderer integrado.

### Pendiente, según la revisión de Codex
- **Tratamientos por nombre de textura** (`10065ef0`): `fullbright`, `fullbright_mess`, `corona_`, guantes y mangas.
- **Casos de modelos especiales**: `bookmenu`, máscara de gas, telescopio y luces del viewmodel.
- **Luces dinámicas:** faltan contratos de la selección y el orden de las cuatro luces y de los conos.

La implementación general de Studio **no** equivale a todos esos casos.

### Contrato de materiales para la siguiente etapa (Codex)
- **Carga** (`10069410`): `gfx/bumpmaps/<textura>.tga`, `_gloss.tga` y `_glosshi.tga`. Las normales llevan mipmaps
  renormalizados (`1006a310`); el gloss, mipmaps normales.
- **Especular:** las rutas ARB originales están embebidas en `1018f858` y `1018faf0`.
  - **Calidad baja:** potencia 4.
  - **Calidad alta:** half-vector normalizado y potencia 16, multiplicada por la máscara gloss.
- **Falta** cerrar las pasadas y los espacios de coordenadas. No sustituirlo por materiales modernos (PBR).

### Build integrada
- **Árbol canónico:** se comprobó que era igual a los parches y se le aplicó `patch_modellight.py` completo.
- **Parche exportado:** 310 líneas nuevas. Solo desaparecen las tres que debían cambiar: la gamma invertida, su
  comentario y el `static` de `R_CofCurve`. hlsdk no cambia.
- **Módulos:** renderer `f440e4a16db8083f…`; `xash3d.wasm` igual (`8a7ca0515bf81ac8`); cliente, servidor,
  filesystem y menú sin cambios.
- **`dist/`:** solo cambian `packs/engine.data`, su `.gz`, `packs/engine.js`, `sw-manifest.js` y `sw.js`.
  Manifiesto `511886d6b3de`.
