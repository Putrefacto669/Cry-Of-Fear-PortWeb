# Integración de Studio 4, lluvia opcional y doble empuñadura — Claude Code, 9 de noviembre de 2026

## Petición del usuario

> Puedes hacer todo eso plis, de ultimo corrige la combinacion de armas porque cuando combine el telefono con la
> navaja parece que el pov de Simon se bugeo y la mano derecha en donde me sale el telefono, sale sobrexpuesta sobre
> la otra mano en donde no deberia de tener nada, tambien quita esas cosas de lluvia que hay en el juego porque
> siento que eso es innesesario y quiero que mejores la visualizacion del celular de Simon, porque no se ve nada,
> como referencia y dato, el telefono de Simon es un Sony Ericcson W610i en negro y naranja

«Todo eso» se refiere a lo propuesto en `CLAUDE_STUDIO4_Y_PRUEBAS_2026_11_09.md`, sección «PENDIENTE»:
- integrar Studio 4 siguiendo la lista de verificación;
- adoptar la guarda de parches;
- adoptar las dos pruebas corregidas.

**Estado:** solo hay commits locales. No hay push ni despliegue, y Pages sigue en `511886d6b3de` hasta que el
usuario lo autorice.

## 1. Lluvia

**Causa:**
- Las rayas que ve el usuario no son del motor. Las dibuja `platform/web/hud.js` en un `<canvas id="cof-rain">`
  cuando el servidor imprime `COF/HUD RAIN <gotas> <vientoX> <vientoY>`.
- La línea la emite `CRainSettings::RainThink` (`game/cof-logic/cof/effects_cof.cpp`), solo con Simon (o la
  cámara de una cinemática) bajo cielo abierto.
- `rain_settings` está en `c_intro`, `c_start2` y `c_game_menu1`.

**Decisión:**
- El original tiene lluvia (`rain_settings`, que su client dibuja con partículas), así que no se borra la entidad
  ni el protocolo.
- Por petición del usuario, la superposición queda **apagada por defecto**.
- **Opciones → Lluvia** (casilla, `cofOptions.rain`) la vuelve a encender al momento: `setRain` guarda la última
  petición del servidor y la reaplica al cambiar la opción.

**Prueba:** `tools/e2e/rain_option.mjs`, en `c_intro`. Con la configuración por defecto, el canvas no pinta ningún
píxel mientras el servidor pide lluvia. Con `rain: true` guardado, sí pinta.

## 2. Integración de Studio 4 en el árbol canónico

### Hallazgo previo

El árbol canónico de WSL (`/root/cof-audits/audit-D3Kl5uly`) no estaba igual que `patches/`:
- **`gl_opengl.c`/`gl_local.h`:** tenían el registro de `cof_fullbrighttextures` de Studio 2.
- **`gl_studio.c`/`gl_rsurf.c`:** se habían quedado en Studio 1.

Al aplicar `patch_studio2.py`, `patch_studio3.py` y `patch_studio4.py` en orden, el `gl_studio.c` y el `gl_rsurf.c`
resultantes son idénticos a los del árbol de Studio 4. En cambio, la cvar quedó definida y registrada dos veces:
- **Causa:** la comprobación «ya aplicado» de `patch()` no reconoce un reemplazo cuyo texto nuevo contiene al viejo.
- **Corrección:** se copiaron `gl_opengl.c` y `gl_local.h` del árbol de Studio 4, que eran iguales a los
  originales del canónico.

Antes de tocar nada se guardó una copia en `/root/cof-audits/canon-backup-refgl-20261109`. Después de copiar,
`diff -r` de `ref/gl` entre el canónico y el árbol de Studio 4 no da diferencias.

### Guarda y exportación

- **`patches.sh check`:** informó de 28 líneas añadidas de la serie actual que la nueva pierde: 2 en `gl_rsurf.c`
  y 26 en `gl_studio.c`.
