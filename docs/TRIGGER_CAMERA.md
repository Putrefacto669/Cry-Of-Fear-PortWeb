# trigger_camera: persistencia WASM

La etapa posterior [FUNC_TRAIN.md](FUNC_TRAIN.md) verifica y corrige la persistencia
de los focos móviles fokus3 e infokus2 junto con sus cámaras.

Se inspeccionaron 93 cámaras en ocho mapas preparados (25 en c_start).
El inventario completo de propiedades y destinos queda en build/validation/cameras/map-cameras.json.

La prueba anterior a la corrección reproduce que kamera3 pierde estado, callback,
jugador, foco, ruta y duración tras cargar. WriteFunction omite callbacks no
resolubles sin ajustar el contador de campos de BASE, desalineando los bloques.
Evidencia: baseline.log y baseline-engine.log.

El parche del SDK guarda la presencia de FollowTarget como entero y omite el
puntero al serializar BASE, restaurándolo inmediatamente en la instancia viva.
Al cargar vuelve a enlazar FollowTarget y conserva nextthink, tiempos relativos,
EHANDLE de jugador/foco y puntero serializado de path_corner. No llama a Spawn,
Use ni Move al restaurar. Xash3D ya restaura la entidad de vista en sv_save.c.
La rama nativa conserva la implementación anterior. No se cambia motor/renderizador.

Archivos de esta etapa: patches/hlsdk/0001-root.patch,
game/cof-logic/cof/player_cof.cpp (consulta sv_cheats cof_camera),
tools/e2e/camera_entities.mjs y este informe. Las funciones de depuración previas
se conservan. La compilación Emscripten terminó correctamente; conserva el aviso
anterior de memcpy de entvars_t en Clone. Se empaquetó únicamente el dist aislado.

Las pruebas usan Playwright 1.64.1/Chromium 156 y mantienen los 29 managers,
incluidos los cuatro multiscene1. Comprueban kamera3 activa, campos restaurados,
continuación del segmento, interrupción y persistencia inactiva. Los usos
independientes de ckamera3 se realizan después de completar naturalmente la
introducción, sin eliminar sus entidades. Cubren activación, carga activa,
finalización, retorno de control y reutilización.

Límites: no se certifica fidelidad visual completa ni todas las 93 cámaras.
Flags CoF adicionales (zangle y bits superiores a los del SDK) no se reinterpretan.
La persistencia propia de focos móviles como func_train requiere una validación
separada: conservar el enlace de cámara no demuestra todos los callbacks del foco.
Partidas antiguas con bloques ya desalineados no se reparan.

Antes de dar por cerrada toda la persistencia cinematográfica conviene comprobar
func_train y otros destinos móviles. La investigación de envpos_world/envpos_sky
puede seguir, conservando esta limitación al validar sus escenas.
No se modificaron recursos originales, licencias ni dist principal. Sin commits,
pushes o despliegues.

## Resultado del 28 de octubre de 2026

La prueba ampliada de cámaras terminó satisfactoriamente y sin pageerror.
La suite de regresión terminó con salida 0: seis contratos BSP, regresión de
Pointer Lock y las seis pruebas previas de navegador, incluidas cinemáticas,
inventario, audio y guardado/restauración. La prueba de cámaras se añade al runner
para futuras ejecuciones. En esta validación se ejecutó separadamente antes de
la suite; no se presenta como una séptima prueba ejecutada por aquel log.

Registros preservados en build/validation/cameras/: baseline.log reproduce el
fallo, fixed-initial.log verifica la reparación inicial, expanded.log y
expanded-engine.log cubren todos los estados mencionados; regression.log y
regression.exit contienen las regresiones. build.log confirma el enlace WASM;
module-sha256.log confirma que el módulo probado coincide con el compilado.
La aplicación inversa del parche al SDK y diff --check fueron satisfactorios.
