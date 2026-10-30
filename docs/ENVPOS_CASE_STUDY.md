# Caso de estudio: el cielo de envpos que desaparecía al volver al menú

Registro técnico de la regresión de `envpos_entities` (30 de octubre de 2026), escrito como caso de
estudio de reingeniería: portar un juego hecho para Windows a un sistema de archivos virtual del
navegador. Las secciones separan lo **observado** (con su fuente) de lo **inferido**.

Evidencias: `build/validation/envpos-case-2026-10-30/` (registros, scripts y resultados de cada
ejecución citada aquí).

## 1. Problema observado

- La prueba de navegador `tools/e2e/envpos_entities.mjs` dejó de pasar después del 29 de octubre.
  Falla al llegar a `c_game_menu1` por `changelevel` tras recorrer `c_start` → `c_start2` → `c_intro`:
  espera 60 s a que el cielo especial dibuje polígonos y no ocurre (`sky state timeout`).
  Fuente: `claude-audit-2026-10-30/envpos-rerun/envpos-entities-failure.log`.
- En ese estado `cof_sky_render_status` informa `active=1 draws=0 polys=0`: el pase de cielo está
  activo pero no dibuja ningún modelo. El cliente sí tiene los marcadores (`COF/SKY mask=3 valid=3
  scale=80 ambient=32 direct=25`).
- El menú cargado directamente (`?map=c_game_menu1`) **sí** dibuja el cielo (`draws=1 polys=448`).

## 2. Impacto sobre la compatibilidad

- El cielo de `c_game_menu1` es un modelo de estudio (`env_model` con `renderfx 137`,
  `models/props/sky_sphere4.mdl`) que el cliente dibuja desplazado según los marcadores
  `envpos_world`/`envpos_sky` (docs/ENV_MODEL.md). Sin él, el fondo del menú queda vacío.
- El fallo depende del recorrido: aparece al volver al menú después de haber montado el paquete de
  `c_start2` en la misma sesión del navegador. Cualquier recurso afectado del mismo modo (no solo el
  cielo) dejaría de cargarse.

## 3. Hipótesis investigadas

| # | Hipótesis | Prueba | Resultado |
|---|---|---|---|
| H1 | El servidor no envía el modelo de cielo fuera del PVS | Lectura de `AddToFullPack`: existe una excepción para `env_model` con `renderfx 137` | Descartada por código |
| H2 | Fallo general del menú o del `changelevel` desde `c_intro` | Menú directo y `c_intro` → menú a mano con el build actual | Ambos dibujan el cielo: descartada |
| H3 | La vista se queda congelada en la cámara de `c_intro` | `view=` del estado del renderer coincidía con la de `c_intro` | **Falsa pista**: `view=` solo se actualiza al dibujar el cielo; `viewpos` real estaba en la cámara del menú y se movía |
| H4 | Error de sincronización de la entidad de vista (`svc_setview`) entre niveles | Registro temporal en motor (servidor y cliente) | El servidor envía `SET_VIEW 78` y el cliente lo recibe con `signon=2`: descartada |
| H5 | El cliente no recibe o no puede representar la entidad de cielo | Nuevos diagnósticos `cof_list`, `cof_sky_entities`, contador `added=` | Servidor: entidad #83 correcta. Cliente: 0 entidades con modelo. **Confirmada** |
| H6 | El cliente no puede cargar el modelo por un problema del sistema de archivos | Búsqueda en el registro y experimento controlado | **Causa demostrada** (sección 4) |

Bisección de componentes (copias del `dist` de Codex con un grupo de archivos sustituido por el del
build actual; una ejecución cada una):

| Variante | Resultado |
|---|---|
| `dist` de Codex sin cambios | falla en el menú |
| + motor y librerías actuales | falla (en otro punto: mezcla de código y paquetes de distintas fechas) |
| + paquete `boot` actual | falla en el menú |
| + paquetes de mapas actuales | pasa |
| + solo `c_intro` actual | falla en el menú |
| + solo `c_start` y `c_start2` actuales | pasa |
| build actual + `c_start`/`c_start2` de Codex | **falla en el menú**: el defecto sigue en el código actual |

## 4. Causa demostrada

**Hechos:**

1. En el menú el motor escribe `Error: Could not load model models/props/sky_sphere4.mdl from disk`
   (2 veces en la ejecución fallida, 0 en las que pasan).
