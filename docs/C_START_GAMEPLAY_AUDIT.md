# Auditoría de jugabilidad de c_start

Fecha del informe: 29 de octubre de 2026 (America/Mexico_City).

## Alcance y conclusión de la auditoría

Se auditó el BSP preparado de c_start, las fuentes actuales del port, los SDK
parcheados y el servidor WebAssembly real de la etapa envpos. El mapa contiene
1024 entidades de 78 clases. Los cambios anteriores de Git se conservaron.

No está demostrado que c_start pueda completarse de manera natural y continua.
El primer impedimento confirmado para reproducir la progresión original es el
conjunto puerta/candado: se omite un acertijo cuyo objetivo explícito es encontrar
un código. No se confunde esa incompatibilidad con un bloqueo físico que impida
caminar. Hasta el límite recorrido, no se encontró un bloqueo duro anterior.
Los sectores posteriores siguen pendientes de una prueba continua válida.

## Evidencia y método

Los originales se leyeron localmente; no se ejecutó ni incorporó una DLL nativa
al producto. Los proyectos Ghidra se abrieron con -readOnly -noanalysis. Los
informes nuevos están en build/validation/c_start-gameplay/, separados de envpos.
No se cambiaron BSP, modelos, texturas ni sonidos originales.

1. Extracción de todas las entidades y de los límites de sus submodelos BSP.
2. Cobertura de factorías contra los símbolos del server.wasm efectivo. Una
   factoría existente no se considera prueba de una implementación completa.
3. Recorrido exploratorio con Playwright 1.64.1 / Chromium 156 y representación
   WebGL activa. Se usaron teclas normales de movimiento, giro y E. Se conservaron
   los cuatro multi_manager llamados multiscene1 y los 29 managers del mapa.
4. sv_cheats=1 se habilitó únicamente para consultas cof_inspect, cof_camera,
   cof_count y cof_fence. No se usaron cof_goto, cof_setkey, cof_touch, cof_fire,
   cof_use, noclip, invulnerabilidad, entrega de objetos ni desbloqueo forzado
   para avanzar. Los teletransportes de la introducción y puertas los dispara
   la propia lógica original del BSP; no los sustituye el guion de prueba.
5. El guion añadido tools/e2e/c_start_progression.mjs usa movimiento por teclado
   y consultas de posición para corregir el rumbo. No es una validación humana.
   Los fences mantienen 30 segundos y los sondeos de estado 60 segundos.

Se utiliza timer=1 para el navegador automático y fx=0 para reducir el coste de
software. El mundo y las entidades se dibujan; no se utiliza r_norefresh. Por ello
esta ejecución verifica recorrido y eventos, no fidelidad del postprocesado ni
la utilidad visual de la linterna. La prueba manual propuesta abajo usa efectos
por defecto. Las capturas exploratorias locales no se publican como recursos.

## Matriz de progresión

Las salidas del BSP indican conexiones y rutas condicionales, no una lista de
cuatro objetivos obligatorios que deban atravesarse todos en una sola visita.

