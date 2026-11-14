# CLAUDE.md

Guía para Claude Code (y cualquier asistente) que trabaje en este repositorio: qué es el proyecto,
cómo se compila y se prueba, qué se hizo hasta ahora y qué trampas ya se conocen. El usuario
trabaja en español: responder y documentar en español; los comentarios del código van en inglés.

## Menú de ropa — 11/11/2026

Leer `docs/CLAUDE_ROPA_MENU_2026_11_11.md`.

- **Retrato negro:** la luz de modelos de CoF (`gl_studio.c`) ya no se aplica a entidades con `EF_FULLBRIGHT`, que
  solo usa el retrato de la interfaz.
- **Panel** (`extras.js`) con la disposición nativa de `CClothesMenu` (`1001f2b0`): lista a la derecha, Close y Reset
  abajo. Reset = `setclothes 0`.
- **Pruebas:** `clothes_menu.mjs` adaptada; el recuento de entradas habilitadas baja en uno porque la ropa
  predeterminada ahora es Reset.

## Pesadilla: cadáver de la X y espejo — 11/11/2026

Leer `docs/CLAUDE_PESADILLA_CADAVER_ESPEJO_2026_11_11.md`.

- **`env_customize`:** una clave `body`/`skin` **ausente vale 0 y se aplica**, como en `hl.dll` (`10108f00`). La
  regla anterior («ausente = no cambiar») escondía los cadáveres de las X falsas, los marcos de TV de `c_apartment3`,
  la cuerda de `c_apartment5` y el rayo de `c_intro`. Las partidas antiguas se migran (versión 2).
- **Destello de la cámara:** ya no marca `LIGHT_DAMAGE` en monstruos con guion. Cancelaba el guion del reflejo de
  Simon en el espejo, que se quedaba estático.
- **Publicado** con manifiesto `c83a0e4f86f0` (solo cambia `server.wasm`, ahora `78a7f109…`).
- **Pendiente, a pedido del usuario:** el cuaderno de notas (16 notas, `cof_addcodenote`, imágenes de código) y el
  teléfono (`cof_phonecall`/`cof_telephone`, que no están en los 11 mapas).

## Continuación de teléfono y HUD — 01/11/2026

Leer `docs/CONTINUACION_TELEFONO_HUD_2026_11_01.md`. Partida limpia en `9588f8f`.
Build aislada `/root/cof-audits/phone-hud-20261101/dist-controls`, puerto 8111,
manifiesto `2f88e7b98c18`, servidor `07e7ef5c…`.
Se retiró la alternancia DOM de F que encendía el filtro postfx incluso en modo SMS;
el servidor y CoFLight siguen controlando el foco. El filtro permanece disponible por API
para diagnóstico. No se cambió intensidad, gamma, motor ni renderizador.
El clic derecho original es un puñetazo (10053a70, animaciones 10/11), todavía pendiente;
no se reprodujo que cambiara la luz. No declarar resuelto todo el síntoma del usuario.
HUD visible tras cámara con navaja, pausa, bolso, restauración, transición A1→A2 y SW.
14 navegadores + 9 BSP + Pointer Lock PASS; callbacks 39/39 en sesión/frío, zoom y cinco
mediciones de apartamentos repetidos. Logs nuevos separados; los fallos se conservaron.
Extras: 22 comentarios + hoodie/ropa/nightvision siguen pendientes; faltan en staging
las 21 grabaciones de comentarios y los modelos developer_commentary y w_nightvision.
El HUD de munición original usa sprites de cargador; no quitar sin más el requisito HEV
del Draw de Half-Life para inventar su interfaz. PlayerUse original busca a 80 unidades,
inventoryuse a 64: no confundirlos. No se modificó dist/ ni se publicó esta etapa.
Integración posterior autorizada por el usuario: ver `docs/PUBLICACION_TELEFONO_HUD_2026_11_01.md`;
la build validada se promueve a dist/ y se publica con ese mismo manifiesto.
Publicación comprobada: build `db41375`, Pages run `41384389487` success; ocho recursos
públicos idénticos y fixture real con SW, módulos esperados, controles/barras y cero errores JS/GL.
Las evidencias posteriores no cambian dist/. No ampliar ese resultado a todo el síntoma del clic derecho.

## Continuación de Codex — linterna, 31/10/2026

