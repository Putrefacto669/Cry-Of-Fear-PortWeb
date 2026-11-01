# Consolidación de la Alpha — avance verificable del 1 de noviembre de 2026

## Estado y alcance

**La Alpha completa y la fidelidad visual total todavía no están acreditadas.** Esta etapa añade mediciones de iluminación en los cinco apartamentos, corrige un fallo reproducido de daño de la Glock y conserva evidencia separada de las regresiones y de los intentos de recorrido natural. No se hicieron commits, pushes ni despliegues. `dist/` no se modificó.

Base efectiva comprobada: `36388770de3718ca3ceb8e8653aa790cb7e152f3`, rama `codex/c-start-padlock`. Las dos correcciones anteriores de linterna ya estaban integradas y publicadas; no se presentan como trabajo nuevo. Su referencia histórica es `PUBLICACION_LINTERNA_2026_10_31.md`. Se recuperaron CLAUDE.md, los informes de continuación, los árboles canónicos del SDK/motor y los registros anteriores. El contexto previo apuntaba a 52625b3; la comprobación final de Git identificó además 752c183 (sincronización de guardados con IndexedDB), 8eace0e (su distribución) y 3638877 (traza de E desde los ojos). Se conservaron esos avances y la nueva build usa el código actual, no una reversión al contexto antiguo.

Árbol canónico: `/root/cof-audits/audit-D3Kl5uly`. Build nueva y privada: `/root/cof-audits/alpha-20261031/dist-glock`. Servidor de prueba con directorio **explícito**: `python3 serve.py /root/cof-audits/alpha-20261031/dist-glock --port 8104`.

Evidencias nuevas: `build/validation/alpha-consolidation-2026-10-31/`. La carpeta conserva la fecha de inicio de la investigación. Los análisis completos de DLL y los guardados generados se excluyen mediante su `.gitignore`; no se añadieron recursos originales al repositorio.

## 1. Iluminación: investigación y mediciones

No se cambiaron intensidad, gamma, brillo global, BSP ni texturas. Sigue presente el filtro provisional. La configuración original local y la web coinciden en gamma 2,5 y brightness 1; eso no justifica una compensación global.

El foco existente usa radio 700, apertura base 50 grados, apertura adicional máxima 30 y caída `1 - t²`: a 350 unidades conserva 0,75 de la intensidad radial; a 525, 0,4375. Esto describe la implementación actual, no una reconstrucción completa de todos los pases del renderizador original.

Se analizó directamente `gfx/flashlight.tga`, sin copiarlo: 512×512 RGB, centro (86,99,105), máximo de canal 124, media 32,54. Es un patrón frío y de intensidad limitada; sustituirlo por blanco o por `flashlight2.tga` alteraría el original. El renderizador confirmó el patrón decodificado de 512×512 RGBA, 1 048 576 bytes. Detalles y hash: `pattern-analysis.json`.

### Método

Pruebas automatizadas con Playwright 1.64.1, Chromium 156.0.8078.4 y SwiftShader. Los fixtures usan fx=0 para aislar la luz del renderizador; esto no desactiva el filtro predeterminado del producto. Captura del framebuffer 800×347; región central entre el 35 % y 65 % de cada eje; luminancia ponderada de bytes RGB. **No es fotometría física.** Se probaron cuatro orientaciones con eventos relativos de ratón y se seleccionó la de mayor incremento central: existe sesgo de selección y no se certifica todo el mapa. Se conceden teléfono/cuchillo para el ensayo; no acredita adquisición natural.

Se comparan apagada/encendida, gl_overbright 0/1, r_dynamic 0 y guardado/carga. La salud debe permanecer constante durante la medición. `r_dynamic 0` también afecta modelos en el motor: por sí solo no demuestra iluminación BSP. Las capturas, los contadores de superficies y la prueba anterior de pared aportan evidencia complementaria.

| Mapa y orientación | Incremento con overbright 0 | Incremento con overbright 1 | Diferencia media tras cargar |
|---|---:|---:|---:|
| c_apartment1, 270° | 13,412 | 13,950 | −0,000071 |
| c_apartment2, 0° | 20,812 | 26,126 | 0 |
| c_apartment3, 90° | 7,362 | 9,801 | +0,002217 |
| c_apartment4, 0° | 20,775 | 26,107 | 0 |
| c_apartment5, 0° | 14,552 | 17,532 | −0,000152 |

