# Plan de Cry of Fear Web para móviles

La base aislada es `4949911`, descendiente de `8590410`. La primera candidata cambia el launcher y la entrada del navegador. Los comandos del juego y los formatos de guardado son los existentes.

## Arquitectura y entradas

| Gesto o botón | Ruta | Verificación |
|---|---|---|
| Joystick izquierdo | Joystick web con captura de puntero → `+forward/+back/+moveleft/+moveright` | Posición del jugador y retorno a reposo |
| Arrastre derecho | Eventos SDL → zona `_look` → ángulos de vista | Cambio de ángulos sin Pointer Lock |
| Ataque, secundario, usar, correr, agacharse, saltar | Botones web con pulsación y liberación → `Xash_Cmd` → binds originales | Acción real y liberación incluso tras cancelación |
| Recarga, teléfono, bolso y accesos rápidos | Comandos y pares de pulsación originales | Inventario y orden de manos en la siguiente fase |
| Pausa | Mismo controlador Escape del HUD | Liberación de entradas al abrir y al volver |

La zona de cámara nativa es de sesión y las acciones web tienen una lista cerrada de comandos. Los botones tienen captura de puntero propia. Los cambios de visibilidad, orientación, mapa y HUD liberan las acciones mantenidas. La elección de dispositivo usa una clave local separada de idioma, opciones y partidas. La guía funciona antes de iniciar el runtime. El loader bloquea Pointer Lock solamente en modo móvil.

## Archivos y etapas

1. `platform/web/index.html`, `mobile.js` y `mobile.css` albergan el selector, la guía y el adaptador inicial.
2. `platform/web/loader.js` conecta el ciclo de vida del runtime. `platform/web/hud.js` expone la visibilidad de paneles interactivos. `tools/wsl/package.sh` incluye los archivos nuevos.
3. Verificar joystick, cámara y acciones reales con eventos multitáctiles de Chromium. Ejecutar también una sesión de escritorio y la regresión de Pointer Lock.
4. Ampliar cobertura a bolso, combos, accesos rápidos, escaleras, candado, menú y grabadoras. Verificar que los estados táctiles sobreviven a transiciones sin dejar entradas pulsadas.
5. Verificar físicamente Android y Safari en iOS con pantallas de distintas proporciones, multitáctil, audio, pestañas en segundo plano, presión de memoria, descarga bajo demanda e IndexedDB. Jugar transiciones naturales antes de declarar compatibilidad.

## Decisión de la primera candidata

La zona nativa `_look` sí cambió los ángulos del cliente web. Los ensayos de `_joy` no demostraron movimiento del jugador de forma aislada. La candidata envía las mismas direcciones que el teclado, con zona muerta y retorno visual. La respuesta analógica queda pendiente de comprobar. El texto nuevo se ofrece en español e inglés y el resto de idiomas del launcher conservan sus traducciones previas.

## Riesgos

SDL y Xash pueden diferir entre configuraciones al procesar Touch Events y sintetizar ratón. Hay que verificar coordenadas bajo letterboxing, orientación, selección de audio, pérdida de foco y los paneles que interceptan el canvas. Las emulaciones no miden la presión de memoria ni representan las restricciones de Safari iOS. Los cambios se sirven en una candidata aislada con el Service Worker público fuera del ensayo.

## Cómo probar la candidata local

Abre `http://127.0.0.1:8136/?sw=0` en este equipo mientras esté activo el servidor aislado. El directorio servido es `/root/cof-audits/codex-mobile-web/site` en WSL. Desde WSL se puede reanudar con `python3 -m http.server 8136 --bind 127.0.0.1 --directory /root/cof-audits/codex-mobile-web/site`. Esta URL usa el runtime de la Alpha `0140a63de3d5` y una copia de los archivos web modificados. Los binarios se sirven desde los paquetes de la base. El parámetro `sw=0` deja fuera el Service Worker de la publicación.

El arnés `tools/e2e/mobile_controls.mjs` recibe el origen y una ruta nueva para capturas. `tools/e2e/mobile_desktop_input.mjs` recibe el origen y prueba la selección PC, teclado, Pointer Lock y huellas de los módulos montados. El posicionamiento y equipamiento de prueba son diagnósticos. Los toques y las teclas son entradas reales del navegador emulado.

Los registros, capturas y huellas están en `build/validation/mobile-web`. El WASM reutilizado no requirió recompilación. La verificación física de Android y Safari iOS, los ajustes de tamaño y opacidad, la validación de audio, el inventario completo, las escaleras, los puzzles, los guardados y una ruta de campaña móvil se mantienen pendientes.