Ver `docs/INFORME_LINTERNA_2026_10_31_CODEX.md` antes de retomar la linterna. Dos defectos
corregidos: índice de luxel sombreado por la variable de brillo y renovación del foco después
de dibujar el mundo. Ahora se renueva desde V_CalcRefdef con la vista final.
Build validada: `/root/cof-audits/flashlight-20261031/dist-view` (8098). El usuario autorizó
después su integración en dist/ y publicación: ver `docs/PUBLICACION_LINTERNA_2026_10_31.md`.
Dos pasadas de 14 pruebas de navegador, 9 contratos BSP y Pointer Lock satisfactorias; se
verificaron mundo, giro, r_dynamic, frames lentos y save/load. Evidencia separada en
`build/validation/flashlight-2026-10-31/`.
El filtro anterior permanece. La prueba exploratoria con gl_overbright=0 conserva un fallo
de umbral (+4,90 frente a +5); falta contraste visual con el original y GPU física.
No hacer pasar esa prueba retocando intensidad sin evidencia. La investigación inicial no publicó;
la integración y publicación posteriores fueron autorizadas y verificadas en GitHub Pages.
Build publicada: commit `1c74111`, manifiesto `c42da5797a53`; prueba pública con SW y save/load PASS.

## Consolidación en curso — 01/11/2026

Leer `docs/CONSOLIDACION_ALPHA_2026_11_01.md`. Build aislada nueva:
`/root/cof-audits/alpha-20261031/dist-glock`, puerto 8104 con argumento de carpeta
explícito en serve.py (su predeterminado apunta a una build antigua).
La Glock consumía munición pero usaba el daño 9 mm de Half-Life, configurado a cero;
ahora registra sk_cof_glock1..4 antes de skill.cfg y pasa el daño CoF explícito.
Compilación y 14 navegadores + 9 contratos BSP + Pointer Lock satisfactorios.
Mediciones en los cinco apartamentos y persistencia satisfactorias en sus fixtures;
la pared anterior con overbright 0 sigue por debajo de +5. No retirar el filtro.
Evidencia en `build/validation/alpha-consolidation-2026-10-31/`; volcados nativos y
guardados privados excluidos. No se publicó esta etapa ni se modificó dist/.
Integración posterior autorizada: ver `docs/INTEGRACION_ALPHA_2026_11_01.md`;
la build validada ya se incorporó a dist/ y se comprobó desde el puerto 8105.
Solo commits locales en esta integración; sin push ni despliegue.
No declarar recorrido completo: los intentos naturales nuevos están documentados
por separado, sin acreditar progresión mediante fixtures con equipo concedido.

## Auditoría de callbacks — 01/11/2026

Ver `docs/PERSISTENCIA_ENTIDADES_2026_11_01.md`. Los 39 avisos de c_apartment1
son 39 callbacks de 27 entidades; se reprodujeron en dist/ antes de corregir.
El fallback de nombres estables se inicializa en GameDLLInit y FIELD_FUNCTION
usa sizeof(BASEPTR) en WASM (GNUC estaba ausente y seleccionaba 4 en vez de 8 bytes).
También se guarda el estado propio de cof_camerazoom. No duplicar las soluciones
previas de sound/puertas/botones/cámaras/trenes. Build aislada:
`/root/cof-audits/persistence-20261101/dist-fixed-abi`, puerto 8108.
0 avisos/pérdidas a 3/20/55 s; callbacks, contactos, zoom y restauración en frío
verificados; 14 navegadores + 9 contratos + Pointer Lock PASS. Sigue un aviso
temprano del constructor anónimo CTestHull: no declararlo inocuo ni silenciarlo.
No se modificó dist/ ni se hicieron commits/push/despliegue en esta auditoría.
Las pruebas tienen salida de audio silenciada; el volumen del producto no cambió.

## El proyecto

Port de **Cry of Fear** (Team Psykskallar, motor GoldSrc) al navegador con **Xash3D FWGS +
Emscripten 4.0.11 + WebGL 2**. La lógica del juego (las DLL originales de Windows) no se puede usar
en la web, así que se reimplementa en C++ sobre hlsdk-portable (`game/cof-logic/`).

- Repositorio público: <https://github.com/Putrefacto669/Cry-Of-Fear-PortWeb> (remote `portweb`,
  rama `main`). El repositorio antiguo, privado, es `origin` (Cry-Of-Fear-Port-Web) y quedó en
  `744cbcb`.
