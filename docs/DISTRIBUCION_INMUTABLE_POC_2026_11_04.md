# Prueba de concepto de distribución inmutable — 4 de noviembre de 2026

## Alcance

Laboratorio privado de localhost, basado en las distribuciones existentes de los commits `2c371e7` (manifiesto histórico `2f88e7b98c18`) y `15f945f` (`03fd8c160749`). No se modifican sus recursos, el formato de los paquetes, los BSP, los guardados nativos ni el motor. No se sobrescribe `dist/`, no se cambian URLs públicas y no se publica el CAS. No hay commits, pushes ni despliegues.

Esta arquitectura **no se presenta como solución del bloqueo de `registration.update()`**. La coexistencia utiliza registros distintos por ámbito, sin depender de que esa comprobación termine. El informe anterior conserva la causa como no confirmada.

## Estructura y generación

Herramientas nuevas en `tools/immutable_poc/`; instrucciones de reproducción en su [README](../tools/immutable_poc/README.md). Salida privada utilizada: `/root/cof-audits/immutable-poc-20261104/site-v4` en WSL. Las salidas previas se conservan; el generador rechaza sobrescribir una carpeta existente.

```text

site-v4/                         # privado; contiene recursos originales

  catalog.json                   # etiquetas, IDs y hashes de la envoltura

  index.html                     # índice local del laboratorio

  objects/sha256/<SHA-256>        # bytes de transporte; una copia por hash

  releases/<release-id>/

    release.json                 # bytes JSON canónicos; su SHA-256 es release-id

    index.html                   # envoltura del HTML existente

    sw.js                        # worker experimental con ámbito de este directorio

    poc_boot.js                  # preparación, escritura exclusiva y transición

```

Los manifiestos incluyen recursos por nombre lógico, URLs físicas por hash completo, tamaños de transporte y descomprimidos, codificación, paquetes, dependencias de arranque y por mapa, módulos montados con sus offsets y SHA-256, contrato conservador de persistencia y hashes de las plantillas experimentales.

Cada paquete conserva el JS y `.data` de Emscripten sin reempaquetar. Un identificador de pareja deriva de los nombres y hashes de ambos. El generador extrae los metadatos del `file_packager`, comprueba tamaños/offsets y verifica que el `.gz` existente descomprima exactamente al `.data`. No inventa metadatos para un formato desconocido. El motor, cliente, servidor, renderizador, filesystem y menú quedan referenciados a su paquete y hash reales.

No hay punto fijo ni dependencia circular: `release.json` no contiene su propio identificador ni el HTML generado que dependa de él. El ID es SHA-256 de los bytes canónicos del grafo. Las plantillas derivan el ID de la ruta; el catálogo registra por separado los hashes de la envoltura. La etiqueta humana no forma parte del ID. El bootstrap y el catálogo siguen dependiendo del origen de confianza; no se implementó una firma de lanzamientos.

| Lanzamiento | ID completo |

|---|---|

| old | a27aa1f5ad9b7d22ee764cb744263e2093405584a6efecee4c88e4989db61f58 |

| new | 88a112f67a85d1295f6a442a8d588eed7b0877c5b1c8af6e0b604eb8eb54f7c2 |

Las copias canónicas exportadas para revisión están en `build/validation/immutable-poc-2026-11-04/final/manifests/`. Los archivos `old-manifest.json` y `new-manifest.json` de cada ejecución son vistas formateadas del mismo grafo; su presentación con sangría no tiene el hash del JSON canónico.

## Integridad y aislamiento

El worker consulta solamente su manifiesto fijado. Ante un recurso ausente o incorrecto no busca una versión más reciente ni un paquete con nombre parecido. El CAS compartido almacena bytes de transporte y vuelve a verificar su hash al leerlos. Antes de responder al loader también comprueba el contenido descomprimido. Un cuerpo truncado, un HTTP fallido o una huella incorrecta no se marcan como descarga válida.

Cada ámbito `/releases/<id>/` tiene su registro; no se eliminan las cachés de otro lanzamiento ni se activa un worker sobre la partida de otra ruta. Los recursos lógicos siguen siendo, por ejemplo, `packs/engine.data` y `/lib/server.wasm`, aunque se obtengan de objetos físicos por hash.

