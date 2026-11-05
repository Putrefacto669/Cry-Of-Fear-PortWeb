# HUD de munición original, launcher de siete idiomas y README

Fecha de la sesión: 4 de noviembre de 2026. Base Git: `2e95cde660c1a19fb9146b559abf33fcb814d295`.

## Resultado y alcance

Se reconstruyó la presentación original comprobable de la **Glock implementada en el port** usando sus sprites y cifras originales. Se compiló el cliente con Emscripten y se probó en el servidor WebAssembly real. El servidor publicado, motor, renderizador, filesystem y menú no fueron sustituidos. No se modificaron daño, cadencia, capacidad, recarga, física o inventario.

El launcher ofrece **inglés, español, francés, alemán, neerlandés, noruego y sueco** al primer acceso. El usuario confirmó los siete, aunque su petición inicial mencionaba seis. La elección se recuerda y puede cambiarse. Es la lengua del launcher; no sobrescribe las preferencias de subtítulos del juego.

El README tiene portada con Simon, logo, estado real de la Alpha, controles, instrucciones de desarrollo y créditos. Los cambios están **sin commit y sin publicar**. `dist/` conserva la versión publicada `b591c193f94d`.

Esto no certifica el HUD de todas las armas originales, el inventario físico de cargadores, toda la campaña ni compatibilidad móvil.

## Investigación del cliente y servidor originales

Se utilizaron exclusivamente los binarios y recursos locales autorizados, mediante análisis de solo lectura. No se añaden DLL al producto ni se publican sus descompilaciones. Las salidas crudas `native-*.txt` quedan ignoradas dentro de la evidencia local.

Referencias: `CHudAmmo::Draw` (`100177c0`), inicialización de sprites (`1001bb40`), recepción de `WpnInfo` (`1001b4d0` / `1001b610`), ayudantes de contadores (`1001a070` / `100177a0`), `GetItemInfo` de Glock (`10045ac0`) y emisiones de mensajes del servidor original.

| Operación | Contrato reconstruido | Aplicación en esta candidata |
|---|---|---|
| Balas cargadas | `cof_glock_mag` tiene 16 frames: 0–15; el frame corresponde al contenido actual | Se dibuja el frame de `CurWeapon`, no una cifra inventada |
| Reservas | `WpnInfo`: BYTE arma, BYTE capacidad, SHORT reserva; la ruta de Glock calcula división entera reserva/capacidad | `AmmoX` ya proporciona los cartuchos reales del port; la presentación aplica el mismo cociente con capacidad 15 |
| Iconos | `cof_glock_mag_icon` y `cof_mag_cross` | Recursos originales, sin sustituirlos por el HUD de Half-Life |
| Cifras | Hoja `cof_ammohud`, mediante los glifos registrados por el HUD | Cifra de unidades completas; no se rotulan cartuchos sueltos como cargadores |
| Dual | `DualAmmo` contiene dos LONG independientes | Solo se presenta el arma de fuego realmente disponible en teléfono + Glock; el teléfono no recibe un contador ficticio |
| Inventario de munición | `AmmoInv`: tres BYTE, índice de slot, tipo y cantidad; separa icono y etiqueta de siete slots | Contrato documentado, sin implementar una distribución de slots no demostrada |
| Despliegue | `WpnDeploy` sin payload, limpia selección/menús | No se simulan cambios de munición mediante este mensaje |
| Ocultación | Máscara `0x0d` y estado de muerte; además las condiciones generales del HUD | Cámara inicial oculta, regreso al jugador muestra; navaja sin cargador |

Los números de arma difieren: Glock original ID 3, Glock del port ID 17. Se mapea expresamente la implementada; no se cambia su identidad ni se aplica el dibujo a otras armas por accidente.

### Diferencia crucial: reservas frente a cargadores físicos

El cociente del original está comprobado en código. Ejemplo real del ensayo:

1. Cargador 15, reserva 15: cifra de unidades completas 1.
2. Un disparo: cargador 14, reserva 15, cifra 1.
3. Recarga existente del port: cargador 15, reserva 14, cifra 0.

Los 14 cartuchos no desaparecen. El port mantiene su recarga actual por cartuchos; esta tarea no la convierte en un sistema de cargadores separados. La cifra reproduce esa normalización del cliente original, **no prueba que existan cero cartuchos ni un inventario físico de cargadores**. El mecanismo completo de `AmmoInv` y posibles cargadores parcialmente llenos sigue pendiente de reconstrucción.

### Disposición y límites visuales

Se recuperaron posiciones a partir del ancho de cifra, tamaño del sprite y tamaño de pantalla. En modo simple, la columna parte de `W + dw/2 - 8*dw`; el cargador se coloca a `H - int(mh*1.1) - mh/6`. Teléfono + Glock desplaza la columna derecha `int(mw*1.5)`. Se conservan icono, cruz y cifra propios de esa disposición, sin dibujar un segundo cargador para una mano sin arma de fuego.