- Permiso de Andreas (Team Psykskallar) con tres condiciones: **créditos visibles, código abierto
  (GPL-3.0) y sin fines de lucro**. La página enlaza el código fuente desde "Acerca de".
- Juego original (referencia, solo lectura): `C:\Program Files (x86)\Steam\steamapps\common\Cry of Fear`.
- SDK oficial 1.3 de Team Psykskallar (FGD, `.rmf` de mapas, prefabs):
  `C:\Users\josue\OneDrive\Desktop\COF SDK\CryOfFear_SDK_1.3.4(1)\CryOfFear_SDK_1.3`.
  Es propiedad de Team Psykskallar y solo se usa como referencia: no se sube al repositorio.

## Reglas de trabajo

- Investigar → reproducir → explicar → corregir → compilar → probar → documentar.
- No hacer commits, pushes ni despliegues sin que el usuario lo pida. Commits en español, con la
  línea `Co-Authored-By` que indique el sistema.
- No usar operaciones destructivas (`git reset --hard`, `git clean`, `git checkout` sobre archivos
  modificados, force push) ni sobrescribir distribuciones o informes ajenos sin autorización.
- No alterar reglas del juego para pasar pruebas, no subir timeouts para ocultar fallos, no
  desactivar cinemáticas, acertijos ni enemigos, no inventar códigos fijos.
- El análisis de las DLL originales es **solo lectura** (Ghidra en modo `-readOnly`). Los proyectos
  de Ghidra (`build/entity-analysis`, `build/envpos-client-analysis`) llevan dentro los bytes de las
  DLL: **no se suben** salvo que el usuario lo pida expresamente.
- `build/validation/padlock/http-2.log` lo modifica el `serve.py` de Codex: no incluirlo en commits.

## Estructura

```
platform/web/       index.html, loader.js, hud.js (HUD/menús propios), postfx.js (+ shaders/), sw.js
game/cof-logic/cof/ lógica de servidor de CoF (entidades, armas, monstruos, candado, puzles...)
game/cof-logic/client/ lado cliente (niebla, partículas, cielo envpos, calcomanías, candado)
patches/xash3d/     cambios sobre Xash3D FWGS (0001-root.patch y submódulos)
patches/hlsdk/      cambios sobre hlsdk-portable (0001-root.patch)
tools/stage_map.py  copia del juego lo que necesita cada mapa (boot + paquetes por mapa)
tools/wsl/          setup, builds, package.sh, patches.sh, e2e
tools/e2e/          pruebas de navegador (Playwright 1.64.1)
tools/ghidra/       scripts de Ghidra de solo lectura para estudiar las DLL originales
docs/               contratos de entidades reconstruidas (PADLOCK, ENVPOS, STATIC_DECAL...)
dist/               build jugable completo (se versiona: el usuario lo pidió en el repo público)
build/validation/   informes y trazas de pruebas (se versiona; el trace de 922 MB va como .json.gz)
```

## Entorno de compilación (WSL Ubuntu, root)

- Árbol de trabajo canónico: **`/root/cof-audits/audit-D3Kl5uly`** (el de Codex, build 19 en
  adelante). Contiene `engine/xash3d-fwgs`, `game/hlsdk-portable`, `build/`, `stage/` (los 11 mapas
  ya preparados con texcomp) y las salidas `dist-decals/`, `dist-next/`.
  `~/cof-web` está desfasado (25 oct): no usarlo.
- Los scripts usan `COF_WORK` (por defecto `~/cof-web`): exportar
  `COF_WORK=/root/cof-audits/audit-D3Kl5uly`.
- `build_game.sh` copia `game/cof-logic` del repo al árbol de trabajo antes de compilar.
- Los parches se editan en el árbol de WSL y se exportan con `tools/wsl/patches.sh export`. El
  diff textual del `.patch` sale grande (cambia el orden de los hunks); comprobar el cambio real
  comparando las líneas `+`/`-` por archivo.

Ciclo completo que se usó (desde Git Bash, con un script en archivo):

