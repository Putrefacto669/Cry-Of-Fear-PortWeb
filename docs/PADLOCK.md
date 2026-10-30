# Candado de c_start: reconstrucción y validación

Informe en curso, 29 de octubre de 2026. No se considera superado el criterio de
recorrido natural hasta completar la búsqueda de la pista y vuelta al candado.
Los resultados históricos se conservan en build/validation/padlock/.

## Contrato reconstruido con fuentes locales

Se analizaron las copias locales autorizadas de hl.dll y client.dll con Ghidra
read-only, el BSP de c_start y el de c_start2 y sus recursos. Ninguna DLL se usa
en la versión web. Los originales y sus proyectos de análisis se conservaron.

- CBasePlayer::Spawn (100f4090): si alguno de los cuatro m_iPadlockNumber es cero,
  genera los cuatro con RANDOM_LONG(1,9). No es una combinación fija ni acepta 0.
- item_padlock Spawn (100b6460): asigna models/items/padlock.mdl, inicializa
  cuatro controladores y sus cuatro ángulos a cero; selecciona idle.
- Use (100b6520): exige jugador y no resuelto; busca la vista indicada por
  message, conserva la relación con el jugador, congela/controla la sesión,
  copia los cuatro valores esperados y cambia a padcam. Emite Padlock (un byte 1).
- padlockrotate 1..4 (100b6280): suma 40 grados a esa rueda y vuelve a cero al
  alcanzar 360. Actualiza el controlador, comprueba la combinación y emite
  items/padl_turn.wav. Se recorre 1,9,8,7,6,5,4,3,2,1.
- La conversión de dígito a ángulo (100b61b0) es 1->0, 2->320, 3->280, 4->240,
  5->200, 6->160, 7->120, 8->80, 9->40.
- Check (100b5f60): solo si coinciden las cuatro ruedas reproduce padl_unlock,
  selecciona open, aplica fundido y programa Finished dos segundos después.
  No hay un botón de confirmar adicional: la última rotación valida automáticamente.
- Finished (100b60b0): dispara target, devuelve vista/control/arma al jugador y
  emite Padlock 0. padlockcancel (100b5ea0) devuelve el control sin disparar target.
  Use reinicia las ruedas al volver a entrar, mientras que restaurar una sesión
  guardada debe continuar sus valores y su estado, sin llamar a Spawn o Use.
- cof_interdooronoff (100a6ea0): para inter_door alterna entre libre y la cerradura
  interna somethinglocked. El port anterior siempre asignaba newlockedby, lo que
  dejaba abierta sd_door1 tras la introducción y mantenía doorlockedss bloqueada.

El modelo tiene cuatro controladores de rotación 0..360, secuencia idle y open
(60 frames a 40 fps). Su cabecera de límites generales es cero, pero los límites
por secuencia son válidos. El BSP sitúa el modelo en 1749,-1635,-1238 y la vista
padcam en 1677,-1635,-1238. No se cambian esas coordenadas ni el BSP.

## Pista y conexión entre mapas

Los mismos cuatro valores del jugador se formatean como texto en el protocolo
Computer (referencias 100934a0 y 100a6980). El ordenador real computeron está en
c_start2, 1304,1711,-554, y dispara multimystery. Dos cof_passwordnote del mapa
proporcionan las credenciales; la ruta de la cuenta principal usa la nota sin
usertype, en 27,2069,-518. La nota de usertype 1 corresponde a la otra cuenta,
cuya distinción completa todavía no está cubierta por el port previo.

La sesión del ordenador existente se amplía para mostrar el código del candado
tras una contraseña correcta. La combinación procede de los mismos campos del
jugador que utiliza item_padlock. No se revela en el estado de diagnóstico ni se
inventa una pista dentro de c_start. La prueba natural requiere viajar a c_start2
y regresar mediante las conexiones reales. El código y la pista no se obtienen
leyendo el save, el estado interno WASM ni generando una nota de prueba.

La auditoría anterior había localizado el bypass pero no había reconstruido esta
ida y vuelta para la pista. Este documento precisa esa parte de la progresión.

## Implementación