| Evento o sector | Dependencias y entidades | Estado actual | Evidencia / limitación |
|---|---|---|---|
| Inicio en el callejón | info_player_start en 639,-2953,-728; trigger_once *34 | Funcional en ejecución | La introducción se activa por contacto del spawn, sin FireTargets de prueba |
| Introducción de unos 44 s | Cuatro multiscene1, kamera3 y cámaras sucesivas, fokus3, path_corner/path_track, env_model, env_fade | Control y final comprobados | frozen vuelve a 0; 29 managers conservados. No se afirma equivalencia audiovisual completa |
| Inventario inicial | givemobile a 2 s, giveswitchblade a 4 s, removecamera | Funcional en ejecución | Mensajes PICKUP/INV/QUICK reales; móvil y navaja en el bolso |
| Subtítulos y SMS iniciales | sub1 y subtitle_linechange, givesms1 a 45 s, chapter a 46 s | Activación comprobada | SUB 9/10, SMS 0 y capítulo observados; interacción completa del teléfono pendiente |
| Bajar y subir escaleras del primer callejón | func_stairs, geometría del mundo, trigger_once *163 | Funcional en recorrido | Velocidad 50 dentro, 150 fuera; se recibe HINT inventory |
| Llegar a la calle y primer susto | crow; trigger_once *41 -> multiblack -> bchange1, sub1, sblacker, killblack | Funcional en recorrido | SUB 13 y hit1.mp3 disparados por caminar; no por comandos de activación |
| Aviso de correr | trigger_once *164 -> hintsprint | Funcional en recorrido exploratorio | HINT sprint registrado |
| Objetivo del candado | trigger_once *194 -> objective1 | Funcional en recorrido | OBJECTIVE objective_a; hints.txt pide encontrar un código |
| Bloqueo inicial de la puerta | multiscene1 -> sd_door1_lock -> sd_door1 | Incompatible, primer defecto de puerta | El port borra lockedby siempre; el original alterna el estado |
| Resolver el candado | padbutton *162 -> padlock; padcam; door_prop_view; cuatro valores del jugador | No implementado de forma original | item_padlock::Use del port marca iuser4 y dispara multi_pad directamente; no valida código ni abre vista original |
| Abrir el paso después de resolverlo | multi_pad -> padlock_gr_vis, padlock_air_inv, sd_door1_lock, killpadbutton | Cadena disponible; recorrido no válido todavía | Se puede cruzar sin ejecutar esta cadena por el error anterior. Su activación provisional no demuestra el acertijo |
| Limpiar objetivo al otro lado | trigger_once *196 -> objective2 | Se observó en la exploración | No acredita haber resuelto el candado: aparece después del paso incorrectamente abierto |
| Bajada a túneles | nerdclimb3/4 y cof_ladder_manager_use; topent/bottoment | Implementación parcial | Usa un traslado instantáneo con fundido; ignora las animaciones originales. No recorrido de forma continua en esta auditoría |
| Guardado en túneles | tape_recorder, cassette_tape, menú de guardado | Implementación existente | Guardado/restauración tiene regresiones previas; interacción con grabadora desde esta ruta pendiente |
| Encuentros en túneles | multispwnsc1/2, monstermaker, monster_slower, sc1wall/sc2wall | Implementación existente, compatibilidad parcial | No se prueba aquí combate, daño, eventos de animación y paso natural |
| Secuencia del móvil en interior | *35 -> multiscene3, cámaras ckamera1/2/3, simon3, mainteleport/2teleport, aglobal1 | Componentes probados por regresiones, visita pendiente | Los callbacks de cámaras y managers tienen pruebas aisladas; eso no equivale a haber llegado jugando |
| Puerta de regreso del interior | doorlockedss, amultiscr1/astate1, doorlockedssd | Riesgo pendiente | Comparte el defecto de cof_interdooronoff; no se declara funcional por su mera factoría |
| Secuencia de Slower | *36 -> dos slower_eyes_mm, slkamera1..6, env_model, cambios de subtítulo, kahshe | Parcial / ejecución continua pendiente | Cámara, modelos y managers tienen cobertura de componentes; sincronización y resultado narrativo completos pendientes |
| Conexión con c_start2 | inter_door *99 -> lolexit1; *97 -> haehecl, landmark hahaland | Definida en BSP, no validada como final del recorrido | Requiere comprobar llegada natural y montaje del paquete siguiente |
| Conexiones con c_apartment1 | *58/changelevel2b/land2b y *158/stla; teleportap1 | Definidas, prueba de paso pendiente | No se fuerza una transición para considerarla superada |
| Conexión con c_nightmare | *92/changelevelea, landmark landea | Rama condicional | Está encima de la zona inicial; no se supone que sea una salida normal alcanzable desde el primer spawn |
| Zona de extras | unlockablesdoor, clothes, cof_clothesmenu, item_nightvision | Incompleta y separada del recorrido principal | No hay factorías para menú de ropa ni visión nocturna; flags de desbloqueables requieren revisión |

## Causa comprobada del primer desvío

En el original local, CCofInterDoorOnOff::Use (100a6ea0) localiza la entidad
indicada por message. Para inter_door consulta su estado de bloqueo (10048540):
si está libre asigna somethinglocked y si ya está bloqueada lo borra. También
hay una rama específica para func_button. El lector de newlockedby existe,
pero esta rutina de uso no respalda reemplazar siempre el bloqueo por ese valor.

En el port, CCofInterDoorOnOff::Use recorre inter_door y llama SetLock(m_sNewLock).
La instancia sd_door1_lock no especifica newlockedby, por lo que borra la
cerradura. sd_door1 comienza sin lockedby y la llamada inicial debería bloquearlo.
La segunda instancia, doorlockedssd, sí especifica newlockedby=nasiss y su puerta
doorlockedss ya comienza bloqueada por nasiss. El port vuelve a asignar nasiss
en lugar de desbloquearla: es un segundo riesgo concreto de bloqueo posterior,
deducido de la implementación y pendiente de reproducir llegando naturalmente
al interior. No se presenta como un bloqueo ya recorrido en esta auditoría.

item_padlock está además incompleto: Spawn no asigna el modelo original
models/items/padlock.mdl; Use no presenta padcam ni conserva/resuelve cuatro
ruedas/valores. El original (Spawn 100b6460, Use 100b6520) asigna ese modelo,
prepara sus controladores, congela el jugador, selecciona la vista indicada por
message y envía un mensaje de interacción. Los cuatro valores proceden del
estado del jugador. No se ha reconstruido aquí su generación, pista, entrada,
confirmación, cancelación y persistencia completas.

