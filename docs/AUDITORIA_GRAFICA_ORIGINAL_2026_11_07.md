# Auditoría gráfica original — fase previa a correcciones

Base limpia: `12963131db259e3f0c6b74d2932ee3d2f317326b`. Fecha local: 7 de noviembre de 2026. Esta etapa no autoriza commits, pushes, publicación ni cambios en `dist/`.

## Referencias legítimas y límites

Se consultan en modo de solo lectura las DLL instaladas por Steam, los BSP y shaders originales. `client.dll` SHA-256 `d2a04641b301804f6f449aa68265042b13adc360925b80033d417ec9f38c9c00`; `hl.dll` SHA-256 `0036b91c01e92ed205513f52563053a55a66a32d257efb5f476b8f1f3dde0e63`. El SDK portable del port no se identifica como código fuente de CoF. En la instalación inspeccionada hay shaders Cg, pero no se ha encontrado el SDK C++ completo.

El usuario inició sesión manualmente. Steam abrió `CoFLaunchApp.exe` mediante `steam.exe -applaunch 223710`; su launcher oficial inició `cof.exe` y se observó el menú nativo, sin el fallo de autenticación de la copia aislada anterior. Se seleccionó 800×600 y modo ventana, sin activar la opción 16 Bit. No se midió el formato interno del framebuffer nativo. El proceso conservó `-nosound` y `-console`. No se eludió ninguna protección ni se modificaron ejecutables.

El usuario continuó jugando. Se dejó el control de esa instancia: no se envían más teclas ni se termina su proceso. Haber observado el menú **no equivale a disponer de capturas nativas equivalentes de las cinco escenas**. Las capturas del port y los análisis de recursos no se presentan como esos pares.

## Diferencias y causas comprobables

| Área | Evidencia original / port | Conclusión y estado |
|---|---|---|
| Datos de luz | Los cinco BSP preparados coinciden byte a byte con el original; los hashes del lump de iluminación se conservan | Las diferencias investigadas no proceden de BSP modificados |
| Capas bump | `client.dll` `1005a110`, `10059660`, `10059990` buscan específicamente estilos 61/62/63 y eligen rutas propias | No son tres luces animadas convencionales; deben respetarse sus papeles en la composición |
| Ruta publicada | El renderer cuyo hash es `8db286…0eec` coincide con el binario privado conservado. Su `R_BuildLightMap` suma las capas según `g_lightstylevalue`; el SDK deja 63 oscuro y 61/62 sin tratamiento bump | Incompatibilidad de interpretación confirmada. Falta cerrar la reconstrucción y medir antes de modificar código |
| Gamma/brillo/contraste | `100595f0` y `1005a110` transforman luz antes de cargar lightmaps; el port usa tablas/overbright de Xash | No se puede equiparar `gl_gamma` a `gamma` ni corregirlo con brillo global |
| Iluminación dinámica | Original con `gl_dynlight`, foco y materiales propios; port con proyección reconstruida y suma por luxel | Conservar la corrección previa de índice por luxel. Faltan comparación de materiales y sombreado equivalente |
| Bump mapping | Original selecciona rutas según flags de superficies, `gl_bump` y capas auxiliares | No está implementado el render material original completo. Un fallback plano no debe declararse bump mapping |
| Especular | `gl_specular`, `gl_highspecular`, `gl_twopassspecular`, programas de calidad distinta y comprobaciones de capacidades | Debe reconstruirse con recursos y código verificables, no con una capa brillante general |
| Texturas/materiales | BSP con texturas originales; búsqueda inicial por nombres `_normal`, `_specular`, `_bump` no da candidatos | Esto no demuestra ausencia de materiales: hay que reconstruir el cargador y sus convenciones reales |
| Sombras/oscuridad | Resultado dependiente de lightmaps, composición y luz dinámica | Sin pares de escena no se atribuye cada sombra a un sistema concreto ni se cambian luces del mapa |
| Niebla | `Fog_Frame` actual configura una aproximación exponencial mediante `1.73/end`, no una interpolación lineal idéntica entre inicio/final | Diferencia matemática confirmada, pendiente de reconstrucción original y prueba antes de corregir |
| Viñeta | `100362b0` carga cuatro TGA originales. Se inspeccionan posición, visibilidad y llamadas de VGUI | Tener los archivos no demuestra cuándo ni cómo se dibujan. La viñeta radial web 0,35 sigue siendo una aproximación |
| Blur | `10071df0` usa pasadas de quads ampliados, pasos X/Y y opacidad, bajo condiciones de estado; la web usa cinco muestras de vecinos | Algoritmos distintos confirmados. No sustituir el blur entero sin reconstruir activación, parámetros y orden |
| Gris | Original con captura de pantalla y textura de pesos; además hay shaders Cg `black_fp.cg` / `fp20_black_fp.cg` con otra operación | No confundir el shader llamado black con el algoritmo general de escala de grises. Falta trazar cada uso |
| Ruido | Ya reconstruido con `snoise` y sprite original | Se conserva. No reactivar el ruido hash web encima |
| Orden de efectos | El postprocesado web opera tras el backbuffer, que ya contiene HUD/ruido; el original tiene rutas de cliente/render y VGUI diferentes | El orden completo requiere rastreo; no se certifica fidelidad solo por igualar coeficientes |