- **Revisión una por una (`integ_drops.py`):** todas son líneas que `patch_studio3.py`/`patch_studio4.py`
  sustituyen. Son el `R_CofSpotFactor` del foco, el bucle de selección anterior, la corona con `COM_RandomFloat`,
  el ×2 aditivo movido, los contadores sin `cone` y el antiguo `cof_corona`.
- **`export --allow-drop`:** se ejecutó con esa revisión. El registro quedó en
  `build/patch-approvals/20261109-003913-1860.txt`.
- **`check` posterior:** «sin pérdidas; la serie nueva reproduce el árbol».
- **Defecto de la prueba de la guarda:** `test_patches_guard.sh` escribía los registros de sus casos en el
  `build/patch-approvals/` real. Tres archivos de ejecuciones de prueba (`COF_WORK=/tmp/...`) se movieron a
  `build/validation/claude-studio4-2026-11-09/guard-test-approvals/`. Ahora la prueba fija
  `COF_PATCH_APPROVALS` en su temporal, y vuelve a pasar sin crear registros en el repositorio.

### Compilación y fusión

- **Compilación:** `build_engine.sh build` y `build_game.sh` en el canónico. El renderer resultante es
  `3ea07f6b1c2726f366aab7f547321093b039df83f7663430cb13f477bc9831b2`, idéntico al de Studio 4.
- **Paquete completo del canónico:** sigue difiriendo de lo publicado en las etapas de mapas y en `extras`, como en
  fases anteriores. Por eso se fusiona: `dist/` publicado más `packs/engine.data`/`engine.js` nuevos, más `hud.js`.
- **Módulos de `engine.data`:** solo cambia `libref_gles3compat.wasm`. Cliente `e0b2b6cc…`, servidor `91ca7418…`,
  filesystem y menú son los publicados.
- **Manifiesto:** **`a70d0ff0bc27`** (95 archivos).
- **Ubicación:** `/root/cof-audits/integ-20261109/merge`, servido en el puerto 8097.

### Pruebas corregidas

Se adoptan del worktree `claude-persist-20261109` las versiones de `tools/e2e/changelevel_entities.mjs` y
`tools/e2e/extras_interactions.mjs` que Codex dio por aptas. El principal no las había modificado desde `a7e7be9`.

## 3. Teléfono (W610i negro y naranja)

- **Modelo:** `v_mobile.mdl` tiene la pantalla y el teclado en texturas `fullbright_mess1..7`,
  `fullbright_lowbattery` y `buttons_fullbright`.
- **Con Studio 4:** se dibujan como en el original (`cof_fullbrighttextures 0.5`, ×2), sin depender de la luz del
  sitio. Antes salían grises y oscuros.
- **Medida en `c_apartment1`:** el brillo del teléfono pasa de 11,6–20,4 a 35,4–38,8. Se ven la pantalla del SMS
  y las teclas naranjas del W610i.
- **Lo que no se hizo:** no se subió el brillo por encima del original ni se tocaron las texturas.

## 4. Combinación teléfono + navaja

**Lo que se investigó:**
- **Original (`client.dll` `1008c7e0`, informe de Codex `ARMAS_CELULAR_2026_11_02`):** dibuja el segundo modelo
  (`v_mobile.mdl`) reflejado en su eje Y local y con el recorte de caras desactivado. El port hace lo mismo
  (`game/cof-logic/client/cof_hands.cpp`).
- **Bodygroups:** `v_mobile.mdl` (`body`, `nerds`, `screen`) y `v_switchblade.mdl` (`dicks`, `blood`) no tienen
  ninguno que oculte manos. Los brazos son parte de la malla.
- **Secuencias:** `v_switchblade.mdl` tiene juegos `p1*` (mano derecha) y `p2*` (mano izquierda). En doble
  empuñadura, `Deploy` fuerza la mano derecha (`m_iHand = 1`) y el clic derecho se reserva al teléfono. Así la navaja
  no puede acabar en la misma mano que el teléfono reflejado.
