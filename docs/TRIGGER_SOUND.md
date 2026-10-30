# trigger_sound: zonas acústicas del servidor portable

## Evidencia y contrato de los mapas

Se inspeccionaron los 14 BSP preparados, el servidor CoF, el SDK portable,
el protocolo svc_roomtype y el DSP de Xash3D. Se consultaron las rutinas de la
clase original CTriggerSound mediante la copia de solo lectura del proyecto de
análisis local del usuario. El material de análisis queda en
`build/entity-analysis/`, ignorado por Git; no se incorpora al código distribuido.

En `c_start` hay 14 instancias. Todas tienen classname trigger_sound, angles
0 0 0 y delay 0; carecen de targetname, target, master y spawnflags explícitos.
Se activan al entrar el jugador en el brush, no mediante un nombre de destino.

| Brush | roomtype | Preset del DSP del motor |
|---|---:|---|
| *222 | 17 | concrete |
| *223 | 0 | off |
| *224 | 17 | concrete |
| *225 | 8 | chamber |
| *226 | 17 | concrete |
| *227 | 23 | cavern |
| *228 | 23 | cavern |
| *229 | 17 | concrete |
| *230 | 0 | off |
| *231 | 8 | chamber |
| *232 | 0 | off |
| *233 | 0 | off |
| *234 | 0 | off |
| *235 | 2 | metalic (nombre en la tabla del motor) |

Otros BSP preparados con esta clase: c_apartment1 (1), c_apartment2 (4),
c_apartment3 (1) y c_apartment4 (7). Usan 23 o carecen de roomtype. La instancia
*202 de c_apartment1 no tiene ese campo; el valor inicial verificable es cero.

## Comportamiento implementado

`game/cof-logic/cof/sound_trigger.cpp` registra trigger_sound y usa un brush
SOLID_TRIGGER, MOVETYPE_NONE y EF_NODRAW, con los límites del modelo BSP.
Touch es virtual y no necesita serializar un puntero de callback adicional.

En el caso normal comprobado:

1. Solo un jugador puede activar el cambio. Un Use sobre la zona no lo activa.
2. Un master simple de tipo FCAP_MASTER debe estar activo, si se especifica.
   Master ausente o vacío significa sin condición. Expresiones Spirit, nombres
   inexistentes y entidades incompatibles se rechazan con diagnóstico.
3. Si esa misma entidad ya es m_pentSndLast del jugador, no se reenvía el efecto
   ni se disparan otra vez sus destinos, aunque Touch se ejecute cada frame.
4. Se guardan en el jugador la fuente, el roomtype y rango cero. Se envía a ese
   cliente el mensaje estándar SVC_ROOMTYPE con un short. La conversión trunca
   valores fraccionarios, como la operación observada en el original.
5. El cliente existente recibe svc_roomtype y actualiza room_type. El mezclador
   ya disponible aplica sus presets DSP; no se añade un canal de audio web propio.
6. Se disparan los destinos mediante SUB_UseTargets con el jugador como activador
   y USE_TOGGLE. Ninguna instancia real de c_start tiene esos destinos; ese caso
   se comprueba mediante fixtures con clases existentes.

Salir del brush no elimina el efecto: permanece hasta otra selección acústica.
Otra entidad acústica, como env_sound, puede reemplazar la fuente mediante el
sistema compartido del SDK. No se inventa un temporizador o reset al salir.

La rutina original de KeyValue reconoce roomtype y master y delega directamente
en CBaseEntity, no en CBaseDelay. Por ello delay no se interpreta como retardo
del preset. Los 14 valores reales son cero. La implementación conserva esa
delegación; no amplía las claves desconocidas a nuevas operaciones.

Se admiten números finitos no negativos menores que 29; su entero truncado
selecciona los presets 0 a 28 del motor utilizado. Valores negativos, no finitos, fuera de rango, desbordados
o con texto adicional desactivan el cambio y producen diagnóstico al tocar.
La configuración de zona (roomtype y master) se guarda/restaura. El caché acústico
del jugador no se añade al guardado: el SDK lo excluye deliberadamente para
permitir que el cliente reciba otra vez el efecto al volver a tocar.

## Código y regresión

- `game/cof-logic/cof/sound_trigger.cpp`: entidad y datos de guardado.
- `game/cof-logic/cof/player_cof.cpp`: cof_soundstate bajo sv_cheats, y actor
  opcional en cof_touch para comprobar contactos que no son de jugadores.
- `tools/e2e/sound_entities.mjs`: navegador, cliente y servidor WASM reales.
- `tools/e2e/test_entity_maps.py`: contrato de los 14 brushes y del valor ausente.
- `tools/wsl/test_entities.sh`: incorporación a la suite existente.