Datos: `measurement-summary.json`, `lighting-1/` y `lighting-apartment3-local-combat/`. Las regiones apagadas de apartamentos 2 y 4 eran oscuras (medias 12,62 y 0,94), por lo que gl_overbright=0 **sí** ilumina superficies oscuras en esos escenarios.

Apartamento 3: el primer intento falló porque el atacante movía la vista con sus golpes. Se detectó después el daño cero de la Glock. La medición posterior se efectuó tras abatir con disparos normales al atacante que se acercó. Otro Faster permaneció vivo, a unas 385 unidades. No se borró ni desactivó ningún enemigo. El alcance local de este fixture se declara expresamente y la salud se comprueba durante toda la medición; no equivale a despejar el mapa.

### Saturación y coste

En la pared luminosa anterior de apartamento 1, el criterio histórico de incremento mínimo +5 **sigue fallando** con overbright 0: incremento 4,899. Se conserva `wall90-instrumented/`; no se rebajó ese umbral. El contador registró 6 660 unidades de contribución solicitada y 5 608 retenidas: pérdida del 15,80 % por saturación LDR en ese punto. Con overbright 1 no se recortó esa contribución. Esto demuestra recorte, pero no explica por sí solo toda la diferencia entre ambos modos ni demuestra incompatibilidad con el renderizador original.

El análisis local y de solo lectura de client.dll encontró pases con combinaciones GL_DST_ALPHA/GL_ONE y material/bump. Todavía no se ha reconstruido su orden completo. No se añadió un pase aditivo especulativo ni se eliminó el filtro.

Con foco encendido, las muestras estacionarias registraron aproximadamente 129 536, 57 856, 42 496 y 37 888 bytes de actualización por frame en apartamentos 1, 2, 4 y 5; apagado, cero en esos puntos. Los contadores JavaScript observan llamadas RGBA8 y no identifican cada textura individual. Los tiempos globales incluyen servidor, cliente, renderizador y driver de software y tienen ruido. La instrumentación nativa adicional de apartamento 4 produjo valores cuantizados de 0–2 ms por frame en la muestra de overbright 0; cero no significa coste nulo. No se afirma un rendimiento de GPU física.

La referencia audiovisual original se pudo consultar, pero no aportó una captura con mapa, pose, gamma y exposición equivalentes. Falta esa comparación controlada y la evaluación humana. **Validación técnica ampliada; fidelidad visual definitiva pendiente.**

## 2. Glock: problema → reproducción → causa → corrección → validación

Problema reproducido: cargador 15→0, rayos de observación alcanzando monster_faster a corta distancia y salud constante en 25. Evidencia anterior: `glock-before-hit-proof/`. El jugador recibía daño y podía morir; no se usó invulnerabilidad.

Causa: CCofGlock enviaba daño explícito cero a FireBulletsPlayer, que selecciona `gSkillData.plrDmg9MM` de Half-Life. Esas cvars tienen valor cero y el skill.cfg original de CoF no las configura. El original configura `sk_cof_glock1..4` a 13. La investigación de hl.dll corroboró que su rutina de actualización lee sk_cof_glock y que CGlock::PrimaryAttack pasa ese daño explícitamente: funciones 100af810 y 10046dc0, valor asociado 10226850.

Corrección mínima:

- Registrar sk_cof_glock1..4 antes de ejecutar skill.cfg en GameDLLInit.
- Seleccionar la entrada del nivel del port y pasar su daño entero a FireBulletsPlayer.
- Mantener trazado, dispersión, cadencia, munición, colisiones y reglas de impacto del SDK.
- Añadir `cof_weapon_status`, observador bajo el control de depuración existente, sin modificar el estado observado.

La prueba aislada adicional `glock-cvar-probe/` configuró temporalmente sk_cof_glock1=7: observó salud 25→11 tras dos impactos, guardado/carga y disparo posterior satisfactorios. Ese valor solo pertenece al ensayo y no se escribió en recursos ni configuración del producto. No se fijó globalmente el daño de todas las armas 9 mm. Los valores de configuración siguen siendo cvars. Limitación: el original usa `difficulty` 1..4; el port usa actualmente `skill`, y su menú asigna Nightmare a 3. Las cuatro entradas originales de Glock valen 13, pero esta corrección no implementa un Nightmare completo ni todos los efectos del arma original.