## Resultados de la candidata

| Prueba | Resultado |
|---|---|
| Selector en español, guía inicial y persistencia tras recargar | PASS en Chromium con emulación táctil |
| Movimiento y cámara en `c_start2` | PASS. El joystick ordenó retroceder y el arrastre cambió yaw y pitch, con Pointer Lock desactivado en modo móvil. |
| Tres contactos simultáneos | PASS. El jugador se desplazó y giró mientras la Glock pasó de 15 a 13 cartuchos. Al cancelar, se emitieron `-back` y `-attack`; el cargador dejó de disminuir. |
| Botón Usar de la trampilla original en `c_apartment1` | PASS. `func_button *132` cambió de abajo a arriba con una pulsación táctil. `tools/e2e/mobile_use.mjs` comprueba el cambio. |
| Escritorio | PASS. Preferencia PC, desplazamiento con S, adquisición de Pointer Lock y ausencia del overlay táctil. También pasó el contrato unitario del adaptador Pointer Lock. |
| Regresión de los siete idiomas | PASS en Chromium y Firefox con `?input=pc&sw=0`. El selector nuevo tuvo su propio ensayo con un perfil sin preferencias. |
| Compatibilidad móvil física, Service Worker y suite completa de escritorio | Pendientes. |

El primer ensayo nativo superponía zonas y produjo un aviso de Xash al asignar el mismo dedo al movimiento y a la cámara. Las pruebas posteriores separaron las zonas. Los intentos sin desplazamiento en la escena de apartamentos se conservan. La validación pasó en una posición de `c_start2` comprobada también con teclado. Reutilicé el WASM de la Alpha. `sha256-final.json` identifica los bytes servidos y los cinco módulos montados por Chromium en la prueba de escritorio.

En la captura de 844 × 390, el grupo de botones todavía se superpone parcialmente con el indicador de munición. Queda pendiente ajustar la disposición y la opacidad en pantallas estrechas. Los logs de cada intento se conservaron y algunas capturas intermedias reutilizaron el mismo archivo. Las capturas finales se guardaron con nombres propios.

## Ajustes posteriores de HUD, pesadilla y sonido

- El HUD táctil usa la máscara de HUD que emite el servidor y comparte la condición de los indicadores del port. En Chromium, desapareció durante la cámara inicial de `c_start` y regresó al juego. Se retiró el botón de ataque secundario de móvil y se movieron el joystick y el grupo de acciones inferiores para liberar los indicadores.
- El aviso móvil utiliza el mismo botón y la misma confirmación de guardados que escritorio. En un origen aislado se instalaron dos versiones locales del Service Worker con los mismos recursos. La primera mantuvo el control hasta tocar Actualizar. La segunda tomó el control y recargó al aceptar. La prueba solicitó `registration.update()` directamente. La detección añadida consulta al volver a la pestaña y cada cinco minutos mientras está activa.
- `stage_map.py` genera un archivo externo `c_nightmare.ent` con dos cambios de 0,3 a 1,2 segundos. El BSP del paquete local tiene el mismo SHA-256 que el original. El arnés activó los dos gestores en el servidor WASM y comprobó modelo visible pasado el plazo anterior y eliminación después. El ensayo de duración usó activación diagnóstica.
- La voz `subtitles/sub1.wav` produjo señal después del panner antes y después de restaurar en Chromium. No se reprodujo el silencio reportado con el contexto activo. Al suspender Web Audio deliberadamente apareció Activar sonido y una pulsación devolvió el contexto a running. Falta escucha física en el dispositivo afectado.
- Evidencia nueva en `build/validation/mobile-web/polish`. La Alpha pública sigue en su versión previa.

## Orientación y menú táctil

El toque en Jugar en modo móvil solicita pantalla completa para el documento y bloqueo horizontal. Si el navegador rechaza la solicitud, el menú principal sigue disponible en vertical. El recordatorio de giro queda para el juego y permite reintentar pantalla completa. El menú táctil amplía los objetivos de toque y reutiliza los paneles de opciones, carga y dificultad.

En Chromium con emulación táctil se recorrió el launcher y el menú reales con dos respuestas simuladas de fullscreen/orientación. La variante denegada comprobó Opciones, dificultad y Cargar partida en vertical. La variante aceptada comprobó el inicio de `c_intro` con un toque sobre la dificultad. El giro físico en Android y Safari iOS queda por comprobar. Evidencia en `build/validation/mobile-web/touch-menu`.
