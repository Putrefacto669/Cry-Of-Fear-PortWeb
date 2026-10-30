# multi_manager: restauración de secuencias en WASM

## Problema y evidencia

Tras guardar/cargar `c_start`, `slower_arms_mm` no activaba la secuencia del
modelo. La prueba `manager_entities.mjs` reprodujo el fallo con el servidor
anterior antes de aplicar la corrección. El registro de referencia queda en
`build/validation/managers/baseline-manager-baseline.log`.

Se inspeccionaron el BSP preparado, `CMultiManager` en el SDK portable y las
rutinas `CSave::WriteFields`, `WriteFunction`, `CBaseEntity::Save/Restore` y
`CBaseToggle::Save/Restore`. El módulo SIDE_MODULE no proporciona un nombre
resoluble por el motor para esos callbacks C++. `WriteFields` cuenta el campo
no vacío, pero `WriteFunction` no escribe su contenido cuando no puede resolver
el nombre. Al cargar, BASE consume datos del siguiente bloque. Por ello no
solo se pierden Think/Use: también puede quedar sin restaurar la configuración
y el estado privado del manager.

No fue necesario inferir comportamiento de la DLL original: se conserva la
implementación existente del SDK y su contrato de ejecución.

## Instancias de c_start

Hay 29 managers, todos sin spawnflags explícitos (modo normal, no threaded):

| targetname | Instancias |
|---|---:|
| multiscene1 | 4 |
| multiblack | 1 |
| multiscene3 | 2 |
| slower_eyes_mm | 2 |
| slower_arms_mm | 1 |
| slower_cam2_mm | 1 |
| hammer_mm | 1 |
| attack_mm | 1 |
| kill_slowerstuff_mm | 1 |
| final_slowerscene_mm | 1 |
| multiljusfl1_1 | 1 |
| multiljusfl1_2 | 1 |
| amultiljusfl1_1 | 1 |
| amultiljusfl1_2 | 1 |
| multikasse | 3 |
| multikasse2 | 1 |
| multi_pad | 1 |
| multiattacks | 1 |
| multispwnsc2 | 1 |
| multispwnsc1 | 1 |
| multifitta | 1 |
| multifittsa | 1 |

Las claves adicionales expresan destinos y sus retardos; el SDK elimina el
sufijo `#` para permitir disparar varias veces el mismo destino. Ordena los
eventos por retardo al Spawn y conserva el orden de los empates. Cada Use inicia
su reloj y propaga su activador. Durante la secuencia normal se deshabilita Use;
al terminar se vuelve a habilitar. En modo threaded, cada activación crea un clon
independiente, que se elimina al finalizar. Los managers con el mismo targetname
siguen siendo entidades distintas; no se fusionan al restaurar.

Casos reales controlados después de cargar:

- `slower_arms_mm`: dispara `slower_arms` a 0 s, cambiando de idle Off a
  open_door On; también contiene destinos de sonido, visibilidad y puerta.
- `slower_cam2_mm`: cambios de línea a 2, 3 y 4 a 1, 3 y 5 s; disparos de
  `sub1`, `sub1#1`, `sub1#2` a 1.1, 4.5 y 7.5 s. Deben salir 2 → 3 → 4.

No se afirma haber recorrido naturalmente los 29 eventos de escena ni haber
validado visualmente todas sus dependencias.

## Cambio acotado

`patches/hlsdk/0001-root.patch` amplía únicamente Save/Restore de CMultiManager
bajo `__EMSCRIPTEN__`. Guarda dos bits de identidad de callback (Think presente,
Use presente). Omite esos punteros al guardar BASE y los restablece inmediatamente
en la instancia viva. Tras leer los datos restaura explícitamente ManagerThink
y ManagerUse según los bits guardados, conservando los estados nulos.

Esto distingue managers sin usar, ocupados, terminados y clones. No llama a
Spawn, no reinicia ni reordena la secuencia y no añade un tick a managers
inactivos. Mantiene el índice, el reloj relativo, los retardos, nextthink y el
EHANDLE del activador que ya serializa el SDK. La rama nativa conserva su macro
original. ManagerReport y las demás funciones de depuración permanecen intactas.