- Nuevo padlock.cpp: estado idle/interacción/apertura/resuelto, cuatro ángulos,
  validación, sonido, modelo, vista, cancelación, éxito diferido, guardado/restauración
  y sincronización después de ResetHUD. Think es virtual, sin punteros de callback
  serializados, para evitar el problema de punteros de funciones WASM ya documentado.
- player.h/player.cpp del SDK: cuatro enteros persistentes del jugador y reenvío
  de Padlock al sincronizar el HUD. Se conserva la propiedad del código al cambiar
  de nivel con un landmark. cof_playerstate conserva además la cadena para los
  guardados del port.
- doors.cpp: alternancia de la cerradura de inter_door; se conserva el lector y
  descriptor antiguo de newlockedby para no retirar datos de guardado.
- puzzles.cpp: se retira el éxito instantáneo del candado y el alias vacío de
  door_prop_view; el ordenador muestra la combinación tras autenticarse. Las
  notas y monitor necesitan sus modelos originales para interacción natural.
- cof_client.cpp: receptor de Padlock y diagnóstico de la entidad recibida.
- hud.js: superposición transparente con el recurso original padlock_buttons.tga;
  cuatro zonas de giro y Cancel en las coordenadas originales. Escape cancela
  la sesión y no abre simultáneamente el menú de pausa. Se adapta el tamaño del
  panel a la superficie del juego embebida para no tapar las ruedas del modelo.
- stage_map.py: dependencias de modelo, sonidos, vista y botones del candado,
  nota genérica y monitor. Solo se copian al staging local aislado al probar.

El SDK elegía la primera de dos superficies usables con idéntica dirección
normalizada. En c_start la puerta y padbutton están separados por una unidad.
Se añade un desempate por el primer impacto real del rayo de uso, conservando
la selección anterior cuando no hay empate. Así E alcanza el botón que está
delante de la puerta cerrada; no depende de nombres especiales ni teletransportes.

## Pruebas e incidencias conservadas

Primera compilación con Emscripten: satisfactoria. Las posteriores compilaciones
incrementales también se guardan individualmente. El servidor contiene padlock.cpp.
El dist principal no se modifica; se empaqueta en /root/cof-audits/audit-D3Kl5uly/dist.

- natural-1: introducción y camino normales hasta la puerta. La puerta ya no deja
  pasar, pero el empate de selección impedía abrir el candado. No cuenta como éxito.
- natural-2: con el desempate, E abre la sesión original, congela al jugador y
  permite girar la primera rueda a 40 grados. Se encontró un conflicto de Escape
  con la pausa y una captura negra del modelo; ambos se investigan antes de validar.
- diagnostic-1/2: activación directa solo para diagnóstico de render/sesión,
  **no acreditan progresión natural**. Confirman recepción del modelo, controlador,
  posición de vista y retorno de control con Escape tras la corrección del HUD.
  Se probaron r_fullbright y r_nocull exclusivamente como diagnóstico, sin
  conservarlos como solución ni modificar la jugabilidad para aprobar pruebas.
- La instrumentación de límites confirma que el modelo está dentro del frustum.
  Se está contrastando la captura de página con lectura del framebuffer al final
  del frame, antes de atribuir el resultado a un fallo de renderizado.

## Estado pendiente

Faltan todavía la prueba completa de pista y retorno natural, la matriz de
combinaciones, los guardados antes/durante/después, y las diez regresiones de
navegador y los contratos BSP. Ninguna de estas comprobaciones se declara pasada
por la mera compilación ni por la activación directa de diagnóstico.

## Diagnóstico adicional (30 de octubre)

Se reprodujo una pantalla negra del modelo en partida nueva, distinta de la vista
tras restaurar. El diagnóstico separado diagnostic-8/9/10 conserva las capturas
y el estado real WebGL: las matrices GPU del pase del cielo y del siguiente modelo
no correspondían a la cámara vigente. No se adoptaron gl_customsky=0, r_nocull,
r_fullbright ni cambios de niebla como solución.

