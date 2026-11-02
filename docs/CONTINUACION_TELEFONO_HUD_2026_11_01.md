# Continuación de la Alpha: teléfono, HUD y compatibilidad

Fecha: 1 de noviembre de 2026. Relevo de Claude Code, HEAD inicial `9588f8f`, rama `codex/c-start-padlock`, árbol Git limpio al iniciar.

## Alcance y resultado

Se investigó el problema de iluminación del teléfono y se corrigió una causa demostrada de divergencia: **F activaba un filtro de brillo aunque el servidor mantuviera apagada la linterna**. La implementación original del clic derecho se reconstruyó como un puñetazo; ese ataque todavía no está implementado en el port. En los ensayos de esta etapa, el clic derecho no modificó el estado de la luz. **No se declara resuelto el síntoma completo comunicado por el usuario**, quien precisó que todo su entorno se ilumina en el primer capítulo.

Las barras de salud/energía no desaparecieron indebidamente en los escenarios comprobados. Se investigó el indicador de munición original y se inventariaron los extras ausentes de los once BSP. Esa investigación no equivale a implementar el sistema de cargadores, ropa, comentarios o visión nocturna.

Se conserva el trabajo anterior. No se modificaron `dist/`, mapas, modelos, sonidos, el motor ni el renderizador; no se hicieron commits, pushes ni despliegues. No se usaron Steam ni DLL nativas en el producto web.

## Estado recuperado y fuentes

Se leyeron `CLAUDE.md`, `CONTINUATION_2026_10_31.md`, `INFORME_MEJORAS_2026_10_31.md`, `PERSISTENCIA_ENTIDADES_2026_11_01.md`, `HUD_PHONE_FOOTSTEPS.md`, el informe de linterna de Codex y la consolidación de la Alpha. Las conclusiones históricas se contrastaron con el código actual y con ejecución nueva.

Fuentes locales originales: proyectos Ghidra `build/entity-analysis/cof_classes` y `build/envpos-client-analysis/envpos_client`, abiertos exclusivamente con `-readOnly -noanalysis`; staging de `/root/cof-audits/audit-D3Kl5uly/stage`. No se necesitan DLL originales para ejecutar las pruebas web. Los volcados descompilados `native-*.txt` están excluidos de Git; el informe conserva las direcciones y conclusiones, no publica las DLL ni sus proyectos.

Evidencia nueva: `build/validation/phone-hud-2026-11-01/`. Los ensayos anteriores permanecen separados. Entorno: Emscripten 4.0.11, Playwright 1.64.1, Chromium 156.0.8078.4, SwiftShader. Los navegadores de prueba están silenciados; el volumen del juego no se cambió.

## 1. Teléfono e iluminación

### Contrato original comprobado

La factoría `weapon_mobile` (`hl.dll`, `10053e50`) instala la vtable de `CMobile`, `101b26c8`.

| Operación | Evidencia original | Comportamiento |
|---|---|---|
| Ataque principal | slot 105, `10053990` | Animación 4/8; programa `CMobile::FlashToggle` a 0,23/0,66 s. |
| Cambio efectivo de modo | `FlashToggle`, `100530b0` | Cambia el modo SMS/linterna y bits de presentación; no es el ataque secundario. |
| Ataque secundario | slot 106, `10053a70` | Animación 10/11 según modo, sonido `weapons/mobile/punch_swing.wav`, reacción de vista y callback diferido `CBasePlayer::MeleeHitThinkPunch` a 0,133 s. No alterna el modo de luz. |
| Golpe diferido | `CBasePlayer::MeleeHitThinkPunch`, `100e7af0` | Trazado/impacto y daño original; la descompilación no recupera todos los argumentos. No se reconstruyó un golpe aproximado para suplirlo. |

En el port `CCofMobile` hereda un `SecondaryAttack()` vacío de `CBasePlayerWeapon`. Eso confirma una funcionalidad pendiente, pero no explica por sí solo un cambio de iluminación al pulsar el botón derecho. La configuración preparada asigna MOUSE1 a `+attack` y MOUSE2 a `+attack2`; la prueba vuelve a consultar el bind servido.