- **Capturas (`dual_view_probe.mjs`, `c_start2`):** el teléfono va en la mano izquierda y la navaja en la derecha.

**Conclusión:** no se pudo reproducir un defecto distinto del comportamiento original. No se cambió la
representación sin evidencia. Falta que el usuario indique qué ve exactamente, con una captura de la escena
y de qué mano.

## 5. Auditoría de Codex sobre `a70d0ff0bc27` y correcciones

### Conclusiones de Codex

**Serie y build:**
- Los cuatro parches reproducen el árbol canónico (`git diff HEAD --ignore-submodules`).
- Los 32 archivos de `ref/gl` coinciden byte a byte con Studio 4.
- Los ocho SHA-256 del registro de aprobación coinciden.
- Las 28 pérdidas están solo en `gl_rsurf.c`/`gl_studio.c`. El delta frente a la serie anterior se limita a
  `gl_local.h`, `gl_rsurf.c` y `gl_studio.c`.
- Las 95 entradas del manifiesto y los 15 `.gz` son correctos. Solo cambia el renderer.

**Contratos y pruebas:**
- Contrato Studio 4 (184442 con y sin corona): PASS.
- Selección: 8/8.
- Contrato de integración: 273.848 dibujos a escala 1 y 1.317 a escala 2, sin escalas inválidas.
- Las dos pruebas de persistencia adoptadas: PASS.

**Doble empuñadura:**
- Las secuencias 12–16 de `v_mobile` pertenecen a las llamadas: `CPhoneCall::ChangeSubtitle` `1005fc20`,
  `CMobile` `10053c90` y `EndCall` `1005ff90`. No tienen que ver con la pareja teléfono+navaja.
- `models/null.mdl` es el modelo de la entidad compuesta `weapon_dualweapon` (`10038d50`, `10035d60`,
  `100e08b0`), no el de una mano. Añadirlo como corrección visual no tiene fundamento.
- La regresión de teléfono+navaja y teléfono+Glock pasa. No se reproduce el solapamiento que describe el usuario.

### Defecto 1: primera exportación de la guarda

**Problema:** si ningún proyecto tenía serie y fallaba la instalación del segundo, el primero quedaba instalado,
aunque el mensaje decía que se habían restaurado las series. `rollback` solo retiraba proyectos con respaldo
`.old`.

**Corrección (`tools/wsl/patches.sh`):** se anotan los proyectos sin serie previa (`fresh`). Al deshacer, su
serie recién instalada también se retira.

**Prueba nueva (`test_patches_guard.sh`, caso `batch-first-export`):** después del fallo, `patches/` queda vacío.
- Con la corrección: PASS.
- Control negativo, la misma prueba contra el `rollback` anterior: falla con «xash3d stayed installed while hlsdk
  failed».

### Defecto 2: la casilla de la lluvia

**Problemas:**
- A 960×600, `main` mide unos 380 px, porque debajo están el registro y el pie. La hoja de Opciones, centrada con
  flex, se desbordaba por arriba y el `<header>` de la página recibía el clic.
- La casilla no tenía nombre accesible.
- Espacio no la cambiaba, porque SDL anula las acciones por defecto de las teclas del documento. A las flechas de
  los deslizadores les pasaba lo mismo.

**Correcciones (`hud.js`):**
- La hoja usa `align-items: safe center` y `overflow-y: auto`, y la caja tiene `max-height: 100%`. Se desplaza
  dentro de `main` sin salirse.
- La etiqueta es un `<label for="cof-option-rain">`.
- Con la hoja abierta y el foco dentro de ella, las teclas (salvo Esc) no llegan al motor, como en el diálogo de
  notas.

**Prueba (`rain_option.mjs`):** recorre la interfaz real a 960×600: Esc, pausa, Opciones, clic en «Lluvia» y
Espacio sobre la casilla. Comprueba el nombre accesible, los píxeles y la preferencia guardada.

