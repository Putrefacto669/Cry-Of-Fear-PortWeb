# Fidelidad gráfica original — resultados de investigación y primera corrección

Fecha local: 7 de noviembre de 2026. Base: `12963131db259e3f0c6b74d2932ee3d2f317326b`. Auditoría previa: [AUDITORIA_GRAFICA_ORIGINAL_2026_11_07.md](AUDITORIA_GRAFICA_ORIGINAL_2026_11_07.md).

## Resultado

Se confirmó el arranque legítimo del original desde Steam y se reconstruyeron dos diferencias mediante el análisis local de su cliente: **niebla lineal** y **pesos originales de una ruta de escala de grises**. Ambas se implementaron en una candidata privada; el soporte lineal requiere un parche del shim GLES y un cambio en la llamada del cliente. No se cambió el brillo global.

La identidad visual completa continúa pendiente. Se identificó una incompatibilidad importante en la composición de las capas de luz y la ausencia del render material original. No se intentó disimularla mediante filtros. No se modificó `dist/`, ni se hicieron commits, pushes o despliegues en esta etapa.

## Fuente original y captura nativa

Se leyeron `client.dll`, `hl.dll`, BSP, texturas y shaders de la instalación de Steam. No se encontró en el árbol inspeccionado el SDK C++ completo de CoF; el SDK portable es una base distinta. Los proyectos Ghidra se abrieron con `-readOnly -noanalysis`; los volcados nativos permanecen ignorados por Git.

El usuario inició sesión manualmente. `steam.exe -applaunch 223710` abrió el launcher oficial y éste inició el juego; se observó el menú nativo en ventana a 800×600. El proceso tenía `-nosound`, `-console` y los argumentos de resolución elegidos. No se eludió autenticación ni se modificaron protecciones. Esto demuestra una vía de arranque legítima; no identifica por sí solo una causa única del antiguo fallo de la copia aislada.

Después el usuario siguió jugando. Se dejó su instancia bajo su control, sin enviar más entradas ni terminar el proceso. **No se obtuvieron pares nativo/port con posición, orientación y fase equivalentes de las cinco escenas.** Las capturas conservadas del port se identifican como tales y no sustituyen esa validación pendiente.

## Hallazgos de iluminación y materiales

Los cinco BSP preparados son idénticos al original, incluidos los lumps de iluminación. Las capas auxiliares son datos del mapa, no archivos perdidos ni nuevos focos que puedan sumarse libremente.

| Mapa | Caras con capas 61/62/63 | Normales encontradas | Gloss de baja calidad | Gloss de alta calidad | Archivos asociados preparados |
|---|---:|---:|---:|---:|---:|
| c_intro | 12.809 | 49 | 0 | 8 | 0 de 57 |
| c_nightmare | 4.767 | 61 | 0 | 12 | 0 de 73 |
| c_start | 7.339 | 87 | 0 | 22 | 0 de 109 |
| c_apartment1 | 10.267 | 133 | 0 | 30 | 0 de 163 |
| c_apartmentsick | 9.048 | 35 | 0 | 9 | 0 de 44 |

El cargador original `10069410` busca `gfx/bumpmaps/<textura>.tga`, `<textura>_gloss.tga` y `<textura>_glosshi.tga`. La carpeta instalada contiene **1.219 archivos**. Los nombres de textura de estos cinco BSP se corresponden con **350 archivos únicos** de esas rutas; las cantidades de la tabla incluyen referencias repetidas entre mapas. La ausencia de `_gloss` en esta selección no significa ausencia de especular: sí existen los recursos de alta calidad.

La búsqueda preliminar por sufijos `_normal`/`_bump` no detectaba esos recursos porque el contrato real conserva el nombre base de la textura. La lista final de rutas y roles se encuentra en `material-coverage-final.json` y sustituye esa búsqueda heurística.

### Incompatibilidad de capas confirmada