```bash
export COF_WORK=/root/cof-audits/audit-D3Kl5uly
REPO="/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web"
MAPS="c_game_menu1 c_intro c_nightmare c_start c_start2 c_apartment1 c_apartment2 c_apartment3 c_apartment4 c_apartment5 c_apartmentsick"
cd "$REPO"
bash tools/wsl/build_engine.sh          # solo si cambió patches/xash3d
bash tools/wsl/build_game.sh
for m in $MAPS; do                       # solo si cambió stage_map.py o los assets de un mapa
  python3 tools/stage_map.py "/mnt/c/Program Files (x86)/Steam/steamapps/common/Cry of Fear" $m $COF_WORK/stage --texcomp $COF_WORK/build/tools/texcomp
done
COF_DIST=$COF_WORK/dist-next bash tools/wsl/package.sh $MAPS
rsync -a --delete --checksum $COF_WORK/dist-next/ "$REPO/dist/"
bash tools/wsl/patches.sh export        # si se tocó el árbol de Xash o hlsdk
```

Los 11 mapas publicados: menú (`c_game_menu1`), prólogo (`c_intro`), **preludio (`c_nightmare`)**
y capítulo 1 "Lost in a city" (`c_start`, `c_start2`, `c_apartment1-5`, `c_apartmentsick`).

## Trampas conocidas

- **Un solo parche por repositorio**: `patches.sh export` borra todos los `.patch` y escribe uno por repo
  a partir del árbol canónico. Un parche suelto (`0004-root.patch`, `hlsdk/0002`...) que no esté aplicado
  en ese árbol se pierde en el siguiente `export`, y el juego se compila sin él. Aplicar cualquier cambio
  al árbol canónico y exportar; antes de un `export`, comparar árbol y parches (líneas `+/-`).
  Consolidado el 08/11 (`docs/RELOJ_Y_CONSOLIDACION_2026_11_08.md`).
  - Desde el 08/11, `export` se cancela si se perderían líneas de los parches actuales.
  - `patches.sh check` informa sin escribir; `export --allow-drop` es solo para sustituciones revisadas.
  - Prueba: `tools/wsl/test_patches_guard.sh`.
  - Desde el 09/11 la serie sale de `git diff HEAD` (incluye lo indexado), el lote es transaccional y
    `--allow-drop` deja registro en `build/patch-approvals/<id>.txt`. La prueba escribe sus registros en
    un temporal (`COF_PATCH_APPROVALS`).
  - Antes de aplicar un `patch_*.py` al canónico, comprobar qué tiene ya: el 09/11 el árbol tenía Studio 2
    en `gl_opengl.c`/`gl_local.h` pero no en `gl_studio.c`, y reaplicarlo duplicó la cvar
    (`docs/CLAUDE_INTEGRACION_STUDIO4_LLUVIA_2026_11_09.md`).
- **Lluvia del HUD** (09/11): las rayas de `hud.js` (`COF/HUD RAIN` de `rain_settings`) están apagadas por
  defecto por decisión del usuario; Opciones → Lluvia las activa (`cofOptions.rain`). El servidor sigue
  enviando la petición. Prueba: `tools/e2e/rain_option.mjs`.
- **Reloj del motor**: en la web `Platform_DoubleTime` usa `emscripten_get_now()`, que es monótono. El de
  SDL (`Date.now()`) retrocede con los ajustes de hora y daba arranques sin conexión (`level loaded at
  -18446744073707 sec`). Prueba: `tools/e2e/clock_backwards.mjs`.
- **Lightmaps fieles** (08/11): `R_CofBuildLightMap` (`gl_rsurf.c`) construye la luz del mundo como el
  `client.dll`, sin tabla de gamma, con ×2 al combinar. El mundo queda más oscuro a propósito.
  - `r_cof_lightmaps 0` vuelve a la luz de Xash para comparar.
  - Opciones → Brillo fija `gl_brightness` (0–0,3, como el original).
  - No compensar subiendo `brightness`, `gamma` ni el ×2.
  - La curva es `pow(x, gl_gamma)·gl_contrast + gl_brightness` (`FUN_100595f0`; no `1/gamma`).
- **Luz de modelos** (08/11, `docs/ILUMINACION_MODELOS_Y_MATERIALES_2026_11_08.md`): el original no usa la luz de
  modelos del motor (`gl_modelrenderer 1`). `gl_studio.c` la reproduce (`R_CofModel*`): capas 61/62/63 del luxel
  bajo el modelo, `gl_lambert 2`, `renderfx` 100–200, y textura × color × 2.
  - El ×2 va por `GL_RGB_SCALE`, que el shim emula solo para esto (`uRGBScale`).
  - `r_cof_modellight 0` compara con la luz de Xash.
  - `cof_model_light` muestra contadores de diagnóstico.
  - Medición: `tools/e2e/model_light.mjs`.
