# Escaleras con animación, como en el original — Claude Code, 14/11/2026

**Qué pidió el usuario.** Implementar en el port las animaciones de escalera del original. Hasta ahora,
`cof_ladder_manager` hacía un fundido a negro y trasladaba al jugador al otro extremo, sin usar las claves
`animation*`, `custom*` ni `descendoffset`. La diferencia ya estaba anotada el 07/11
(`docs/FIDELIDAD_GRAFICA_2026_11_07.md`).

**Dónde hay escaleras.** En los mapas publicados solo hay tres, todas en `c_start`:

| Manager | Animaciones | Bajada | Destinos |
|---|---|---|---|
| `nerdclimb2` | `climb_start_up`, `climb_loop_up`, `climb_end_strt_02_up` | `customond climb_start_strt_02_down`, `customoffd climb_end_down` | `nerd2exittop` / `nerd2exitbot` |
| `nerdclimb3` y `nerdclimb4` | `climb_start_up`, `climb_loop_up`, `climb_end_up` | `customond climb_start_down`, `customoffd climb_end_down` | `nerdNexittop` / `nerdNexitbot` |

Las tres tienen `descendoffset 96` y `model models/ladder_climb.mdl`. Cada una tiene dos `cof_ladder_manager_use`:
`iuser1` 0 abajo y 1 arriba.

## 1. El original (análisis de solo lectura)