R_SetupGL carga RI.worldviewMatrix, pero no actualiza siempre el caché
RI.modelviewMatrix. Cuando padcam ve una habitación fuera del recorrido y no se
dibujan brushes visibles, R_LoadIdentity puede retornar por modelviewIdentity y
el pase de envpos reutiliza una matriz anterior. El arreglo localizado toma
worldviewMatrix explícitamente al comenzar ese pase y restaura esa misma base.
Se conserva el cielo, su escala, iluminación y rango de profundidad. La compilación
renderer-view-cache-build.log pasó. diagnostic-11 y natural-4 muestran el modelo
con gl_customsky=1, r_fullbright=0 y r_nocull=0. Se retiró la instrumentación temporal
del renderer; quedan los diagnósticos de cliente y servidor controlados por comandos.

natural-4 comprueba entrada mediante E al caminar desde el inicio, rotación real
de la primera rueda a 40 grados y cancelación mediante Escape. También atravesó
la transición real a c_start2 y la puerta d1_1_exit1, sin activaciones forzadas.
Se conservan intentos de navegación obstruidos; no se confunden con fallos de la
entidad ni se eliminan de los registros. Todavía no acreditan el acertijo completo.
El recorrido encontró además dos fallos verificables en la pista:

- El HUD dejaba pasar al SDL las teclas de los formularios. La instrumentación
  de natural-4 registra Enter con defaultPrevented=true y ningún submit. El HUD
  ahora retiene keydown/keypress mientras el diálogo está abierto. button-baseline
  y button-fixed-3 verifican escritura con teclas reales y Enter, llegando a la
  respuesta DENIED del servidor; no se acredita progresión con esas activaciones.
- El botón real *19 de c_start2 perdía Use al cargar (use=1 -> use=0). Se conserva
  la reproducción en button-baseline. CBaseButton guarda identidades de los
  callbacks conocidos de Think/Touch/Use/MoveDone en WebAssembly, conserva sus
  punteros vivos después de escribir y los vincula al restaurar sin Spawn/Use.
  También conserva los sentinelas nextthink=0 y -1 frente al reajuste de reloj de
  MOVETYPE_PUSH y FIELD_TIME. Las demás plataformas mantienen su serialización.
  button-fixed-3 comprueba reposo, retorno pendiente, reposo después del retorno,
  reapertura de la interfaz y rechazo de una contraseña incorrecta. La primera
  prueba button-fixed esperaba erróneamente Think=null en reposo; se conserva
  su timeout. El SDK deja LinearMoveDone asignado con nextthink=-1: la prueba
  corregida comprueba el estado toggle y el sentinela real, sin ampliar tiempos.

Los guardados antiguos que ya omitieron callbacks no contienen esa información;
no se declara que se hayan reparado o migrado. Se está repitiendo el recorrido en
una partida nueva con los campos y callbacks nuevos. Continúan avisos históricos
sobre otros callbacks del SDK y recursos genéricos de Half-Life no preparados;
no se ocultan ni se presenta este trabajo como una solución global de guardado.
natural-6 leyó la nota 640_pass6.tga (thebeatles54), rechazó una contraseña errónea
y obtuvo 6186 del diálogo visible del ordenador. No pudo regresar: el servidor
abortó con Host_Error "Can't find connection to c_start2 from c_start". Los
fences posteriores expiraron porque ya no había servidor, no por lentitud del
acertijo. La evidencia se conserva completa; este intento no acredita éxito.

changelevel-baseline reproduce la causa sin recorrer el mapa: antes de guardar,
haehecl contiene map=c_start, landmark=hahaland, use=1, touch=1; después se vacían
ambas cadenas y desaparecen ambos callbacks. El contador BASE de FIELD_FUNCTION
omitidos consume el bloque derivado CChangeLevel. Se aplica una serialización de
identidades de callbacks solo para esta clase, conservando sin modificaciones
los campos y el comportamiento originales. changelevel-fixed-2 comprueba la
persistencia y dos idas/vueltas nativas. Las activaciones directas de esa prueba
son diagnósticas y no acreditan progresión natural. Su movimiento inicial normal
sale del volumen de llegada para evitar el retorno automático previsto por el BSP.
El primer intento de esta prueba, conservado como changelevel-fixed, encontró
ese retorno automático porque partía dentro del volumen; no se cambiaron entidades
ni se ampliaron tiempos para la prueba corregida.