### Defecto reproducido con F

Había dos propietarios de la tecla:

1. El motor envía el comando `flashlight` al servidor. Con el teléfono en la mano ese comando no cambia la luz: el modo se controla con el ataque principal.
2. Un listener DOM de `postfx.js` alternaba incondicionalmente `settings.flashlight` al recibir KeyF con Pointer Lock.

El segundo camino no consultaba inventario, modo SMS, estado del servidor, cambios de arma ni guardados. El shader multiplica la imagen y podía seguir encendido al guardar el teléfono. No es la linterna proyectada del cliente original.

En `baseline/`, después de pasar al modo SMS, F activa `fx.flashlight=true` y la media de la región medida pasa de aproximadamente 69–73 a **239,99/255**. El filtro sigue encendido al equipar la navaja. La evidencia incluye capturas y el estado del postprocesado; las variaciones pequeñas entre frames anteriores no se atribuyen al clic derecho.

### Corrección mínima

Se retiró únicamente el listener KeyF de `postfx.js`. El comando normal sigue llegando al servidor y `CoFLight` sigue controlando el foco `COF_SPOT_KEY`. El filtro antiguo conserva su código y la API `CoFPostFX.set({flashlight:true})` para diagnóstico. No se modificaron sus shaders ni el foco, su color, alcance, apertura, intensidad o gamma.

Se amplió `cof_weapon_status`, bajo `sv_cheats`, con una línea `COF/PHONE` que muestra modo, luz efectiva, dual y mensaje. Es observación: no modifica el estado ni imprime por frame.

### Comprobaciones de controles

En `controls-fixed/`, con Pointer Lock e inputs de ratón/teclado reales:

| Estado | Modo | Luz servidor | Filtro |
|---|---:|---:|---:|
| Teléfono en linterna, antes/después de clic derecho | 1 | 1 | apagado |
| Tras ataque principal, antes/después de clic derecho | 0 | 0 | apagado |
| F con teléfono en modo SMS | 0 | 0 | apagado |
| Navaja recién equipada | 0 | 0 | apagado |
| Primera F con navaja y teléfono en el bolso | 0 | 1 | apagado |
| Segunda F con navaja | 0 | 0 | apagado |

La región medida con la navaja cambia de 70,94 a 76,98 y vuelve a 70,95: funciona el foco real sin añadir el filtro saturado. Las dos pulsaciones derechas mantienen modo/luz. No hubo errores JavaScript ni WebGL en el ensayo.

**Límite:** esta prueba se hizo en `c_apartment1` y con equipo concedido para diagnóstico; no acredita obtenerlo mediante un recorrido natural ni descarta otros problemas visuales en todos los puntos del capítulo, con otras configuraciones o con GPU física.

## 2. Barras de salud y energía

Se revisaron `CoF_PlayerPreThink`, la emisión periódica `COF/HUD STAT`, `m_iHideHUD`, `refreshBars`, la pantalla de carga y los flags de `trigger_camera`. El original de referencia oculta las barras con máscara `0xc` y en `c_nightmare`.

Prueba nueva `hud_lifecycle.mjs`, carpeta `hud-lifecycle/`:

| Condición | Resultado observado |
|---|---|
| Launcher → Jugar → Nueva partida → dificultad | Arranca `c_intro` por la interfaz real; SW controla la página. |
| Cámara inicial de intro | Ambas barras ocultas, conforme al estado recibido. |
| Carga diagnóstica de c_apartment1, cámara inicial | Ambas ocultas durante la cinemática original. |
| Fin de la cámara, navaja equipada | Ambas visibles, opacidad 1 y tamaño distinto de cero. |
| Bolso abierto/cerrado | El estado de las barras se conserva; se registró el estado real del bolso. |
| Pausa y regreso | No se pierde el estado de las barras. |
| Guardar y restaurar | Las barras vuelven a estar visibles; los recursos de imagen están cargados. |
| Segunda visita con Service Worker | Las barras aparecen después de terminar la introducción. |