El bootstrap prepara secuencialmente frontend, motor, boot, compartidos existentes y el primer mapa. Solo después ejecuta los scripts originales. Un fallo en esta preparación ofrece reintento y no arranca un runtime incompleto. El manifiesto de sesión se congela en memoria. Los paquetes posteriores se solicitan por el mismo grafo; no se vuelve a consultar un selector global de versión.

## Persistencia y compatibilidad

Se conserva el origen y el nombre nativo de la base IDBFS, `/rwdir`, pese a cambiar la ruta del lanzamiento. Un Web Lock común al perfil impide arrancar dos escritores participantes. Una segunda pestaña puede descargar y verificar otro lanzamiento mientras la primera juega. Para demostrar dos runtimes simultáneos sin escribir sobre el mismo slot se utilizan contextos de almacenamiento independientes.

`transition()` espera a la sincronización de los archivos existentes antes de navegar. El adaptador experimental serializa las llamadas web a `FS.syncfs` y espera a operaciones que ya estuvieran en vuelo. No modifica el guardado de Cry of Fear ni genera un autosave para sustituir la acción original del jugador. Los ensayos realizan primero un guardado nativo y esperan su fence.

La procedencia se registra en un sidecar web, separado de `.sav`. Si la huella de los módulos nativos cambia, el destino se considera **no verificado** y se bloquea antes de arrancar con ese perfil. No se afirma que dos hashes distintos demuestren una incompatibilidad binaria: es una política deliberadamente conservadora. No se implementó un analizador universal del formato `.sav`, una tabla de compatibilidad entre SDK ni una migración automática. Una base heredada sin procedencia tampoco se abre automáticamente para escritura.

La versión histórica `old` no tiene el comando/sistema posterior de extras. Por ello, la persistencia de su slot nativo se prueba en `old`, y el archivo nativo de perfil/desbloqueos se comprueba en `new`. Los desbloqueos de prueba se preparan con el diagnóstico existente, sin acreditar progresión natural ni alterar las mecánicas del producto.

## Medición

Se registran tres magnitudes distintas:

1. Cuerpos HTTP efectivamente enviados por el servidor, separados por fases. No incluyen cabeceras ni coste TLS; localhost no usa TLS.

2. Eventos del worker: bytes comprimidos/descomprimidos, aciertos de caché, tiempo de verificación y máximo de buffers de payload vivos que declara la operación. Esta última cifra no incluye todas las copias internas de WebCrypto, Blob, descompresor o asignador.

3. Suma de VmRSS del árbol de procesos del navegador privado cada 500 ms. Es una medición de RSS muestreado de escritorio: cuenta páginas compartidas varias veces y puede perder picos entre muestras. Incluye juego/renderizado y, cuando corresponde, dos contextos activos. No equivale a memoria física exclusiva del verificador.

`navigator.storage.estimate()` aporta el uso aproximado del origen; el análisis del CAS en disco determina además sus bytes exactos de objetos únicos. Los tamaños en memoria WASM son instantáneas del heap lineal, no todo el consumo del motor.

## Intentos conservados

- Generación `site-v1`: falló porque la versión antigua no contiene `packs/shared.json`. Se comprobó su contrato histórico y se admitió la lista vacía para esa distribución. No se agregó un paquete inventado al original.

- `site-v2`: generación preliminar conservada. `site-v4` fija las plantillas usadas en las ejecuciones de navegador documentadas.

- `run-1`: montó correctamente los cinco módulos antiguos, pero el arnés intentó comprobar el perfil de extras que ese servidor histórico todavía no implementa. Se corrigió el escenario, no el servidor.

- `run-2`: verificó módulos, aislamiento, integridad, recuperación y el segundo mapa; falló al consultar un contexto destruido durante la navegación. Se conservó la evidencia. El cierre de ese contexto quedó pendiente; se terminó exclusivamente su navegador privado y se documentó la interrupción.

- `run-3`: verificó los archivos de perfil/slot al cambiar rutas y rechazó el contrato inverso no verificado. El arnés reutilizó el contador anterior de conexiones al reabrir un runtime y envió un diagnóstico demasiado pronto; agotó el fence de 30 s. Se cambió la espera para exigir una conexión nueva. No se aumentó el plazo.

Los arneses conservan su copia por ejecución. Los plazos son 30 s para preparación/fences y 60 s para arranque/carga de runtime. El cierre diagnóstico se acota aparte; no transforma una prueba fallida en satisfactoria.

## Compatibilidad móvil futura