Resultado en servidor WASM real: enemigo 25→12 y después deadflag distinto de cero, consumo real de munición y continuación del disparo después de cargar. `glock-persistence/` y `glock-persistence-deadflag/` pasan. Se verifica el SHA-256 de `/lib/server.wasm` cargado: `6d7d62e59aed0311d14028ed110b0dc3b38e4fab188638017271fc6c60d94432`.

Se conservan intentos fallidos: un fixture exigía eliminar también al enemigo distante; otro exigía observar un frame no mortal entre disparos; otro suponía salud negativa en el cadáver. El SDK puede asignar salud positiva al cadáver. La prueba final comprueba deadflag, daño/munición y persistencia, sin exigir capturar un estado transitorio. Ninguna regresión histórica ni su timeout se modificó.

Un intento sirvió accidentalmente el directorio predeterminado antiguo de serve.py al omitir su argumento de carpeta. Queda en `glock-after/` y `regressions/`; no acredita la build nueva. Se corrigió el lanzamiento, se verificó el módulo y se repitió todo en `regressions-verified-build/`.

## 3. Inventario, objetos y arsenal

Inventario estático completo de los once BSP preparados, referencias y secuencias de modelos: `static-inventory.json`. Contratos de objetos concretos: `object-contracts.json`. Disponibilidad de un modelo o animación no equivale a que su comportamiento esté implementado.

| Elemento | Estado comprobable y falta principal |
|---|---|
| COMBINE | El menú termina en sonido de rechazo. El servidor original recibe inventorycombine con dos slots y un resultado; compara combined_result y tiene ramas específicas glockwithtaclight/phonewithbattery. Falta reconstruir todas las validaciones de cliente, consumo y persistencia antes de implementarlo. |
| DROP | El menú no ejecuta una caída real. La rutina original 100e3460 incluye restricciones de estado, teléfono de un jugador, jeringa durante uso, radio y ramas por clase. No corresponde a borrar una entrada genérica del bolso. |
| Panel de notas | Existe lectura de notas individuales, pero no se acreditó un archivo completo de notas consultables y persistentes. |
| func_valve con objeto | La ruta actual de uso menciona esta diferencia con el original; no se encontró una instancia bloqueada con objeto en los once mapas. No se inventa una operación ni se acredita una prueba real ausente. |
| useunlock | CInterDoor consume esta propiedad sin aplicarla. No apareció en los BSP preparados. Falta contraste de su rama original y un fixture válido. |
| Vídeo, c_apartment3 | func_button *133, targetname menhora, lockedby Videotape, target multitortyr, spawnflags 33. El objeto se recoge en c_apartment4. Falta un ensayo natural completo de inserción/escena y restauración específico de este botón. |
| Sótano, c_apartment4 | inter_door *96, lockedby basementkey, target bas1exit1. No se certifica el desbloqueo natural solo porque exista el contrato general de puertas. |

Comparación original de solo lectura: `weapon_dualweapon` exportado en 10038d50 instala CDualWeapon::vftable. La rutina 100de990 valida slots y armas, localiza instancias y construye estado combinado; PrimaryAttack y SecondaryAttack son entradas separadas de su vtable. El port solo conserva la combinación teléfono+cuchillo mediante estado de jugador: no es una reconstrucción de CDualWeapon. Los volcados privados no se publican.

### Matriz técnica del arsenal