Se verificaron dimensiones, opacidad y carga real de las imágenes, además de conservar capturas y mensajes STAT. No se cambió el código del HUD para conseguir estos resultados. La primera captura tras restaurar todavía puede coincidir con el fundido de carga; la versión ampliada del ensayo espera también que esa capa termine y comprueba una transición nativa entre apartamentos. **`hud-transition/` y `hud-equipped-camera/` pasan:** la segunda repetición equipa la navaja mientras la cámara original sigue activa, comprueba que las barras siguen ocultas y que reaparecen al concluir; tras restaurar y usar el trigger original de cambio de nivel aparecen también en c_apartment2. En ambas repeticiones el Service Worker controla la página y no hay errores JavaScript.

Los cambios de mapa del ensayo son diagnósticos, no un recorrido continuo desde Nueva partida hasta los apartamentos. No se certifica la ausencia del síntoma en todos los navegadores del usuario.

## 3. Munición: investigación antes de implementar

Se recuperó `CHudAmmo::Draw` de `client.dll`, función `100177c0`, y su inicialización `1001bb40`. El original carga, entre otros, `cof_glock_mag`, `cof_glock_mag_icon` y `cof_mag_cross`; dibuja el cargador usando el clip como frame del sprite, un icono y una reserva numérica. Oculta esta presentación según máscara `0xd`. También existen mensajes `AmmoInv`, `DualAmmo`, `WpnInfo` y `WpnDeploy`, y una interfaz separada de cargadores.

En el staging, `sprites/hud.txt` declara `cof_glock_mag` como 32×128, su icono como 32×32 y la cruz como 16×16. El port compila aún el `CHudAmmo::Draw` del HLSDK, cuya primera condición exige `WEAPON_SUIT`: Simon no lleva ese traje. No basta con quitar esa condición, porque se obtendría la interfaz de munición de Half-Life.

La función original `1001a070` obtiene una reserva específica por arma; para Glock ID original 3 usa el campo `+0x50`. El port usa ID 17 y la reserva común `9mm`, contada actualmente como balas también en el bolso. La correspondencia completa con los cargadores originales, el estado dual y los mensajes originales requiere más trabajo. **No se añadió una barra genérica ni se presentaron balas como cargadores.**

## 4. Extras y entidades ausentes

`map_compat_inventory.py` lee exclusivamente los BSP preparados y las factorías `LINK_ENTITY_TO_CLASS` del SDK y del port. `map-inventory.json` conserva propiedades y referencias de cada extra. No copia BSP ni recursos.

| Mapa | Comentarios | Otros extras sin factoría |
|---|---:|---|
| c_game_menu1 | 0 | — |
| c_intro | 0 | — |
| c_nightmare | 4 | — |
| c_start | 4 | cof_clothesmenu, item_nightvision |
| c_start2 | 2 | — |
| c_apartment1 | 4 | cof_hoodie |
| c_apartment2 | 0 | — |
| c_apartment3 | 3 | — |
| c_apartment4 | 1 | — |
| c_apartment5 | 2 | — |
| c_apartmentsick | 2 | — |
| **Total** | **22** | **3** |

La comparación estática también detecta `info_texlights`; se distingue de los extras jugables y no se añade una entidad vacía para ocultar su aviso. **La carga real de los once mapas (`runtime-inventory/`) coincide exactamente con las clases y cantidades de factorías ausentes del inventario estático**, incluidos los 25 extras. No hubo errores JavaScript en esas cargas. Esto confirma la ausencia de factorías, no la fidelidad de todas las factorías que sí existen.

### Semántica original recuperada y límites

