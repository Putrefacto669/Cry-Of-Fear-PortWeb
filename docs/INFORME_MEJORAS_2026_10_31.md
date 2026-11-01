# Informe de mejoras pendientes — 31 de octubre de 2026

Estado del port después de la sesión del 31 de octubre: qué quedó hecho, qué quedó a medias
y qué falta, ordenado por prioridad. Las referencias al original salen del análisis de solo
lectura de `hl.dll` y `client.dll` con los scripts de `tools/ghidra/`.

## Hecho en esta sesión

- **Llaves desde el bolso**, como el `inventoryuse` original. E sobre una puerta o un botón con
  llave solo avisa; USE en el bolso desbloquea y gasta el objeto. Probado en la puerta del
  apartamento (`c_apartment1`) y en la cuerda (`c_apartment5`). Detalle en
  `CONTINUATION_2026_10_31.md`.
- **Introducción original** según `iuser1` y **selector de idioma de subtítulos** con la pantalla de
  banderas del original (7 idiomas). Publicado.
- **Publicación en GitHub Pages**: <https://putrefacto669.github.io/Cry-Of-Fear-PortWeb/>.

## 1. Iluminación y linterna (prioridad alta, a medias)

**Síntoma (usuario).** En los apartamentos del capítulo 1 hay sitios clave donde no se ve nada,
ni con la linterna.

**Causa principal encontrada.** El port no tiene la linterna del original:

- La del port (`postfx.js`) es un filtro sobre la imagen ya dibujada:
  `color × (1 + 12 × cono)`. Multiplica, así que lo negro sigue negro.
- La del servidor nunca se encendía. `FlashlightTurnOn` del HLSDK exige el traje HEV, que Simon no
  lleva (`effects` se queda en 0).
- La del original (`client.dll`, `FUN_100aea10`, renderer derivado de Paranoia) es un **foco
  proyectado que suma luz**:
  - Origen en la vista, radio 700 y color (0,46; 0,46; 0,51).
  - Patrón `gfx/flashlight.tga` y apertura de 50° más hasta 30° si hay una pared a menos de 150
    unidades (traza; se suaviza a 10 × diferencia por segundo).
  - Atenuación `1 − t²` (t = distancia en el eje / radio, `FUN_1005ab50`) y término N·L.
  - Se dibuja con una segunda pasada `glBlendFunc(GL_DST_ALPHA, GL_ONE)`:
    `final = textura × (lightmap + luz)`.
- En el servidor original el teléfono guarda su propio indicador (`+0x1ea8`, bit 8 de `+0x5d0`) con
  `items/flashlight1.wav`. No usa traje, batería ni `EF_DIMLIGHT`.

**Lo implementado (compilado; sin terminar):**

- **Servidor** (`player_cof.cpp`, `weapons_cof.cpp`, `atmosphere.cpp`):
  - `CoF_SetFlashlight` / `CoF_FlashlightIsOn`, sin traje, con el sonido original.
  - Mensaje `CoFLight`, reenviado cada 2 s; se guarda con la partida.
- **Cliente** (`cof_client.cpp`):
  - Con la linterna encendida crea en cada fotograma un dlight y un elight con `COF_SPOT_KEY`, radio
    700 y el color original.
  - Calcula la apertura con la traza de 150 unidades (cvar `r_cofspot_fov`).
- **Renderer** (`patches/xash3d`, `gl_rsurf.c` y `gl_studio.c`):
  - La luz `COF_SPOT_KEY` se trata como foco: por luxel, cono con `gfx/flashlight.tga`, `1 − t²` y
    N·L, sumado después de la tabla de gamma.
  - Los modelos solo la reciben dentro del cono.
- **Web**: el filtro de `postfx.js` (tecla F) **se mantiene** hasta que el foco ilumine el mundo,
  para no dejar el juego peor que antes.

**Lo que falla.** En el pasillo de `c_apartment1` el foco apenas cambia la imagen: brillo medio de
58,9 con la linterna apagada frente a 60,2 encendida, medido sobre el fotograma del motor antes de
`postfx`. El cambio debería ser grande. Hipótesis por comprobar, en este orden:

1. **No llega a `R_AddSpotLight`.** Poner un contador o una cvar de depuración. El dlight del
   cliente puede no estar marcando superficies (`R_PushDlights` / `dlightbits`), o el
   `CL_AllocDlight` del cliente no llega al renderer con esa clave.
2. **Las lightmaps dinámicas no se vuelven a subir** en el camino GLES/`gl2_shim`
   (`glTexSubImage2D` de los bloques dinámicos).
