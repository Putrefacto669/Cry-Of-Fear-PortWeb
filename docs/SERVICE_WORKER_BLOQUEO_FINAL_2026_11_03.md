# Investigación del bloqueo de actualización — 3 de noviembre de 2026

## Resultado

**El bloqueo se reproduce y su causa interna sigue sin demostrarse.** No se ha aplicado una corrección especulativa al producto. Se ha acotado el problema a una comprobación pendiente anterior al fetch del script del worker, con diferencias reproducidas entre tipos de navegador, clientes y perfiles. No hay evidencia suficiente para atribuirlo a audio, renderizado, almacenamiento o lógica de Cry of Fear.

La Alpha publicada y la candidata actual no se modificaron. HEAD inicial: `25587d81186adbdf429392cbb72aeb890e60befb`; distribución publicada desde `bd883c172b386f2c92ff88224aa7f17a12e5f171`, manifiesto `d071fd1b614e`. El informe anterior y todos sus resultados se conservan. No se hicieron commits, pushes, despliegues ni cambios en `dist/`.

## Reconstrucción controlada

Los árboles privados extraídos de Git se sirven en `http://127.0.0.1:8133/game/`. El cambio de versión solo cambia qué árbol responde el servidor. Cada ejecución utiliza una salida nueva. No se sirven estos controles en GitHub Pages.

| Árbol | Commit histórico | Manifiesto | SHA-256 completo de sw-manifest.js |
|---|---|---|---|
| old | 2c371e7 | 2f88e7b98c18 | 1f958c4094fdfbd042a5100fbefe4940ed52a3c6be226ed5116bb9536bf59c45 |
| new | 15f945f | 03fd8c160749 | 19c7c8f5581d9e8f52e7e49f1268b00e7b0c865eb18f2eec371c0249d68fbe54 |

Los dos `sw.js` históricos son idénticos: 6.502 bytes, SHA-256 `c478bd66e1641941c787540bcf7f0cf81f8866881142fbe366dae5a6ddc7cd4a`. Los cuatro archivos se compararon byte a byte con `git show`; `fixtures.json` conserva el resultado. No se añadieron manifiestos sintéticos para simular esta transición.

Entorno: WSL Linux, Node 24.19.0, Playwright 1.64.1, revisión Chromium `f842f52ef39fd97b449eb27cff414bf05a98ddce`, versión 156.0.8078.4. Se probaron tanto `chrome-headless-shell` como el ejecutable completo `chrome`, ambos en modo headless. **“Chrome completo” no significa aquí una sesión gráfica de Windows.** Ambos binarios pertenecen a la instalación privada de pruebas; no se cambió el navegador del usuario.

El cliente real carga `c_apartment1` y conserva la configuración anterior de prueba (`sw=1&timer=1&fx=0&prefetch=0&debug=1`). El sonido está silenciado mediante `--mute-audio`. No se cambió el motor, no se retiraron entidades ni se modificaron recursos.

La página mínima `/observer.html` pertenece al mismo origen, pero está fuera del ámbito `/game/`. No carga el juego ni un loader y obtiene explícitamente el mismo registro por su ámbito. Esta ubicación evita que el manejador histórico de navegación devuelva el HTML del juego al solicitar la página mínima. Se comprueba el ámbito y estado del registro; no se presupone que el observador esté controlado por él.

## Instrumentación

- Se conserva en la página el estado real de la promesa: llamada, resolución o rechazo y tiempos de `performance.now()`. El controlador consulta ese estado sin esperar indefinidamente a que una evaluación de Playwright devuelva la promesa de `update()`.
- El plazo de cada comprobación sigue siendo **30.000 ms**. Una observación posterior, o cerrar una pestaña para diagnosticar, no convierte un timeout previo en aprobado.
- Se registran `updatefound`, cambios de estado del worker, `controllerchange`, installing/waiting/active, errores de página, eventos CDP de registro y versión, y peticiones/respuestas/fallos del navegador.
- El servidor registra peticiones, respuestas, bytes y SHA-256. NetLog permite contrastar si existe una petición interna que el servidor o Playwright no hayan visto.
- Se capturan trazas de Chromium con categorías ServiceWorker, startup y tareas. Hay capturas satisfactorias y capturas cuyo cierre no completó; estas últimas se conservan como limitación, sin presentarlas como trazas vacías del navegador.
- Se calculan cinco SHA-256 completos directamente sobre `/lib/` dentro del runtime antes y después. No basta comprobar el manifiesto declarado.