- **Comentarios:** `DevThink` (`1002c2a0`) consulta `dev_commentary` y condiciones de desbloqueo. `DevUse` (`1002c4b0`) manda audio y autor, guarda/reduce volumen, inmoviliza y conserva condiciones previas para restaurarlas al terminar o pulsar Enter. `noise` es la grabación, `fuser2` su duración e `iuser1` el autor. No sería equivalente reproducir un WAV y omitir la restitución del control/volumen. El original usa GetAsyncKeyState para Enter; la versión web debe reconstruir esa entrada sin introducir una dependencia de Windows.
- **Sudadera:** `HoodieUse` (`10094ec0`) comprueba jugador vivo, otorga un bit de desbloqueo, presenta el mensaje, reproduce find_note y retira el objeto. La instancia de c_apartment1 tiene `iuser1=5`: HLC, bit original `0x1000`; modelo `models/costumes/Folded_HLC.mdl`, presente en staging. Falta integrar de forma comprobable el perfil persistente de desbloqueos y el menú de ropa; no se inventó un flag aislado que se pierda entre campañas.
- **Ropa:** `cof_clothesmenu` conserva `cameraent` y `simonent`; la instancia real enlaza `clothescamera` y `simonclothes`. Se recuperaron sus dos campos de serialización. La parte de selección/aplicación y persistencia de trajes todavía no está reconstruida completamente. La búsqueda de un símbolo llamado `ClothesUse` no encontró esa función: no se tomó ese nombre supuesto como un contrato real.
- **Visión nocturna:** `item_nightvision` usa `models/items/w_nightvision.mdl`; la instancia real de c_start tiene `frags=-1`. Su efecto completo cliente/renderizador y condición de desbloqueo siguen pendientes. No se añadió un filtro verde arbitrario.
- **Recursos:** `resource-availability.json` verifica 27 rutas esperadas: están Folded_HLC y los tres sprites de munición inspeccionados; faltan `models/developer_commentary.mdl`, `models/items/w_nightvision.mdl` y las **21 grabaciones distintas de los 22 comentarios**. El juego original ya no está instalado en la ruta histórica; las DLL de Ghidra no sustituyen esos recursos. Comentarios y visión nocturna no pueden validarse completos con el staging actual. No se copiaron bytes de modelos, sprites o sonidos al informe.
- **Gato:** `CCoFDeadCat::CatUse` (`100931f0`) permite cinco interacciones "A dead cat..." y después "Hello kitty...", con sonido y desbloqueo, sujeto a estado previo. No se encontró una instancia de esa clase ni referencia a hellokitty en los once BSP. No se convirtió cualquier env_model de gato en una entidad distinta.

Estas entidades continúan pendientes. No se añadieron factorías decorativas para que desaparezca "No spawn function for".

## 5. Mediciones de iluminación

Se repite `flashlight_maps.mjs` contra la build nueva, con los BSP y los enemigos originales. Se comparan linterna apagada/encendida, `gl_overbright` 0/1, control negativo `r_dynamic=0`, cuatro orientaciones, y guardado/restauración. Los datos son regiones concretas, no una afirmación sobre cada habitación del mapa.

Resultados nuevos: medias de luminancia 0–255 de la región central, con el filtro de postprocesado desactivado:

| Mapa y orientación | Overbright 0, apagada → encendida | Overbright 1, apagada → encendida |
|---|---:|---:|
| c_apartment1, 270° | 43,492 → 56,904 | 46,454 → 60,404 |
| c_apartment2, 0° | 12,622 → 33,427 | 12,338 → 38,460 |
| c_apartment3, 90° | 8,697 → 16,395 | 8,877 → 19,134 |
| c_apartment4, 0° | 0,942 → 21,665 | 0,938 → 26,991 |
| c_apartment5, 0° | 17,176 → 31,728 | 17,180 → 34,712 |

En las diez combinaciones, apagar `r_dynamic` recupera la media de referencia (diferencia medida 0); guardar/restaurar conserva la iluminación dentro del umbral original de 1. Las condiciones de salud se conservaron durante las mediciones definitivas y no hubo errores JavaScript.