La corrección se aplica al SDK aislado utilizado para compilar y se conserva en
el parche del repositorio; no depende de editar manualmente una instalación
externa para futuras compilaciones.

## Pruebas y límites

`tools/e2e/manager_entities.mjs` se incorpora a `test_entities.sh`. Usa el motor y
servidor WASM reales y recursos preparados localmente. Además de los dos managers
reales, crea fixtures con entidades existentes para comprobar eventos pendientes,
ausencia de repetición o ejecución inmediata al cargar, bloqueo mientras está
ocupado, reutilización después de terminar, activador real a través de `*locus`,
dos clones simultáneos guardados y su eliminación al terminar.

Se guardan partidas nuevas con el formato corregido. Este cambio no repara
partidas antiguas cuyo bloque de datos ya estaba desalineado. Tampoco resuelve
la serialización de callbacks de todas las demás clases del SDK; sus avisos
pueden seguir apareciendo. Las pruebas de lógica reducen el refresco gráfico
después de arrancar WebGL y lo vuelven a desactivar tras cargar. No son una
medición de rendimiento ni una validación visual completa de las cinemáticas.

La etapa posterior de trigger_sound encontró timeouts intermitentes en la suite
larga cuando multiscene1 continuaba sus eventos automáticos de cámara e
inventario a la vez que los fixtures. La prueba de aquella etapa eliminaba sus
cuatro managers, conservando los managers reales bajo prueba y los plazos y
aserciones anteriores. Se aísla así ese escenario de regresión; la causa de los
timeouts y la restauración de la cinemática inicial completa no quedan resueltas
por esa modificación de la prueba. Véase `TRIGGER_SOUND.md`.

La fase posterior de estabilización restituye las cuatro instancias en la prueba
actual. Conserva aserciones y fence de 30 segundos y añade diagnóstico opcional;
véase [CINEMATIC_STABILITY.md](CINEMATIC_STABILITY.md). La causa de los timeouts
históricos todavía no se ha confirmado.

Se mantienen las licencias y créditos existentes. No se añaden recursos
originales, Steam ni dependencias de DLL nativas.

## Resultado local — 26 de octubre de 2026

- Referencia anterior: la prueba falla al activar `slower_arms_mm` después de
  cargar. Se conserva su registro para reproducir el defecto corregido.
- Emscripten 4.0.11 compila y enlaza el nuevo servidor. Persiste el aviso anterior
  del SDK sobre memcpy de entvars_t en Clone; no impide la compilación.
- La suite conjunta termina con código 0: cinco contratos BSP sin omisiones y
  cinco pruebas de navegador (`entities`, `campaign_entities`, `motion_entities`,
  `model_entities`, `manager_entities`) satisfactorias y sin errores JavaScript.
- Pasan los managers reales después de cargar, eventos pendientes sin repetición,
  bloqueo mientras está ocupado, reutilización, propagación del activador
  restaurado y dos clones guardados que terminan y se eliminan independientemente.
- Sintaxis JavaScript/Bash y comprobación inversa del parche contra el SDK
  utilizado: satisfactorias. El cambio está en el módulo WASM del paquete probado.

Registros, verificación de exportaciones y servidor resultante:
`build/validation/managers/`, ignorado por Git. Solo se actualizó el paquete de
prueba aislado `/root/cof-audits/audit-D3Kl5uly/dist` en WSL. El `dist/` del
repositorio no se sobrescribió. Ese paquete usa sw=0 durante las pruebas;
requiere regenerar normalmente el manifiesto de caché antes de distribuirlo.
No se realizaron commits, pushes ni despliegues.

La siguiente entidad crítica propuesta es `trigger_sound`. La inspección inicial
encontró 14 brushes en `c_start` con claves roomtype y delay; su factoría está
ausente actualmente. La existencia de esas claves todavía no prueba su contrato
de contacto, temporización o persistencia del efecto acústico. Se deja esa
implementación pendiente de reconstrucción y pruebas específicas.