| Arma | Modelos/animaciones y operaciones actuales | Munición/daño/sonidos | Persistencia y diferencia pendiente |
|---|---|---|---|
| Switchblade | v/w propios; ataques, cambio de mano y secuencias por mano | Sin munición; TraceAttack de 6; swing/cuerpo/pared | Inventario conservado; no se ha demostrado aquí restauración a mitad de cada animación ni equivalencia completa de daño y CDualWeapon. |
| Glock | v/w propios; draw/holster/idle/shoot/último tiro/recargas normal y vacía | 15 en cargador; reserva máxima 90; daño CoF reparado; sonidos actuales weapons/glock, mientras el original analizado usa weapons_new/glock | Cargador, reserva, arma activa y disparo después de cargar verificados. Mira, taclight, dual y todos los estados transitorios pendientes. |
| Syringe | v/w propios; animación de uso y curación al frame 39/30 s | Cura 50, consume una unidad, máximo 10; no es arma ofensiva | El tiempo adicional m_flHealTime no tiene serialización específica en la clase. Hay riesgo al guardar durante la inyección; pendiente reproducción antes de corregir. |
| Mobile | v/w propios; estados SMS/linterna | Sin munición ni daño; mensajes y foco | Estado de teléfono y luz guardado mediante cof_playerstate; dual solo con cuchillo; teléfono de algunas cinemáticas sigue pendiente. |
| Camera | v/w propios; foto/flash/recarga temporal | Sonido take_photo, sin munición; flash y lógica fotográfica | No se acredita aquí toda la continuidad del preludio ni la escala del screamer frente a una pose original equivalente. |
| Axe, MP5, FAMAS, Booklaser | Clases actuales de recogida al bolso, sin arma utilizable propia | No acreditar ataque, daño, recarga o audio por la presencia del modelo | Son limitaciones existentes; no se añadieron armas decorativas. Sus apariciones en c_start necesitan clasificar requisitos de campaña frente a contenido opcional. |

Prioridad: Glock, cuchillo, teléfono, jeringa y cámara, que intervienen en los mapas preparados. Las secuencias disponibles de cada modelo v/w están enumeradas en el JSON; no se copiaron los modelos.

## 4. Voces y presentación cinematográfica

El catálogo volvió a localizar los ambient_generic de voz y los cambios de mapa. El informe de continuación ya distingue nueve voces en c_start, tres en c_apartment5 y el vómito de c_apartmentsick; c_apartment1..4 no contienen voces habladas de Simon equivalentes a cada pensamiento escrito.

La nueva regresión ambient_persistence pasa: identifica el PCM exacto antes/después de cargar, restaura la fuente activa y no reproduce una fuente terminada, con la política de autoplay predeterminada. Esto supera una comprobación de carga de archivo, pero **no acredita escucha humana ni inteligibilidad de la mezcla final en altavoces**. Las mediciones previas de buses, ganancia y espacialización siguen siendo referencia; no se retocaron volúmenes.

La prueba nueva `voice-mix-native/` identifica el PCM de subtitles/sub1.wav, espera su activación por el multi_manager original y analiza la señal después de la ganancia del canal y del panner, antes y después de cargar la voz activa. Pasa sin Use forzado: RMS máximo 0,04169 en ambas muestras, master 0,8, bus world 1, canal 0,498, atenuación lineal y alcance 800, contexto running, cero errores JS. No se almacenó PCM original. Es evidencia de señal espacializada con buses abiertos; no equivale a escucha humana. El ensayo anterior voice-mix/ activó otra voz fuera de su escena y no confirmó señal; se conserva como ensayo fallido y no se convirtió en un supuesto defecto del audio.

Teléfono cinematográfico y tamaño del screamer: pendientes de contraste de eventos/modelos, transformación y captura equivalente. No se inventó una escala ni se añadió sonido a eventos que el original no procesa.

## 5. Localización y launcher

Siete idiomas seleccionables en la pantalla del juego: inglés, neerlandés, francés, alemán, noruego, español y sueco. Los textos propios del port usan principalmente español/inglés; el launcher sigue en español incluso con locale fr-FR y no tiene selector. No se anuncia soporte completo para siete interfaces.

Staging: inglés tiene los tres archivos base de textos, 27 notas y SP/Doctor/coop. Cada lengua adicional tiene nueve archivos de texto y ocho notas; los extras de conclusión no convierten la interfaz en completa. Español tiene imágenes SP y Doctor; los otros cinco idiomas adicionales solo SP. Las imágenes ausentes hacen fallback a inglés. No equivale a validar las campañas Doctor o coop.

Muchos textos heredados no son UTF-8 (detalle por idioma en static-inventory.json). El decoder latin1 existente los conserva; convertir el decoder globalmente a UTF-8 rompería acentos. Propuesta, sin modificar originales: `platform/web/i18n/{es,en,...}.json` UTF-8, claves estables como launcher.play, inventory.combine, save.empty; módulo t(key,args), fallback inglés con reporte de claves faltantes y pruebas de acentos/interpolación. Separar etiquetas nuevas de los índices de subtítulos/notas originales, cuyo adaptador sigue leyendo el formato heredado. No traducir entidades, comandos, rutas ni nombres de guardado.