La prueba contrasta las 14 configuraciones reales con el estado del servidor,
room_type del cliente y los coeficientes room_size/room_refl aplicados por el
DSP para los cinco presets utilizados. Comprueba que room_off está desactivado.
También verifica repetición de contactos, rechazo de otros actores y Use,
destinos una sola vez, masters abiertos/cerrados, entradas inválidas, truncado
de fracciones, guardado/carga y carga de c_apartment1.

Además del Touch controlado, se coloca al jugador dentro de los brushes reales
*223, *222, *225 y *227 y se espera el contacto generado por el motor. No se llama
a Touch en esa parte. Al llevar al jugador fuera, se verifica la persistencia
del preset. Son entradas controladas por teletransporte de depuración, no un
recorrido natural completo de las rutas del mapa.

Las pruebas arrancan WebGL y el audio del motor; después reducen el refresco
gráfico para comprobar lógica. Validar mensajes y parámetros efectivos del DSP
no equivale a una comparación auditiva o de muestras contra el juego original.

En la primera ejecución conjunta hubo un timeout de 30 s esperando el fence de
un guardado en manager_entities, después de pasar sus cuatro primeros casos.
Se conserva en `build/validation/sound/first-regression-failure.log`. El mismo
servidor pasó después las pruebas aisladas de managers tanto con DSP desactivado
como activado. El diagnóstico con DSP activado permitió observar comandos hasta
90 s, pero ninguno tardó más de los 2 s que activaban su registro de lentitud.
La primera repetición conjunta mantuvo el escenario y los límites originales y
también agotó el fence de otro comando de manager_entities. No se identificó una
causa confirmada de esos timeouts. Para aislar los fixtures de la cinemática
automática concurrente, la prueba ahora elimina las cuatro instancias de
multiscene1 antes de guardar. Los managers reales comprobados y sus aserciones
se conservan, y el límite de 30 s no se amplía. Esto acota la prueba: no establece
que la cinemática inicial completa con todas sus restauraciones esté validada.

## Límites y próximo candidato

La rutina original tiene ramas especiales ligadas a vuser1.x del jugador y a
otro estado privado, cuyo significado no se ha reconstruido. Si vuser1.x no es
cero, esta implementación rechaza el caso con diagnóstico: no se asigna una
semántica inventada. El port actual y las pruebas usan el caso normal cero.
No se declara compatibilidad con todas las combinaciones originales de agua,
efectos o sobrescrituras acústicas; tampoco con expresiones avanzadas de master.

No se comprobaron en ejecución las zonas de c_apartment2/3/4, una comparación
perceptual del audio ni la campaña completa. Continúan los avisos de recursos y
otras entidades pendientes del SDK. No se modifica la serialización general de
sus callbacks ni se presupone compatibilidad de partidas antiguas.

La siguiente prioridad de validación es investigar los timeouts del escenario
con la cinemática inicial concurrente y sin aislamiento. Los siguientes candidatos
de implementación son envpos_world y envpos_sky, todavía sin factoría
en las cargas preparadas. Es necesario reconstruir sus vínculos entre servidor,
cliente y renderizado antes de atribuirles efectos visuales o implementarlos.

Se conservan las licencias y créditos existentes de Team Psykskallar y Andreas
Rönnberg. No se incluyen recursos originales, Steam ni dependencias de DLL nativas.

## Resultado local — 26 de octubre de 2026

Emscripten 4.0.11 compiló y enlazó el servidor incluyendo sound_trigger.cpp.
Se verificaron en el WASM las 12 factorías de estas etapas, incluida trigger_sound,
y la coincidencia SHA-256 entre módulo compilado, fuente del paquete y copia
archivada. No fue necesario modificar el cliente ni el motor.

La suite final, con los fixtures de managers aislados como se describe arriba,
terminó con código 0: seis contratos BSP sin omisiones y seis pruebas de navegador
(entities, campaign_entities, motion_entities, model_entities, manager_entities,
sound_entities) satisfactorias y sin errores JavaScript. Los plazos originales
se conservaron. Esto verifica las regresiones controladas de inventario,
subtítulos, brushes, escaleras, puertas, teletransporte, barra del jefe, movimiento,
animación, managers y audio. No demuestra que la cinemática concurrente que
agotó los plazos en las ejecuciones anteriores esté corregida.

Sintaxis JavaScript/Bash, diff --check y comprobación inversa del parche contra
el SDK utilizado: satisfactorias. Registros finales, diagnósticos anteriores,
verificación de exportaciones y módulo: `build/validation/sound/`, ignorado por
Git. El registro final es `regression.log`; se conservan ambas ejecuciones
conjuntas fallidas para investigar sus timeouts.

Solo se actualizó el paquete aislado de WSL en
`/root/cof-audits/audit-D3Kl5uly/dist`. El dist del repositorio no se sobrescribió.
Ese paquete usa sw=0 para las pruebas y necesita regenerar el manifiesto de caché
antes de distribuirse. No se realizaron commits, pushes, publicación de recursos
ni despliegues.