- **Pruebas e2e de Codex**: Node en `/root/emsdk/node/24.19.0_64bit/bin`, Playwright y navegadores en
  `/root/cof-audits/browser-1.64.1` (`PLAYWRIGHT_BROWSERS_PATH=.../browsers`; los `.mjs` se copian a
  `.../e2e/` para que encuentren `node_modules`).
- **Comillas en WSL desde Git Bash**: `$var` y `$(...)` se expanden antes de llegar a WSL. Escribir
  siempre un script en el scratchpad, quitar CRLF (`sed -i 's/\r$//'`) y ejecutar con
  `MSYS_NO_PATHCONV=1 wsl -u root -- bash /mnt/c/.../script.sh`.
- **Finales de línea**: varios archivos del repo usan CRLF (`postfx.js`, `index.html`). `sed -i` de
  Git Bash los convierte a LF y Python en Windows escribe CRLF: usar la herramienta Edit, `sed -b`
  o escribir bytes. `sw-manifest.js` va con LF.
- **dist/ y el Service Worker**: `sw.js` sirve las copias `.gz` de los `.data`/`.wasm` y comprueba
  hashes de `sw-manifest.js`. Si se toca cualquier archivo de `dist/` a mano hay que regenerar los
  `.gz` y el manifiesto (el bloque Python final de `package.sh`). Con `.gz` desfasados el motor no
  arranca (`filesystem_stdio.wasm: need to see wasm magic number`). Lo más seguro es empaquetar
  siempre todo con `package.sh`.
- **Mayúsculas en rutas**: los recursos vienen de Windows (`models/Props` = `models/props`), pero MEMFS
  las distingue y `FS_FixFileCase` solo entra en una carpeta. `loader.js` unifica la capitalización al
  montar paquetes; aun así, `stage_map.py` debe copiar rutas con la capitalización real (`find_ci`).
  Caso completo en `docs/ENVPOS_CASE_STUDY.md`.
- **Errores GL que dependen del backend**: SwiftShader (pruebas sin interfaz) no informa de lecturas
  fuera de rango que ANGLE D3D11 rechaza con `GL_INVALID_OPERATION`. Para reproducir hay que usar la
  GPU real (panel del navegador de la app) o el detector de buffers de
  `build/validation/glerr-2026-10-30/scripts/glquads.mjs`. En WebGL, `gl2_shim` va sin VAO y con
  arrays de cliente. El `glDrawRangeElements`/`glDrawElements` de Emscripten con un buffer de
  índices enlazado no sube vértices. Caso completo en `docs/GL_INVALID_OPERATION.md`. La variable
  de las partículas del motor es `r_drawparticles`; `cl_draw_particles` no existe.
- `.gitattributes` tiene `dist/** -text` y `build/validation/** -text`: no tocarlos o cambian los hashes.
- **GitHub**: límite de 100 MB por archivo y HTTP 408 en pushes grandes. Subir en partes de ~150 MB
  (se hizo con un script que hace `git add --pathspec-from-file` por lotes). Windows corta las listas
  de argumentos largas.
- **`index.lock`**: la app de escritorio ejecuta `git status` a menudo; si un comando de git se
  cuelga, puede quedar un lock viejo. Comprobar su hora y los procesos de git antes de borrarlo.
- **Ghidra headless** (`C:\Users\josue\cof-re-tools`, JDK en `jdk-25.0.4.1+1`): el `.bat` parte los
  argumentos por comas y descarta los vacíos; usar `+` como separador y `-` como vacío. Proyecto del
  `client.dll`: `build/envpos-client-analysis/envpos_client`; del servidor:
  `build/entity-analysis/cof_classes`. Scripts de solo lectura en `tools/ghidra/`: `DumpBlackRefs`
  (funciones que usan ciertas cadenas), `DumpFuncs` (descompila funciones y sus llamadores),
  `DumpScalarUse` (quién usa un desplazamiento), `DumpFloats` (valores de constantes),
  `DumpCallers` (quién llama a una dirección), `DumpEntityClass` (clase exportada y su tabla de
  métodos). Ejemplo:

  ```powershell
  $env:JAVA_HOME = "C:\Users\josue\cof-re-tools\jdk-25.0.4.1+1"
  & "C:\Users\josue\cof-re-tools\ghidra_12.2_PUBLIC\support\analyzeHeadless.bat" "<repo>\build\envpos-client-analysis" envpos_client -process -noanalysis -readOnly -scriptPath "<repo>\tools\ghidra" -postScript DumpFuncs.java "<salida>.txt" "1006e4f0" "-" "0" "-"
  ```