2. El servidor mantiene la entidad #83 (`env_model`, `renderfx=137`, `effects=0`,
   `modelindex=164`, `model=models/props/sky_sphere4.mdl`); el cliente no tiene ninguna entidad de
   cielo con modelo (`COF/SKY_ENTITY count=0`) y el renderer no recibe ninguna (`added=0`).
3. Todos los paquetes guardan el modelo como `models/Props/sky_sphere4.mdl`. El paquete
   `map_c_start2` del `dist` de Codex contiene además **un archivo bajo `models/props/`** (minúscula):
   `file_packager` ejecuta `createPath("/rodir/cryoffear/models", "props")`.
4. Experimento controlado con el build actual (mismos pasos, solo cambia una carpeta vacía):

   | Ejecución | Carpetas en `models/` | Errores de carga del modelo | Cielo |
   |---|---|---|---|
   | control | `["Props"]` | 0 | `draws=1 polys=448` |
   | carpeta `models/props` vacía creada antes del menú | `["Props","props"]` | 2 | `draws=0 polys=0` |
   | control | `["Props"]` | 0 | `draws=1 polys=448` |

**Mecanismo** (código de `filesystem/dir.c`, `FS_FixFileCase`): el motor resuelve las mayúsculas
recorriendo la ruta componente a componente y entra en **una** entrada del directorio que coincida
sin distinguir mayúsculas. Si el archivo no está ahí, falla; no prueba otra carpeta del mismo nombre.
En Windows, de donde vienen los recursos, `Props` y `props` son la misma carpeta y esto no puede
ocurrir. En MEMFS (el sistema de archivos en memoria de Emscripten) son dos carpetas distintas: al
montarse `c_start2` aparece `models/props` y, desde entonces, `models/props/sky_sphere4.mdl` se
busca en ella.

**Inferencia:** el paquete de Codex se generó con una ruta escrita a mano en minúsculas
(`models/props/inomhusd/cafe_monitor.mdl`, de `cof_computer`) que no pasó por la corrección de
mayúsculas de `tools/stage_map.py`; al volver a preparar los mapas con el script actual la ruta salió
como `Props/Inomhusd`, y por eso el build publicado pasaba la prueba. No se reconstruyó cómo se
generó exactamente aquel paquete.

## 5. Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes |
|---|---|---|
| Solo volver a empaquetar (lo que ya ocurría en el build publicado) | Sin cambios de código | No corrige el defecto: cualquier paquete futuro con otra capitalización lo reproduce |
| Cambiar `FS_FixFileCase` para probar todas las carpetas equivalentes | Corrige en el motor | Parche más grande en Xash, coste en cada búsqueda, se aleja de upstream |
| Validar en `package.sh` que no haya rutas que solo difieran en mayúsculas | Detecta el problema al construir | No protege paquetes ya generados; no reproduce el comportamiento de Windows |
| **Unificar la capitalización al montar los paquetes (`loader.js`)** | Reproduce la semántica de Windows (una carpeta por nombre), pequeño, en la capa web, cubre todos los paquetes | Si dos paquetes trajeran archivos distintos con el mismo nombre en distinta capitalización, gana el último (igual que en Windows) |

## 6. Justificación de la solución

La diferencia de comportamiento está entre la plataforma original (sistema de archivos que no
distingue mayúsculas) y la plataforma destino (MEMFS, que sí las distingue). La corrección se coloca
en la frontera entre ambas, donde se crean los archivos: `platform/web/loader.js` envuelve
`Module.FS_createPath` y `Module.FS_createDataFile` (las funciones que llama `file_packager`) y, si ya
existe una carpeta o archivo con el mismo nombre en otra capitalización, usa ese. Se instala en
`preRun`, antes de que se monten los paquetes iniciales, y antes de cada precarga.

No cambia el renderer, las cámaras, el movimiento ni las entidades, ni la prueba.

## 7. Archivos y componentes afectados

| Archivo | Cambio |
|---|---|
| `platform/web/loader.js` | Corrección: `canonicalPath` y envoltorios de `FS_createPath`/`FS_createDataFile`, instalados en `preRun` |
| `patches/xash3d/0001-root.patch` (`ref/gl/gl_rmain.c`) | Diagnóstico: `cof_sky_render_status` informa `added=` (modelos de cielo recibidos del cliente en el último frame) |
| `game/cof-logic/client/cof_client.cpp` | Diagnóstico: comando `cof_sky_entities` |
| `game/cof-logic/cof/player_cof.cpp` | Diagnóstico: `cof_list <clase>`, `cof_inspect #N`, y `renderfx`/`modelindex`/`model` en `cof_inspect` |

