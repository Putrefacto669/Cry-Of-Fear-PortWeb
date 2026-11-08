# Fidelidad visual e Items / Clothes — implementación y validación

Fecha: 7 de noviembre de 2026. Investigación inicial: [Estado visual y ropa](ESTADO_VISUAL_Y_ROPA_2026_11_07.md).

## Resultado y alcance

Se implementó el acceso a **Items / Clothes desde el menú principal**, con una previsualización tridimensional del modelo original de Simon, selección de prendas desbloqueadas y persistencia de la preferencia. No es necesario iniciar una campaña para verlo. La candidata local final tiene manifiesto **`b3cc76b41bd9`**.

Se reconstruyó el ruido visual mediante el sprite original y se corrigió una fuga de estado WebGL al inicializar el postprocesado. **La fidelidad visual completa con el ejecutable original sigue pendiente**: no se certifican iluminación, materiales, viñeta ni colorimetría equivalentes por haber pasado estas pruebas.

No se hicieron commits, pushes ni despliegues en esta tarea. La candidata y sus paquetes se generaron fuera de `dist/`, en `/root/cof-audits/visual-clothes-20261107/`. Los recursos originales solo se leyeron.

## Investigación del original

La fuente autorizada fue la instalación local en `C:\Program Files (x86)\Steam\steamapps\common\Cry of Fear\cryoffear`, sus BSP, modelos, sprites, TGA y los proyectos locales de análisis de `client.dll` y `hl.dll`, abiertos en modo de solo lectura.

El intento de capturar el ejecutable original desde una copia privada terminó con **“Failed to initalize authentication interface. Exiting...”**. No se eludió esa comprobación ni se modificó Steam. Por tanto, no existen en este informe pares de imágenes original/port de las cinco escenas solicitadas. Las capturas conservadas son **port anterior/port candidato**, y su etiqueta lo distingue expresamente.

### Contratos originales comprobables

| Sistema | Evidencia | Decisión |
|---|---|---|
| Ropa | `cof_clothesmenu`, mensajes, comprobación de bits y `setclothes`; escena de `c_start` con `simonclothes` y `clothes_1` | Reutilizar máscara, materiales y modelo existentes |
| Modelo | `models/cutscene/simon_clothes.mdl`, secuencia `clothes_1`; 1.341.620 bytes | Dibujarlo con Studio; no inventar un modelo ni una pose |
| Vestimenta | Texturas externas originales de chaqueta, pantalón y cara | Reutilizar sustituciones existentes; no tratar el número de traje como un índice de skin MDL |
| Botón nativo Clothes | La acción del menú nativo conduce a una tienda de merchandising | No confundirlo con el selector cosmético; la nueva entrada usa el arte original Unlockables |
| Ruido | `CHudNoise::Draw` en `10030340`: `snoise`, `subtle_noise.spr`, 256×256, 20 frames; frames aleatorios 1–19, mezcla aditiva y tinte `int(cl_noiseamount*255)` | Sustituir el ruido hash predeterminado por ese recurso y operación |
| Lightmaps | Rutas `1005a110` / `100595f0`; brillo y contraste ligados a iluminación/materiales | No simular esa ruta aumentando el brillo global |
| Valores originales | Registro de gamma 1, brillo 0 y contraste 1; un perfil instalado con contraste 1,4 no demuestra el valor de fábrica | No imponer preferencias personales a todos los jugadores |

## Implementación de ropa

La nueva entrada del menú permanece en `c_game_menu1`. El servidor precachea el modelo de ropa en ese mapa y valida cada selección contra los bits originales. El cliente dibuja una entidad Studio exclusivamente visual en una textura RGBA con profundidad propia; el compositor web la presenta a la izquierda del selector. No crea una entidad de juego, mueve la cámara, ejecuta eventos de animación ni reinicia secuencias de campaña.

La pose y los materiales son originales. La iluminación neutra de esta previsualización usa `EF_FULLBRIGHT` **solo en esa entidad de interfaz**, para evitar que la escena gris del fondo oculte las prendas. No modifica `r_fullbright`, la iluminación ni la oscuridad de los mapas. El retrato se compone después de los filtros del fondo para conservar los colores de la ropa.

Se reutilizan el renderizador Studio y la API de render ya proporcionada por Xash3D; no se modificaron el motor ni el renderizador. La textura tiene su propio framebuffer y se restauran los estados de framebuffer, viewport, profundidad y entidad actual al terminar.

