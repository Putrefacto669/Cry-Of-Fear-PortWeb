# Auditoría de continuidad Codex → Claude Code (30 de octubre de 2026)

Solo lectura del producto. No se editó código, parches, SDK, dist ni informes de Codex. Las únicas
escrituras: esta carpeta, dos carpetas nuevas en WSL (`/root/cof-audit-rerun-20261030-094807`,
`/root/cof-audit-rerun-envpos-20261030-095743`) y scripts en el scratchpad de la sesión.

## 1. Repositorio

- Raíz: `C:\Users\josue\OneDrive\Desktop\Cry Of Fear Web Alpha Version\Cry-Of-Fear-Port-Web`
- Rama `main` = `origin/main` = `744cbcb`. Sin otras ramas ni stash. Todo el trabajo de Codex está sin commit.
- Ignorado: `build/` (1,1 GB de validación), `dist/` (copia local antigua), `tools/__pycache__/`.

## 2. Cambios pendientes (solo locales, no están en GitHub)

- 13 modificados (+1335/−65): cof_client.cpp, cof_player.h, doors.cpp, env_model.cpp, player_cof.cpp,
  puzzles.cpp, teleport.cpp, patches/hlsdk/0001-root.patch (+666), patches/xash3d/0001-root.patch (+188),
  hud.js, loader.js, stage_map.py, e2e_setup.sh (Playwright 1.56.1 → 1.64.1).
- 41 nuevos: 9 entidades (bossbar, changevalue, checkbrush, envpos, motion, padlock, sound_trigger,
  stairs, triggeron), 12 documentos en docs/ (ENVPOS.md vacío; varios en Windows-1252), 20 pruebas e2e
  y tools/wsl/test_entities.sh.

## 3. Compilaciones y artefactos

- Árbol canónico de Codex: `/root/cof-audits/audit-D3Kl5uly` (current-path). Build 19, 30 oct 09:32:
  server.wasm `082a2836…`, client.wasm `cda2369f…`. dist aislado de 793 MB. padlock-stage con c_start y c_start2.
- Navegador de pruebas: `/root/cof-audits/browser-1.64.1` (Playwright 1.64.1, chromium_headless_shell-1248).
- Copias de referencia: `/root/cof-audits/padlock-baseline`, `padlock-before-button-fix`.
- `~/cof-web` está desfasado (25 oct): su hlsdk tiene 14 archivos cambiados frente a 21 del árbol de Codex.
- Comprobado: los parches de la repo equivalen a los SDK del árbol de Codex (hlsdk 21/21, xash3d 23/23 y
  submódulos; trains.h solo difiere en una línea en blanco final). game/cof-logic de la repo es idéntico al
  compilado. hud.js, loader.js, sw.js, postfx.js, debug.js y gpustats.js idénticos al dist de Codex.
- Un `serve.py` de Codex (PID 401 en WSL, desde las 07:40) sigue sirviendo ese dist en 127.0.0.1:8095.

## 4. Informes recuperados (build/validation/)

c_start-gameplay, cameras, chromium156, cinematics, cinematics-audio, envpos, managers, models, motion,
padlock (53 MB: natural-1..9, diagnostic-1..11, button-*, changelevel-*), sound, trains.

## 7. Pruebas ejecutadas en esta auditoría

| Prueba | Resultado |
|---|---|
| pointer_lock.mjs | OK |
| test_entity_maps.py (stage principal) | OK, 7 tests |
| test_envpos_maps.py (stage principal) | OK |
| test_padlock_maps.py (stage principal) | OK |
| test_envpos_maps.py (padlock-stage) | Falla esperada: a ese stage le faltan mapas |
| entities, campaign, motion, model, manager, sound, camera, train, track, button, changelevel | OK (11/12) |
| envpos_entities | **FALLA dos veces**: tras c_start2 y c_intro, en c_game_menu1 el cielo especial no se dibuja (draws=0, ambient=-1) y vence el plazo de 60 s |

Último paso registrado de envpos en navegador: 29 oct (c_start-gameplay/regressions.log, envpos/final-runtime-*).
Después, el 30 oct, cambió el pase del cielo del renderizador (caché de modelview) y la sesión del candado;
Codex solo repitió el contrato BSP de envpos. Causa no determinada.

## 8–9. c_start, c_start2 y candado

Recorridos naturales natural-7/8/9: introducción completa → E abre el candado (PADLOCK 1) → cancelación
(PADLOCK 0) → transición real a c_start2 → lectura de la nota de contraseña (natural-8/9). natural-9 termina
con el jugador atascado en c_start2 (1062,1938,-555), camino del ordenador. natural-6 llegó al ordenador
(contraseña errónea a propósito, DENIED) y al volver a c_start abortó con "Level transition ERROR"; Codex lo
atribuyó a la serialización de trigger_changelevel y lo corrigió (changelevel-fixed-2 con activaciones
diagnósticas; changelevel_entities pasa hoy). El regreso natural no se ha repetido.

Sin validar de forma natural: contraseña correcta → código; volver a c_start; combinación errónea; combinación
correcta → apertura, Finished y multi_pad; puerta liberada; guardado antes/durante/después.

Visibilidad: en partida nueva el modelo se ve tras el arreglo del renderizador (diagnostic-11, natural-9),
muy oscuro. No hay captura posterior de la vista del candado tras restaurar: la comparación sigue abierta.
Hallazgo aparte: en diagnostic-3 (restaurado) las manos del jugador salen blancas sin textura.
