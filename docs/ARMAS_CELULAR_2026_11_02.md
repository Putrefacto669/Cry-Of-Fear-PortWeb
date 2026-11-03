# Armas y celular — 2 de noviembre de 2026

## Alcance y referencia original

Se conservó la etapa anterior en el commit local `9899747` (extras, informes y pruebas). No se hizo push ni se modificó `dist/`. Esta etapa implementa el puñetazo con el teléfono solo y las parejas celular/cuchillo y celular/Glock. Las pruebas de equipamiento son diagnósticas: entregar armas, colocar al jugador o crear un blanco no acredita progresión natural del capítulo.

La instalación de Steam se consultó exclusivamente en lectura. Referencia `hl.dll` SHA-256 `0036b91c01e92ed205513f52563053a55a66a32d257efb5f476b8f1f3dde0e63`; `client.dll` `d2a04641b301804f6f449aa68265042b13adc360925b80033d417ec9f38c9c00`. Los volcados de análisis y partidas quedan excluidos de Git. No se incorporan modelos, sonidos ni DLL originales.

## Contratos reconstruidos

- Teléfono solo: teléfono en derecha, puñetazo izquierdo con clic derecho. `CMobile::SecondaryAttack` (`10053a70`) reproduce secuencia 10 o 11 según modo SMS/linterna, sonido de balanceo y espera de un segundo. Programa impacto a 0,133 s (`100e7af0`), traza de 32 unidades con comprobación de casco y `FindHullIntersection` para geometría BSP. `sk_cof_punch1..4` vale 5 en la configuración original; se respeta el daño configurable, los grupos de impacto y la máscara original `0x04001000`. El golpe no cambia SMS/linterna.
- Pareja: teléfono a la izquierda; arma a la derecha. `inventorydualwield` (`100de990`, creación `100e08b0`) valida propiedad, ranuras distintas y armas de una mano; normaliza la fuente de luz hacia la izquierda. En el original, clic izquierdo dispara/ataca con la derecha y clic derecho opera la izquierda. Con teléfono acompañado, este último cambia SMS/linterna y no lanza un puñetazo adicional.
- `inventorycombine` es un sistema separado de recetas de objetos. No se reemplaza ni se confunde con DUAL WIELD.
- El cliente original (`1008c7e0`) dibuja un segundo modelo de vista, invierte la columna Y local por -1 y desactiva descarte de caras durante ese dibujo. No hay un modelo combinado nuevo: se reutiliza `models/weapons/mobile/v_mobile.mdl`.
- Secuencias de puñetazo originales: `sms_punch` y `flash_punch`, 30 fotogramas a 30 FPS. Los recursos del teléfono y los dos sonidos de golpe ya estaban en los paquetes privados; no se añadieron recursos originales al repositorio.

## Implementación

`game/cof-logic/cof/weapons_cof.cpp`: puñetazo diferido en entidad `cof_punch_hit` con EHANDLE guardado y Think virtual; no depende de un puntero de función no registrado. Las parejas reutilizan los objetos reales del inventario y su munición. Se guardan la mano del cuchillo y el temporizador de luz del teléfono. Se mantienen independientes los ataques y animaciones de ambas manos.

`game/cof-logic/cof/cof_player.h` y `player_cof.cpp`: validación de pareja, salida explícita a arma individual y persistencia de arma derecha, secuencia, serial y tiempo de animación. Una petición inválida conserva la pareja válida anterior. El estado antiguo `dual` sin selector nuevo conserva la compatibilidad prevista con cuchillo, sin afirmar compatibilidad con partidas nativas.

`game/cof-logic/client/cof_hands.cpp`, `cof_client.cpp`, `cof/atmosphere.cpp`: mensaje `CoFHands` de 12 bytes, animación independiente y dibujo del teléfono reflejado; actualización de fase por tiempo transcurrido y resincronización periódica. Instrumentación opcional `cof_weapon_debug` y comando cliente `cof_hands_render`.

`patches/hlsdk/0001-root.patch`: integración del segundo modelo en el renderizador Studio del SDK cliente. El motor Xash3D y el módulo del renderizador no se modifican. El parche se exportó del SDK real y pasó `git apply --reverse --check`. Las líneas de contexto de este parche anidado generan avisos de espacios de Git; no se mutilaron para ocultarlos. El resto del diff pasa la comprobación de espacios.