Las herramientas nuevas son exclusivamente diagnósticas: `tools/e2e/sw_jobs_fixture.py`, `sw_jobs.mjs`, `sw_jobs_raw.mjs` y `sw_jobs_analyze.py`. No se incorporan al producto ni a sus paquetes.

## Ejecuciones

Evidencias nuevas en `build/validation/sw-jobs-2026-11-03/`. Cada carpeta contiene sus eventos y, cuando la captura terminó, resultado, NetLog comprimido y traza. Las revisiones posteriores del arnés conservan también su copia y hash dentro de la ejecución.

| Ejecución | Condiciones | Resultado observado |
|---|---|---|
| game-shell-1 | Shell nuevo, juego, old → new | API pendiente a 30 s; módulos sin cambios; sin errores JavaScript |
| game-other-shell | Juego primero; observador abierto después del timeout | Ambas llamadas pendientes a sus respectivos 30 s |
| game-other-trace | Misma comparación, trazado iniciado después de navegar | Ambas llamadas pendientes; abrir el observador o su inspector no liberó la primera |
| minimal-shell-fixed | Shell nuevo, solo página mínima | Resolvió en 58 ms; se descargó el script; el worker nuevo pudo activarse al no haber un cliente controlado del juego |
| game-full-1 | Chrome completo nuevo, juego | Resolvió en 148 ms; worker nuevo instalado esperando; módulos antiguos conservados |
| game-full-2 | Otra instancia nueva de Chrome completo, juego | Resolvió en 205 ms; worker nuevo esperando; módulos antiguos conservados |
| dual-close-shell | Juego y observador, dos llamadas | Ambas agotaron 30 s. Cerrar el juego liberó después la llamada del observador, aproximadamente 3,2 s tras el cierre |
| game-shell-no-sw-network | Shell; inspección de red de workers de Playwright desactivada | Siguió pendiente a 30 s; esta opción no elimina el problema |
| dual-minimal-shell | Juego abierto; la primera llamada se hace desde la página mínima | También pendiente a 30 s; la llamada posterior desde el juego tampoco completó dentro de su plazo |
| profile-create | Chrome completo con perfil persistente nuevo; old → old | Comprobación sin cambio de bytes resuelta en 92 ms; guardado real creado y sincronizado |
| profile-reopen | Reapertura del mismo perfil; old → new | Pendiente a 30 s incluso con Chrome completo; guardados y módulos intactos |

Los tiempos redondeados proceden de la promesa de la página, no de la duración total del proceso. Preparación, capturas y cierre consumen tiempo adicional y no amplían el plazo de actualización.

El cierre del juego en `dual-close-shell` es un experimento de diagnóstico: **no se propone cerrar una partida como arreglo ni se contabiliza ese ensayo como estable**. La segunda llamada ya estaba pendiente antes del cierre; después aparecen la descarga del script y la nueva versión.

## Qué permiten concluir las trazas

En los ensayos satisfactorios de página mínima y Chrome completo aparece una tarea `ThreadControllerImpl::RunTask` originada en `content/browser/service_worker/service_worker_register_job.cc`, función `Start`, línea 190 de esta revisión. En la captura de `profile-reopen` hay 125.046 eventos y actividad de tareas del navegador, pero no aparece esa tarea de inicio. La captura acredita actividad durante la espera; no es un volcado completo de las colas de trabajos.

En los ensayos bloqueados sin cierre diagnóstico, NetLog no muestra un nuevo inicio de petición a `/game/sw.js` después de llamar a la API. Esto confirma que la ausencia de HTTP no es solamente un punto ciego de los eventos de Playwright o del servidor. En la ejecución mínima satisfactoria el inicio de URLRequest aparece aproximadamente 1 ms después de la llamada.

