# GL_INVALID_OPERATION en el preludio: partículas del motor con arrays de cliente en WebGL

Estado: **causa demostrada, corregida en `gl2_shim` y validada** (30 de octubre de 2026). El
arreglo está en `patches/xash3d/0001-root.patch`; el `dist/` publicado todavía no lo incluye.
Evidencia y scripts: `build/validation/glerr-2026-10-30/`.

## 1. Problema

En el preludio (`c_nightmare`) la consola del motor mostraba muchas veces por segundo
`OpenGL Error: GL_INVALID_OPERATION (at .../ref/gl/gl_rmain.c:1015)`. Se había atribuido a la cámara
de fotos en la mano. Un error GL en cada frame indica que una llamada de dibujo se rechaza, así que
algo deja de verse. Además, el registro pierde utilidad para depurar.

## 2. Método

1. **Reproducir sin modificar el nivel.** Se usa la partida real: la cámara la entrega el propio
   mapa y ninguna entidad se toca. El jugador se coloca con los comandos de depuración del port
   (`noclip`, `cof_goto`, `cof_face`).
2. **Traza WebGL.** Se envuelven los métodos del contexto WebGL 2 y se consulta `getError()` solo
   mientras la traza está armada; consultarlo tras cada llamada bajaba el juego a 3 frames en 15 s.
   Así se obtiene la llamada exacta y su pila (`glerr_trace.mjs`).
3. **Detector de lecturas fuera de rango** (`glquads.mjs`). En cada `drawElements` se mira, para
   cada atributo de vértice activo, el tamaño del buffer enlazado. Un buffer de menos de 16 bytes
   no puede contener ni un vértice, así que el dibujo lee fuera de rango. El detector funciona
   también con SwiftShader, que no informa del error, y permite medir con pruebas automáticas.
4. **Biseccionar con variables del motor**: `r_drawentities`, `r_drawparticles` y ocultar
   entidades concretas.
5. **Corregir, recompilar** con `build_engine.sh` y `package.sh` en una distribución aparte
   (`dist-glfix`), **y repetir** las mismas mediciones y la suite de regresión.

## 3. Hechos observados

- **La cámara no es la causa.** Con la cámara en la mano, en la sala inicial y con juego normal,
  hay 0 errores: 60 frames en SwiftShader y 2249 dibujos en GPU real. El error aparece en otras
  zonas del edificio de las X; el punto de reproducción usado es (-620, 800, 40), mirando a `spott1`.
- **Depende del backend.** Con ANGLE Direct3D 11 (NVIDIA RTX 4060, panel del navegador de la app)
  hay 111 errores en 8 s y 138 en 3 s en ese punto. Con SwiftShader (pruebas sin interfaz) hay 0
  errores, pero el detector confirma que el dibujo es igual de inválido.
- **Llamada exacta**: `drawElements(TRIANGLES, 972, UNSIGNED_SHORT, 0)`, invocada desde
  `_glDrawRangeElements` de Emscripten dentro del renderer (`libref_gles3compat`).
- **Estado de WebGL en el fallo:**
  - los tres atributos (`inPosition`, `inColor`, `inTexCoord0`) apuntan a buffers de **1 byte**;
  - el índice máximo es 647, es decir, 648 vértices = 162 quads;
  - el buffer de índices mide 98 304 bytes;
  - no hay framebuffer de destino propio.
- **Origen: las partículas del motor.**

  | Variable cambiada en el punto de reproducción | Buffers demasiado pequeños |
  |---|---|
  | `r_drawparticles 0` | 0 de 1826 |
  | `r_drawparticles 1` | 155 de 1860 |
  | `r_drawentities 0` (las partículas también desaparecen) | 0 de 1958 |

  Ocultar `spott1` (`effects 128`) o cambiar su `rendermode` no cambia nada (140–166 por fase).
  `CL_DrawParticles` (`ref/gl/gl_rpart.c:48`) dibuja todas las partículas activas en un solo
  `pglBegin( GL_QUADS )` con la textura `*particle`. Lo llama `CL_DrawEFX` (`engine/client/cl_efx.c`).
  En `gl_rmain.c` del árbol actual, la comprobación que sigue a `CL_DrawEFX` está en la línea 1020.
  El 1015 del enunciado corresponde con toda probabilidad a una versión anterior del archivo. Esto es
  una inferencia, no se ha verificado.
