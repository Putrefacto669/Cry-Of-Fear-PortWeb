# motion_manager: compatibilidad comprobada

Continuación de `ENTITY_COMPATIBILITY.md`. Implementación independiente para el
servidor portable; conserva los créditos a Team Psykskallar y Andreas Rönnberg.
No incorpora recursos originales ni depende de la DLL nativa.

## Evidencia y contrato

Se inspeccionaron los 14 BSP preparados localmente, el SDK portable, el sistema
de entidades y las rutinas del original mediante una copia de solo lectura del
proyecto de análisis existente del usuario. Ese material de análisis permanece
en `build/entity-analysis/`, ignorado por Git; no se distribuye.

La única instancia de `motion_manager` encontrada en esos BSP está en `c_intro`:

| Propiedad | Valor |
|---|---|
| origin | 2719 -1794 -613 |
| target | *locus |
| targetname | ausente |
| m_iszPosition, m_iszFacing | ausentes |
| modos y spawnflags | ausentes: valor inicial cero |

Una instancia sin nombre se activa durante `Activate`, usando el propio manager
como activador. `*locus` selecciona ese activador. Sin canales de posición ni
orientación, esta instancia crea un controlador sin operaciones de movimiento.
No hay evidencia para atribuirle efectos de cámara o movimiento adicionales.
`envpos_world` y `envpos_sky` son clases distintas pendientes de investigación.

## Operaciones implementadas

`m_iszPosition` y `m_iszFacing` admiten tres números finitos literales. Una
cadena vacía desactiva el canal. Para posición, `m_iPosMode` determina:

| Modo | Operación en cada tick, con dt = frametime del servidor |
|---|---|
| 0 | origin = vector |
| 1 | origin += vector * dt |
| 2 | velocity = vector |
| 3 | velocity += vector * dt |

Para orientación, `m_iFaceMode` determina:

| Modo | Operación en cada tick |
|---|---|
| 0 | angles = VecToAngles(vector); dirección cero no cambia angles |
| 1 | angles += VecToAngles(vector) * dt; dirección cero no cambia angles |
| 2 | angles += vector * dt |
| 3 | avelocity = vector |

Cada `Use` crea un controlador independiente por cada entidad cuyo targetname
coincide. `*locus` selecciona solo el activador recibido. Cada controlador captura
la configuración al crearse; cambiar o eliminar el manager no la modifica. Se
elimina si desaparece su destino o activador. Las referencias son EHANDLE, para
evitar reutilizar accidentalmente un edict que ocupó el mismo índice.
El flag 1 imprime datos de movimiento para diagnóstico.

Se guardan los campos del manager, su activación inicial y el estado de cada
controlador. El controlador omite su callback determinista durante el guardado
de BASE y lo vuelve a enlazar al restaurar. En este servidor SIDE_MODULE,
`WriteFunction` no puede resolver ese miembro por nombre: omitir el contenido
sin ajustar el recuento de campos desalineaba el bloque de restauración. La
corrección está limitada a la nueva clase; no modifica el serializador general.

## Regresión reproducible

`tools/wsl/test_entities.sh` ejecuta los contratos de BSP y las tres pruebas
reales de navegador, contra un paquete previamente compilado y servido.
`tools/e2e/motion_entities.mjs` comprueba:

- Activación automática de la instancia real de `c_intro`, sin factory ausente.
- Los ocho modos anteriores mediante estado real del servidor y dt observado.
- Dirección cero, selección del activador, destinos con nombres repetidos,
  activaciones repetidas y configuración capturada.
- Eliminación del destino, del activador y del manager.
- Rechazo sin efectos de expresiones desconocidas, números no finitos, vectores
  incompletos, modos o flags no admitidos y destinos ausentes.
- Guardar/cargar, perturbar posición y orientación después de cargar y comprobar
  que el controlador sigue actuando; restauración de referencias y configuración,
  eliminación posterior y ausencia de duplicación por activación automática.
- Cambio de mapa a `c_start2`, sin controladores del nivel anterior ni errores JS.

Las pruebas arrancan WebGL y el WASM reales; desactivan el refresco gráfico tras
los primeros frames para comprobar lógica. No equivalen a una revisión visual
completa de las cinemáticas.

## Límites

El original también evalúa entidades `calc_position`/`calc_velocity`, expresiones
y un modo de posición 4 relacionado con rutas. No se han implementado: los
valores desconocidos se rechazan antes de crear controladores. No se añaden
transformaciones de parenting ni se fuerza la vista del jugador. Los modos
aritméticos se comprobaron con entidades de prueba no sólidas; no se establece
compatibilidad completa con físicas de brushes o cinemáticas del jugador.

Persisten avisos anteriores por recursos y entidades del SDK no disponibles.
La restauración de callbacks de otras clases queda fuera de esta corrección.
El siguiente candidato crítico es `env_model`: actualmente conserva modelo,
secuencia y body, pero necesita auditar animación y activaciones de las escenas
reales antes de ampliar su comportamiento.

## Resultado local — 25 de octubre de 2026

Emscripten 4.0.11 compiló y enlazó el servidor con `motion.cpp`. Se verificaron
en el binario las factorías `motion_manager` y `cof_motion_thread`, además de las
siete incorporadas en la etapa anterior. La suite conjunta terminó con código 0:
cuatro contratos de BSP sin omisiones y las tres pruebas de navegador
(`entities`, `campaign_entities`, `motion_entities`) satisfactorias.

Los registros y el módulo se conservan localmente en
`build/validation/motion/`. El paquete aislado de WSL se regeneró con ese módulo;
el `dist/` del repositorio permanece sin sobrescribir. El paquete de pruebas
usa `sw=0`; debe regenerarse el manifiesto con `package.sh` antes de distribuirlo
o utilizar Service Workers. No se realizaron commits, pushes ni despliegues.
