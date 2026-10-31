# Bolso (TAB), barras, teléfono y pisadas como en el original

Fecha: 30 de octubre de 2026. Origen: la prueba del usuario sobre el capítulo 1, con dos capturas
del juego original como referencia (el bolso y el teléfono con el SMS de la madre).

Todo lo de este documento sale del análisis de solo lectura de las DLL originales
(`cl_dlls/client.dll` y `cl_dlls/hl.dll`) con Ghidra. Scripts usados: `DumpBlackRefs`,
`DumpEntityClass`, `DumpFuncs`, `DumpScalarUse` y el nuevo `DumpCallers`, que descompila quién llama
a una función.

## 1. Problemas reportados y causa

| Síntoma | Causa demostrada |
|---|---|
| No se oyen las pisadas | `pm_shared.c` era el de Half-Life (`player/pl_step*.wav`, que CoF no trae: `couldn't load "player/pl_step2"`). Además, `sound/materials.txt` no estaba en ningún paquete |
| No se ven la salud ni la energía | `hud.js` solo mostraba las barras al cambiar el valor. El original las muestra siempre |
| El SMS de la madre sale como un cuadro de texto | El original no tiene texto aparte: el mensaje está dibujado en las texturas del teléfono (`fullbright_mess1..7`), y el modelo elige la pantalla con su `body` |
| El teléfono no sale al cogerlo en el inventario | Para equipar había que hacer doble clic, sin ninguna pista. El original abre un menú con EQUIP al hacer clic |
| El bolso no se ve como el original | Faltaban el fondo de óxido (`backgroundtoall.TGA`), el menú de cada objeto y los sonidos |

## 2. Comportamiento original extraído

### Barras de salud y energía (`client.dll`, `FUN_10038a10`)
- Los paneles de las dos barras se hacen visibles mientras se juega, sin esperar a ningún cambio.
- Se ocultan en `maps/c_nightmare.bsp` (el preludio), con el HUD desactivado o si
  `m_iHideHUD & 0xc` (`HIDEHUD_ALL` o `HIDEHUD_HEALTH`).
- `trigger_camera` (`hl.dll`) con el spawnflag 16 pone `HIDEHUD_HEALTH` mientras dura la cámara y lo
  quita al terminar. Todas las cinemáticas de los mapas publicados lo llevan (spawnflags 116 o 52).

### Teléfono (`hl.dll`: `CCofTriggerMobile`, `CMobile`)
- `trigger_cofmobile`:
  - solo actúa si el jugador tiene `weapon_mobile`;
  - guarda `bodynumber` como mensaje actual del jugador y marca el SMS como no leído (mensaje de
    usuario `UnreadSMS`);
  - si el teléfono está en la mano, reproduce `sms_looksms` o `flash_looksms`;
  - salvo con el spawnflag 1, suenan `weapons/mobile/mobile_sms.wav` y `phone/phone_vibrate.wav`.
- `weapon_mobile` tiene dos modos:
  - **SMS** (el inicial): `draw_sms`, `idle_sms`, `holster_sms`, sin luz;
  - **linterna**: `draw_flash`, `idle_flash`, `holster_flash`, con luz.
- El disparo principal cambia de modo con `smstoflash` / `flashtosms`. La luz cambia a mitad de la
  animación: 0,23 s y 0,66 s.
- El `body` del arma es el número de mensaje. En `v_mobile.mdl` la parte "nerds" tiene `screen1..7`,
  `screen_off` y `screen_lowbat`.
- Mientras el teléfono está en la mano, el SMS queda leído y el icono `640_hudelem_smsicon.tga`
  desaparece.

### Bolso (`client.dll`)
- Detrás del `640_inventory.tga` va un fondo de óxido a pantalla completa (`backgroundtoall.TGA`).
- Al hacer clic en un objeto se abre un menú en el borde derecho del hueco, 5 px más arriba y a la
  izquierda:
  - armas: `inventory_weapons.tga` (EQUIP, COMBINE, DROP, DUAL WIELD, 1 2 3);
  - objetos: `inventory_items.tga` (USE, COMBINE, DROP).
- Sonidos de `sound/inventory/`:
  - `inventory_open` y `inventory_close` al abrir y cerrar;
  - `inventory_toggle` al elegir un objeto;
  - `inventory_click` en una acción válida;
  - `inventory_no` en una acción no válida.

