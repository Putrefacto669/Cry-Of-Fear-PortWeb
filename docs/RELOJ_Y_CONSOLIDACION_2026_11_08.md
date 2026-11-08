# Reloj del motor, consolidación de parches y capas de luz — 8 de noviembre de 2026

Trabajo de Claude Code al retomar el proyecto tras la última etapa de Codex
(`FIDELIDAD_GRAFICA_2026_11_07.md`, `CONTINUACION_GRAFICA_2026_11_08.md`).

## 1. Consolidación de los parches

### Problema
`tools/wsl/patches.sh export` borra todos los `.patch` de cada proyecto y escribe un único archivo por
repositorio (`0001-root.patch` para el principal) a partir del árbol de trabajo de WSL. Había parches que
no estaban aplicados en el árbol canónico (`/root/cof-audits/audit-D3Kl5uly`):

- `patches/xash3d/0004-root.patch`: niebla lineal de Codex (sin confirmar en Git). Compilado en un árbol
  privado (`/root/cof-audits/graphics-20261107`).
- `patches/hlsdk/0002-root.patch` y `0003-root.patch`: HUD original de la Glock (`CoF_DrawAmmo`) y ruido
  original (`CoF_DrawOriginalNoise`), confirmados en el repositorio pero sin aplicar en el árbol canónico.

Consecuencias:
- El siguiente `export` habría borrado esos parches sin conservar su contenido.
- Cualquier compilación del juego desde el árbol canónico habría salido sin HUD de munición y sin ruido.

Un primer `export` lo demostró: borró `hlsdk/0002` y `0003`. Se restauraron de inmediato desde Git antes
de seguir.

### Corrección
1. Se comprobó que el árbol canónico coincidía línea a línea con `xash3d/0001-0003` y `hlsdk/0001`.
2. Se aplicó `xash3d/0004` al árbol del motor y `hlsdk/0002` + `0003` al de hlsdk (los tres aplican
   limpios).
3. Se exportó. Se comprobó que las líneas `+/-` de los parches nuevos son exactamente la unión de las
   antiguas:
   - `xash3d/0001-root.patch` = `0001` + `0004` anteriores;
   - `hlsdk/0001-root.patch` = `0001` + `0002` + `0003` anteriores.

Ahora cada repositorio tiene un único parche igual a su árbol, y un `export` futuro no puede perder nada.

### Compilación
Desde el árbol canónico consolidado:
- **Renderer** (`libref_gles3compat.wasm`): idéntico byte a byte a la candidata de Codex, `8049c178…`.
- **Servidor** (`hl_emscripten_wasm32.wasm`): idéntico, `91ca7418…`.
- **Cliente:** las fuentes de `cof-logic` y de hlsdk son idénticas a las de Codex. El binario
  (`e0b2b6cc…`) solo difiere de `44fcd9de…` en el texto de versión que inserta la compilación: este
  árbol es un clon Git (`8a09758d-dirty`, `master`) y el de Codex no (`unknown-commit`). Las opciones de
  compilación son las mismas.

## 2. Fallo intermitente de arranque: reloj no monótono

### Síntoma
Arranques que no llegan a conectar. Firma en el log:
- `Time to first frame: 18446744073709.xxx seconds` o `level loaded at -18446744073707.xx sec`;
- después `Trying to connect with modern protocol` y nada más.

Afectó a pruebas de Codex (`voice_mix_probe`, `c_start-gameplay/replay-2`, `scenes-linear-800/c_nightmare`,
`visual-noise-final`) y a la de `dual_hands` en esta sesión.

### Causa demostrada
- En la web, Xash usa `TIMER_SDL` (`engine/platform/sdl2/sys_sdl2.c`):
  `(double)(SDL_GetPerformanceCounter() - g_ClockStart) / SDL_GetPerformanceFrequency()`, con enteros sin
  signo de 64 bits.
- El valor del error, 18446744073709 ≈ 2⁶⁴ / 10⁶, identifica una frecuencia de 10⁶: la rama
  `gettimeofday()` de SDL2. En Emscripten eso es `Date.now()`, la hora del sistema, **que retrocede**
  cuando se ajusta el reloj.
- Si una lectura cae antes de la primera, la resta sin signo da la vuelta: el motor salta 1,8·10¹³ s y
  el cliente no conecta.
- En los logs fallidos, la propia hora del registro retrocede justo antes:
  - `22:35:16 → 22:35:14` en `voice_mix_probe`;
  - `21:59:02 → 21:59:01` en `replay-2`.

  WSL ajusta su reloj así, pero también puede ocurrirle a un jugador al sincronizarse la hora o al
  despertar el equipo.