Las prendas bloqueadas están deshabilitadas, la equipada se señala con `aria-pressed` y el contorno de selección, y los materiales cambian al seleccionarla. Están cubiertas las once prendas alternativas originales y la ropa predeterminada. La variante de hoodie personalizado, que ya carecía de soporte, no se presenta como implementada.

Se corrigieron dos problemas reproducidos durante la validación: la textura del retrato no se anunciaba de nuevo al reabrir el menú, y una petición tardía de Pointer Lock de SDL podía capturar el cursor durante el menú o tras una recarga en Firefox. Ahora la interfaz conserva el cursor y Nueva partida oculta el menú antes de solicitar la captura mediante el gesto del botón de dificultad. No se suprimen los errores de Pointer Lock ni su fallback existente.

### Persistencia

El perfil continúa en `/rwdir/cryoffear/cof_extras_profile.cfg`: `COF_EXTRAS 1 <máscara> <preferencia opcional>`. Los lectores antiguos siguen leyendo la máscara; los perfiles antiguos sin preferencia siguen siendo válidos. Una preferencia bloqueada se ignora, sin conceder un desbloqueo ni reescribir automáticamente el archivo.

Se conserva la escritura temporal y el reemplazo del perfil, junto con su sincronización existente a IndexedDB. La partida nativa sigue guardando su propia ropa: cargar una partida antigua restaura su estado sin revocar desbloqueos ni reemplazar la preferencia más reciente del menú. No se cambió el formato nativo del guardado ni se migraron partidas.

## Cambios visuales delimitados

1. `cof_visual.cpp` dibuja el sprite original, conserva las opciones `cl_noiseeffect` / `cl_noiseamount` y utiliza un generador aleatorio exclusivamente visual. No consume la aleatoriedad del servidor. El parche SDK llama al efecto dentro de `CHud::Redraw`, respetando las condiciones de HUD/intermisión indicadas en el código.
2. El ruido hash web queda en cero por defecto, para evitar superponer dos efectos. Sigue disponible para diagnóstico.
3. La inicialización del postprocesado anterior cambiaba la textura de una unidad activa ajena y `UNPACK_ALIGNMENT` antes de capturar el estado. Una prueba WebGL real reproduce la pérdida en la versión anterior y demuestra la restauración en la candidata, tanto en Chromium como en Firefox. La inicialización también es idempotente.

No se sustituyeron niebla, envpos, iluminación dinámica, manos, física ni mecánicas previamente reconstruidas. No se añadieron curvas de contraste, nuevos materiales ni filtros para disimular diferencias desconocidas.

## Archivos modificados

| Archivos | Propósito |
|---|---|
| `game/cof-logic/cof/extras.cpp`, `cof/cof_extras.h` | Apertura desde menú, validación de prendas y preferencia compatible |
| `game/cof-logic/cof/weapons_cof.cpp` | Únicamente llamada al precache del modelo en el punto de precache existente; sin cambios de armas |
| `game/cof-logic/client/cof_clothes_preview.cpp` | Modelo Studio original, encuadre y textura de retrato |
| `game/cof-logic/client/cof_client.cpp`, `cof_decals.cpp`, `cof_extras.cpp` | Integración cliente, acceso a API existente y diagnóstico de materiales |
| `game/cof-logic/client/cof_visual.cpp`, `patches/hlsdk/0003-root.patch` | Ruido original y punto de dibujo del HUD |
| `platform/web/extras.js`, `hud.js`, `loader.js` | Entrada de menú, selección, cierre y cursor |
| `platform/web/postfx.js`, `shaders/postfx.frag.glsl` | Composición del retrato y conservación del estado WebGL |
| `tools/stage_map.py`, `tools/wsl/package.sh` | Modelo común, arte original y deduplicación de dependencias |
| `tools/e2e/clothes_menu.mjs`, `clothes_profile_compat.mjs`, `visual_scenes.mjs`, `visual_noise.mjs`, `postfx_state.mjs`, `test_clothes_resources.py` | Nuevos contratos y pruebas reales |
| `tools/e2e/pointer_lock.mjs`, `ammo_hud.mjs` | Regresión de cursor y hash de servidor esperado configurable, conservando la comprobación |

## Compilación e integridad