Los volcados están fuera del repositorio, en `C:\Users\josue\cof-audits\private-native\claude-escaleras-2026-11-14\`.

**Servidor (`hl.dll`):**

| Función | Qué hace |
|---|---|
| `CCoFLadderManager` KeyValue (`1004e4d0`) | Guarda `animation1..N` por su número, `customoff/on/offd/ond`, `descendoffset`, `topent` y `bottoment` |
| `cof_ladder_manager_use` Use (`1004fe80`) | Exige estar en el suelo y una espera de 1 s. Dispara el manager con el valor del `iuser` de la zona |
| Manager Use (`1004fb50`) | Ver abajo |
| Paso de subida (`1004f470`) | Ver abajo |
| Paso de bajada (`1004f780`) | Ver abajo |
| `LadderThink` (`1004ed40`) | Ver abajo |

**Manager Use (`1004fb50`):**

1. Rechaza con una bengala encendida («I'll need to drop this flare before I can climb»).
2. Congela al jugador (`FL_FROZEN`, `100deff0`).
3. Crea un `camera_model` (`CAnimatedCameraModel`) con el modelo del manager en su origen y ángulos; al bajar, lo sube
   `descendoffset`.
4. Envía `AttachCam` con el índice de la cámara y pone al jugador `FL_GODMODE|FL_NOTARGET`.
5. Arranca `LadderThink` y da el primer paso.

**Paso de subida (`1004f470`):**

- Reproduce `animation[índice]` con `100c20c0`: busca la secuencia por nombre y la reinicia.
- La primera vez desde arriba usa `customond`; `customoff` sustituye a la `climb_end…up`.
- Entre bucles sube la cámara **48 unidades** (`DAT_101afebc`).

**Paso de bajada (`1004f780`):**

- Retrocede un índice y reproduce `climb_loop_down`, bajando 48 entre bucles.
- En el primer índice reproduce `customoffd` (o `climb_end_down`) y termina.

**`LadderThink` (`1004ed40`):**

- Cuando acaba la animación en curso, **`IN_FORWARD`** da un paso de subida e **`IN_BACK`** uno de bajada.
- **Al terminar:**
  - quita la cámara, `AttachCam` 0, descongela y ejecuta `finishladder` en el cliente;
  - coloca al jugador en `topent` o `bottoment` + 37 unidades, con los ángulos del destino y `fixangle`;
  - dispara el `target` del manager.

La duración de cada animación sale del MDL.

**Cliente (`client.dll`):**

- `AttachCam` (`1006f890`) guarda la entidad cámara.
- Al dibujar esa entidad (`1008cee0`, con `m_fDoInterp` a 0) toma sus attachments: origen = `attachment[0]` (hueso
  `eye`), ángulos a partir de `attachment[1] − [0]` con el pitch invertido, y roll a partir de `attachment[3] − [0]`.
- `V_CalcNormalRefdef` (`100af790`) usa esos valores como vista en el fotograma siguiente.
- Así el jugador ve los brazos de Simon (`ladder_climb.mdl`) trepando.

## 2. Implementación

**Servidor** (`game/cof-logic/cof/puzzles.cpp`):

- `CCofLadderManager` reconstruye `KeyValue`, `Use`, `StepUp`, `StepDown`, `LadderThink` y `Finish` según el original.
- `cof_ladder_camera` es el `camera_model`: un `CBaseAnimating` que no se guarda en la partida, con `EF_NOINTERP` como
  el `m_fDoInterp = 0` del original.
- El mensaje `CoFAttachCam` (short con el índice; 0 = soltar) se registra en `CoF_LinkUserMessages`.
- `cof_ladder_manager_use` exige suelo y 1 s entre usos, y dispara el manager con su `iuser1`.

**Cliente** (`game/cof-logic/client/cof_hands.cpp` y `cof_client.cpp`):

- Captura los attachments al dibujar la cámara (`CoF_HandsBeforePoints`).
- `CoF_LadderView`, llamada desde `CoF_ClientFlashlightView` (`V_CalcRefdef`, después de `V_CalcNormalRefdef`),
  sustituye `vieworg` y `viewangles`.
- **Diagnóstico:** `cof_ladder_view`.

**Desviaciones obligadas por Xash o por el port, todas documentadas en el código:**

| Desviación | Motivo |
|---|---|
| `MOVETYPE_NONE` en lugar de `FL_FROZEN` | Xash (`SV_ParseClientMove`) borra los botones de un cliente congelado, y la escalada depende de W/S |
| `view_ofs` sigue a la cámara | El jugador se queda arriba mientras la cámara baja por el hueco, y el servidor solo envía las entidades del PVS de `origin + view_ofs`. Mover al jugador tocaría los triggers del hueco. Se restaura al terminar |
| Los attachments se capturan durante el dibujo | Xash los rehace al dibujar, después de `V_CalcRefdef`. El original también los toma en el dibujo |
| Corrección del salto de 48 | La vista se desplaza con el origen de la entidad en el mismo fotograma, para no quedarse atrás |
| Recuperación tras 2 fotogramas sin dibujo | Al cambiar de secuencia, las cajas difieren mucho (`climb_start_down` llega a x 95, `climb_loop_down` a 24); la vista retrasada queda fuera, el modelo se descarta y no llega captura nueva. Tras 2 fotogramas así, la vista pasa un instante a origen + 72 en z, dentro de todas las cajas |
| El arma se oculta (`viewmodel` = 0) y no dispara | Se restaura al terminar |
| Partida guardada a mitad de escalada | La cámara no se guarda; al cargar, el manager termina la escalada hacia el destino de la dirección en curso |

**No implementado:**

- El aviso de la bengala, porque no hay bengalas en los mapas publicados.
- El mensaje `DAT_102265cc` y el FOV 90 del final.
- La rareza del original con `animation13`, que no incrementa el contador; los mapas usan tres animaciones.

## 3. Pruebas

**`tools/e2e/ladder_climb.mjs <url> <salida> [manager]`** (Chromium 156, `c_start`):

1. Usar la zona de abajo y comprobar que llega `AttachCam` con `ladder_climb.mdl`, que la vista sale de los attachments
   y que el jugador no se mueve.
2. Mantener W hasta el final: el jugador acaba en `topent` + 37.
3. Usar la zona de arriba, mantener S y acabar en `bottoment`.
4. La cámara se dibuja todo el recorrido: las capturas crecen en cualquier ventana de 1 s.
5. Guardar a mitad de escalada y cargar: el jugador queda libre y sin cámara.

**Resultados** (`build/validation/claude-escaleras-2026-11-14/`):

| Escalera | Ejecución | Resultado |
|---|---|---|
| `nerdclimb4` | `ladder-nerdclimb4-205621` | **PASS** |
| `nerdclimb3` | `ladder-nerdclimb3-205925` | **PASS** |
| `nerdclimb2` | `ladder-nerdclimb2-210210` | **PASS**; baja con su secuencia propia (`seq 7`) |

**Fallos conservados, en orden:**

| Ejecución | Causa |
|---|---|
| `201636`, `201940` | Attachments leídos en `V_CalcRefdef`: aún a cero |
| `202257` | `FL_FROZEN`: Xash borra W/S |
| `202711` | La prueba mantenía W y el jugador seguía andando arriba |
| `203441`, `203824`, `204237`, `204456` | La cámara dejaba de dibujarse al bajar |
| `205330` | Comprobación demasiado estricta a 4 fps |

**Capturas:** `04-up-4.png` de `nerdclimb3` muestra el brazo de Simon. SwiftShader deja estas zonas muy oscuras, así
que se aprecia poco.

**Batería completa** sobre la candidata combinada `cand-ld` (recarga dual como el original + escaleras), manifiesto
**`b902da18e9f1`**, `server.wasm` `6d354715…`. Evidencia en `bateria/`:

| Ejecución | Resultado |
|---|---|
| `ld-suite-230225` / `regressions-ld-230829` | **18/18**, `hands_arm_mask` PASS. Las dos variantes de Codex fallan en la recarga dual (línea 55), como se esperaba |
| `ld-suite-230725` / `regressions-ld-231403` | **16/18**. Corrió a la vez que la anterior sin querer: dos baterías de navegador en paralelo. Fallaron `sound_entities` (tiempo agotado esperando la zona acústica) y `extras_interactions` (no llegó «The door is locked») |
| `regressions-ld-rerun-233034` | Esas dos, repetidas a solas: **2/2 PASS** |
| `dualhands-ld-233137` | `dual_hands_contract` sobre la misma candidata: **PASS** |

Las dos ejecuciones se solaparon porque la primera no se detectó viva tras un corte de sesión y su servidor 8118 se
cerró; siguió con el de la segunda, que sirve los mismos archivos de `cand-ld`. Los fallos se conservan.

## 4. Límites

- No hay captura del original subiendo una escalera: se reprodujo el contrato del código, no se ha comparado la imagen.
- No se probó con GPU real: el navegador de la app no llegaba al servidor de WSL.
- La recuperación por descarte puede verse como un salto de un fotograma al cambiar de secuencia.

## 5. Publicación

El usuario la autorizó el 14/11. `dist/` pasa a **`b902da18e9f1`** (recarga dual como el original + escaleras). Frente a
`0140a63de3d5` cambian `packs/engine.*`, `sw-manifest.js` y `sw.js`.