- **Hipótesis descartadas por medición:**
  - la cámara;
  - la entidad `spott1`, que el registro temporal del shim mostraba como "entidad actual" (era un
    valor que se había quedado de un dibujo anterior);
  - las superficies de agua (`EmitWaterLightPolys`): ninguna entidad del mapa usa texturas `!`;
  - `cl_draw_particles`, que **no existe** en Xash (la consola responde "Unknown command"). La
    variable real es `r_drawparticles` (FCVAR_CHEAT).

## 4. Causa demostrada

El fallo surge de combinar el emulador de modo inmediato de Xash con la emulación de arrays de
cliente de Emscripten:

1. En WebGL, `gl2_shim` arranca con la configuración `ASYNC MAP CYCLE=1 VER=300`: sin VAO y sin
   streaming incremental. Los atributos se pasan como **punteros a memoria del cliente**.
2. Si un `GL_QUADS` tiene más de 4 vértices, `GL2_FlushPrims` lo dibuja con el buffer de índices
   compartido `triquads_ibo` (0 1 2 0 2 3…) y `glDrawRangeElements`.
3. En Emscripten 4.0.11, `glDrawRangeElements` **ignora el rango** y llama a `glDrawElements`.
4. Con un buffer de índices enlazado, Emscripten no puede leer los índices para saber cuántos
   vértices hacen falta: deja `vertexes = 0`. Entonces
   `preDrawHandleClientVertexAttribBindings(0)` copia 0 bytes en el buffer temporal, que mide
   `1 << 0` = 1 byte.
5. WebGL lee 648 vértices de un buffer de 1 byte. D3D11 (ANGLE) lo rechaza con
   `GL_INVALID_OPERATION`. SwiftShader no lo rechaza, pero tampoco tiene datos válidos.

Conclusión: **los lotes de partículas de más de una partícula nunca se dibujaban bien en la web.**
En D3D11 se descartaban con error; en otros backends se dibujaban sin vértices válidos. Las
partículas sueltas y los quads aislados (4 vértices) usan `glDrawArrays( GL_TRIANGLE_FAN )` y no
sufren el problema.

## 5. Alternativas consideradas

| Alternativa | Decisión | Motivo |
|---|---|---|
| Desactivar partículas (`r_drawparticles 0`) | Rechazada | Elimina efectos visuales para ocultar el error (prohibido) |
| Ocultar o silenciar `GL_CheckForErrors` | Rechazada | Oculta el síntoma y desactiva comprobaciones OpenGL (prohibido) |
| Forzar el modo VAO+VBO del shim (`-vao`) | Rechazada | Cambia la ruta de dibujo de todo el renderer; en WebGL sin `glMapBufferRange` real el streaming es lento; riesgo amplio |
| Copiar los vértices de cada lote a un VBO propio | Rechazada | Correcta pero más código y otra ruta de buffers solo para este caso |
| Parchear `libwebgl.js` de Emscripten | Rechazada | Modifica la cadena de herramientas, no el proyecto; difícil de reproducir |
| **Índices en memoria del cliente** para estos lotes | **Elegida** | Emscripten sí cuenta los vértices cuando los índices están en memoria del cliente y sube exactamente los que se usan; el cambio es local al shim |

## 6. Solución

Archivo: `engine/xash3d-fwgs/ref/gl/gl2_shim/gl2_shim.c`. Va exportado en
`patches/xash3d/0001-root.patch` (+21 líneas, ningún otro archivo cambia). Todo va dentro de
`#if XASH_EMSCRIPTEN`, así que las demás plataformas no cambian.

1. Una copia en memoria del cliente de la secuencia de índices de quads (`gl2wrap_triquads_client`,
   `TRIQUADS_SIZE` valores). Se rellena en `GL2_InitTriQuads` a partir de `triquads_array`, la misma
   tabla que se sube a `triquads_ibo`.
2. En `GL2_FlushPrims`, rama `GL_QUADS` con más de 4 vértices y sin VAO obligatorio: se desenlaza
   `GL_ELEMENT_ARRAY_BUFFER` y se llama a `glDrawElements( GL_TRIANGLES, count / 4 * 6,
   GL_UNSIGNED_SHORT, gl2wrap_triquads_client )`. Los punteros de atributo ya apuntan al inicio del
   lote, así que los índices empiezan en 0, igual que en la ruta original.