### Defecto 3: la pausa no protegía el cursor (causa real del «header intercepts»)

Con las dos correcciones anteriores, el clic de Playwright seguía fallando en la prueba con «`<header>`
intercepts pointer events» (4 de 4 veces). Pruebas descartadas:
- El diagnóstico aislado, el panel del navegador de la app y `elementFromPoint` ponían la etiqueta en ese punto.
- CDP (`boundingBox`), `visualViewport` (escala 1, sin desplazamiento) y el zoom CSS (ninguno) coincidían con el DOM.
- Quitar la captura de pantalla previa no cambió nada.
- En el diagnóstico, añadir `getByRole` y las lecturas del canvas tampoco reprodujo el fallo.

**Lo que lo resolvió:** la prueba registra qué elemento recibe de verdad el `pointerdown` de un clic real del ratón.
Era `<canvas id="canvas">`, y `document.pointerLockElement` era el canvas con la hoja de Opciones abierta.

**Causa:** SDL pide el Pointer Lock en el siguiente gesto del usuario, y el clic en «Opciones» del menú de pausa
lo concedía. Desde ese momento todos los clics van al canvas: el jugador no puede usar la hoja de Opciones abierta
desde la pausa. Playwright informa del primer elemento distinto de la etiqueta en su propia comprobación (el
`<header>`), lo que despistaba.

**Por qué no salía en el diagnóstico:** no se demostró. Allí el bloqueo no llegó a concederse antes del clic.

**Corrección (`loader.js`):** el envoltorio de `requestPointerLock` ya rechazaba el bloqueo del canvas con el
menú principal (`CoFHUD.menuOpen`) o el armario abiertos, y ahora lo rechaza también con la pausa abierta
(`CoFHUD.paused`). El manejador de `pointerlockchange` lo suelta si llega igualmente. «Continuar» primero
quita la pausa y después pide el bloqueo, así que el juego sigue capturando el ratón al volver.

**Lo que no se cambió:** Espacio ya funcionaba con el ratón capturado, porque el foco del teclado sigue en la casilla.

## 6. Cuelgue entre la intro y la pesadilla (informe del usuario, 09/11/2026)

> Hay un problema, luego de la intro, no carga la pesadilla, se queda pegado

**Dónde:** en el puerto **8090**, que sirve el `dist/` del repositorio, es decir, la build publicada
`511886d6b3de`. No pasó en la candidata.

**Reproducción (`tools/e2e/intro_to_nightmare.mjs`):**
- La prueba arranca en `c_intro` sin órdenes ni teclas y espera a que el juego cambie de nivel solo. El cambio
  lo hace el `trigger_changelevel` `*141` (landmark `landakukej`) al final de los `multi_manager` de la intro.
- Sin fallos llegan a `c_nightmare`: la publicada (400 s), la candidata (340 s) y la candidata con Service
  Worker (257 s).
- Con `COF_FAIL_PACK=c_nightmare` (falla la primera petición del paquete, como con el servidor caído un
  momento), la **publicada se queda en `c_intro` para siempre**.
- **Registro:** `CHANGE LEVEL: c_nightmare landakukej` y, una sola vez,
  `Error: changelevel: map c_nightmare doesn't exist`. Después el trigger sigue llamando a `CHANGE LEVEL` miles de
  veces sin efecto.

**Causa (dos piezas):**
1. **`loader.js`:** solo intenta precargar el paquete del mapa siguiente una vez, a los 5 s de conectar. Si
   falla, no lo reintenta, y nada lo vuelve a pedir al cambiar de nivel.
2. **Motor (`pfnChangeLevel`, `sv_game.c`):** acepta un único cambio por `spawncount`. Tras el rechazo, ignora los
   siguientes del trigger aunque el BSP llegue a existir.

**Qué hizo fallar la precarga en el navegador del usuario:** no se sabe. `serve.py` solo informa de los errores en
su propia ventana. La corrección cubre cualquier causa.