### Pisadas (`client.dll`, `FUN_10014190` y `FUN_10013a70`)
- **Correspondencia letra de `materials.txt` → tipo:**
  - C (o ninguna) → hormigón;
  - M → metal, D → tierra, V → conducto, G → rejilla, T → baldosa (suena a hormigón);
  - S → charco, W → madera, Z → alfombra, F → barro, U → hierba, I → barro;
  - O → arena, P → nieve, Y → cristal, H → papel, R → grava, B → hierba con ramitas.
- **Sonido de cada paso:**
  - uno de los cuatro `player/footsteps/<material>N.wav` al azar;
  - tierra y vadeo usan además el pie izquierdo o derecho;
  - escalera: metal con tono 150; vadeo: tono 80.
- **Sonidos añadidos:**
  - agachado, `crawlN.wav` al 70 %;
  - en cada paso, `player/sprint/bag_movement.wav` (al 10 % andando y al 70 % corriendo, tono
    100 ± 30);
  - en superficies `B`, tres de cada diez pasos, un `twig_snapN.wav`.

## 3. Cambios

| Archivo | Cambio |
|---|---|
| `patches/hlsdk` → `pm_shared/pm_shared.c` | `PM_PlayStepSound` y `PM_MapTextureTypeStepType` del original. La carrera se detecta por velocidad horizontal mayor de 200 (andar 150, correr 275); el original usa una bandera propia |
| `patches/hlsdk` → `dlls/triggers.cpp` | `trigger_camera` con spawnflag 16 oculta la salud y la energía durante la cámara |
| `game/cof-logic/cof/cof_player.h`, `player_cof.cpp` | Estado del teléfono (`cof_phone_t`: mensaje, no leído, modo), guardado en `cof_playerstate`. `COF/HUD STAT` añade `m_iHideHUD`. Nuevo `COF/HUD SMSICON` |
| `game/cof-logic/cof/puzzles.cpp` | `trigger_cofmobile` como el original |
| `game/cof-logic/cof/weapons_cof.cpp` | `weapon_mobile` con los dos modos, `LookAtMessage` y `COF/HUD SMSREAD` cuando el mensaje queda en pantalla. Precarga de las pisadas en todos los mapas |
| `platform/web/hud.js` | Barras siempre visibles, salvo en el preludio, con HUD oculto o durante la carga. Icono de SMS sin leer. Traducción del SMS como subtítulo al leerlo. Bolso con fondo, menú y sonidos |
| `tools/stage_map.py` | Paquete de arranque: `materials.txt`, pisadas, `bag_movement`, sonidos e imágenes del bolso, icono de SMS y vibración |
| `tools/ghidra/DumpCallers.java` | Nuevo, de solo lectura |

## 4. Validación (build `dist-ui`, GPU real, `c_start`)

- **Barras:** durante la cinemática inicial, `COF/HUD STAT 100 100 0 8` y las barras ocultas. Al
  terminar, `... 0` y las dos visibles.
- **Teléfono y SMS:**
  - `givesms1` (silencioso) con el teléfono guardado da `SMSICON 1` y el icono aparece;
  - EQUIP desde el menú del bolso lo saca en modo SMS con el mensaje de la madre en la pantalla,
    como en la captura de referencia, y quita el icono;
  - el subtítulo en español dice "¿Dónde estás? Vuelve a casa lo antes posible. Está oscureciendo.";
  - el disparo cambia a linterna.
- **Bolso:** fondo de óxido, paneles, menú EQUIP / COMBINE / DROP / DUAL WIELD / 1 2 3 junto al
  teléfono.
- **Sonidos:** `soundlist` muestra cargados `player/footsteps/*`, `bag_movement.wav` y
  `inventory_open/toggle/click/close.wav`. Ya no sale `couldn't load "player/pl_step2"`.
- **Suite de regresión:** las 12 pruebas pasan a la primera sobre `dist-ui`, entre ellas cámaras,
  envpos y cambio de nivel.
- **Preludio:** las barras siguen ocultas (`STAT ... 8`) y no hay errores.

## 5. Limitaciones y pendientes

- **COMBINE, DROP y DUAL WIELD** suenan a `inventory_no`; no están implementados en el port. El
  original manda `inventorycombine` e `inventorydualwield` al servidor.
- **Puñetazo con el teléfono** (`sms_punch` / `flash_punch`, disparo secundario) sin implementar: falta
  extraer su daño (`MeleeHitThinkPunch`).
- **Panel de notas del bolso** sin implementar.
- **Ritmo de los pasos y balanceo de la cámara:** siguen siendo los de Half-Life. El original lee
  los intervalos de claves de `physinfo` que no se han extraído.
- **Animaciones "trabadas"** (reporte del usuario): no se ha identificado de qué animaciones se trata.