## Probar en el navegador

- Servidor: `python dist/serve.py dist --port 8090` (Windows) o `serve.py` en WSL en otro puerto.
  El 8080 suele estar ocupado por el `Jugar.bat` del usuario.
- Sin `?map=` la página abre el **launcher** (`#launcher` en `platform/web/index.html`, imágenes en
  `platform/web/launcher/`) y el motor solo arranca al pulsar Jugar; con `?map=` va directo al juego
  (todas las pruebas e2e lo usan).
- Publicación: `.github/workflows/pages.yml` sube `dist/` a GitHub Pages en cada push a `main`
  (Source: GitHub Actions). Todas las URL son relativas; se probó bajo `/Cry-Of-Fear-PortWeb/`.
  El panel del navegador de Claude no admite Service Workers: el SW se prueba en Chrome.
- Idioma de subtítulos: Opciones → pantalla de banderas original (`language_settings.tga`, 7 idiomas).
  hud.js lo guarda en `localStorage.cofLanguage` (por defecto, el del navegador) y fija la cvar
  `cof_subtitlelanguage` (1 inglés, 2 neerlandés, 3 francés, 4 alemán, 5 noruego, 6 español,
  7 sueco), registrada en `cof_client.cpp` como en el client original.
- Parámetros de la página: `?map=c_nightmare` (mapa inicial), `?sw=0` (sin Service Worker),
  `?timer=1` (el bucle no se para con el panel oculto), `?debug=1`.
- Si una pestaña de `localhost:8090` sirve cosas viejas: desregistrar el Service Worker y borrar
  `caches`.
- Comandos de consola desde JS: `Module.ccall("Xash_Cmd", null, ["string"], ["comando\n"])`.
- Depuración del port (requieren `sv_cheats 1`): `cof_goto x y z` / `cof_goto <nombre>`,
  `cof_face <nombre>`, `cof_count <clase>`, `cof_list <clase>`, `cof_remove <nombre>`,
  `cof_inspect <nombre|#índice>`, `cof_give <arma>`, `cof_use`, `cof_fire`, `noclip`. Xash no tiene
  `setpos`. Cielo: `cof_sky_status`, `cof_sky_entities` (cliente) y `cof_sky_render_status`
  (renderer; `view=` es la del último frame en que se dibujó el cielo, no la vista actual).
- Una pestaña en segundo plano corre a ~1 fps: traerla al frente para comparar.

## Protocolo y piezas clave

- El servidor imprime líneas `COF/HUD <CMD> ...`; `loader.js` les quita el `[hh:mm:ss] ` y las pasa
  a `hud.js` (menú propio, bolso, salud/energía, notas, candado, blanco y negro, desenfoque...).
- Mensajes de usuario CoF: `CoFFog`, `CoFEmit` (atmosphere.cpp), `skymark_w`/`skymark_sky`
  (envpos.cpp), `Padlock`, `CoFDecal` (static_decal.cpp). Se registran en `CoF_LinkUserMessages`.
- Estado por cliente que hay que reenviar en cada mapa o partida cargada: se manda desde
  `CBasePlayer::UpdateClientData` (`CoF_SendEnvpos`, `CoF_PadlockSync`, `CoF_SendStaticDecals`).
- Armas CoF: `UseDecrement() TRUE` y `cl_lw 0` (sin predicción en cliente).
- El cliente pide la RenderAPI de Xash con `HUD_GetRenderInterface` (cof_decals.cpp) sin sustituir
  funciones del renderer: sirve para cargar texturas propias.

## Trabajo hecho

### Antes de la llegada de Codex (hasta el 25 de octubre)
- Menú original con paneles propios (sin el menú de Half-Life: Esc, TAB, cargar partida, opciones),
  pantalla de carga negra.
- Prólogo (lluvia), preludio (cámara de fotos, `camera_spot_trigger`) y capítulo 1 con enemigos,
  armas (navaja, Glock, jeringa, móvil, cámara), bolso guardado en las partidas, notas, puzles,
  escaleras, subtítulos y textos en español, niebla (`FogParams` exponencial, `gl_fog 1`), hojas y
  vapor (sistema de partículas propio con TriAPI), brillos, `func_button` con `lockedby`.
