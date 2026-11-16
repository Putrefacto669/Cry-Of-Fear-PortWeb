# Cry of Fear Web · Rediseño del HUD táctil

Candidata local del worktree `C:/Users/josue/cof-audits/codex-mobile-web`. El HUD toma como referencia la composición adjunta de 1672 × 941. El escenario de las capturas es el juego real en `c_start2` y difiere del fondo de la referencia.

## Comparación visual

| Elemento | Candidata a 1672 × 941 | Referencia |
|---|---|---|
| Barra superior | Pausa, bolso y notas/objetivos alineados a la izquierda. Números centrados y linterna a la derecha. | Misma agrupación, con iconos SVG monocromáticos dibujados para esta interfaz. |
| Joystick | Diámetro aproximado de 232 px, centro en 20 % y 75,4 % del canvas. Perilla del 42 % de la base. | Aproximadamente 225 px y perilla de 95 px. |
| Ataque y acciones | Ataque de 159 px, interacción, recarga, correr y agacharse de 99 px. Se añadió un botón de salto discreto junto al borde inferior derecho. | Ataque de unos 155 px y acciones de 95–105 px. |
| Cámara | Mitad derecha libre con zona táctil nativa invisible. | Área libre sin rectángulo ni rótulos. |
| Acabado | Gradientes gris azulado, contorno fino, halo tenue y realce del último acceso rápido tocado. | Mismo reparto tonal. El dibujo del bolso conserva la correa de hombro solicitada anteriormente. |

A 844 × 390 el canvas de juego ocupa unos 693 × 390 con márgenes laterales. El ataque mide unos 66 px y las acciones ordinarias unos 41 px. Las pruebas geométricas comprobaron que los botones del overlay quedan dentro del canvas y que sus áreas circulares no se pisan en los dos tamaños. Las barras originales siguen siendo las del juego. Cuando se equipa la Glock, su indicador de munición queda muy cerca de la columna derecha en el tamaño reducido.

## Archivos y entrada

- `platform/web/mobile.css` define las proporciones respecto del canvas, el espacio seguro, el acabado y la posición de cada botón.
- `platform/web/mobile.js` dibuja iconos SVG y registra dos zonas táctiles de Xash3D. `_look` controla yaw y pitch. `_joy` con `TOUCH_FL_STICK` conserva la magnitud analógica. La perilla visual sigue al contacto. Los botones siguen enviando sus comandos existentes y el HUD libera entradas al cancelar o perder foco.
- `platform/web/hud.js` identifica la sensibilidad como táctil en modo móvil y conserva el control de sensibilidad existente. El modo PC mantiene su etiqueta original.
- `tools/e2e/mobile_controls.mjs` prueba posiciones, movimiento real, cámara, disparo, inventario, contacto cancelado y pérdida de foco.

## Validación y pendientes

Chromium con emulación táctil y SwiftShader. El WASM de motor y juego es el de la candidata anterior. Se comprobó movimiento y cámara simultáneos con ataque, liberación tras cancelar y perder foco, apertura y cierre del bolso, y Uso sobre la trampilla original de `c_apartment1`. El posicionamiento y equipamiento usados para esos ensayos fueron diagnósticos. En PC pasaron teclado y Pointer Lock real, ausencia de overlay y contrato de Pointer Lock.

El motor actual conserva los desplazamientos pequeños del pulgar. La zona muerta analógica configurable queda pendiente. El realce del acceso rápido indica el último número pulsado. En una prueba adicional, se asignó una navaja al acceso 2 mediante diagnóstico y el toque la equipó. El botón de objetivos abrió el bolso, y desde ese menú se combinó el teléfono con la navaja mediante toques. Tras guardar y cargar, el servidor conservó la combinación y reapareció el HUD. Todavía hace falta comprobar escaleras, salto y giro durante carrera, todos los cambios de mapa y la ergonomía en teléfonos Android y iOS físicos.

Capturas y registros en `build/validation/mobile-web/redesign/`. Las pruebas no modificaron los recursos originales ni la Alpha pública.


## Escalada animada en móvil

La candidata local `959ff0c4b4f4` usa la escalada animada del worktree de continuidad. Se compilaron cliente y servidor Emscripten. Los hashes del paquete y los módulos se guardaron en `build/validation/mobile-web/ladder-animated`.

Al apuntar a una escalera utilizable, el botón de ataque muestra el icono de escalera. Durante la animación quedan visibles pausa y joystick. El eje vertical del joystick emite las entradas originales de avance y retroceso. La vista usa los attachments de `ladder_climb.mdl`. Al terminar, los controles habituales reaparecen.

El primer ensayo subió correctamente, pero al mirar hacia abajo desde el borde superior no apareció el icono. La detección ahora reutiliza la selección cercana de la tecla E cuando el trazado frontal no detecta un blanco utilizable. El contexto se vuelve a comprobar en el servidor al pulsar. Chromium con emulación táctil comprobó ambas direcciones en `nerdclimb3` de `c_start`, con el mismo punto de salida en cada dirección, vista por attachments y retorno de los controles. El posicionamiento inicial fue diagnóstico. El segundo ensayo y el fallo inicial se conservaron por separado.

La restauración de guardados durante la escalada y la validación en teléfonos físicos están pendientes. Los experimentos de MOVETYPE y restauración permanecen separados de esta candidata.

## Guardados desde el modo táctil

En Chromium emulado, el botón Usar activó la grabadora Sewer Store. Tras cerrar el navegador y reabrir el mismo perfil, tanto Pausa → Cargar partida como el menú principal recuperaron la posición exacta. El archivo persistió en el almacenamiento IndexedDB de ese origen. Se usó posicionamiento diagnóstico para llegar a la grabadora.

En un ensayo separado, se guardó por comandos mientras la animación de nerdclimb3 estaba activa. Al cargar, la cámara se suelta y se completa la salida al extremo correspondiente. El arreglo rearma el callback de limpieza y serializa la dirección de salida separada del estado transitorio de la animación. Pasaron los ensayos de ascenso y descenso con el paquete local 6cbbb7413178. Los avisos generales de serialización que aparecieron durante los guardados quedan en los registros de diagnóstico. Falta validación en dispositivos físicos. Evidencia en `build/validation/mobile-web/mobile-save`.