`platform/web/hud.js`: la confirmación DUALSELECT cierra el bolso tras seleccionar la pareja. Se conserva la interacción existente del menú DUAL WIELD.

Pruebas nuevas: `tools/e2e/phone_punch.mjs`, `phone_punch_impact.mjs` y `dual_hands.mjs`. Ayuda de análisis local: `tools/ghidra/DumpInstructions.java`.

## Compilación y ejecución

Emscripten 4.0.11; Playwright 1.64.1; Chromium 156.0.8078.4; navegador silenciado mediante `--mute-audio`. Se preservan los fences de 30 segundos y las cuatro instancias originales `multiscene1`.

La primera compilación dual falló por usar `HasNamedPlayerItem` como puntero cuando devuelve BOOL. Se corrigió buscando el objeto realmente transportado en las listas del inventario. La segunda compilación enlazó servidor y cliente satisfactoriamente, en 2,381 s. Ambos logs se conservan.

Build privada: `/root/cof-audits/dual-20261102/dist-hands-first`, servidor de validación local en puerto 8121. Módulos montados y comprobados por SHA-256 desde el navegador:

- servidor: `1825e06ab8b8f627c03f9a8515b63cc9951147586ef57a6365f179d01e88cfd2`;
- cliente: `07cb1626ef02943514d0592df6e78f2aad39e51ca2137e896d44dc3715b7d0fb`.

## Evidencia inicial comprobada

`build/validation/dual-wield-2026-11-02/hands-first/result.json`: PASS, selección por el bolso real, cuchillo/celular, cambio independiente de luz, rechazo de ranura repetida, Glock/celular en orden invertido, disparo 15→14, guardar/cargar conservando 14 balas y ambos objetos únicos. Equipar teléfono individual elimina el segundo modelo. Cero errores JavaScript. Capturas `blade-phone.png` y `glock-phone.png` inspeccionadas visualmente: teléfono izquierdo y arma derecha visibles.

`punch-built/result.json`: clic derecho real inicia enfriamiento del puñetazo. `baseline-final/result.json`: el mismo ensayo en la build previa confirma la ausencia anterior del ataque. Los primeros intentos de baseline fallaron por una aserción incorrecta del bit de botón, que el SDK consume al procesarlo; se preservaron y se corrigió la prueba, sin cambiar el motor.

## Limitaciones

El original también aplica un impulso de cámara mediante una función y campos propios. No se sustituyó por un `punchangle` supuesto: ese detalle todavía no tiene equivalencia reconstruida. Las parejas con otras armas de una mano del original, recetas de combinación, efectos especiales de todos los materiales y notificaciones SMS durante cada animación no quedan certificados por esta etapa. El selector rechaza parejas aún no implementadas.

No se acredita aquí un recorrido natural nuevo ni jugabilidad completa del capítulo. Los 50 avisos históricos de callbacks de `c_start` siguen siendo una deuda separada de la auditoría anterior. Los resultados finales de impacto pendiente, restauración fría y regresiones se registran abajo al terminar su ejecución.
## Resultados ampliados

- `hands-cold-fourth/result.json`: **PASS**. Partida creada durante la transición linterna→SMS, restaurada desde un nuevo runtime iniciado en `c_game_menu1`: Glock con 14 balas, pareja activa, teléfono en SMS y luz apagada. `getError()` de WebGL devuelve 0 y no se perdió el contexto. Esta prueba acredita el estado final de la transición; no mide la igualdad de cada instante luminoso con el ejecutable nativo.
- `punch-impact-corridor/result.json`: **PASS**. Blanco diagnóstico `monster_slower` con colisión original, IA/pose inmovilizadas únicamente para aislar la traza. A 96 unidades del centro no pierde salud; a 40 unidades del centro, con la superficie del modelo dentro del alcance, recibe 5 puntos (1000→995). El daño diferido se guarda antes de dispararse: la partida conserva 995 y, tras cargar, aplica el golpe una sola vez hasta 990. El EHANDLE conserva el jugador y el blanco cambia de índice 284→279 sin romper la operación. El trabajador temporal desaparece después de impactar; esperar más no repite el daño.
- `punch-visual/result.json` y `phone-punch.png`: **PASS** de entrada real, enfriamiento 0,856 s observado y animación de puño izquierdo inspeccionada. El modo SMS/linterna no cambia al golpear. La imagen corresponde a una fase de la animación original; no acredita aún el impulso nativo de cámara pendiente.
- `regressions/`: **14 suites de navegador PASS**: entidades, campaña, movimiento, modelos, managers, sonidos, cámaras, trenes, tracktrains, envpos, botones, cambios de mapa, persistencia de triggers y sonido ambiente. **7 contratos de entidades BSP + 1 envpos + 1 candado PASS**, además de **Pointer Lock PASS**. No se retiraron `multiscene1` ni se ampliaron sus fences.
- `extended/callback_behavior/result.json`: **PASS**, 39 callbacks conservados, 39 en carga fría, cinco monstruos con animación, recogida de munición y jeringa, activación del generador, teletransporte y transición originales comprobados como regresiones diagnósticas.
- `extended/voice_mix_probe/result.json`: **PASS**, PCM después del panner antes/después de cargar, sin HRTF ni afirmación de escucha humana. `extended/zoom_persistence/result.json`: **PASS**.
- `extended/extras_interactions/result.json`: **PASS**, E en trampilla, llave original, uso de llave desde bolso, puerta y movimiento tras restaurar.