Emscripten **4.0.11**, SDK portable base `8a09758d2912d278423870391f6c25995de0000b`, parches locales 0001/0002/0003. Se compilaron cliente y servidor en el árbol privado y se empaquetaron mediante las herramientas del repositorio. `build-seventh.log` registra el último enlace satisfactorio del cliente. Los intentos anteriores fallidos y sus correcciones se conservaron.

| Módulo montado realmente por el navegador | SHA-256 |
|---|---|
| Cliente nuevo | `45294e1e911c5c2caf3c8c022f1555b21fe02c8e4524acca3a76684f51fd6b4f` |
| Servidor nuevo | `91ca7418dcdcb520cd1479d77ca6646af79e455158c23f179661a1f46f7954f4` |
| Renderizador conservado | `8db286f9132d53133c1a9887ef78bf0735dd264962846f2db6b66350d11e0eec` |
| Filesystem conservado | `85e8f987a23b86f6dcabc92acda5e2818653bb155e84b7fab25fdbd3ec507a95` |
| Menú del motor conservado | `bbde8c4bcdfc8b61ed538fbcd86c5d92693a35277a7955fa502f5232285e6051` |

Los resultados del menú incluyen hashes leídos del filesystem del runtime, no solo del directorio de compilación. El motor principal conserva los bytes de la base privada. Las DLL originales, recursos comunes y BSP se comprueban mediante `final_audit.py`; no se incluyen esos binarios originales en el repositorio. El modelo compartido se monta una sola vez, incluso al cargar `c_start`.

## Resultados reales de pruebas

Evidencia: `build/validation/visual-clothes-2026-11-07/`. Playwright **1.64.1**, Chromium **156.0.8078.4** y Firefox **157.0**, este último con Xvfb y WebGL de software. El audio de salida se mantuvo silenciado; la prueba de voces mide la señal interna y no acredita escucha humana.

| Prueba | Resultado y alcance |
|---|---|
| `clothes-final` / `clothes-firefox-final` | PASS en ambos navegadores sobre la candidata final: modelo real, doce opciones, materiales, bloqueo, reapertura, perfil frío, guardado nativo y Nueva partida con captura del ratón |
| Materiales de ropa | Lectura de la textura GPU, geometría alfa visible, hashes de imágenes distintos, IDs de chaqueta/pantalón/cara correspondientes; error GL cero y sin errores JavaScript en estas suites |
| Desbloqueo HLC | `Use` de la entidad original en `c_apartment1` concede 4096 y habilita exclusivamente esa prenda además de la predeterminada |
| Cobertura del resto de ropa | Desbloqueo diagnóstico explícito para probar materiales; **no acredita haber conseguido esas prendas jugando** |
| `profile-compat` | PASS: lector nuevo/perfil antiguo, preferencia bloqueada y lector WASM antiguo/perfil nuevo; archivos sin reescritura durante lectura |
| `postfx-state` | PASS en cuatro combinaciones anterior/candidata × Chromium/Firefox; reproduce el fallo anterior y verifica la corrección |
| `hud-css` | PASS: reproduce el colapso Gecko anterior y conserva geometría de vida/energía, escalado y condiciones de ocultación en ambos motores |
| `pointer-lock-final.log` | PASS: movimiento raw, fallback, rechazos, APIs antiguas, promesas SDL ignoradas y protección de interfaz |
| `clothes-resize-ready` | PASS: el retrato GPU reaparece con geometría válida tras pasar por ventanas 640×480, 1280×900 y 960×720, sin errores JavaScript |
| Contratos BSP | PASS: **11 pruebas** mediante `unittest discover -s tools/e2e -p 'test_*maps.py'` |
| Recursos de ropa y ruido | PASS: **3 pruebas** de recurso original, secuencia, sprite y deduplicación |
| `visual-noise-repeat` | PASS en `c_start`: sprite válido, intensidad 0,6 → 153, 0,5 → 127, teselas según resolución, parada/reanudación y sin activar fullbright |
| `scenes-before` / `scenes-after` | PASS de observación de seis mapas, incluidos los cinco solicitados, a 1 y 15 segundos tras conexión; capturas y estados guardados |
| Regresiones previas | **18/18 PASS**: campaña, manager, sonido, cámara, train, tracktrain, envpos, botones, transición, persistencia de triggers/ambientes, callbacks, extras, interacciones, puñetazo SP, manos duales, munición y voces |