## Extensión del caso de lightmaps

| Mapa | Superficies con estilos auxiliares 61/62/63 |
|---|---:|
| c_intro | 12.809 |
| c_nightmare | 4.767 |
| c_start | 7.339 |
| c_apartment1 | 10.267 |
| c_apartmentsick | 9.048 |

`tools/audit_graphics.py` extrae estilos, dimensiones, dependencias visuales y estadísticas de los lumps sin copiar recursos originales. La media de bytes del lump **no es luminancia de una escena renderizada**: incluye capas auxiliares que no representan color final.

La siguiente comprobación contrasta la capa estándar con la reconstrucción nativa sin bump y con la suma convencional del renderer. No se cambiará un dato auxiliar por una luz ni se descartará una capa solo por su número sin identificar el contrato completo.

## Protocolo de comparación que se exige

Para acreditar un par nativo/port: framebuffer 800×600, relación 4:3, FOV, posición y ángulos documentados, mismo mapa y fase de cinemática, estado de linterna, luz/fog y opciones gráficas registrados. El perfil nativo leído tenía `gamma 2.5`, `brightness 1`, `gl_gamma 1`, `gl_brightness 0`, `gl_contrast 1.4`, bump/especular activos, ruido 0,5 y viñeta habilitada; contraste 1,4 es una preferencia instalada, no un valor de fábrica demostrado. No se alteró para esta auditoría.

Una captura sin posición/fase comprobada solo sirve como referencia cualitativa. Los pares port anterior/port candidato irán en carpetas distintas y con hashes de módulos, cvars y estados. No se usarán sus diferencias para inventar una captura del original.

## Plan de corrección y verificación

Primero cerrar el contrato de capas de luz; implementar solo una corrección acotada si la evidencia y las pruebas de fallo lo justifican. Mantener el juego, Items / Clothes, niebla, ruido y foco existentes mientras se diagnostican otras rutas. Compilar en un árbol privado con Emscripten. Repetir pruebas de composición/linterna, BSP, mapas, cámaras, cinemáticas, armas, HUD, inventario y ropa con las cuatro `multiscene1` y los límites existentes.

La evidencia nueva está en `build/validation/graphics-2026-11-07/`, separada de la publicación y los ensayos previos. Los volcados del análisis nativo permanecen ignorados. El informe de resultados añadirá los cambios que se lleguen a verificar y los puntos todavía pendientes; esta auditoría previa no declara resuelta la fidelidad gráfica.