`1005a110` del original distingue superficies con datos bump. `10059660` reconstruye la ruta plana usando capas 61/62/63; `10059990` prepara datos para la ruta bump. Con gamma 1, brillo 0 y contraste 1, el cálculo neutro de la textura de luz incluye ambiente, difusa y componente Z de dirección, con normalización de color al desbordar. Quedan pendientes el conjunto de pasadas y el resto de parámetros gráficos.

El renderer publicado, cuyo binario coincide con el árbol de referencia conservado, acumula estas capas mediante el bucle convencional de lightstyles. `CL_RunLightStyles` asigna 256 a estilos sin secuencia, y el SDK configura 63 como oscuro. Por tanto, las capas 61 y 62 contribuyen como luces ordinarias en esa ruta. La consulta de iluminación de modelos en `ref/common/ref_light.c` también acumula capas; corregir solo una textura de pared dejaría otra ruta sin resolver.

El análisis de datos muestra que **usar solamente la capa 0 tampoco equivale a la reconstrucción original**. El error absoluto medio por canal frente a la textura neutra reconstruida es aproximadamente 11,55; 12,28; 11,77; 20,87 y 9,24 para los cinco mapas, respectivamente. Esto no es una medición de brillo de pantalla ni una comparación contra capturas nativas: son cálculos sobre las capas del BSP, antes de la mezcla de texturas, gamma y pasadas posteriores. Los resultados exploratorios anteriores a la comprobación de constantes no se usan como referencia final.

Se conserva esta incompatibilidad como siguiente trabajo del renderizador, sin descartar capas arbitrariamente. La lista de recursos permite preparar únicamente los materiales que vaya a consumir una implementación real; no se añadieron descargas que el renderer actual todavía no utiliza.

## Corrección de niebla

### Causa demostrada

En `client.dll`, `10093bc0` llama a `glFogi(GL_FOG_MODE, GL_LINEAR)` y configura inicio, final, color y `GL_NICEST`. En la ruta web anterior:

1. El cliente enviaba una densidad `1.73 / end` como aproximación.
2. `GL2_Fogi` no hacía nada, y `GL2_Fogf` solo conservaba densidad: se perdían modo, inicio y final.
3. El fragment shader aplicaba una exponencial fija. Además, su distancia `gl_FragCoord.z / gl_FragCoord.w` no equivale en general a profundidad en espacio de vista.

El comentario antiguo asumía una exponencial al cuadrado, pero el shader real utilizaba `exp(-density * distance)`. Bajo esa aproximación, a distancia 500 con final 1500 la visibilidad sería aproximadamente 0,562; la niebla lineal original no debe atenuar antes de 500. A 1500, la aproximación deja aproximadamente 0,177 de la escena, mientras la curva lineal debe haber llegado por completo al color de niebla. Son valores de las fórmulas, no luminancia medida de una captura.

### Implementación acotada

- `game/cof-logic/client/cof_client.cpp`: usa densidad cero para seleccionar la ruta `GL_LINEAR` ya existente en `TriFog`, conservando distancias, colores, mensajes y lógica de fade.
- `patches/xash3d/0004-root.patch`: añade al shim GLES los parámetros inicio/final/modo lineal, propaga el modelview y calcula la profundidad de vista por vértice. El fragment shader interpola `clamp((end - abs(eye.z)) / (end - start), 0, 1)`.
- La ruta exponencial anterior se conserva para los demás modos. No se presenta este parche como implementación fiel de todos los modos exponenciales de OpenGL.
- El parche se aplica después de `0001-root.patch`; se comprobó su aplicabilidad sobre el árbol de referencia. No modifica luz, IA, física, servidor, armas ni recursos originales.

La prueba GPU sintética usa los shaders reales incluidos por el renderer. Reproduce el fallo anterior y comprueba inicio, mitad y final para rangos 100–1000, 200–1500 y 500–1500, en proyecciones ortográfica y perspectiva. La ruta exponencial conserva los mismos píxeles. Se ejecuta en Chromium y Firefox.