3. **`gl_overbright` vale 1 en el port** y 0 en la configuración original del usuario. Con
   overbright, Xash cambia la escala de las lightmaps (`lightscale`) y la suma posterior puede
   quedar mal escalada. Además puede ser una diferencia de brillo general frente al original:
   comparar.
4. **`r_dynamic` no respondió** en la consola. Comprobar que existe y que está a 1 en la build web.

Cuando el foco funcione:
- quitar el cono de `postfx.js`;
- comparar con capturas del original en los mismos puntos (pasillos y habitaciones oscuras de
  `c_apartment1` a `c_apartment5`);
- medir el coste por fotograma (la luz rehace las lightmaps a 700 unidades);
- **no modificar los mapas originales**: si tras arreglar la linterna sigue habiendo zonas
  imposibles, documentarlas con capturas del original antes de decidir nada.

## 1b. Partidas guardadas

- Corregido: la partida se perdía al cerrar la pestaña y Cargar partida se quedaba en el menú
  (detalle en `CONTINUATION_2026_10_31.md`).
- Pendiente: 39 avisos "Invalid function pointer in entity!" al guardar en `c_apartment1`. Hay que
  identificar las entidades y conservar sus funciones como en `sound.cpp` y las puertas.

## 1c. Usar (E)

- Corregido: E no alcanzaba lo que está por encima de la cabeza (la trampilla con la Glock de
  `c_apartment1`). Ahora traza 80 unidades desde los ojos, como el original.
- Pendiente: la búsqueda alrededor del jugador es de 64 unidades (80 en el original), y falta la
  traza de la bandera `0x200` (`PlayerUse` del HLSDK).

## 2. Llaves y objetos del bolso

- Sin probar en juego: el botón de la cinta de vídeo (`c_apartment3`, `*133`) y la puerta del
  sótano (`c_apartment4`, `*96`).
- `func_valve` con objeto: el original lo admite y el port no (ningún mapa publicado lo usa).
- `useunlock` de `inter_door` se ignora: en el original, usar una puerta desbloquea otra.
- Botón desbloqueado con objeto: el original dispara además un objetivo en `+0x1a4` (clave por
  identificar) y espera 1 s antes de admitir E.
- Bolso: COMBINE, DROP, el panel de notas y el puñetazo con el teléfono siguen sin implementar.

## 3. Armas

- Combinación de armas como el `CDualWeapon` original. Hoy solo funcionan el teléfono y la navaja.
- El resto del arsenal de los capítulos siguientes.
- Animaciones "trabadas" que vio el usuario: falta saber cuáles.

## 4. Cinemáticas y sonido

- **Voces de Simon:** el usuario sigue sin oírlas. En las pruebas, el port las emite todas con los
  volúmenes del mapa. Hace falta saber en qué escena exacta falla y datos de su navegador.
- **Teléfono en cinemáticas:** el motor no dibuja el viewmodel cuando la vista no es el jugador
  (`CL_IsViewEntityLocalPlayer`). Hace falta un modelo que siga a la cámara.
- La cara del screamer del preludio se ve más pequeña que en el vídeo original (causa sin
  demostrar).

## 5. Entidades y validaciones pendientes

- Candado: validar de forma natural la contraseña, la combinación, la vuelta a `c_start` y
  guardar/cargar. Manos blancas tras cargar partida.
- Sin implementar:
  - `cof_greyfade`;
  - del capítulo 1: `cof_developer_commentary`, `cof_hoodie`, `cof_clothesmenu` e
    `item_nightvision`.
- `tools/e2e/smoke.mjs`: dos comprobaciones que ya fallaban antes (descarga de 4,6 MiB al recargar y
  `ERR_INTERNET_DISCONNECTED` sin conexión).
- Escena de `multiscene3` tras guardar/cargar: falta la suite completa sobre el dist con las
  correcciones de disparadores.

## 6. Publicación

- El Service Worker no se ha probado en el sitio publicado: el navegador integrado de Claude no lo
  admite. Probarlo en Chrome: recargar no debería volver a descargar los paquetes.
- Límites de GitHub Pages:
  - 1 GB de sitio (hoy 822 MiB): los capítulos siguientes no cabrán, y habrá que llevar los
    paquetes a otro alojamiento (Releases o almacenamiento de objetos).
  - 100 GB de tráfico al mes (unos 300 jugadores nuevos).
- `boot.data` pesa 83 MB y GitHub avisa a partir de 50 MB. El límite duro es de 100 MB.

## 7. Idiomas

- Las introducciones de Doctor y cooperativo de los idiomas nuevos se añadirán con esos mapas.
- La interfaz propia del port (menús de `hud.js`, launcher) solo está en español e inglés.