El código exacto de Chromium envía los trabajos de actualización a la cola UI con prioridad `BEST_EFFORT`; los trabajos de registro usan la prioridad normal. El propio código deja pendiente revisar la prioridad de la API explícita. Véase [ServiceWorkerRegisterJob::Start, revisión utilizada](https://raw.githubusercontent.com/chromium/chromium/f842f52ef39fd97b449eb27cff414bf05a98ddce/content/browser/service_worker/service_worker_register_job.cc). Se inspeccionaron también las rutas de DevTools, creación de fábricas de red y arranque; los URLs y hashes de las fuentes locales consultadas están en `chromium-source-index.json`.

**La prioridad es una hipótesis fundada en código, no una causa demostrada.** La ausencia de una tarea en la traza no identifica por sí sola si el trabajo no se encoló, está esperando otro trabajo del registro, quedó diferido por planificación o está retenido en otra fase no instrumentada. No se cambió la prioridad ni se compiló un Chromium modificado para comprobar ese mecanismo.

## Aplicación, navegador y arnés

1. **No es únicamente una espera mal construida del arnés original.** La promesa permanece pendiente dentro de la página; el estado se consulta desde fuera, el registro conserva su worker activo y no hay una petición de actualización en NetLog. Otras evaluaciones y los mensajes periódicos del runtime siguen funcionando en los ensayos instrumentados.
2. **No depende solo del sitio de llamada dentro del juego.** La página mínima usa el mismo registro y también puede quedar pendiente mientras el juego está abierto, incluso llamando primero desde ella.
3. **No es exclusivo de un binario ni de un perfil nuevo.** Chrome completo resolvió en dos instancias nuevas, pero reprodujo el atasco al reabrir un perfil persistente. Esta muestra no permite establecer una tasa de fallo general ni asegurar que toda sesión nueva de Chrome completo vaya a resolver.
4. **Desactivar la inspección de red de workers de Playwright no lo resolvió.** No descarta todas las interacciones posibles de DevTools/Playwright.
5. **No se ha demostrado un bloqueo del hilo del juego ni una causa de audio o almacenamiento.** Hay actividad del cliente durante la espera; una petición de música pendiente en algunos ensayos es una observación, no una prueba de causalidad.

Se intentó además un control mediante el pipe CDP directo, sin importar Playwright ni auto-adjuntar inspectores a workers. Sus intentos no alcanzaron un resultado comparable de `update()`: hubo bloqueos de comandos de diagnóstico/evaluación durante la preparación. Se conservan en carpetas `raw-shell*`. **Ese control es inconcluso y no permite descartar completamente Playwright.** El primer intento se interrumpió y quedó documentado; los posteriores acotan los comandos individuales. No se aumenta el plazo de la API.

## Guardados e integridad

En `profile-create` se ejecutó un guardado nativo en `c_apartment1`, se esperó su fence y se sincronizó IDBFS. Tras cerrar y reabrir el mismo perfil, `profile-reopen` recuperó exactamente estos archivos; conservaron los hashes incluso tras el timeout:

| Archivo | SHA-256 |
|---|---|
| sw_jobs.sav | 5fc30eba68f3a95530ed2003b7951e61385e2bfcfbc74036f8d35b154b743ac0 |
| sw_jobs.bmp | 40019c73749bf647faf0e1d084f36b4b1c17336b9e69d7097ef6a7fbdf4979f9 |

Esta prueba verifica persistencia e integridad de los archivos; no añade una nueva prueba de carga jugable del slot. Las pruebas de carga de la candidata pertenecen al informe anterior y no se presentan como repetidas aquí.

Los cinco módulos montados se mantuvieron idénticos en las comparaciones completas, tanto cuando la actualización resolvió como cuando quedó pendiente. Al cerrar el juego para el diagnóstico se comprobaron antes de cerrarlo. El servidor antiguo conserva `07e7ef5c…`, el cliente antiguo `e0bc9af5…`; los cinco SHA-256 completos constan en cada resultado. No se aceptó una actualización a mitad de la partida para forzar un resultado. Estas comprobaciones no garantizan que un mapa antiguo aún no cacheado pueda descargarse después de retirar sus recursos del alojamiento; sigue vigente la limitación documentada anteriormente.

## Intentos inválidos y límites

- `minimal-shell` esperaba `navigator.serviceWorker.ready` desde fuera del ámbito del registro. Esa promesa no es una confirmación válida para ese cliente. El intento se interrumpió, se conservó su evidencia y se sustituyó en una carpeta nueva por la consulta explícita de `active`. No cuenta como timeout de `update()`.
- Algunas capturas CDP anteriores no completaron el cierre de tracing en 10 s. Se pasó a la API de trazado de navegador de Playwright; las ejecuciones posteriores conservan las capturas reales que terminaron. Un error de captura no altera el resultado de los 30 s de la API.
- El comando CDP `Browser.getBrowserCommandLine` rechaza la consulta sin `--enable-automation`. Se conserva ese error; no se interpreta como fallo de la aplicación. Se registró por separado la línea de lanzamiento para el control directo.
- Se retiraron de las copias de evidencia accesibles al repositorio las URLs `data:` con contenido incrustado, sustituyéndolas por huellas. Las capturas sin filtrar se conservan únicamente en el área privada WSL. No se agregan paquetes, modelos, audios ni binarios originales a Git.
- Localhost y estas sesiones reconstruyen los bytes y el síntoma, pero no todo el historial de la antigua sesión pública, sus cachés ni la planificación de su proceso. No se ensayó Firefox, Safari, móvil ni Chrome gráfico de Windows.
- No se repitió la suite completa de mecánicas ni se recompiló Emscripten: no hay cambios de código de producto que compilar. Las comprobaciones nuevas usan el servidor WASM real y los módulos históricos. Los resultados anteriores de regresión se conservan, sin atribuirles una ejecución nueva.

## Estado y siguiente paso

No se considera resuelto el bloqueo ni se cambia el comportamiento de actualización de la candidata. `d071fd1b614e` conserva las correcciones verificadas de integridad, control de activación y sincronización descritas en los informes previos; este trabajo no añade una garantía de que `registration.update()` siempre complete en 30 s.

El siguiente experimento útil es obtener un volcado instrumentado del coordinador de trabajos de Service Worker de esta revisión de Chromium: entrada a Update, trabajos ya encolados para ese registro, post/ejecución de StartImpl y estado de la cola BEST_EFFORT. Debe repetirse con un controlador CDP mínimo que complete primero el arranque, para separar navegador y DevTools. Hasta disponer de esa evidencia no corresponde cambiar el juego, parchear un planificador ni introducir recargas automáticas.

La arquitectura para los capítulos siguientes se propone aparte en [PROPUESTA_PAQUETES_INMUTABLES_2026_11_03.md](PROPUESTA_PAQUETES_INMUTABLES_2026_11_03.md): manifiestos inmutables por lanzamiento, objetos por SHA-256 completo, grafo fijado de módulos y paquetes, ámbitos de worker por lanzamiento, aceptación por el jugador y continuidad de IDBFS. Es una propuesta de distribución; no se ha implementado ni se presenta como solución demostrada del atasco.

## Reproducción

Preparar en privado los árboles `old/` y `new/` de los commits indicados, instalar la versión exacta de Playwright y sus navegadores y servirlos con:

```text
python3 tools/e2e/sw_jobs_fixture.py <raíz-privada> <log-http-nuevo> 8133
node tools/e2e/sw_jobs.mjs http://127.0.0.1:8133/ <salida-nueva> <captura-privada-nueva> game shell
node tools/e2e/sw_jobs.mjs http://127.0.0.1:8133/ <otra-salida> <otra-captura> game full
```

Los paths del ejecutable completo en el arnés corresponden a la instalación privada descrita. Para perfil persistente, los argumentos siguientes son `<perfil> old old create`, y en otra ejecución `<mismo-perfil> old new check`. `dual-minimal` y `minimal` seleccionan los otros clientes. Ejecutar secuencialmente: el selector de versión del servidor pertenece al fixture entero. Las salidas existentes se rechazan para evitar sobrescribir evidencia.

`sw_jobs_analyze.py <directorio-evidencias>` genera una salida nueva `analysis.json`, compara guardados, resume NetLog y cuenta tareas en las trazas. No convierte un timeout en éxito ni afirma una causa automáticamente.

## Comprobaciones de cierre

`analysis.json` resume trece ejecuciones con `result.json`: once comparaciones de actualización y dos controles CDP inconclusos. Los intentos interrumpidos quedan además fuera de ese recuento, con sus registros conservados. El análisis confirma los hashes de guardado a través de la reapertura.

Sintaxis Node de los dos arneses, AST de las dos herramientas Python, comprobación de espacios finales y escaneo de recursos incrustados: satisfactorios. `git diff --check` no registra errores en archivos seguidos; los archivos nuevos se revisaron por separado. `final-checks.json` conserva estas comprobaciones. HEAD permanece en `25587d8`, `dist/` coincide con HEAD y el SHA-256 de su worker sigue siendo `9712ce939c7b33c6087454ff345eeadb1f1490101ac25598fc022eec575e6e47`. Se cerraron los navegadores y el servidor privado de esta investigación.