### Intentos fallidos conservados

Además de la primera compilación, se conservaron los ensayos `punch-impact-first`, `-near`, `-pending`, `-hook`, `-hook-fixed` y `-fixture`. Documentan colocaciones laterales demasiado próximas a paredes, variación de la pose del blanco, guardados que llegaban después del impacto y una llamada de prueba a `mouse.click` sin coordenadas. La prueba final coloca al jugador a lo largo del corredor y fija únicamente el blanco creado para el ensayo; no elimina enemigos originales. Para capturar la ventana de 0,133 s se observa el mensaje de inicio dentro del navegador y se encola el comando normal de guardado, evitando el viaje adicional a Playwright. No se alteran frames, reloj ni tiempo del golpe.

`hands-cold-first` llegó a la restauración, pero los comandos de auditoría fueron rechazados porque el runtime nuevo tenía `sv_cheats=0`; la prueba ahora lo habilita explícitamente antes de usar sus sondas. `hands-cold-second` esperaba observar exactamente 14 balas mientras mantenía pulsado el disparo y podía saltarse ese valor con la carga de pruebas; ahora suelta el botón y compara la munición realmente observada antes/después de guardar. `hands-cold-third` conservó el error de API de ratón mencionado. Los intentos posteriores satisfactorios se mantienen por separado. Ninguno de estos fallos se ocultó aumentando timeouts ni modificando condiciones de las regresiones anteriores.

`source-verification.json` confirma hashes originales sin cambios, manifiesto privado `84903bb46fe3`, módulos empaquetados y `dist/` principal sin diff. El módulo del renderizador conserva `8db286f9132d53133c1a9887ef78bf0735dd264962846f2db6b66350d11e0eec`.

## Uso

Abrir el bolso con TAB, seleccionar el celular, elegir DUAL WIELD y después el cuchillo o la Glock. El orden inverso también se acepta. Clic izquierdo opera el arma derecha y clic derecho cambia el teléfono izquierdo entre SMS y linterna. Equipar el celular individualmente sale de la pareja: el teléfono vuelve a la derecha y clic derecho lanza el puñetazo izquierdo. Los objetos permanecen separados en el inventario y no se generan copias de armas.

## Pendiente

Continuar con la referencia del impulso original de cámara y las demás armas de una mano antes de anunciar equivalencia completa del sistema nativo. La build es privada y los cambios se conservan mediante commits locales; esta etapa no publica GitHub Pages ni actualiza la distribución principal.
## Corrección adicional demostrada: recarga de Glock

Al guardar mientras se recarga, la build inicial perdía `m_fInReload`: restauraba 14 balas y 15 de reserva y nunca terminaba la recarga. Evidencia previa a la corrección: `hands-reload-final/result.json`. `CBasePlayerWeapon::m_SaveData` guarda cargador y temporizadores del arma, pero no la marca de recarga; el tiempo `m_flNextAttack` del jugador además es relativo con CLIENT_WEAPONS, aunque la tabla del monstruo lo trata como tiempo mundial.