Las 18 regresiones usan la candidata intermedia `852b9db38518`, con los mismos binarios finales. La candidata final solo añade la protección del cursor del menú raíz y el orden de su gesto Nueva partida; esos cambios se vuelven a verificar en ambas suites finales de ropa y en Pointer Lock. No se presenta la ejecución intermedia como una repetición completa de las 18 sobre otro manifiesto.

Se conservaron las cuatro instancias originales `multiscene1`. No se aumentaron los límites de confirmación ni se eliminaron entidades para obtener resultados satisfactorios. La preparación diagnóstica de mapas y desbloqueos está identificada en los scripts; no es una prueba de progresión natural.

## Capturas y cómo repetir

Los resultados contienen las capturas `clothes-final/costume-0.png` a `costume-11.png` y equivalentes de Firefox. Ejemplo: [Hello Kitty en Firefox](../build/validation/visual-clothes-2026-11-07/clothes-firefox-final/costume-3.png). Los pares observacionales están en `scenes-before/` y `scenes-after/`, nombrados por mapa y segundo. Los instantes de cinemática no están sincronizados con precisión de frame; no se atribuye toda diferencia entre imágenes al filtro de ruido.

Con la candidata servida en localhost, ejecutar los scripts con `node tools/e2e/clothes_menu.mjs <base> <salida nueva> [firefox]`, `visual_noise.mjs <base> <salida nueva>` y `visual_scenes.mjs <base> <salida nueva>`. Firefox requiere un servidor gráfico en este entorno. Los contratos de recursos requieren `COF_STAGE` y `COF_ORIGINAL`. La evidencia conserva recetas privadas de SDK, staging, empaquetado y auditoría; no requiere escribir en `dist/`.

## Fallos conservados y limitaciones

- Los primeros intentos de previsualización mostraban el modelo pequeño/gris o no recuperaban la textura al reabrir. Las ejecuciones fallidas se conservan junto a las satisfactorias; la solución usa un destino UI separado y reanuncia la textura.
- Firefox reprodujo una captura tardía del cursor tras recargar. La candidata final corrige ese caso y demuestra que Nueva partida sigue capturando el ratón por interacción normal.
- El primer arnés de ruido envió comandos antes de la conexión real. Otro intento no recibió confirmación con cheats desactivados. Se corrigió el arnés, no los límites ni el juego. Un tercer intento no completó la conexión en 60 segundos y mostró un contador de tiempo negativo en el log; **la causa de ese intento aislado no está demostrada**. La repetición completa pasó y el fallo queda conservado en `visual-noise-final/`.
- La previsualización puede necesitar la resincronización periódica del servidor tras una reinicialización de vídeo; no se afirma continuidad sin un frame de transición durante cambios de tamaño.
- El primer ensayo de resize leyó la textura retirada antes de que llegara su reemplazo y falló. El ensayo conservado `clothes-resize-ready` espera la nueva textura válida dentro del mismo límite de 30 segundos y comprueba sus píxeles; no se aumentó ese límite.
- No se realizó una prueba física Android/iOS ni escucha humana del sonido. Tampoco se valida aquí un recorrido natural completo de campaña.
- Continúan pendientes las comparaciones nativas de oscuridad y luz dinámica, bump/specular y lightmaps, el algoritmo exacto de gamma/contraste, la viñeta original de cuatro TGA y las diferencias de kernel/orden de blur y gris. No se sustituyeron por efectos inventados.
- Los logs mantienen avisos heredados de recursos de compatibilidad y `info_texlights`; aprobar las suites no significa que todos los avisos del motor hayan desaparecido.

## Convivencia con otros cambios y siguiente paso

La investigación empezó en `97c7277`. Durante el trabajo aparecieron commits externos de README/SEO/verificación de buscadores, hasta `6535bc9`. Se preservaron: no son commits realizados por esta tarea. Por eso el estado publicado actual puede diferir del manifiesto del inicio. La comprobación adecuada de no alterar la publicación es `git diff HEAD -- dist`, sin cambios locales propios; no restaurar `dist/` a la fotografía antigua.

La ropa queda implementada y probada en la candidata privada. La fidelidad visual queda **parcialmente reconstruida**. El siguiente trabajo recomendado es obtener capturas nativas autorizadas de puntos reproducibles en las cinco escenas y resolver primero diferencias demostradas de luz/materiales; después reconstruir la viñeta con su colocación original. El informe no autoriza publicación ni cambios de distribución.