### Corrección
`sys_sdl2.c`, solo en Emscripten: `Platform_DoubleTime` usa `emscripten_get_now()`
(`performance.now()`), que es monótono. Queda en `patches/xash3d/0001-root.patch`. No cambia la lógica
del juego.

### Prueba
`tools/e2e/clock_backwards.mjs` reproduce el fallo a voluntad. Hace retroceder `Date.now()` 2 s justo
cuando el motor imprime su primera línea y exige que el cliente conecte sin tiempos desbordados.

| Build | Resultado |
|---|---|
| Motor anterior | FALLA: `level loaded at -18446744073707.94 sec`, no conecta |
| Motor corregido | PASA: `level loaded at 1.68 sec`, conecta |

## 3. Capas de luz 61/62/63 (investigación, sin cambios)

### Qué hace el original
`client.dll`, `FUN_10059660`, ruta plana para caras con relieve:
- capa 61 = ambiente (RGB), capa 62 = color difuso (RGB), capa 63 = dirección codificada;
- `luz = ambiente + difuso × z`, con `z = capa63.b / 127 − 1`;
- después la curva de gamma `FUN_100595f0(2x) × 0,5`, y `FUN_10059f30` normaliza por el máximo si un canal
  pasa de 1;
- las caras sin relieve usan solo la capa 61 (`FUN_10059880`).

Xash, en cambio, trata 61/62/63 como estilos de luz normales y suma 0 + 61 + 62 (63 apagada).

### Medición sobre los BSP
Media por luxel en caras con las tres capas, en unidades del lightmap, no de pantalla:

| Mapa | Capa 0 | Suma de Xash | Reconstrucción neutra del original |
|---|---:|---:|---:|
| `c_apartment1` | 38,9 | 68,1 | 20,0 |
| `c_apartment3` | 23,5 | 39,7 | 12,3 |
| `c_start` | 20,8 | 37,1 | 10,6 |

La reconstrucción neutra es más oscura que lo que dibuja Xash, y eso contradice lo que observa el usuario
(el port se ve demasiado oscuro). Falta, por tanto, una parte del cálculo original:
- la curva de gamma cuando `DAT_101cc084 ≠ 1` (`FUN_100ff550`, sin analizar);
- el factor `(2x) × 0,5`;
- probablemente un sobrebrillo ×2 al combinar textura y lightmap.

**No se cambió el renderer.** Corregir solo la composición podría oscurecer aún más el juego.

### Cadena completa (continuación del mismo día)

**Curva de gamma.**
- `FUN_100ff550` es `pow()`.
- `FUN_1005a000` compara los tres parámetros con las cvars del renderer original: `gl_gamma`
  (por defecto "1"), `gl_brightness` ("0") y `gl_contrast` ("1"); además existe `gl_bump` ("1").
- Con esos valores, que son también los del `config.cfg` del usuario, la curva es `x × 1 + 0`: neutra. La
  reconstrucción anterior **es** el lightmap que sube el original, sin tabla de gamma del motor.

**Combinación.**
- El dibujo del mundo (`FUN_10061b40`) pone el lightmap en la unidad 0 y la textura en la 1 con el modo 5
  de `FUN_10062c10`: `GL_COMBINE`, `MODULATE`, `GL_RGB_SCALE 2`.
- Píxel = textura × lightmap × 2.

**Port (Xash).**
- `bl = Σ lm × valor de estilo` (0 → 264, 61/62 → 256, 63 → 0), `t = bl × 256 >> 14`, lightmap =
  `lightgammatable[t] >> 2` (gamma 2,5, brightness 1, lightgamma 2,5).
- Con `gl_overbright 1`, segunda pasada `GL_DST_COLOR, GL_SRC_COLOR` con color 128/192.
- Píxel = textura × lightmap × 1,333.

**Modelo por luxel** sobre las caras con capas 61/62/63 (multiplicador final de la textura):

| Mapa | Original | Port | Port / original (mediana) | Luxels < 0,15: original / port |
|---|---:|---:|---:|---:|
| `c_apartment1` | 0,157 | 0,451 | ×2,88 (3,07) | 60,4 % / 19,0 % |
| `c_apartment3` | 0,097 | 0,263 | ×2,72 (3,14) | 86,1 % / 50,3 % |
| `c_start` | 0,083 | 0,266 | ×3,21 (3,15) | 85,6 % / 38,9 % |

**Conclusión.** En la luz estática el port es unas tres veces **más claro** que el original, no más
oscuro. La causa es que el original no pasa sus lightmaps por la tabla de gamma del motor, que levanta
mucho las sombras. El original es así de oscuro a propósito y depende de la linterna del teléfono.