Launcher_audit pasa en 1280×800 y 390×844: runtime no arranca antes de JUGAR, Tab enfoca el botón, Enter abre el menú del motor, no hay desbordamiento horizontal ni errores JavaScript. SW desactivado en este ensayo. No hay controles táctiles acreditados; el tamaño móvil no demuestra jugabilidad en teléfono. IndexedDB disponible no acredita por sí solo persistencia tras cerrar el navegador. Guardado/restauración en sesión sí se probó en otras regresiones.

El SW existente usa revisiones por archivo, precarga ligera y espera la decisión del usuario para activar una actualización. La prueba pública histórica verificó instalación fresca y hashes; esta etapa no volvió a desplegar ni certificó migración, modo offline completo, cuotas o expulsión de guardados.

### Propuesta de distribución, sin cambios de infraestructura

La nueva distribución aislada informa unos 578 MiB sin comprimir y 309 MiB de transferencia prevista por SW. Los paquetes por mapa ya existen; agruparlos por capítulo no reduce por sí mismo el tamaño total hospedado. GitHub documenta un máximo de 1 GB por sitio publicado y un límite blando de 100 GB/mes de transferencia: [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), consultado el 1/11/2026.

Propuesta para revisión: conservar shell/motor/boot y el capítulo inicial en Pages; manifiestos versionados por capítulo, recursos compartidos deduplicados y paquetes inmutables con hash; descarga bajo demanda y precarga solo de transiciones inmediatas. Antes de mover recursos a almacenamiento externo, verificar permisos de distribución, CORS/CORP, respuestas comprimidas, reintentos, integridad, cuotas y actualización atómica de módulo/manifiesto/guardados. No elegir proveedor ni cambiar URLs de producción sin una prueba aislada de esos contratos. Implementar luego una prueba de instalación fresca, actualización con partida abierta y recuperación sin red para cada capítulo.

## 6. Progresión y ruta manual de aceptación

Grafo extraído de BSP: c_intro → c_nightmare → c_start ↔ c_start2; c_start ↔ c_apartment1 ↔ c_apartment2; c_apartment1 ↔ c_apartment5 ↔ c_apartment3 ↔ c_apartment4; c_apartment3 ↔ c_apartmentsick. c_apartmentsick también referencia **c_basement, que no está entre los once mapas preparados**. Un grafo de transiciones no demuestra que todas sean accesibles con sus condiciones originales.

Ruta manual propuesta, con checkpoints antes y después de cada interacción:

1. JUGAR, nueva partida y dificultad elegida; introducción/preludio, fotos y screamer; salida a c_start.
2. Esperar cinemáticas sin saltarlas; obtener teléfono/cuchillo mediante la ruta original y registrar objetivos/SMS.
3. Llegar al candado, comprobar puerta bloqueada y cancelar la interfaz. Visitar c_start2, leer la pista y el ordenador, obtener el código de la partida y regresar.
4. Probar código incorrecto; introducir el obtenido, desbloquear y entrar a apartamentos. Guardar antes/durante/después del acertijo y comprobar continuidad.
5. Recorrer c_apartment1/2 con sus llaves y objetivos; obtener la Glock donde la campaña la entrega, recoger munición, combatir y comprobar linterna en habitaciones oscuras.
6. Seguir los eventos que llevan a c_apartment5/3/4, recoger la cinta en el sótano, insertarla en menhora y comprobar la escena multitortyr; resolver la puerta basementkey sin conceder el objeto por depuración.
7. Continuar c_apartmentsick y documentar la frontera con c_basement no preparado. No saltar a otro mapa con comandos para acreditar este paso.

Controles: W/A/S/D, ratón, E, TAB, teclas rápidas y la interfaz de guardado. Fotografiar objetivos, inventario, puerta y estado visible en cada checkpoint; registrar errores y no avanzar con comandos ante un bloqueo. Un observador de solo lectura puede aportar posición y referencias, sin modificar el estado.

