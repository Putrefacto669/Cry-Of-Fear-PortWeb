# Evidencia: GL_INVALID_OPERATION en el preludio (30-10-2026)

Informe: `docs/GL_INVALID_OPERATION.md`.

## Distribuciones (árbol de WSL `/root/cof-audits/audit-D3Kl5uly`)

- `dist-fix`: sin el arreglo.
- `dist-glfix`: con el arreglo de `gl2_shim`.

## `runs/`

| Archivo | Contenido |
|---|---|
| `00-traza-webgl-*.json/.txt` | Traza WebGL con SwiftShader: cámara entregada por el nivel; 0 errores en 60 frames (un `viewport INVALID_ENUM` al arrancar) |
| `01-detector-antes-y-despues.txt` | Detector de buffers: punto (-620, 800, 40) con 253/3036 sin arreglo y 0/2472 con arreglo |
| `02-r_drawparticles-y-spott1-sin-arreglo.txt` | Bisección sin arreglo: `r_drawparticles` 0/1, `r_drawentities 0`, ocultar `spott1` |
| `03-recorrido-11X-y-suite-con-arreglo.txt` | Recorrido de las 11 X con detector por fase, y la suite de 12 pruebas sobre `dist-glfix` |
| `03-suite-*-summary.txt` | Resumen de la suite: con arreglo (`dist-glfix`) y build anterior (`dist-fix`) |
| `03-envpos-timeout-en-suite.log.gz` | Registro del único fallo (timeout de `envpos_entities` dentro de la suite) |
| `04-envpos-repetido-con-arreglo.txt` | `envpos_entities` repetida sola: pasa |
| `quads-*.console.log.gz` | Consola completa de cada ejecución del detector |

Las mediciones en GPU real (RTX 4060, ANGLE D3D11) se hicieron en el panel del navegador de la app
y están recogidas en el informe; no hay archivo de esas ejecuciones.

## `scripts/`

| Script | Uso |
|---|---|
| `glerr_trace.mjs`, `glerr_run.sh` | Traza WebGL |
| `glquads.mjs`, `glquads_run.sh` | Detector de buffers. Fases opcionales por variable de entorno: `PARTICLES_TEST`, `SPOT_TEST`, `WALK_TEST` |
| `shimfix.py` | Aplica o revierte el arreglo y el registro temporal `GL2DBG` en el árbol de WSL |
| `build_gl.sh` | Compila el motor y empaqueta en una distribución aparte |
| `validate.sh` | Recorrido de las 11 X y suite completa |
| `suite_fix.sh` | Suite de 12 pruebas |
| `envpos_one.sh` | `envpos_entities` sola |
| `fpcheck.sh` | Cuenta los avisos `Invalid function pointer` en las ejecuciones |

Nota: `WALK_TEST` usa `cof_face headdy`, que orienta al jugador en sentido contrario al disparador
del screamer. Para reproducir el cambio a `c_start` hay que orientar a yaw 270 desde
(-738, -1300, -290).