Una corrección fiel oscurecería el port unas tres veces. Lo que el usuario percibe como «no se ve nada»
no se explica por las capas de luz; quedan por comparar la linterna, los modelos y el brillo de pantalla.

**Supuestos del modelo**, que habría que confirmar con una captura nativa del mismo punto:
- los valores de estilo de luz;
- la ruta plana: con `gl_bump 1` el original usa la ruta con relieve, que reparte N·L por píxel con
  media parecida;
- la tabla de texturas: texgamma se aplica a ambos y no entra en la comparación.

## 4. Lightmaps fieles y ajuste de brillo

Decisión del usuario: «Fiel + ajuste de brillo». La luz estática se construye como en el original, y el
jugador que lo vea demasiado oscuro tiene el mismo ajuste que ofrecía el original (`gl_brightness`).

### Cambios en el renderer (`patches/xash3d/0001-root.patch`, `ref/gl`)
- **Cvars nuevas** (`gl_opengl.c`, `gl_local.h`):
  - `r_cof_lightmaps` ("1"): 0 vuelve a las tablas de gamma de Xash, para comparar;
  - `gl_gamma` ("1"), `gl_brightness` ("0") y `gl_contrast` ("1"): los nombres y valores por defecto del
    renderer original. Como en el original, el contraste se limita a 2 y el brillo a 0,3.
- **Reconstrucción** (`gl_rmain.c`, `R_CheckCvars`): cambiar cualquiera de las cuatro reconstruye los
  lightmaps (`GL_RebuildLightmaps`).
- **`R_CofBuildLightMap`** (`gl_rsurf.c`) aplica las tres reglas del `client.dll`, sin tabla de gamma del
  motor:

  | Caso | Fórmula | Función original |
  |---|---|---|
  | Capas 61, 62 y 63 | `curva(2·(ambiente + difuso·z))·0,5` | `FUN_10059660` |
  | Solo la 61 | `curva(capa 61)` | `FUN_10059880` |
  | Las demás caras | `curva(capa 0)·0,5` | `FUN_10059d20` |

  - `curva(x) = x·gl_contrast + gl_brightness`; antes, `pow(x, 1/gl_gamma)` si `gl_gamma ≠ 1`.
  - Normalización por el canal máximo y negativos a 0 (`FUN_10059f30`).
  - Los estilos animados (que no sean 61–63) conservan su animación: `valor / 264`.
  - Las luces dinámicas y el foco de la linterna se suman como las pasadas aditivas del original, a ×1
    después del ×2.
- **Combinación ×2**: la pasada de sobrebrillo usa color 1 en vez de 128/192, así que el resultado es
  textura × lightmap × 2, como el modo 5 de `FUN_10062c10` (`GL_RGB_SCALE 2`). Con `gl_overbright 0`
  el propio lightmap lleva el ×2.
- **Opciones → Brillo** (`platform/web/hud.js`):
  - el deslizador va de 0 a 0,3 y fija `gl_brightness`;
  - se guarda en `localStorage` como `lightBrightness`, por defecto 0, como el original;
  - el `brightness` del motor queda fijo en 1.

### Medición en el navegador (GPU real, `c_apartment1`, `fx=0`)
Media del fotograma (0–255) / porcentaje de píxeles por debajo de 16:

| Punto | Fiel | Anterior (Xash) | Fiel + brillo 0,3 |
|---|---|---|---|
| Pasillo inicial | 27,8 / 14 % | 65,2 / 1 % | 54,5 / 1 % |
| Habitación de la trampilla | 65,6 / 46 % | 90,7 / 41 % | 101,7 / 6 % |
| Delante del apartamento | 15,9 / 69 % | 35,9 / 8 % | 40,3 / 7 % |

- Lo fiel es entre 1,4 y 2,3 veces más oscuro que lo anterior, en la dirección que predecía el modelo por
  luxel (sección 3).
- Con el brillo al máximo se vuelve a un aspecto cercano al anterior o más claro, sin levantar tanto las
  sombras profundas.

### Límites conocidos
- **Modelos** (personajes, armas, objetos): siguen iluminándose con el punto de luz y la gamma del motor.
  Pueden verse algo más claros que el mundo.
- **Relieve**: con `gl_bump 1` el original usa la ruta con relieve, que reparte N·L por píxel; aquí se
  usa la ruta plana, de media parecida.
- **Gamma**: el exponente cuando `gl_gamma ≠ 1` no está confirmado. El deslizador no lo usa.
- **Sin comparación nativa**: falta una captura del juego original en el mismo punto.

### Pruebas
Ver la sección 5.