Por eso no se aplica un cambio parcial que cierre la puerta sin proporcionar
el acertijo original necesario para abrirla. Tampoco se inventa un código fijo,
se sustituye por un botón de éxito ni se valida el candado por su implementación
provisional. Este primer impedimento para la progresión original queda identificado,
pero todavía no resuelto.

## Clasificación de pendientes

**Bloqueantes para una validación fiel de la progresión:** puerta/candado sin
código y vista originales; después, sectores y transiciones no recorridos de
forma continua. Estos últimos son comprobaciones pendientes, no fallos demostrados.
No se ha demostrado un bloqueo físico anterior al candado.

**Importantes para jugar:** escaleras de mano simplificadas; guardado en grabadoras
desde el recorrido; combate y eventos de los Slower; flujo de interacción del móvil;
semánticas de puertas y extras. Se observó alternancia por contacto entre zonas
acústicas solapadas (*233/*235 y *228/*234), con mensajes repetidos. No se corrige
ese segundo problema dentro de la tarea de localizar el primer impedimento.

**Visuales o de presentación:** 28 env_static_decal carecen de factoría (leaves,
klotter y trail2), y falta cof_developer_commentary en cuatro puntos opcionales.
No se ha comprobado si algún graffiti contiene información útil: no se descarta
su relevancia como pista solo por tratarse de una calcomanía. info_texlights es
información de iluminación del compilador, no un objetivo de jugador. Los casos
envpos y cielo cuentan con su informe previo; no se reabren en esta auditoría.

Existen avisos por recursos estándar de Half-Life ausentes, delta is_donator,
sonidos de pasos y un GL_INVALID_ENUM de inicialización. Se registran; no se
atribuyen automáticamente al acertijo ni se confunden con un aborto WASM.

## Ruta de prueba manual con teclado y ratón

Esta es una ruta propuesta y parcialmente reproducida por automatización. **No
se realizó una validación humana de principio a fin.**

1. Servir el dist aislado preparado y abrir `?map=c_start&sw=0&prefetch=1`, con
   efectos por defecto. Clic en el juego para capturar ratón; Esc lo libera.
   Confirmar que todos los recursos preparados pertenecen al usuario.
2. Esperar a que termine la introducción, sin saltarla. Deben recibirse móvil y
   navaja, SMS y capítulo; el control debe volver al callejón.
3. Usar WASD y ratón. Avanzar por el pasillo, bajar las primeras escaleras, girar
   a la derecha, luego a la izquierda y subir hasta el patio. TAB debe abrir el
   inventario; 1 y 2 seleccionan los objetos asignados. SHIFT corre y C agacha.
4. Atravesar la abertura del patio hacia el corredor de azulejos y avanzar hasta
   la calle. Observar el susto y su subtítulo. Seguir la calle hacia la izquierda
   hasta su curva; después girar a la derecha y acercarse a la puerta con candado.
5. Pulsar B para comprobar el objetivo de encontrar un código. Mirar al candado
   y pulsar E. En una implementación correcta debe poder iniciarse y cancelarse
   la interacción original, encontrar su pista, introducir el código correcto y
   desbloquear el paso. Una combinación incorrecta no debe abrirlo.
6. **Punto de fallo actual:** cruzar con E sin resolver ese acertijo no cuenta como
   superar el paso. Si sucede, registrar la posición y detener la validación de
   progresión continua. No desbloquearlo con consola para seguir acreditando éxito.
7. Cuando se implemente el candado, ampliar el recorrido: cruzar la puerta,
   comprobar que se borra el objetivo, seguir la ruta hacia las escaleras de mano,
   usar E para trepar, interactuar con grabadora/combate, visitar el interior del
   móvil y observar las cámaras. Cada bifurcación y retorno deberá documentarse
   jugando antes de declararse probado; esta instrucción no certifica esos pasos.
8. Finalmente comprobar la salida elegida hacia el mapa vecino y la conservación
   de inventario/estado. Repetir desde una partida nueva sin comandos de progreso.

## Archivos y producto

Solo se añaden este informe y tools/e2e/c_start_progression.mjs. Las extracciones,
planos privados, descompilados y capturas quedan en build/validation/c_start-gameplay/,
que no es distribución. No se cambian código de juego, motor, renderizador ni dist
principal. No hay una corrección de producto ni una compilación nueva que atribuir
a esta auditoría. Los módulos ya compilados se identifican mediante SHA-256.

Se conservan licencias y créditos: Cry of Fear, Team Psykskallar y Andreas Rönnberg;
Xash3D FWGS y HLSDK mantienen sus archivos de licencia existentes. No se realizan
commits, pushes, despliegues ni publicación de recursos originales.


## Resultados reproducidos de esta auditoría

- Recorrido exploratorio: capturas 01..16 y probe-engine.log. Se alcanzó la
  aproximación al candado caminando. Un intento de fence con sv_cheats=0 fue
  rechazado como comando desconocido; no es un fallo de progresión del mapa.
- replay-1: la introducción terminó, pero el waypoint 1740,-1175 apuntaba contra
  una pared. Código 1, fallo del guion de navegación. Se corrigió a la curva real
  de la calle; no se modificaron colisiones ni el BSP.
- replay-2: no se alcanzó client connected dentro del sondeo inicial de 60 s.
  Código 1. El log conserva una duración negativa anómala de carga; su causa no
  se atribuye a la concurrencia ni al acertijo. Es un incidente de arranque
  pendiente de diagnóstico, no una prueba de un bloqueo del jugador en la calle.
- replay-3: ejecución a viewport 320x240, sin cambiar límites de tiempo. Completó
  la introducción, recorrido, HINT inventory, multiblack/SUB 13 y objective_a.
  Pulsar E llevó al jugador de (2112.1,-1335,-731) a (2108,-1485,-731), con
  frozen=0 después y padbutton todavía presente. Código **2**, que el guion
  reserva para incompatibilidad de progresión confirmada. **No es un test de
  mapa completo satisfactorio.** page-errors.json quedó vacío.

Los intentos y resultados no se sobrescribieron. El guion conocido no se añade a
la suite de regresiones como si fuera un contrato de éxito: se ejecuta por
separado y debe revisarse cuando se implemente el acertijo.

Los símbolos exportados originales Check (100b5f60) y Finished (100b60b0) aportan
más evidencia: Check compara los cuatro valores del modelo con la conversión de
los cuatro valores esperados, reproduce padl_unlock, inicia la secuencia y programa
Finished. Finished dispara el target, devuelve la vista y control al jugador y
cierra el mensaje Padlock. Las cadenas locales también muestran padlockrotate
1..4, padlockcancel y gfx/vgui/puzzle/padlock_buttons.tga. Esos comandos y el
mensaje no están implementados en el port. Falta reconstruir la generación y
presentación de la pista, el rango/conversión de los controladores y la sesión
completa de entrada/cancelación/persistencia. No se utiliza un código supuesto.
El staging preparado de c_start tampoco contiene models/items/padlock.mdl.

## Reejecución del guion de auditoría

Con el servidor de pruebas activo, copiar tools/e2e/c_start_progression.mjs al
directorio e2e del entorno aislado de Playwright. Tras activar emsdk_env.sh:

```sh
PLAYWRIGHT_BROWSERS_PATH=../browsers \
COF_AUDIT_OUTPUT=/ruta/nueva/de/resultados \
node c_start_progression.mjs http://127.0.0.1:8095/
```

La carpeta de resultados debe ser nueva; el guion rechaza sobrescribir sus
evidencias existentes. El guion
produce engine.log, steps.json, page-errors.json y las capturas del candado.
Salida 2 confirma el desvío conocido; 1 indica fallo de ejecución; 3 requiere
inspeccionar una interacción que no reprodujo el bypass. Ninguna de esas salidas
certifica que c_start sea jugable de principio a fin.


## Resultado final de regresiones

La suite tools/wsl/test_entities.sh terminó con código **0** en esta auditoría:
Pointer Lock, los siete contratos BSP anteriores, el contrato BSP adicional de
envpos y los diez navegadores (los nueve anteriores más envpos). Se conservaron
multiscene1 y los límites originales. Incluye entidades, inventario, campaña,
motion_manager, modelos, managers, audio, trigger_camera, func_train,
func_tracktrain y cielo. La prueba de envpos volvió a observar un cambio real
de 25 538 píxeles y completó los cambios de nivel y limpieza del estado.

El registro conjunto es regressions.log, su estado está en regressions.exit y
los logs de cada navegador en regression-logs/. Esto acredita ausencia de
regresiones en esos contratos, **no** la finalización de c_start. El guion de
progresión separado terminó con código 2 al confirmar el desvío del candado.

No se compiló otra versión del producto: solo se añadieron informe y auditoría.
Los tres hashes de module-sha256-final.txt son idénticos a los de la etapa envpos
validada. La sintaxis del guion nuevo se verificó con node --check. El servidor
HTTP temporal se cerró tras concluir las pruebas.

**Estado de la meta inmediata:** primer impedimento de compatibilidad localizado
y reproducido, todavía sin corregir. La siguiente implementación necesaria es
la sesión original del candado: generación y pista del código, cuatro ruedas,
entrada/cancelación, vista, éxito diferido y persistencia, junto con la alternancia
correcta de la cerradura. Una corrección limitada a cerrar la puerta introduciría
un bloqueo duro en el port actual. No se presenta como solución ni se omite ese
acertijo para declarar el mapa completamente jugable.
