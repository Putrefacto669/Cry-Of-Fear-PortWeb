# Evidencias: regresión de envpos (30 de octubre de 2026)

Caso de estudio: `docs/ENVPOS_CASE_STUDY.md`. Cada carpeta de `runs/` es una ejecución en WSL
(Playwright 1.64.1, Chromium headless shell 1248). En casi todas hay `test.out` (salida de la
prueba), `envpos-entities.log` o `envpos-entities-failure.log` (consola completa del juego) y
`http.log`.

| Ejecución | Build probado | Resultado |
|---|---|---|
| `baseline-*` | build publicado (`dist-next`) | pasa |
| `codexdist-*` | `dist` de Codex | falla en el menú |
| `hyb-engine-*`, `hyb-boot-*`, `hyb-maps-*` | `dist` de Codex con motor / boot / mapas actuales | falla (otro punto) / falla / pasa |
| `hyb2-intro-*`, `hyb2-start-*` | `dist` de Codex con `c_intro` / `c_start`+`c_start2` actuales | falla / pasa |
| `hyb3-next-oldstart-*` | build actual con `c_start`+`c_start2` de Codex | falla |
| `diag-codex-*` | `dist` de Codex, prueba instrumentada (cámara, jugador, `viewpos`) | falla |
| `diag-viewdbg-*` | motor con registro temporal `VIEWDBG` (`svc_setview`) | falla |
| `diag2-*`, `diag3-*`, `diag4-*` | diagnósticos `cof_sky_entities`, `added=`, `cof_list env_model` | fallan; muestran la entidad #83 sin modelo en el cliente |
| `case-153703` | experimento de mayúsculas | sin resultado (faltaba `node` en el PATH) |
| `case-153724` | experimento de mayúsculas, build sin corrección | control pasa / carpeta `props` falla / control pasa |
| `case-fix-*` | experimento con la corrección (carpeta creada con `FS_createPath`) | las tres pasan |
| `fix-oldstart-1-*`, `fix-oldstart-2-*` | corrección + `c_start`/`c_start2` de Codex | pasan |
| `fix-1-*`, `fix-2-*`, `fix-3-*` | corrección, paquetes actuales | pasan |
| `suite-dist-fix-*` | suite de 12 pruebas con la corrección | 12/12 |
| `smoke-fix-*`, `smoke-dist-next-*` | `smoke.mjs` y `pointer_lock.mjs` con y sin corrección | mismos resultados en ambos |

`scripts/`: los scripts usados (servir un `dist` y lanzar una prueba, bisección, experimento,
copias instrumentadas de la prueba, registro temporal del motor y su retirada).