Los registros temporales del motor usados para descartar H4 (`VIEWDBG`) se retiraron antes de
exportar los parches.

## 8. Pruebas realizadas

Entorno: WSL Ubuntu, Playwright 1.64.1, Chromium headless shell 1248 con SwiftShader, servidor
`tools/serve.py`. Prueba: `tools/e2e/envpos_entities.mjs` sin modificar (límite de 60 s intacto).

| Configuración | Ejecuciones | Pasan |
|---|---|---|
| `dist` de Codex (sin corrección), incluida una copia instrumentada de la prueba | 2 (+2 en la auditoría de la mañana) | 0 |
| Build actual + paquetes `c_start`/`c_start2` de Codex (sin corrección), incluidas las variantes instrumentadas | 5 | 0 |
| Build publicado (sin corrección, paquetes coherentes) | 1 | 1 |
| **Con corrección** + paquetes `c_start`/`c_start2` de Codex | 2 | 2 |
| **Con corrección**, paquetes actuales | 3 | 3 |

En las 5 ejecuciones con corrección: 0 errores `Could not load model models/props/sky_sphere4.mdl`
y 0 errores de página. Duración: 79–88 s por ejecución.

Experimento con la corrección (el "paquete" crea `models/props` con `FS_createPath`, como haría
`file_packager`): la carpeta resultante sigue siendo `["Props"]` y el cielo dibuja
`draws=1 polys=448`; el envoltorio está activo desde el arranque.

Suite completa de navegador (12 pruebas) con la corrección: ver sección 9.

## 9. Resultados de la suite completa

Suite de navegador con la corrección (`runs/suite-dist-fix-*`), una ejecución:

| Prueba | Resultado | Duración |
|---|---|---|
| entities | pasa | 17 s |
| campaign_entities | pasa | 12 s |
| motion_entities | pasa | 12 s |
| model_entities | pasa | 10 s |
| manager_entities | pasa | 35 s |
| sound_entities | pasa | 15 s |
| camera_entities | pasa | 76 s |
| train_entities | pasa | 42 s |
| track_entities | pasa | 9 s |
| envpos_entities | pasa | 89 s |
| button_entities | pasa | 15 s |
| changelevel_entities | pasa | 20 s |

12 de 12, frente a 11 de 12 en la auditoría de la mañana (fallaba `envpos_entities`).
`envpos_entities` cubre el cielo en `c_start`, `c_start2`, `c_intro` y `c_game_menu1`, el paralaje y la
iluminación (ambient 32 / direct 25), guardado y restauración de los marcadores y el cambio a un mapa
sin marcadores (`c_apartment1`).

Otras pruebas que dependen de `loader.js`:

| Prueba | Sin corrección | Con corrección |
|---|---|---|
| `pointer_lock.mjs` | pasa | pasa |
| `smoke.mjs` (menú y `c_start`): carga, SW, caché, arranque sin conexión | pasa | pasa |
| `smoke.mjs`: "la recarga no descarga nada pesado" | falla (4,6 MiB) | falla (4,6 MiB) |
| `smoke.mjs`: "sin errores de página" | falla (`ERR_INTERNET_DISCONNECTED`) | falla (igual) |

Los dos fallos de `smoke.mjs` aparecen igual sin la corrección: son anteriores a este cambio y quedan
como trabajo pendiente.

## 10. Limitaciones

- Con una sola ejecución por variante, la bisección indica qué paquetes desencadenan el fallo pero no
  mide su frecuencia; el experimento controlado (sección 4) es lo que demuestra la causa.
- La variante "motor actual + paquetes de Codex" falló en otro punto (el tiempo de juego se detiene
  tras la cámara de introducción de `c_start`); no se investigó porque mezcla código y paquetes de
  fechas distintas y no se reproduce con paquetes coherentes.
- La corrección actúa en el navegador. Un build nativo que montara los mismos paquetes en un sistema
  de archivos que distingue mayúsculas tendría el mismo riesgo.
- El aspecto oscuro del menú que se veía antes de esta corrección se debía al filtro de blanco y negro
  (corregido el mismo día); con el cielo dibujado el menú se ve como en las capturas de esta prueba,
  pero no se ha comparado todavía con el juego original.