La integración activa **las entidades BSP reales** `ackelfaden`, `nkakelaeie` e `ingenfog` en contextos privados. Lee uniforms de los programas utilizados por las llamadas de dibujo, comprueba distancias y color, apaga la niebla de `c_nightmare` y restaura un guardado nativo. La restauración vuelve a dibujarla sin `Spawn` ni `Use` de recuperación. La activación inicial es diagnóstica y no acredita progresión natural. No se revalidó el fundido largo de `ackelfaden`.

## Corrección de escala de grises y postprocesado restante

`1005d7a0`, en su ruta de combinadores de punto flotante, usa los pesos originales **0,32 / 0,59 / 0,09** almacenados en `1014c920`. El shader web usaba **0,299 / 0,587 / 0,114**. Se corrigió exclusivamente la función `Grey` de `platform/web/shaders/postfx.frag.glsl`.

La prueba compila el shader de producción y reproduce el fallo con los pesos anteriores. Comprueba primarios, blanco, negro y un color mixto con intensidades 0, 0,5 y 1. Por ejemplo, con gris completo el rojo puro pasa aproximadamente de 76 a 82 y el azul de 29 a 23 sobre 255. La ruta nativa antigua DOT3 cuantiza pesos mediante una textura RGB y puede diferir de la ruta flotante; no se afirma identidad con todos los perfiles de hardware original.

El ruido `snoise` sigue en C++, con el hash web desactivado por defecto. No se duplicó. El blur original usa quads ampliados, pasos X/Y y opacidad en `10071df0`; continúa pendiente reemplazar de forma completa el kernel web. La viñeta original tiene cuatro TGA y creación de paneles en `100362b0`, pero no se cerraron activación y colocación de todos sus elementos. No se sustituyó la viñeta radial por una composición inventada. El shader Cg llamado `black_fp.cg` contiene una operación distinta: su nombre no demuestra que sea la ruta general de gris.

## Compilación y candidata

Emscripten **4.0.11**, compilaciones aisladas en `/root/cof-audits/graphics-20261107/`. Se configuró el motor y se compiló el target `ref_gles3compat`; el cliente se compiló mediante `build_game.sh`. El paquete final conserva el servidor publicado, filesystem, menú y motor principal. La configuración emite comprobaciones negativas de APIs de otras plataformas; los logs de enlace final terminan satisfactoriamente. Permanecen advertencias de código heredado, sin ocultarlas.

Manifiesto privado final: **`66cf767ece53`**.

| Módulo | SHA-256 |
|---|---|
| Cliente nuevo | `44fcd9defe4934ca0ec51767fd66f0d0615cdb34a0196f4a05cbb80d867ffd77` |
| Renderer nuevo | `8049c1787d83c6802e09c1ddcb3a2df35a283b798737aff774294e30e770aa5c` |
| Servidor conservado | `91ca7418dcdcb520cd1479d77ca6646af79e455158c23f179661a1f46f7954f4` |

Las pruebas de niebla y ropa leen estos hashes del filesystem del runtime. No basta con que existan archivos compilados en disco.

## Capturas y alcance de la validación

Evidencia nueva: `build/validation/graphics-2026-11-07/`. Playwright 1.64.1, Chromium 156.0.8078.4 y Firefox 157.0, con GPU de software en las pruebas aisladas. No se declara compatibilidad móvil física.

`visual_scenes.mjs` admite `COF_CAPTURE_SIZE=800x600`. Oculta únicamente el marco HTML de depuración durante la captura y **comprueba el tamaño real del framebuffer**. Conserva el HUD del juego. Registra mapa, gamma, brillo, FOV configurado, origen/ángulos de la vista web, estado del jugador, ruido, envpos, filtros y tiempo de servidor. No teletransporta ni elimina entidades.