Lo que **no** cambia:
- la ruta con VAO (`vao_mandatory`);
- los quads de 4 vértices (`GL_TRIANGLE_FAN`);
- el resto de primitivas;
- las comprobaciones de errores;
- los efectos.

**Efecto visible esperado:** los lotes de partículas de varias partículas del motor ahora se
dibujan con sus vértices reales en la web. Antes se descartaban (D3D11) o salían sin datos válidos.
Es el comportamiento que el motor ya tiene en escritorio, no un efecto nuevo.

## 7. Resultados

Mismo punto de reproducción, mismo script y misma partida, antes y después del arreglo:

| Medición | Sin arreglo (`dist-fix`) | Con arreglo (`dist-glfix`) |
|---|---|---|
| Detector, sala inicial con cámara | 0 / 2072 | 0 / 2520 |
| Detector, punto (-620, 800, 40) | **253 / 3036** (`count 972`, buffer de 1 byte) | **0 / 2472** |
| GPU real (RTX 4060, D3D11), errores WebGL en el punto | 111 en 8 s; 138 en 3 s | **0** en 3096 dibujos |
| GPU real, cámara en la mano | 0 | 0 en 2249 dibujos |
| Líneas `OpenGL Error` del motor en el preludio completo (GPU real) | presentes (el síntoma reportado) | **0** de `GL_INVALID_OPERATION` |
| Recorrido de las 11 X (detector por fase) | — | 0 buffers pequeños en las 11 fases |

Validación funcional con el arreglo:

- **Preludio completo (GPU real, panel de la app):** la cámara la entrega el nivel. Se fotografían
  las 11 X y `cof_count camera_spot_trigger` da 9, porque quedan las 9 X falsas. Después: screamer
  (`COF/TELEPORT beforetelet`, música `nightmareend.mp3`, `BLUR`, teletransportes `teleea45` y
  `teleea`), `CHANGE LEVEL: c_start landea` y `Spawn Server: c_start`. `c_start` se renderiza con
  normalidad.
- **Suite de regresión (12 pruebas) sobre `dist-glfix`:** 11 pasan a la primera, entre ellas
  `changelevel_entities` (persistencia entre mapas). `envpos_entities` falló una vez por un timeout de
  espera: la cinemática `kamera3` iba por `now=47.93` y la prueba espera a `> 48` con un límite de
  60 s. **Repetida sola dos veces, pasa las dos** (81 y 88 s), con la comparación real del canvas
  del cielo (25 435 píxeles cambian con `gl_customsky`). Sobre `dist-fix` pasó a la primera. La
  prueba depende del tiempo; el arreglo no toca el cielo.
- **Avisos sin relación:** los 146 `Invalid function pointer in entity!` al guardar la transición
  de nivel ya existían. La suite sin arreglo y la suite con arreglo registran exactamente las mismas
  1872 líneas. Es lógica de servidor, ajena al renderer.

Comando del recorrido automático: el script `glquads.mjs` (`WALK_TEST`) no llegó a `c_start`
porque `cof_face headdy` orienta al jugador hacia +y y este camina alejándose del disparador
(`trigger_once` `*125`, y ≈ -1370). Es un defecto del script, no del juego: orientando a 270° el
screamer y el cambio de nivel funcionan.

## 8. Componentes afectados

- `patches/xash3d/0001-root.patch` (`ref/gl/gl2_shim/gl2_shim.c`): el arreglo.
- Ningún cambio en `game/cof-logic`, `platform/web` ni en los recursos del juego.

## 9. Limitaciones

- No se identificó **qué emisor** genera las ~162 partículas cercanas a `spott1`. Para el arreglo no
  hace falta, porque corrige la ruta de dibujo para cualquier emisor.
- La comparación visual de las partículas con el juego original no está hecha.
- SwiftShader no informa del error. Las pruebas automáticas dependen del detector de buffers, no
  de `getError()`.
- Queda un `GL_INVALID_ENUM while uploading *default [2D]` aislado al arrancar el renderer. Es otro
  error, que aparece una sola vez, y no se investigó aquí.
- Mientras el `dist/` del repositorio no se reempaquete, la versión publicada sigue con el error.