El intento automatizado natural nuevo alcanzó el candado y la transición c_start2, pero quedó detenido en (1672,5; −1568; −860), antes del waypoint (1680; −1500). Página sin errores JavaScript. No se demostró todavía que fuera un bloqueo de la campaña: el controlador admite 18 unidades de llegada y 8 grados de error, por lo que un problema de navegación es una hipótesis abierta. Se conserva natural-padlock/. El controlador experimental de llegada a 8 unidades falló antes en una zona con func_stairs, y el de giros por teclado a 2 grados no convergió; ambos resultados quedan separados. Finalmente `natural-padlock-mouse/` pasó usando los mismos waypoints y tolerancia de llegada originales, con movimiento W y giros de ratón relativos que entran por SDL, sin fijar ángulos del jugador por comandos. Llegó a la nota y al ordenador, obtuvo el código original desde la interfaz, regresó al candado y creó su checkpoint. Su prueba operations/ pasó código incorrecto, cancelación, persistencia antes/activa/abriéndose/resuelta, puerta desbloqueada y E normal para cruzarla; ambas páginas registraron cero errores JavaScript. Los recursos, enemigos y fences de 30 segundos permanecieron intactos. Esto confirma que los atascos de esos intentos eran limitaciones del controlador de pruebas, no un bloqueo demostrado del juego. Acredita el tramo candado–ordenador–regreso–puerta, **no el capítulo completo ni una prueba manual humana**.

## 7. Compilación, regresiones y archivos

Emscripten 4.0.11: servidor compilado y enlazado en 2,682 s (`build-game-glock.log`). Renderizador instrumentado compilado satisfactoriamente (`build-engine-diagnostics-final.log`), con el aviso previo de nColinElim sin usar. Empaquetado aislado satisfactorio, manifiesto 11319dd82ec8. El hash del servidor cargado coincide con el enlace nuevo; no basta con que exista el .cpp.

Regresiones verificadas contra 8104, sin retirar multiscene1 ni ampliar fences de 30 segundos:

- 7 contratos test_entity_maps + 1 envpos + 1 padlock: **9/9**.
- Pointer Lock: **PASS**.
- entities, campaign_entities, motion_entities, model_entities, manager_entities, sound_entities, camera_entities, train_entities, track_entities, envpos_entities, button_entities, changelevel_entities, trigger_persistence y ambient_persistence: **14/14 PASS**.
- test_flashlight_lightmap: reproduce el índice antiguo incorrecto y pasa la versión corregida en RGB, apagado/encendido, gamma, saturación y alfa.
- Tres fixtures satisfactorios de daño/persistencia Glock (incluido el sondeo de cvar), cinco mediciones de iluminación, dos vistas del launcher y una prueba de señal de voz espacializada/restaurada. El recorrido automatizado natural candado–ordenador–regreso y sus operaciones también pasaron. No equivalen a un recorrido manual completo.

Archivos de producto modificados: `game/cof-logic/cof/weapons_cof.cpp` (daño), `player_cof.cpp` (observador), `patches/hlsdk/0001-root.patch` (registro temprano), `patches/xash3d/0001-root.patch` (contadores optativos r_cofspot_debug/cof_spot_stats). Instrumentación apagada por defecto; no se modificó el resultado aritmético de composición para arreglar su saturación.

Herramientas: `tools/e2e/flashlight_maps.mjs`, `launcher_audit.mjs`, `voice_mix_probe.mjs`, adaptación del extractor de `test_flashlight_lightmap.py` y `tools/ghidra/DumpFunctionRange.java` de solo lectura. Informe y evidencia nueva separados de los históricos. Los dos parches pasan git apply --check --reverse contra sus árboles canónicos. `verification-manifest.json` conserva el HEAD efectivo, hashes de los logs y el módulo cargado. El diff textual de los archivos de parches puede señalar espacios de contexto como whitespace: no implica por sí solo un error de compilación del código parcheado.

### Conclusión y siguiente trabajo

El fallo de daño cero de la Glock queda corregido y verificado en WASM, con límites explícitos respecto al original. La iluminación funciona en los cinco fixtures y persiste tras cargar, pero siguen pendientes equivalencia visual, pared saturada y GPU física. No procede retirar el filtro ni declarar la Alpha completa.

Prioridades siguientes: extender el recorrido natural satisfactorio más allá de la puerta del candado, hasta los apartamentos y sus acertijos; reconstruir la validación cliente/servidor de COMBINE y DROP con fixtures reales; probar vídeo y puerta del sótano con objetos obtenidos en campaña; reproducir guardado durante la jeringa; verificar mezcla audible y las diferencias de presentación pendientes. Cualquier nueva corrección debe seguir la misma cadena de reproducción, causa y regresión.