Se separan tres series: `scenes-before-800` (publicación anterior), `scenes-candidate-800` (gris) y `scenes-linear-800` (gris y niebla lineal). Son series del port, a 1 y 15 segundos aproximados tras la conexión; sus logs incluyen tiempos y vistas reales. **No se garantiza coincidencia exacta de frame de cinemática entre ejecuciones y no se calcula una supuesta distancia de fidelidad nativa a partir de ellas.**

### Resultados consolidados

| Comprobación | Resultado real |
|---|---|
| Compilación de cliente y renderer | PASS; `build-client-fog.log`, `build-renderer-fog-final.log` |
| Shader de gris | PASS en Chromium/Firefox; primarios, mezclas 0/0,5/1 y fallo reproducido de los coeficientes anteriores |
| Shaders del shim de niebla | PASS en Chromium/Firefox; profundidad de vista, inicio/mitad/final, dos proyecciones y ruta exponencial conservada |
| `fog-entities-800` | PASS: entidades reales, distancias/colores en programas efectivamente dibujados, apagado y restauración nativa; framebuffer comprobado 800×600 |
| Tres series de seis mapas | PASS; 36 capturas del port en total con framebuffer 800×600 y estados registrados |
| Contratos BSP | 11 pruebas satisfactorias |
| Regresión de composición de linterna | PASS: conserva índice por luxel, RGB, gamma, luces apagadas/activas, saturación y alfa; reproduce el fallo histórico como control |
| HUD CSS y Pointer Lock | PASS; pruebas de vida/energía en ambos navegadores y contratos de captura/liberación del cursor |
| Estado WebGL del compositor | PASS en ambos navegadores: inicialización y restauración de estado, sin reintroducir la fuga anterior |
| Ruido original | PASS sobre la candidata intermedia de gris; activación, intensidad y teselas. Las capturas finales también registran el sprite activo con la intensidad esperada |
| Ropa en candidata final | Chromium: PASS de menú, preview, bloqueos, worker y hashes. Firefox: un inicio fallido antes de conectar; repetición completa PASS con doce opciones, desbloqueos, persistencia, guardado/restauración y Nueva partida |
| Dieciocho regresiones con gris | 18/18 PASS, candidata intermedia `40ee67758cbf` |
| Dieciocho regresiones con niebla | 17 PASS en la primera ejecución; `voice_mix_probe` no alcanzó la conexión inicial. Repetición de esa prueba PASS con señal PCM real antes/después de cargar. **No fue una primera ejecución limpia de 18/18** |

Las dieciocho suites incluyen campaña, managers, sonido, cámaras, trenes, tracktrain, envpos, botones, cambios de nivel, persistencia de triggers/ambientes y callbacks, extras, interacciones del bolso, puñetazo, manos duales, munición y voces. Se conservaron las cuatro `multiscene1`, las entidades y los límites originales. Los ensayos de voces miden señal del grafo de audio; no acreditan escucha humana.

Los dos fallos de inicio quedan documentados: Firefox se detuvo tras inicializar el renderer/UI sin llegar al cliente; la primera prueba final de voces se detuvo antes de conectar y registró `level loaded at -18446744073707.29 sec`. Esta última firma también existe en evidencia anterior con el renderer previo. Ninguna prueba llegó a observar una pérdida de señal de voz en ese intento, porque no pasó de la conexión. **La causa de la intermitencia de arranque sigue desconocida**; no se atribuye a audio, renderizado o concurrencia sin demostrarlo. Las repeticiones satisfactorias no la declaran resuelta.

Se conservan los intentos iniciales fallidos de los arneses: una directiva GLSL de versión duplicada y macros que el fixture no definía. Se corrigió la preparación de los shaders de prueba; no se ocultaron errores ni se aumentaron límites. Continúan avisos heredados de recursos, `info_texlights`, `GL_INVALID_ENUM` al subir `*default` y AVI no disponible. El aviso `*default` se comprobó también en la evidencia previa satisfactoria de Firefox.

