# Estado inicial: fidelidad visual y Items / Clothes

Fecha: 7 de noviembre de 2026. Base: `97c7277d08dd1cc91bc6b99e4a4b6766502a3228`. El árbol estaba limpio antes de esta investigación. No se autorizan commits, pushes, despliegues ni cambios en `dist/`.

## Alcance de la comparación

Se inventariaron los BSP originales `c_intro`, `c_nightmare`, `c_start`, `c_apartment1`, `c_apartmentsick` y `c_game_menu1`. La instalación autorizada sigue en `C:\Program Files (x86)\Steam\steamapps\common\Cry of Fear`. Se consultan sus recursos y los proyectos locales de Ghidra en modo de solo lectura.

Se intentó ejecutar el original en una carpeta privada, copiando los archivos mutables y enlazando únicamente recursos de lectura. El ejecutable terminó con **“Failed to initalize authentication interface. Exiting...”**. No se eludió autenticación ni se controló una cuenta de Steam. Por ello **no hay capturas nativas equivalentes de las cinco escenas**: no se presentan imágenes del port como si fueran capturas del original. La comparación inicial se basa en contratos de código, recursos y configuración. El error y la separación del perfil están registrados en la evidencia.

La captura de escenas del servidor WebAssembly real usa las cinemáticas y entidades intactas, sin fullbright, teletransporte ni sustitución de escenas. Es observación de la build publicada; no acredita un recorrido natural de la campaña.

## Matriz visual inicial

| Área | Original comprobable | Port existente | Estado y causa |
|---|---|---|---|
| Iluminación de superficies | Cliente propio con lightmaps, bump/specular y parámetros `gl_gamma`, `gl_brightness`, `gl_contrast` | Renderer GLES de Xash3D y lightmaps del BSP | Diferencia arquitectónica confirmada; no se puede reproducir cambiando sin más el brillo final de toda la imagen |
| Contraste | `1005a110` prepara lightmaps; `100595f0` aplica contraste y brillo en esa ruta; registro original: gamma 1, brillo 0, contraste 1 | Gamma/brillo del motor y preferencia web de brillo | El perfil instalado tiene contraste 1,4, pero eso no demuestra que sea el valor de fábrica. No se impondrá ese valor como arreglo global |
| Linterna | Proyección específica del cliente original | Luz espacial reconstruida mediante `COF_SPOT_KEY`; antiguo cono web disponible solo para diagnóstico | Ya está separada del cono multiplicativo de pantalla. No se reactiva éste para simular iluminación física |
| Niebla | Entidades originales, incluidas distancias, color y fades | `env_fog`, mensajes del cliente y TriFog | Reconstruida; falta comparación nativa de las imágenes y de la combinación con luz/materiales |
| Grano | `CHudNoise` dibuja el sprite `snoise` / `subtle_noise`, teselas de 256 px, frames aleatorios 1–19, tinte `int(cl_noiseamount*255)` y mezcla aditiva (`10030340`) | Ruido hash a 24 Hz, amplitud 0,06 ponderada por luminancia | Diferencia de algoritmo y recurso confirmada. Es un candidato a corrección verificable sin alterar iluminación ni mecánicas |
| Viñeta | Cuatro TGA originales de 256×256; `cl_vignette` existe | Función radial del shader, fuerza 0,35 | Aproximación confirmada. Aún hay que verificar colocación/visibilidad antes de anunciar equivalencia |
| Blanco y negro / blur | Pasadas específicas del cliente original | Shader web con mezcla gris y blur de cinco muestras | Funcionalidad reconstruida parcialmente; no se certifica identidad del kernel, orden o colorimetría |
| Cielo y envpos | Marcadores del BSP y ambient/direct originales | Protocolo y pase de cielo ya implementados | Conservar implementación validada. `c_intro` y `c_start` usan escala 80, ambient 32 y direct 25 |
| Modelos y manos | Modelos originales, huesos, materiales externos por traje | Studio renderer, manos duales y sustituciones de textura restauradas al terminar cada dibujo | Rutas existentes; comprobar cada prenda, no solo la chaqueta HLC validada anteriormente |
| Sprites y overlays | Recursos originales | Munición original de Glock; otros efectos aún aproximados | Distinguir el recurso original del algoritmo de presentación, no asumir equivalencia solo por tener el archivo |

### Escenas y dependencias