El primer intento de c_apartment3 **falló**: un Faster atacaba al jugador, su salud había bajado a 64 y el movimiento de la vista impedía estabilizar la orientación. Se conserva en `lighting/c_apartment3/`. La repetición `lighting-apartment3-combat/` usa la preparación de combate ya existente, sin modificarla: arma concedida, disparos normales contra el atacante cercano, comprobación de salud estable y otros enemigos conservados. Pasa con salud 100 antes/después. No se alteró el límite de la prueba, la IA ni la colisión, y no se acredita como recorrido natural.

No hay capturas equivalentes nuevas del juego nativo: su instalación histórica ya no está disponible. Por tanto, los números del port y las fórmulas reconstruidas no prueban fidelidad visual final frente al original. No se ajustaron gamma, texturas o iluminación para superar un umbral. La prueba histórica de la pared a 90° con overbright 0 y ganancia +4,90 no se ha convertido en un éxito por elegir otra orientación; sigue siendo una limitación de aquella comparación.

## 6. Compilación, integración y regresiones

Build privada: `/root/cof-audits/phone-hud-20261101/dist-controls`, servida con carpeta explícita en el puerto **8111**. `dist/` del repositorio se sirvió únicamente como control anterior en 8110.

- Compilación Emscripten satisfactoria: **2,604 s**, `player_cof.cpp` y enlace del servidor.
- Empaquetado de los once mapas satisfactorio, manifiesto **`2f88e7b98c18`**.
- Servidor nuevo: **`07e7ef5cb6df07708b5c3c15abb7fd18e6a3bcb17d60efb5ad0e6605c2d37ee1`**.
- Cliente conservado: `e0bc9af55fa19c19b085c88da63eb425f8606976da408425db28fac2517b2222`.
- Los parches de hlsdk y Xash pasan comprobación inversa contra los árboles canónicos; no se editaron en esta etapa.
- Regresión del bucle de lightmap: pasa el código actual y detecta el fallo anterior, sin recursos originales.
- Los resultados de navegador se generan contra 8111 con los límites históricos y multiscene1 conservados.

Resultados definitivos:

| Prueba | Resultado nuevo |
|---|---|
| Contratos BSP | **9/9**: 7 generales, envpos y candado. |
| Pointer Lock | **PASS**. |
| Regresiones de navegador | **14/14**: entities, campaign_entities, motion_entities, model_entities, manager_entities, sound_entities, camera_entities, train_entities, track_entities, envpos_entities, button_entities, changelevel_entities, trigger_persistence, ambient_persistence. |
| Controles del teléfono | **PASS**, dos ejecuciones: `controls-fixed/`, `controls-repeat/`. |
| Ciclo de HUD | **PASS**, tres ejecuciones progresivamente ampliadas; la final comprueba navaja durante la cámara y transición nativa a c_apartment2. |
| Factorías en los once mapas | **PASS**: avisos observados coinciden con el inventario. No implica implementar los extras. |
| Guardado a 3 y 20 s | **0 avisos** de punteros inválidos en ambos casos. |
| Callbacks, misma sesión y navegador nuevo | **39/39** en ambos; cinco monstruos reanudan animación. |
| Operaciones después de restaurar | Munición y jeringa se recogen, Spark se apaga/reactiva, spawnm3 genera un único baby sin repetirse tras cargar, *127 conserva Touch y alcanza hiss1_land1, cambio a c_apartment2 con inventario. |
| Zoom activo | Retorno y reutilización con configuración original conservados. |
| Lightmap | Regresión C y mediciones definitivas de los cinco mapas satisfactorias; primer intento de apartamento 3 fallido conservado. |

La repetición de callbacks usa los fixtures anteriores sin reescribirlos. Sus posicionamientos de diagnóstico y Use remotos no se presentan como progresión natural. El aviso temprano de CTestHull fuera de estas ventanas sigue pendiente; cero avisos a 3/20 s no demuestra que todos los callbacks de la campaña estén cubiertos.

`verification-manifest.json`, generado por `verify_results.py`, comprueba datos, módulos montados realmente, hashes de los 18 logs de regresión, correspondencia estática/runtime, recursos ausentes, pruebas funcionales y ausencia de cambios en dist/. Su salida es PASS y declara explícitamente que el síntoma original de clic derecho y los extras siguen sin resolverse por completo.