Se usa tinte blanco de sprites y desvanecimiento de cifras con mínimo 170 y decremento 20 por segundo, derivados del original. No se certifica todavía equivalencia exacta del color dinámico global `HUDColor`: su valor completo no quedó reconstruido. No se afirma equivalencia píxel a píxel de todas las configuraciones del juego original.

## Código y archivos

| Archivo | Cambio |
|---|---|
| `game/cof-logic/client/cof_ammo.cpp` | Dibujo original de Glock, ocultación, contadores derivados y comando diagnóstico `cof_ammo_render` |
| `game/cof-logic/client/cof_client.cpp` | Inicialización y reinicio visual por nivel |
| `game/cof-logic/client/cof_hands.cpp` | Consulta de solo lectura del estado teléfono + Glock |
| `patches/hlsdk/0002-root.patch` | Llamada desde `CHudAmmo::Draw`, antes del requisito HEV de Half-Life |
| `platform/web/launcher.js` | Siete traducciones, selector inicial, memoria de elección y acceso con teclado |
| `platform/web/index.html` | Estilos del selector e inclusión del script |
| `platform/web/loader.js` | Estado inicial del launcher traducido |
| `tools/wsl/package.sh` | Inclusión de `launcher.js` en el paquete frontend |
| `README.md` | Portada, imágenes, estado, uso y documentación actualizados |
| `docs/images/simon-header.jpg`, `docs/images/README.md` | Arte promocional original y procedencia; el logo ya existía |
| `tools/e2e/ammo_hud.mjs` | Contratos con Glock real, UI del bolso, recarga y persistencia |
| `tools/e2e/ammo_hud_firefox.mjs` | Dibujo real de Gecko con disparo y guardado/carga; no acredita entrada de ratón |
| `tools/e2e/launcher_languages.mjs` | Primer acceso, siete lenguas, teclado y persistencia en ambos navegadores |

`cofLauncherLanguage` es independiente de `cofLanguage`. No se inicia el motor ni se descargan paquetes por elegir idioma. Las pruebas de acceso directo con `?map=` mantienen el arranque previo. Escape se atiende en la captura de `window` antes del HUD: el manejador global del juego impedía que el evento llegara al selector en `document`. Este arreglo queda limitado al selector abierto.

No se cambiaron `hud.js` ni su corrección CSS publicada para Gecko. No se añadieron dependencias de Steam.

## Compilación e incorporación real

SDK base `8a09758d2912d278423870391f6c25995de0000b`, Emscripten 4.0.11. Clon y compilación privados en `/root/cof-audits/ammo-hud-20261104/`. Se verificó que `0001-root.patch` y `0002-root.patch` se aplican sucesivamente a un clon limpio. El nombre del segundo parche respeta la convención del aplicador del repositorio.

`build-first.log`: compilación completa satisfactoria. `build-final.log`: recompila `cof_ammo.cpp` / `cof_hands.cpp` y enlaza `client_emscripten_wasm32.wasm`, satisfactoria en 1,742 s. Persisten advertencias previas del SDK, incluidas operaciones `memset` sobre clases polimórficas; no se ocultaron.

Se reemplazó únicamente el cliente dentro de una copia privada del par `engine.js` + `engine.data`. El módulo cargado en ejecución contiene `COF/AMMOCLIENT`; sus hashes se midieron desde MEMFS, no solo desde un archivo de salida.

| Módulo cargado | SHA-256 completo |
|---|---|
| Cliente nuevo | `5e9d0053e3d2baf50673362bfcf555e5667224838f223ebde01679d84fe38c26` |
| Servidor conservado | `c2d9d984a416e6a8552f1a75939c065c0bd983263b0d8206e60c5f5d9e6a69a5` |
| Renderizador conservado | `8db286f9132d53133c1a9887ef78bf0735dd264962846f2db6b66350d11e0eec` |
| Filesystem conservado | `85e8f987a23b86f6dcabc92acda5e2818653bb155e84b7fab25fdbd3ec507a95` |
| Menú conservado | `bbde8c4bcdfc8b61ed538fbcd86c5d92693a35277a7955fa502f5232285e6051` |

La evidencia JSON es la referencia para los hashes. Candidata de pruebas nativas `d89b15c1f62e`; candidata final del launcher `636f6f29424d`, en `/root/cof-audits/ammo-hud-20261104/candidate-v5`. Solo la etiqueta traducida de la tecla Espacio cambió entre ambas; su par de paquetes del motor es idéntico byte a byte. El manifiesto continúa usando las revisiones SHA-256 truncadas a 12 caracteres del empaquetador existente. No se modifica aquí su formato ni se confunde con la prueba de distribución inmutable anterior.

## Resultados reales

Playwright 1.64.1, Chromium 156.0.8078.4 y Firefox 157.0. Navegadores de pruebas silenciados. Evidencias en `build/validation/ammo-hud-2026-11-04/`.

