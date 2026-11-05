# Distribución inmutable: laboratorio privado

Herramientas experimentales, fuera del producto. No sobrescriben `dist/`, no cambian URLs públicas ni el formato nativo de mapas/guardados. El servidor escucha exclusivamente en loopback. **Los objetos generados contienen recursos originales: deben permanecer en almacenamiento privado autorizado y no agregarse a Git.**

## Archivos

- `generate.py`: lee dos distribuciones existentes; produce objetos deduplicados, manifiestos canónicos y envolturas por lanzamiento. Valida gzip, tamaños y offsets del empaquetador existente. Rechaza reutilizar una salida.
- `worker.js`: ámbito por lanzamiento; verifica SHA-256 completo de transporte y contenido descomprimido, incluso en caché. No limpia los objetos de otros lanzamientos.
- `boot.js`: fija el lanzamiento por ruta, prepara las dependencias de un mapa y ejecuta el loader original. Coordina escritores con Web Locks y espera a IDBFS antes de la transición explícita. Su adaptador serializa las llamadas web a syncfs; no cambia el guardado nativo.
- `serve.py`: fixture de localhost con fallos reversibles de ausencia, corrupción y truncado. No modificar los objetos físicos para estos ensayos.
- `validate.mjs`: pruebas con Chromium y servidor WASM real; comandos de diagnóstico para guardados y carga de mapas, sin acreditar progresión natural.
- `memory.py`: suma VmRSS de los procesos del navegador privado cada 500 ms.
- `analyze.py`: verifica el CAS completo y genera mediciones. Los manifiestos exportados aquí son los bytes canónicos originales.
- `test_generate.py`: contratos de generación, deduplicación, conservación de entradas y rechazo de paquetes inválidos.

## Reproducción en WSL

Requiere Python 3.12, Node y Playwright 1.64.1 con Chromium 156.0.8078.4. `validate.mjs` usa el ejecutable completo de la instalación privada documentada; ajustar ese path si se reproduce en otra máquina y registrar la versión resultante. Las distribuciones históricas corresponden a `dist/` de `2c371e7` y `15f945f`; se extraen en carpetas privadas desde el repositorio autorizado. No hace falta compilar el motor.

Con las rutas siguientes sustituidas por rutas privadas reales:

```sh
python3 -B tools/immutable_poc/test_generate.py -v
python3 tools/immutable_poc/generate.py --release old=/privado/old --release new=/privado/new --out /privado/site
python3 tools/immutable_poc/serve.py /privado/site /evidencias/http.jsonl --port 8134
```

En otra terminal, copiar `validate.mjs` a una carpeta privada cuyo `node_modules` contenga Playwright; así la resolución ESM no depende de instalar módulos en el repositorio. Ejecutar:

```sh
node /privado/runner/validate.mjs http://127.0.0.1:8134/ /evidencias/run /privado/browser-run /ruta/repo/tools/immutable_poc
python3 tools/immutable_poc/analyze.py /privado/site /evidencias --run run --http http.jsonl
```

Elegir salidas nuevas en cada repetición. El arnés mantiene 30 segundos para fences, preparación y confirmaciones; permite 60 segundos para el arranque/carga del runtime. No llama a `registration.update()` como requisito de coexistencia y no demuestra una solución para su bloqueo intermitente.

## Persistencia y compatibilidad

Ambas rutas conservan el origen y la base IDBFS `/rwdir`. Solo un runtime del perfil puede escribir; otra pestaña puede preparar recursos. Dos runtimes simultáneos se prueban en contextos de almacenamiento independientes. Esto no ofrece dos escritores sobre el mismo slot.

La huella `saveContract` es una política conservadora basada en los módulos nativos exactos, no un detector universal del formato interno `.sav`. Un cambio de huella se considera **no verificado** y se bloquea antes de arrancar; no significa que se haya demostrado una incompatibilidad binaria. No hay migración automática. Una base existente sin procedencia se bloquea para exigir una auditoría, sin escribir en ella. El perfil y los desbloqueos originales no se convierten a otro formato.

El usuario debe guardar mediante la mecánica original antes de una transición. `transition()` sincroniza los archivos existentes, no inventa un autosave del estado actual. No promete completar una sincronización después de matar el navegador o cortar la energía.

## Límites

Es un laboratorio, no un launcher listo para publicación. Faltan política de retención/cuotas, selección de perfiles, negociación de compatibilidad probada, interfaz de transición, migración desde el worker raíz y validación móvil física. El bootstrap y el catálogo dependen del origen de confianza; no están firmados. El catálogo registra hashes de la envoltura generada, separada del manifiesto para evitar circularidad.

Las verificaciones actuales usan ArrayBuffers completos y descompresión en memoria. Se mide su coste; no se presume que reduzcan el pico de RAM. La suma RSS incluye páginas compartidas varias veces y la medición del almacenamiento es aproximada. Los logs contienen nombres y huellas, no paquetes, modelos, audios ni archivos de partidas originales.