- Release `v0.2.0-alpha` con el zip de `dist/`.

### Trabajo de Codex (30 de octubre), auditado
- Entidades de `c_start`: candado (`item_padlock`, `docs/PADLOCK.md`), `bossbar`, `changevalue`,
  `checkbrush`, `envpos` (cielo 3D), `motion_manager`, `trigger_sound`, escaleras, `triggeron`,
  serialización de cámaras, trenes, botones, `multi_manager` y `trigger_changelevel`.
- Auditoría de continuidad: `build/validation/claude-audit-2026-10-30/AUDITORIA.md`.

### 30 de octubre (Claude Code)
- **Repositorio público**: historia unida con el commit inicial (sin force push), etiquetas,
  `dist/` y `build/validation` subidos por partes. Copias en `C:\Users\josue\CoF-Backups\2026-10-30\`
  (bundle con todas las ramas, `build/validation`, árbol de WSL, `dist` anterior).
- **Enlace GPL** apuntando al repositorio público (README, `package.sh`, `build_preload.sh`).
- **dist/ roto**: los `.gz` del build de Codex eran del 25 de octubre; se regeneraron.
- **`env_static_decal`** (63 en el capítulo 1: hojas, grafitis, carteles): `docs/STATIC_DECAL.md`.
  Texturas TGA de `gfx/decals` con fondo gris 128 y mezcla 2x modulate (`GL_DST_COLOR,
  GL_SRC_COLOR`) en `gl_decals.c` para los nombres que empiezan por `gfx/decals/`.
- **Blanco y negro**: `cof_blackandwhite` usaba `cgshaders/black_fp.cg`, que invierte la imagen (el
  menú y las escenas salían blancas). El `client.dll` hace un pase de `gl_grayscale`: la imagen en
  gris encima con alfa = `iuser1 / 255` (`GreyFade` lo anima). `postfx.js` hace ahora
  `mix(color, luma, grey)`.
- **Preludio**: `camera_spot_trigger` ya no se oculta: es la X blanca (`c_nightmarex`, aditivo) que
  hay que fotografiar. Recorrido completo comprobado: intro, 11 X, espejo que se rompe, screamer
  final (`headdy` + grito) y cambio a `c_start`.
- **`GL_INVALID_OPERATION` en el preludio** (`docs/GL_INVALID_OPERATION.md`): no lo causaba la
  cámara, sino los lotes de partículas del motor (`CL_DrawParticles`, varios quads en un
  `Begin`/`End`). En WebGL se dibujaban sobre un buffer de vértices de 1 byte. Arreglo en
  `gl2_shim.c`, solo para Emscripten: esos lotes se dibujan con índices en memoria del cliente. En el
  punto de reproducción los dibujos inválidos pasan de 253 a 0, y en GPU real (D3D11) de decenas de
  errores por segundo a 0. La suite y el preludio completo pasan. El disparador del screamer es el
  `trigger_once` `*125` (y ≈ -1370): se llega caminando hacia -y desde (-738, -1300, -290).
- **Bolso, barras, teléfono y pisadas como el original** (`docs/HUD_PHONE_FOOTSTEPS.md`), sacado de
  `client.dll` y `hl.dll`:
  - **Bolso:** fondo de óxido y menú por objeto (EQUIP... 1 2 3) con los sonidos `inventory/*`.
  - **Barras:** siempre visibles, salvo en el preludio o con el HUD oculto; las cámaras con
    spawnflag 16 ponen `HIDEHUD_HEALTH`.
  - **Teléfono:** modos SMS y linterna; el SMS se ve en la pantalla del modelo (`body` = número de
    mensaje), con icono de no leído y traducción como subtítulo.
  - **Pisadas:** `player/footsteps/*` según `sound/materials.txt`, más el roce del bolso.

## Pendiente

- Reempaquetar `dist/` con el arreglo de `gl2_shim` (ya está en `patches/xash3d`; validado en
  `dist-glfix` del árbol de WSL, falta autorización para publicarlo).
- X falsas del preludio (`wrong1..11`) sin probar una por una (el usuario dice que las X van bien).
- Bolso: COMBINE, DROP, DUAL WIELD y el panel de notas sin implementar (suenan a `inventory_no`).
  Falta también el puñetazo con el teléfono (disparo secundario).
- El usuario ve animaciones "trabadas": falta saber cuáles (armas, enemigos o cinemáticas).
- Diferencias frente al recorrido original en vídeo (`docs/VIDEO_REFERENCE.md`): la cara del
  screamer se ve más pequeña en el port (causa sin demostrar) y el cono de luz del móvil está sin
  comparar. Las capturas sin interfaz (SwiftShader) pintan blanco el modelo en mano: no es un fallo
  del port.
- `tools/e2e/smoke.mjs` falla dos comprobaciones (ya fallaban antes de la corrección de envpos): la
  recarga vuelve a descargar 4,6 MiB y aparece `ERR_INTERNET_DISCONNECTED` sin conexión.
- Candado: falta validar de forma natural la contraseña correcta, la combinación, el regreso a
  `c_start` y guardar/cargar. Manos blancas tras cargar partida.
- Llaves: se usan desde el bolso (`cof_useitem`, `CoF_UseItemOn` en `doors.cpp`), como el
  `inventoryuse` original; E sobre una puerta o un botón cerrados solo avisa. Sin probar en juego: el
  botón de la cinta de vídeo de `c_apartment3` y la puerta `*96` de `c_apartment4`.
- Linterna a medias (`docs/INFORME_MEJORAS_2026_10_31.md`): servidor, cliente y foco del renderer
  (`COF_SPOT_KEY` en `patches/xash3d`) compilados, pero el foco apenas ilumina el mundo. El cono de
  `postfx.js` sigue activo con F hasta arreglarlo.
- `cof_greyfade` (fundido a gris) no está implementado; no aparece en los mapas publicados.
- Entidades del capítulo 1 sin implementar: `cof_developer_commentary`, `cof_hoodie`,
  `cof_clothesmenu`, `item_nightvision` (y `info_texlights`, que solo sirve al compilar).
## Validación de continuación — 31 de octubre de 2026 (Codex)

- Al recuperar el relevo: HEAD `4000b6a`, árbol limpio, rama activa
  `codex/c-start-padlock` (no se cambió a main).
- Sobre el dist de ese commit se repitieron las doce regresiones de navegador:
  12/12 satisfactorias; también Pointer Lock y los nueve contratos BSP.
  Evidencia nueva, separada: `build/validation/continuation-2026-10-31/`.
- `natural-1` llegó con controles normales a la nota y al PC y volvió al candado.
  `operations-2/result.json` comprueba código erróneo/correcto, cuatro ruedas,
  cancelación, persistencia y cruce de la puerta liberada mediante E. La extensión
  posterior hacia multiscene3 se obstruyó en una escalera: no acredita la escena.
- Se reprodujo pérdida de MultiTouch de los trigger_once *35/*43 después de
  guardar/cargar. También se perdían Touch y estado de doorclose2. Hay correcciones
  en el parche hlsdk, compiladas y empaquetadas **solo en dist aislado**:
  `/root/cof-audits/continuation-20261031/dist-doors`. El dist principal no cambió.
- `trigger-fixed-2` pasa tres restauraciones de disparadores y puerta en reposo,
  y una prueba de Use/guardado/carga de la puerta que termina detenida. La suite
  completa posterior a esos cambios y el recorrido de multiscene3 siguen pendientes.
- El original ofrece uso directo de func_door_rotating con bandera 256; *42 tiene
  spawnflags 19. Su Use no activa multiscene3 por nombre: existe un trigger_once
  de proximidad (*35). Se retiró el static global añadido para esa activación.
- Informe: `docs/CONTINUATION_2026_10_31.md`. Las voces no se declaran audibles por
  estar presentes: todavía falta la comprobación de emisión y escucha.
- Validación de Claude Code sobre `dist-customize` (con el enrutamiento body/skin de
  env_customize): escena natural del SMS completa, `cusse` pone `body=1` en `simon3`;
  12/12 regresiones y pruebas de disparadores, voces y uso satisfactorias. La escena
  arranca al entrar en `*35`, no con E. El "enemigo" inmóvil es probablemente
  `models/cutscene/blacker.mdl`, visible si `*43` no cierra la puerta.
- Ojo: Codex dejó servidores abiertos en 8096 (`dist/`) y 8099 (`dist-use`, sin el
  arreglo). Una prueba lanzada contra 8099 no valida las correcciones posteriores.