El diseño permite reutilizar objetos y preparar solo un mapa, pero el loader actual ya separa los mapas: **no se demostró una reducción incremental de carga inicial frente a ese loader existente**. La mejora comprobable buscada aquí es conservar grafos coherentes y reutilizar objetos entre lanzamientos.

La implementación aún verifica y descomprime paquetes completos. Eso puede elevar picos de RAM aunque reduzca bytes de red. Una implementación posterior tendría que estudiar verificación incremental, límites de concurrencia y costes de copias sin modificar los paquetes originales. No se ejecutaron pruebas físicas de Android/iOS y no se declara compatibilidad móvil ni mejora de RAM móvil.

## Límites antes de publicar

- Es una prueba de concepto, no una sustitución lista del launcher público. La interfaz para seleccionar perfil, guardar, aceptar una versión y resolver incompatibilidades sigue pendiente.

- La exclusión de escritura protege clientes de este prototipo. Un loader público antiguo que no participa en Web Locks no queda protegido por ese bloqueo: la migración debe exigir cerrar esos escritores antes de adoptar su almacenamiento.

- La política conservadora bloquea cambios que quizá sean compatibles; deben probarse y autorizarse explícitamente. Una huella de módulos no valida por sí sola un archivo nativo arbitrario o corrupto.

- El formato de metadatos soportado es el existente del empaquetador inspeccionado. Un cambio de Emscripten se rechaza si ya no se puede reconstruir su contrato.

- No hay recolección de basura, reserva de cuota, expulsión coordinada ni soporte certificado de una campaña entera offline. Se conservan objetos de ambos lanzamientos, con su coste de espacio.

- Deben completarse las pruebas de Range/seek de audio, respuestas MIME de todos los recursos opcionales y fallos de un paquete una vez que su carga nativa ya empezó. La recuperación acreditada aquí ocurre en preparación, antes de montar el paquete fallido.

- No se ejecutó de nuevo toda la suite de mecánicas/cinemáticas. Los recursos y binarios originales no cambiaron; las pruebas nuevas usan el servidor WASM real para dos mapas, guardados y perfiles. Los avisos históricos de modelos/comandos/entidades no implementados siguen en los logs; no se ocultaron ni se presentan como regresiones resueltas.

## Plan de migración desde GitHub Pages

1. Mantener intacta la Alpha mientras el prototipo sigue en localhost. Revisar las mediciones y definir límites de espacio y memoria antes de ampliar capítulos.

2. Parametrizar la base de despliegue del proyecto. Este fixture usa `/objects` y `/releases` en la raíz local; no se deben copiar esas URLs sin adaptación a `/Cry-Of-Fear-PortWeb/`. El ID lógico y el origen de los guardados no deben depender accidentalmente de un host nuevo.

3. Preparar un catálogo completo de los recursos que deban retenerse. No sobrescribir objetos por hash y no borrar lanzamientos con partidas activas. Verificar permisos de distribución antes de cualquier publicación de recursos.

4. Ensayar en un entorno privado la adopción desde el worker raíz: instalar y comprobar el registro del subámbito antes de navegar; comprobar qué controlador responde realmente, sin solicitar una activación global que interrumpa otras partidas.

5. Auditar y respaldar los guardados existentes sin modificarlos, comprobar compatibilidad de módulos/slots y exigir el cierre de escritores heredados. Conservar el origen y `/rwdir`; introducir procedencia solo tras una comprobación explícita.

6. Diseñar la confirmación del jugador y el fallo de sincronización. Si guardar o preparar falla, conservar la partida abierta y permitir reintento. No usar recargas forzadas para esconder el problema.

7. Completar pruebas de cuota, retención, cortes de descarga, cierre/reapertura, varias pestañas, audio/Range, recursos opcionales y dispositivos móviles físicos. Verificar las capacidades y límites vigentes del alojamiento antes de elegir una infraestructura para más capítulos; no se cambia ahora el proveedor.

8. Revisar el resultado y obtener autorización separada para cualquier cambio de build pública, commit, push o despliegue. Conservar una ruta de retorno y los objetos de la versión anterior.

La transición de distribución y el prototipo táctil deben seguir evaluándose por separado. Ninguna medición de este laboratorio identifica la causa del bloqueo de actualización pendiente.

## Resultado final y cifras

**PASS en la ejecución final:** una suite completa con **32 comprobaciones**, Chromium 156.0.8078.4 y Playwright 1.64.1; cero errores JavaScript y ningún cierre de contexto pendiente. Es un ensayo completo del prototipo, no 32 recorridos de campaña independientes. `run-4` conserva además la suite anterior satisfactoria de 31 comprobaciones.