Ensayo adicional no concluyente: se intentó capturar una página CSS mínima con Zen 1.22b/155.0.1 en un perfil temporal vacío y modo headless; la invocación terminó sin producir la captura. No se usó ni modificó el perfil del usuario. No se considera una prueba satisfactoria de Zen ni evidencia de un defecto de CSS, y no se cambió el dimensionado de las barras basándose en ese intento.

## 6b. Alcance de E: contraste adicional

Se releyeron `hl.dll` `100ea630` (PlayerUse) y `100e4410` (inventoryuse) en modo de solo lectura. La búsqueda esférica de **PlayerUse** pasa el float 80 (`0x42a00000`); el port aún hereda 64 del SDK en esa búsqueda. La búsqueda de **inventoryuse** pasa 64 (`0x42800000`), como `CoF_UseItemOn` actual. No se deben aumentar ambos radios por analogía.

El PlayerUse original tiene además una traza posterior que solo admite entidades con capacidad `0x200`. No se identificó todavía aquí el contrato completo de esa capacidad ni se acreditó un fallo de progresión por ese camino. Se conserva esta diferencia documentada y no se modifican selectores o flags sin una regresión que reproduzca el caso real.

## 7. Archivos y continuidad

Producto modificado: `platform/web/postfx.js` (propiedad de KeyF) y `game/cof-logic/cof/player_cof.cpp` (observación COF/PHONE).

Pruebas nuevas: `tools/e2e/phone_secondary_probe.mjs`, `hud_lifecycle.mjs`, `map_compat_inventory.py` y `map_spawn_inventory.mjs`. Análisis de solo lectura: nuevo `tools/ghidra/DumpVtableRange.java`; `DumpFuncs.java` acepta también nombres de funciones además de direcciones, para recuperar callbacks ya identificados por Ghidra. Se conservan los modos previos del script.

Documentación: este informe y una sección nueva en `CLAUDE.md`. Evidencia y auxiliares: `build/validation/phone-hud-2026-11-01/`, incluidos scripts de compilación/ejecución, `inspect_resources.py`, `verify_results.py`, la página CSS aislada, JSON, logs y capturas. Su `.gitignore` excluye los volcados originales y las partidas generadas. La revisión final de Git conserva HEAD `9588f8f`, índice sin cambios preparados y dist/ sin diferencias. `git diff --check` termina satisfactoriamente; los mensajes de conversión LF/CRLF son avisos de la configuración de Git, no fallos de compilación.

Prioridades pendientes:

1. Contrastar el síntoma de entorno completamente iluminado con una captura/configuración equivalente del usuario y con la referencia nativa. El clic derecho no está acreditado como causa ni como arreglado.
2. Reconstruir por completo MeleeHitThinkPunch y validar el puñetazo; no basta con reproducir su animación.
3. Verificar reservas/cargadores y condiciones del HUD de munición antes de implementarlo con los sprites originales.
4. Recuperar legalmente los recursos ausentes y reconstruir el perfil de desbloqueos y los efectos de los extras; conservar estados de control/volumen al implementar comentarios.
5. Seguir con las pruebas naturales del botón de vídeo `c_apartment3 *133`, puerta `c_apartment4 *96`, búsqueda de E a 80 unidades, traza 0x200, useunlock y auxiliar CTestHull. No se presentan como resueltos por esta etapa.

Este informe es un avance verificado, no la conclusión de todas las tareas del relevo ni una certificación de campaña completa.

## Integración posterior autorizada

El usuario autorizó después incorporar esta etapa al repositorio, dist/ y GitHub Pages. La promoción y sus comprobaciones están documentadas en [PUBLICACION_TELEFONO_HUD_2026_11_01.md](PUBLICACION_TELEFONO_HUD_2026_11_01.md). Las afirmaciones anteriores de «sin modificar dist/ ni publicar» corresponden a la investigación inicial, antes de esa autorización.