**Corrección (`loader.js`; no cambia el juego, el motor ni los recursos):**
- **Reintento:** si falla la precarga, se reintenta con espera creciente (5, 10, 20 y 30 s; 20 intentos como
  máximo).
- **Red de seguridad:**
  - se guarda el último `CHANGE LEVEL: <mapa> <landmark>` del juego;
  - si el motor responde `changelevel: map X doesn't exist` y X está empaquetado, se monta su paquete;
  - después se repite ese mismo cambio con `changelevel2 X <landmark>`, que llega a la misma
    `SV_QueueChangeLevel` que `pfnChangeLevel`, pero sin la protección de `spawncount`.

**Verificación sobre la candidata:**

| Caso | Resultado |
|---|---|
| Falla el primer intento | El reintento lo resuelve: PASS (327 s) |
| Fallan todos los intentos hasta el cambio de nivel (12 peticiones abortadas) | Rechazo a los 315 s y, 2 s después, `Spawn Server: c_nightmare [landakukej]`, con landmark: PASS (336 s) |
| Sin fallos | PASS (259 s) |

## 7. Resultados

**Build final:** manifiesto **`bdffd7b5dfe5`**. Es la publicada más:
- el renderer de Studio 4 `3ea07f6b…`;
- `hud.js` (lluvia y hoja de Opciones);
- `loader.js` (cursor en la pausa, reintento de la precarga y red de seguridad del cambio de nivel).

Cliente, servidor, filesystem y menú son los publicados.

### Sobre la build final `bdffd7b5dfe5`

| Prueba | Resultado |
|---|---|
| 18 regresiones de Codex (con las dos pruebas adoptadas) | **18/18** |
| `pointer_lock` | PASS |
| `rain_option` (interfaz real a 960×600) | PASS: 0 px por defecto; clic en «Lluvia» 5.012 px; Espacio 0 px y queda guardado; con la opción guardada 5.027 px |
| `intro_to_nightmare` sin fallos | PASS (259 s) |
| `intro_to_nightmare`, falla un intento | PASS (327 s) |
| `intro_to_nightmare`, fallos hasta el cambio | PASS (336 s), con landmark |

### Sobre `a70d0ff0bc27`

Mismo motor que la final; solo cambian `hud.js`/`loader.js`, que tienen sus propias pruebas arriba.

| Prueba | Resultado |
|---|---|
| `studio4_contract.py` | PASS |
| `studio_selection_contract.py` | 8/8 |
| `studio_fullbright_review` (Codex) | PASS |
| `studio_runtime_contract` (Codex) | PASS |
| `clock_backwards` | PASS |
| `fog_entities` | PASS |
| `flashlight_probe` con persistencia | PASS: pared 45,8 → 55,9; `r_dynamic 0` 45,9; recarga 56,0 |
| Teléfono (`model_light`, `c_apartment1`), `cof_fullbrighttextures 0.5` frente a `0` | 35,8 frente a 13,3, sin errores GL |

### Guarda

| Prueba | Resultado |
|---|---|
| `test_patches_guard.sh` (con `batch-first-export`) | PASS |
| Control negativo con el `rollback` anterior | Falla en el caso nuevo, como debe |

**Evidencia:** `build/validation/claude-integration-2026-11-09/`.

## 8. Pendiente

- **Publicación:** solo commits locales. Pages sigue en `511886d6b3de` hasta que el usuario lo autorice.
- **Doble empuñadura:** falta la captura del usuario. Codex tampoco reprodujo el solapamiento.
- **Causa real de la precarga fallida en el 8090 del usuario:** sin datos. La corrección la cubre.
- **`pfnChangeLevel`:** la red de seguridad repite el cambio con `changelevel2`. Conviene que Codex revise que esa
  ruta conserva todo lo que hace el cambio original (`SV_QueueChangeLevel` es la misma función).