### Archivos y reproducción

Además de los cambios de producción citados, se añadieron `tools/audit_graphics.py`, `tools/e2e/grey_weights.mjs`, `linear_fog.mjs` y `fog_entities.mjs`. `visual_scenes.mjs` incorpora el tamaño fijo y las vistas; `clothes_release.mjs` admite hashes esperados explícitos de cliente y renderer manteniendo las comprobaciones.

Las recetas `prepare_fog.py`, `package_fog.py` y los runners de regresión se conservan en la evidencia. `0004-root.patch` respeta el convenio de nombres de `tools/wsl/patches.sh`, que selecciona el repositorio a partir del nombre. La candidata final se sirve desde `/root/cof-audits/graphics-20261107/candidate-linear-fog`, sin copiarla a `dist/`.

## Siguiente trabajo recomendado

Priorizar la composición de las capas de luz y el render material —incluida la consulta de luz para modelos— antes de tocar gamma global. Después completar bump/especular y validar su interacción con la linterna. Blur y viñeta requieren cerrar su contrato, no solo cargar sus archivos.

Para capturas nativas futuras, utilizar el arranque de Steam ya demostrado y el `snapshot` original (el perfil inspeccionado lo tiene ligado a F5). Registrar mapa, fase reconocible y parámetros. La consola `viewpos` se ha comprobado en Xash, pero no se encontró ese nombre en el `hw.dll` original: no se prescribe como si estuviera disponible allí. Queda pendiente un método nativo comprobado para registrar posición/orientación y sincronizar la fase. Hasta disponer de él, las capturas nativas adicionales deben etiquetarse como referencias cualitativas.

## Observaciones del jugador contrastadas durante esta etapa

El usuario describió la animación de Simon al trepar, apariciones concretas al fotografiar X del preludio y una progresión con cuerda y deterioro ambiental en los apartamentos hasta una zona que parece baños. Se conservaron como referencia manual y se contrastaron sus vínculos sin modificar esas mecánicas.

- **Escaleras:** se confirmó una aproximación existente en `puzzles.cpp`. `cof_ladder_manager` consume sin implementar las propiedades `animation*`, `custom*` y `descendoffset`; su interacción usa un fundido y traslado al destino. Los BSP inspeccionados referencian `models/ladder_climb.mdl` y secuencias concretas como `climb_start_up`, `climb_loop_up`, `climb_end_up` y variantes de bajada. Esto es una diferencia funcional y de presentación confirmada, no un efecto de gamma ni de niebla. No se declara que las regresiones anteriores certifiquen la animación original.
- **X del preludio:** `c_nightmare` contiene **20 `camera_spot_trigger` con ubicaciones y destinos definidos**. Se extrajeron sus enlaces a managers, relays, paredes, puertas, luces, secuencias y modelos `models/nightmare/1.mdl`, `2.mdl` y `3.mdl`. El código actual escoge el punto centrado en el encuadre y dispara su destino, sin sorteo en esa selección. Esto no acredita que todas las apariciones se ejecuten correctamente. La identificación visual de cada cadáver/personaje concreto y la prueba natural de cada evento quedan pendientes.
- **Apartamentos y cuerda:** se localizaron referencias de nombre relacionadas con rope y se conservó la red real de transiciones. Los números de mapa no constituyen una secuencia lineal: existen enlaces de `c_apartment1` a `c_apartment5`, de éste a `c_apartment3`, de `c_apartment3` a `c_apartmentsick` y de este último a `c_basement`. La descripción «baños» no se asignó a un mapa sin evidencia adicional. No se modificaron acertijos, transiciones ni dificultad basándose en esa descripción.

Evidencia: `manual-reference-links-final.json`. El recorrido completo referido por el usuario no se reprodujo en el navegador en esta tarea. Estas observaciones amplían la lista de fidelidad pendiente; no se presentan como fallos corregidos por el nuevo renderizado de niebla.