| Prueba | Resultado y alcance |
|---|---|
| `chromium-second/result.json`, `chromium-final/result.json` | PASS (repetido; la segunda ejecución usa la candidata final `636f6f29424d`): Glock, cámara original, bolso, navaja, teléfono + Glock, recogida de munición real, disparo, recarga guardada, restauración fría y cambio de mapa |
| `firefox-render/result.json` | PASS: servidor WASM y renderizado real, sprites originales, frame 15 → 14, guardado/restauración, barras y hash del cliente |
| `launcher-final/result.json` | PASS en ambos navegadores: siete opciones y textos, elección obligatoria inicial, idioma recordado, preferencia del juego intacta, Escape/Tab, ancho 320 px, sin descarga del motor |
| `hud-css-second/result.json` | PASS: reproduce el colapso de la fórmula antigua en Gecko y valida las barras actuales en Chromium/Firefox a cuatro alturas y con las reglas de ocultación |
| `dual-hands/result.json` | PASS: teléfono + navaja/Glock, bolso real, disparo, interruptor independiente, recarga, restauración caliente/fría y salida del dual |
| `sp-punch/result.json` | PASS: impulso autoritativo SP, movimiento, vista y persistencia caliente/fría de ángulos/velocidad |
| Pointer Lock | PASS del contrato de `tools/e2e/pointer_lock.mjs` sobre el loader modificado: raw movement, fallback, rechazos y API antigua |

Las pruebas nativas conservan las entidades y cinemáticas originales del mapa. No se aumentaron límites: confirmaciones/condiciones 30 s y los límites de arranque/carga de 60 s ya expresados en el arnés.

Se inspeccionaron capturas de la Glock simple y con teléfono, del launcher de escritorio y del selector estrecho. El selector estrecho es una prueba de diseño responsive, no certificación de juego móvil.

### Ensayos fallidos conservados

- `launcher-first`: comparación de `innerText` afectada por mayúsculas CSS; se corrigió el arnés para comprobar el texto subyacente.
- `launcher-second` y `launcher-third`: Escape no cerraba; se localizó la interceptación por el HUD y se corrigió el selector. `launcher-fourth` y `launcher-final` pasan en ambos navegadores.
- `chromium-first`: el arnés exigía conservar Glock tras `changelevel` sin landmark. El servidor tenía inventario vacío; se corrigió la expectativa, no el juego. La comprobación posterior verifica que el HUD se vacía cuando el servidor no tiene arma.
- `firefox-first`: no llegó a conectarse en modo headless, sin errores JS registrados; no se atribuye una causa definitiva.
- `firefox-headed`: el juego sí arrancó bajo Xvfb, pero la captura de ratón no se confirmó en 30 s. No se altera Pointer Lock para hacer pasar esta prueba. La validación visual posterior usa comandos diagnósticos y no acredita entrada física en Gecko.
- Primer ensayo `hud-css`: se suministró como baseline el HUD ya corregido; falló la expectativa deliberada de colapso antiguo. La repetición usa `baseline-hud.js` anterior al arreglo y pasa.
- Primer empaquetado: colisión de variable del arnés al exportar la prueba JSON; se recuperó la evidencia verificando por separado el par de paquetes y sus módulos. Un intento posterior de verificación exigió por error hashes completos a revisiones de 12 caracteres; no se publicó esa candidata parcial. Se corrigió el preparador y se conservó el formato existente.

Los fallos se conservan; no se borran resultados para presentar únicamente éxitos.

## Limitaciones y continuación

- No hay demostración de recorridos naturales completos: la preparación de armas y la recogida de munición en el ensayo usan herramientas de diagnóstico. El comportamiento posterior de disparo, recarga y bolso en Chromium utiliza las operaciones reales.
- El cambio de mapa de diagnóstico sin landmark no prueba conservación de inventario entre las transiciones naturales. Prueba que el cliente no deja una cifra obsoleta cuando el servidor queda sin arma.
- `AmmoInv` necesita investigación adicional para representar cargadores individuales, incluidos los parciales, sin alterar la recarga existente ni inventar contadores.
- Dos armas de fuego simultáneas no están implementadas como mecánica del port. La prueba dual de esta tarea es teléfono + Glock.
- Navaja y teléfono no llevan contador de balas. Las recogidas de FAMAS, MP5A3, hacha y Simon’s Book siguen siendo parciales; no se anuncia un HUD completo para ellas.
- No se certifica color dinámico global exacto del HUD original, ratón físico de Firefox/Zen, Android/iOS ni toda la campaña.
- No se ejecutó de nuevo toda la suite histórica de entidades/BSP/audio: se ejecutaron las regresiones indicadas en la tabla, y se conservó el servidor publicado byte a byte. No se presenta esa igualdad como sustituto de pruebas no realizadas.

Siguiente trabajo recomendado: reconstruir el contrato completo de cargadores de `AmmoInv` y sus emisores originales, antes de ampliar la interfaz al siguiente arma de historia. Después, validar entrada y recarga con Firefox/Zen en una sesión de escritorio normal. La candidata requiere revisión y autorización independiente antes de commit/publicación; no se hicieron commits, pushes ni despliegues en esta etapa.

## Publicación posterior autorizada

Tras este informe el usuario autorizó commits, push, actualización de dist y despliegue. El seguimiento está en [Publicación de la Alpha](PUBLICACION_ALPHA_HUD_IDIOMAS_2026_11_04.md). Las limitaciones técnicas anteriores se mantienen.