Se acreditaron: los cinco módulos exactos de cada versión; reutilización real de objetos; dos ámbitos; grafo de sesión congelado; partida antigua abierta durante preparación; rechazo de ausencia, corrupción, truncado y caché dañada con reintento; segundo escritor bloqueado; segundo mapa descargado y montado; perfiles y slots conservados al cambiar rutas; bloqueo conservador de contratos no verificados en ambos sentidos; fallo de IDBFS que impide navegar; reapertura fría del navegador y carga nativa del slot en su versión de origen.

La salida final es `build/validation/immutable-poc-2026-11-04/final/`: `run/result.json`, `run/stages.jsonl`, `run/rss.jsonl`, `http.jsonl`, `measurements.json` y los dos manifiestos canónicos. Se verificaron los **117 objetos únicos** del CAS, byte a byte por tamaño y SHA-256 completo. Los binarios y paquetes permanecen fuera del repositorio, en el árbol privado WSL.

| Magnitud | Medición final |

|---|---:|

| Objetos comunes a los dos grafos | 59 |

| Transporte único almacenado para ambos grafos completos | 580.18 MB |

| Dos copias separadas de los grafos | 698.23 MB |

| Duplicación evitada por CAS | 118.05 MB, aproximadamente 16.9 % |

| Preparación inicial de c_apartment1 antiguo | 54.59 MB verificados; 1.90 s |

| Desde preparación hasta runtime antiguo comprobado | 60.19 MB HTTP; 22.30 s |

| Preparación nueva y comprobaciones con partida antigua abierta | 64.58 MB HTTP nuevos; 12.16 s |

| Reutilización en esa preparación nueva | 6 objetos/eventos de acierto; 2.30 MB evitados de red |

| Segundo mapa c_apartment2 en perfil nuevo | 19.06 MB HTTP; 15.20 s hasta montaje/carga comprobados |

| Máximo de buffers de payload en preparación inicial | 108.94 MB; no equivale a todo el verificador |

| Pico RSS sumado durante arranque antiguo | 2357.94 MB |

| Pico RSS sumado durante preparación nueva con juego abierto | 3053.45 MB |

| Pico RSS sumado durante el segundo mapa | 3774.31 MB |

| Pico RSS sumado de toda la suite | 4203.02 MB; 353 muestras |

| Uso final aproximado del origen persistente | 203.58 MB; cachés 202.55 MB, IndexedDB 1.03 MB |

MB en esta tabla significa 1.000.000 bytes. Los números de RAM son de escritorio con SwiftShader y deben leerse con las limitaciones metodológicas anteriores. El uso final del origen incluye las descargas deliberadas de mapas adicionales de las pruebas de fallos; no representa el presupuesto mínimo de una partida normal. Los tiempos son de loopback y no predicen una conexión móvil.

Los grafos completos contienen 324.14 MB y 374.09 MB de transporte respectivamente. Los 118.05 MB compartidos corresponden a todo el catálogo, no a bytes ahorrados necesariamente en el primer arranque. No se extrapola esa deduplicación a toda la campaña.

Los tres contratos de generación pasan: determinismo y conservación de entradas/CAS; rechazo de gzip y offsets incorrectos; rechazo de pareja incompleta. También pasan la sintaxis de los JS/MJS, el AST de Python y la regresión existente de Pointer Lock. No se recompiló C++/Emscripten: se utilizaron los módulos existentes, comparados contra sus hashes montados.

**Estado:** la coexistencia y la descarga por mapas quedan demostradas dentro del laboratorio. La adopción de guardados entre módulos diferentes se bloquea de forma conservadora; no se ha demostrado compatibilidad binaria entre esos dos SDK ni se han migrado partidas. La publicación y la compatibilidad móvil siguen pendientes de los trabajos enumerados.

Mientras concluía la etapa, el usuario informó un fallo del HUD público. Se investigó por separado y se corrigió únicamente CSS de `platform/web/hud.js`; véase [HUD_GECKO_2026_11_04.md](HUD_GECKO_2026_11_04.md). Esa candidata local no se incorporó retroactivamente a los dos árboles históricos ni se publicó. Las comprobaciones de distribución de este informe corresponden a los manifiestos finales indicados y a Chromium; no certifican el HUD histórico en Gecko.