La corrección se limita a `CCofGlock`: guarda `m_fInReload` y una copia FLOAT del tiempo restante del jugador. Al restaurar recupera ambos; la transferencia de munición sigue ocurriendo por el `ItemPostFrame` normal del SDK. No se llama a Spawn, Use, Reload ni Deploy para reconstruir artificialmente una operación. La marca se limpia normalmente al enfundar, como antes.

Los bloques nuevos de Glock, mano del cuchillo y temporizador del teléfono son opcionales al leer partidas antiguas: si falta el bloque, el lector rebobina y conserva el estado base. No se atribuye a partidas anteriores información que nunca guardaron; una mano o transición antigua no serializada sólo puede usar el valor predeterminado conocido.

Compilación de compatibilidad: `build-reload-compatible.log`, **PASS en 2,160 s**. Nueva build privada **`/root/cof-audits/dual-20261102/dist-hands-reload`**, puerto **8122**, manifiesto **`f0013e079220`**. Servidor montado **`ef7c00df9026d0c4dc529a3d6f17a0dec95682661b4d4bade5e4849a79fe9918`**; cliente y renderizador conservan sus hashes anteriores. La build inicial queda preservada.

`hands-reload-focus/result.json`: **PASS** con el arreglo: pareja y carga fría, disparo, munición original recogida por Touch, recarga guardada/restaurada y finalización en 15 balas + 14 de reserva. El intento `hands-reload-fixed` sólo registra conexión rechazada porque el servidor aún no se había iniciado; `hands-reload-fixed-live` conserva un fallo de foco de la prueba antes de abrir el bolso. El ensayo posterior da foco explícito al canvas antes de TAB; no modifica el juego.

`legacy-first/results.json`: **dos pruebas PASS**. Se cargó el checkpoint histórico `natural_gate` de octubre (teléfono/cuchillo) y una partida de la etapa de extras (Glock). Las armas siguen presentes tanto en el bolso como en las listas reales del jugador y se pueden equipar. Los archivos de partida se leyeron del entorno local y no se incorporaron al commit.

La repetición `punch-impact-repeat/result.json` también pasó en la primera build, confirmando de nuevo un único impacto restaurado y sin daño repetido. Los guardados ampliados a 3 y 20 segundos del apartamento tuvieron **cero avisos de punteros inválidos**; la selección de E con el checkpoint previo pasó en `extended/use_surface`.
## Verificación de la build corregida

`hands-final-cold-reload/result.json`: **PASS**. Además de bolso, dos modelos, disparo y restauraciones anteriores, se reabrió la partida guardada durante la recarga desde otro runtime iniciado en el menú. La Glock conservó `reload=1`, 14 balas, 15 de reserva y **2,34067 s pendientes**; sin pulsar R otra vez terminó con **15 + 14** y la pareja activa. Cero errores JS y WebGL 0. Esto verifica el tiempo relativo, no sólo el estado final.

`punch-final-reload/result.json`: **PASS** del alcance, daño y golpe pendiente exactamente una vez en la última compilación. La corrección de la Glock no altera ese callback. `source-verification-final.json` registra los hashes de los originales y de la build definitiva; confirma el `dist/` principal sin cambios. No se hicieron pushes ni despliegues.
`extras-final/result.json`: **PASS** en la última build para perfil de desbloqueos persistente, partida antigua, transición pendiente de visión nocturna y restauración del arma. Se ejecutó el intro original de `c_start` hasta que su cámara terminó normalmente; no se retiraron las cuatro escenas para acelerar la prueba.
La repetición completa sobre el servidor corregido concluyó con **14/14 suites de navegador, 9/9 contratos BSP y Pointer Lock PASS** (`regressions-reload/`). `voice-final` y `callbacks-final` también pasaron: señal PCM conservada antes/después de cargar, sin HRTF; **39/39 callbacks** tanto en carga normal como fría, cinco monstruos animados, munición, generador y transición funcionales. Cero errores JavaScript en las pruebas dirigidas.

**Conclusión:** el celular individual permite el puñetazo izquierdo original comprobado; las parejas con cuchillo y Glock muestran ambas manos, mantienen controles e inventario, y sobreviven a guardados y cargas normales/frías. Se corrigió una pérdida real de recarga sin alterar su ejecución normal. No se declara equivalencia con todas las armas del juego ni se acredita un recorrido nuevo completo de campaña. Los archivos originales y la distribución principal permanecen intactos.