| Mapa | Dependencias visuales relevantes del BSP |
|---|---|
| `c_intro` | Cielo `black`, lluvia, envpos world/sky, cámaras de introducción |
| `c_nightmare` | Cielo `black`, `cof_blur` de intensidad 1 / 1,5, niebla RGB 10/10/12 entre 200 y 1500 |
| `c_start` | Cuatro `multiscene1`, niebla RGB 10/10/12 entre 500 y 1500, blur de intensidad 4, envpos y escena de vestimenta |
| `c_apartment1` | Interiores y niebla negra entre 100 y 1000, cámaras, hoodie HLC original |
| `c_apartmentsick` | Interiores, cielos negros y secuencias de cámaras originales |

Los nombres no prueban por sí solos que cada efecto esté activado en el instante de una captura. El inventario completo y los estados de ejecución se guardan por separado.

## Sistema de vestimenta existente

- Servidor: `cof_hoodie`, máscara de desbloqueos y `cof_clothesmenu` están implementados en `game/cof-logic/cof/extras.cpp`.
- Perfil: `/rwdir/cryoffear/cof_extras_profile.cfg` conserva desbloqueos mediante IndexedDB. La selección está en el estado serializable del jugador, pero actualmente se reinicia con Spawn y **no se conserva como preferencia del perfil** al iniciar otro runtime.
- Cliente: `cof_extras.cpp` cambia temporalmente camiseta, manga, pantalón y rostro durante Studio; después restaura las texturas originales. Hay once trajes adicionales reconstruidos, además del predeterminado; la ropa personalizada no está completada.
- HTML: `extras.js` presenta las prendas disponibles y deja las bloqueadas como `Locked`, deshabilitadas. La elegida usa `aria-pressed`.
- Escena real de `c_start`: `clothes` → `clothescamera` / `simonclothes`; modelo `models/cutscene/simon_clothes.mdl`, secuencia `clothes_1`. La cámara apunta a `clothestarget`.
- Menú principal web: solo Nueva partida, Cargar y Opciones. Falta un acceso de vestimenta que funcione sin comenzar la campaña.

### Precisión sobre el menú original

El gráfico `gfx/vgui/menu/clothes.tga` pertenece al menú Extras comercial: la acción 5 de `CVGUIExtraMenu::ActionSignal` (`1002bcf0`) abre una página de camisetas mediante Steam. **No es el selector cosmético del personaje.** No se añadirá ese enlace ni se presentará como acceso original a los trajes.

El mapa `c_unlockables` existe, pero solo contiene cinco entidades, incluida `cof_unlockables`; no tiene el modelo/cámara del armario. Cargarlo sin implementar su contrato tampoco proporciona una preview de Simon.

El selector real `CClothesMenu` comprueba los bits antes de emitir `setclothes`; su lista bloqueada no equivale a ropa disponible. Su mensaje contiene máscara LONG y tres BYTE. Los comandos del port deben seguir validándose en el servidor, no confiar en la interfaz.

## Implementación progresiva propuesta

1. Sustituir únicamente el ruido inventado que ya tiene un contrato verificable por el sprite y la operación aditiva originales. Conservar el resto del postprocesado hasta disponer de pruebas suficientes; no aplicar un filtro de contraste global para compensar materiales/lightmaps.
2. Añadir un acceso Items / Clothes al menú del port, identificado como adaptación de navegación, con el modelo real de Simon y la secuencia existente. Reutilizar Studio y las sustituciones de materiales; no crear otro sistema de skins ni un renderer de MDL en JavaScript.
3. Conservar la máscara original, rechazar selecciones bloqueadas y guardar la preferencia mediante una extensión compatible del perfil del port. No cambiar el formato de las partidas nativas; cargar una partida debe conservar su propio estado de ropa.
4. Probar preview, selección, cierre, nuevo runtime, guardado/carga y prendas reales. Mantener por separado la validación del armario de `c_start` y la adaptación al menú.

## Evidencia inicial

`build/validation/visual-clothes-2026-11-07/`: `baseline.json`, `map-inventory.json`, `unlockables-map.json`, `original-isolation.json`, `native-launch.json`, registros de análisis y capturas `scenes-before/`. Los volcados de funciones originales `native-*.txt` son locales e ignorados; no se añaden DLL, modelos ni mapas originales al repositorio.

Este informe describe el estado **anterior a la implementación**. No declara resueltas la iluminación, la equivalencia visual global, la preview ni la persistencia de selección.
