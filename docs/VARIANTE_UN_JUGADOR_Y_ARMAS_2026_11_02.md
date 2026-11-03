# Variante interna de un jugador y prioridades de armas — 2 de noviembre de 2026

## Resultado

La rama de impulso angular para un jugador está implementada en el movimiento compartido del SDK y comprobada en el servidor/cliente WebAssembly. El teléfono modifica la velocidad angular autoritativa; el ángulo y esa velocidad sobreviven a guardar/cargar, incluida una carga desde otro runtime. En esta rama ya no se usa el evento visual añadido en la etapa anterior, evitando dos impulsos simultáneos.

No se han implementado armas nuevas en esta etapa: después de cerrar la ruta SP se presenta abajo el orden recomendado, basado en los archivos locales. No se modificó `dist/`, no se publicaron recursos originales ni se hizo un despliegue.

## Contrato original reconstruido

Referencia original `hl.dll`: SHA-256 `0036b91c01e92ed205513f52563053a55a66a32d257efb5f476b8f1f3dde0e63`. Cliente original: `d2a04641b301804f6f449aa68265042b13adc360925b80033d417ec9f38c9c00`. También se examinó estáticamente `hw.dll`, identidad `9dd34e536c4bb7cda3bc1bc4f0f5f6163687566a16f35c0ea0be59f93da62875`. Se utilizó una copia de análisis de hw.dll fuera del repositorio, de idéntico hash y marcada de sólo lectura. Ninguna DLL original se ejecuta ni se incluye en el producto.

El hallazgo que resuelve la incertidumbre anterior es `hl.dll:10005260`, llamado desde `10004170` en `100042e6`. Es el integrador de punch angular de movimiento. El layout del prefijo `playermove_t` confirma:

| Campo | Offset del ABI examinado |
|---|---:|
| frametime | 0x10 |
| punchangle | 0xA0 |
| dead | 0xD0 |
| vuser3 | 0x234 |

El código original lee/escribe la velocidad en `pmove + 0x234`: corresponde a **vuser3**. Así se pudo identificar su función sin copiar los offsets internos del ejecutable al port. `pmove-prefix-offsets.json` conserva el cálculo reproducible del layout; `native-sp-integrator.txt` y `native-pm-caller.txt` son análisis privados excluidos de Git.

`100f91b0`, invocado por el ataque secundario del celular, acumula la velocidad (-20,+20,+60) para parámetros (1,1,3). En la rama alternativa utiliza el evento del cliente, conservado para maxClients > 1.

El integrador de movimiento original usa:

```
angle += frametime * angularVelocity
angularVelocity *= max(0, 1 - 9*frametime)
angularVelocity -= angle * min(2, max(0, 65*frametime))
angle.pitch/roll = clamp(angle.pitch/roll, -89, 89)
angle.yaw = clamp(angle.yaw, -179, 179)
```

Se detiene si las longitudes de ambos vectores son <= 0,001. Se conservaron también sus condiciones explícitas `dead` y valor 2 de la clave física `chr`, que establecen respectivamente la componente Z o X en 670 antes de integrar. No se inventó una interpretación adicional de `chr` ni se añadieron emisores de esa clave. Esas condiciones auxiliares se portaron por evidencia estática; no se certificaron aquí todos los contextos de muerte/finales que puedan utilizarlas.

La instalación original ya incluye en `delta.lst` los tres componentes de vuser3 y punchangle. El staging mantiene ese archivo original: no se cambió el protocolo del motor ni el recurso. Xash3D ya copia vuser3 entre el edicto y PM_Move en ambas direcciones. No fue necesario modificar el motor.

## Implementación y persistencia

- `game/cof-logic/cof/weapons_cof.cpp`: SP acumula la velocidad en `pev->vuser3`; la rama del evento `CoFPunch` queda para más de un cliente. El callback de impacto, sus 0,133 segundos, daño y alcance permanecen en su implementación previa.
- `game/cof-logic/cof/player_cof.cpp`: añade `m_vecPunchVelocity` como FIELD_VECTOR al estado serializable del jugador. El ángulo ya se guarda en el bloque ENTVARS del SDK. Las partidas antiguas que no contienen el campo nuevo obtienen velocidad cero. Se añadieron diagnósticos de estado/guardado/restauración bajo `cof_weapon_debug`.
- `game/cof-logic/client/cof_phone_punch.cpp`: conserva el componente de evento y registra por separado el punchangle nativo recibido, para comprobar que SP no produce doble feedback.
- `patches/hlsdk/0001-root.patch`: PM_DropPunchAngle utiliza el integrador reconstruido en SP; UpdateClientData transmite vuser3 cuando no se usa la codificación de armas predichas. HUD_TxferPredictionData conserva en SP ese estado autoritativo en lugar de sobrescribirlo con metadatos de munición. view.cpp entrega el punchangle recibido al diagnóstico del cliente.
- `tools/e2e/phone_singleplayer_punch.mjs`: prueba nueva con entrada real y comparación numérica por paso. Conserva las pruebas anteriores.
- `tools/e2e/dual_hands.mjs`: establece captura de ratón mediante un clic real, mientras el jugador sigue desarmado, antes de abrir el bolso. No cambia el modo del teléfono ni consume balas del fixture.

La configuración soportada continúa siendo `cl_lw=0`, confirmada en ejecución. Este trabajo no habilita predicción de las armas personalizadas con cl_lw=1.

El decaimiento angular SP es compartido por el recoil del SDK: la Glock también pasa por el integrador original cuando tiene punchangle. No se cambiaron su daño, munición, cadencia declarada, recarga ni trazas de disparo. La corrección es al mecanismo angular compartido; no se atribuye falsamente sólo a una animación local del teléfono.

No se llama a Spawn, Use o Reload para recuperar el estado después de cargar. No se cambiaron reglas de gravedad, aceleración, colisión ni entidades de cámara/trenes.

## Build y pruebas

Compilación con Emscripten 4.0.11. Los tres builds conservaron sus registros: 2,908 s para la integración inicial; 2,567 s tras corregir el formato de un diagnóstico de maxClients; 1,564 s para el ajuste de predicción. La advertencia de memset sobre entidad polimórfica de client.cpp pertenece a código anterior y no se ocultó.

Build privada final: `/root/cof-audits/dual-20261102/dist-phone-sp-predict`, puerto **8125**, manifiesto **03fd8c160749**.

| Módulo realmente montado en navegador | SHA-256 |
|---|---|
| server.wasm | c2d9d984a416e6a8552f1a75939c065c0bd983263b0d8206e60c5f5d9e6a69a5 |
| client.wasm | fac7e66382a9915f33534030eab35ab0c8a9e846304e0200000bb300f8cde585 |
| renderizador, conservado | 8db286f9132d53133c1a9887ef78bf0735dd264962846f2db6b66350d11e0eec |

Evidencia nueva: `build/validation/phone-singleplayer-2026-11-02/`. Playwright 1.64.1, Chromium 156, siempre con audio silenciado.

- `sp-first/result.json`: PASS. Guardó ángulo (-1,1,3) y velocidad (-9,9,27); ambas restauraciones devolvieron esos valores exactamente.
- `sp-second/result.json`: PASS, repetición con otra duración de pasos. Guardó (-0,64,0,64,1,92) y (-12,96,12,96,38,88); recuperó exactamente ángulo y velocidad en carga normal/fría. La prueba separa expresamente las líneas de estado del servidor de los contadores del evento del cliente al verificar el reposo.
- Ocho pasos reales por golpe se contrastaron contra el integrador reconstruido con los frametimes de movimiento registrados. No se sustituyeron por frames ficticios ni se alteró el reloj.
- El cliente mostró máximos de punchangle nativo, y **cero eventos CoFPunch y cero contribución de ese componente local** en SP. Captura `native-sp.png` inspeccionada. El ángulo renderizado conserva la cuantización del protocolo existente.
- `punch-persistence`: PASS, daño del golpe y callback pendiente una sola vez después de cargar.
- `hands-captured`: PASS, bolso real, celular+cuchillo/Glock, disparo, guardado y restauraciones, incluida recarga fría que termina con 15 balas y 14 de reserva.
- `extras`, `voice`, `callbacks`: PASS. Perfil y visión nocturna; PCM antes/después de restaurar sin HRTF; 39/39 callbacks en carga normal y fría, cinco monstruos animados y continuidad de las operaciones de inventario/eventos.
- `legacy`: dos PASS de partidas históricas con teléfono/cuchillo y Glock.
- `regressions/`: **14/14 suites de navegador, 9/9 contratos BSP y Pointer Lock PASS**, manteniendo las cuatro multiscene1 y sus límites originales.

Los intentos `hands-persistence` y `hands-repeat` conservan un doble INVTOGGLE anterior al golpe y el timeout posterior al cerrarse el bolso. La misma secuencia aparece en el registro previo a esta etapa `dual-wield-2026-11-02/hands-reload-fixed-live/engine.log` de las 20:54:12. Se corrigió el contexto de entrada de la prueba con captura real del ratón; no se modificó el inventario ni se aumentaron timeouts. La entrada por TAB sin captura sigue siendo una deuda previa y no se presenta como arreglada en producto.

La prueba anterior `phone_view_punch.mjs` documenta la adaptación por evento de la build archivada. La nueva rama SP se verifica con su prueba específica; no se exige que emita un evento que el original no utiliza en esta ruta.

## Armas: evidencia y prioridades antes de implementar más

Se leyeron **226 BSP c_*** de la instalación local. Desde c_intro, el grafo estático de transiciones alcanza **81 mapas**, excluyendo nodos de menú. Incluye bifurcaciones y finales alternativos: no equivale a un único recorrido, no demuestra obligatoriedad de cada pickup y no es telemetría de uso real. Se separaron apariciones de armas y disponibilidad de munición para evitar interpretar pocas recogidas como poco uso.

Ya cubiertos en el port: **celular, Switchblade, Glock, cámara digital y jeringa de morfina**, con los límites indicados en informes anteriores. Son la base que debe mantenerse al añadir armas. La cámara digital importa para la mecánica fotográfica; la morfina figura en 32 mapas de este grafo. Para la Glock se encontraron referencias a su munición en 17 mapas.

Orden recomendado para las siguientes implementaciones:

| Orden | Arma o equipo | Evidencia local del grafo de historia | Motivo de prioridad |
|---:|---|---|---|
| 1 | **Hunting Rifle — weapon_rifle** | Recogida en c_park; munición en 6 mapas | Cubrir el fusil presente en c_park y su apuntado/recarga; es distinto de G43. |
| 2 | **Remington 870 — weapon_shotgun** | Arma en 3 mapas; cartuchos en 7 | Combate cercano y cobertura de sewer/asylum/village. |
| 3 | **Lantern y Branch** | Farol en 12 mapas; rama en 2 | Cubrir herramientas y cuerpo a cuerpo presentes en el tramo del bosque; no tratar la rama como simple pickup sin ataque. |
| 4 | **MP9 — weapon_tmp** | Arma en 4 mapas; munición en 8 | Automática de la campaña. El nombre MP9 sale de la definición instalada; no confundirla con weapon_mp5 / MP5A3. |
| 5 | **M16 — weapon_m16** | Arma en 5 mapas; munición en 8 | Cobertura de tramos posteriores y combate sostenido. |
| 6 | **P345 .45 — weapon_p345** | Arma en 3 mapas; munición en 3 | Próxima pareja de pistola/celular tras reconstruir su contrato de una mano. |
| 7 | **VP70 — weapon_vp70** | Arma en 1 mapa; munición en 6 | Validar ráfaga, recarga y compatibilidad con celular sin inferirlas de la Glock. |
| 8 | **Nightstick — weapon_nightstick** | Referencias en 4 mapas | Completar la alternativa cuerpo a cuerpo de sus zonas. |
| 9 | **Flares y Flashlight** | Referencias en 2 y 1 mapas | Completar iluminación e interacciones de mano izquierda cuando se preparen esos tramos. |
| 10 | **Taurus .357 y armas de secuencias finales** | Revólver localizado y munición en 5 mapas; existen definiciones especiales | Investigar junto a sus condiciones de ruta/personaje. No inventar cuándo se entregan ni asumir que todos los finales usan el mismo equipo. |

FAMAS, Simon's Book, Axe y MP5A3 mantienen compatibilidad parcial de pickup anterior; no se deben anunciar como armas completas. G43 no tiene referencias en este grafo estático de 81 mapas: se pospone hasta identificar y preparar sus usos concretos. Ninguna de estas conclusiones sustituye las pruebas de recorrido natural.

Fuentes reproducibles: `campaign-weapons.json` (censo amplio), `story-weapon-priorities.json` (grafo y nombres instalados), `story-ammunition.json` (munición), y sus scripts de lectura. Sólo se versionan metadatos de análisis, no BSP, modelos, sonidos ni definiciones originales completas.

**Siguiente tarea recomendada: investigar e implementar weapon_rifle en su escenario real de c_park, antes de abrir más combinaciones de armas.** Esta etapa se detiene tras terminar SP y enumerar prioridades, según lo solicitado.

## Límites

La ruta SP del impulso, su integración, transporte y persistencia están comprobados para el jugador vivo y sus guardados. No se declara probada cada muerte/final especial que utilice chr, equivalencia binaria con partidas del ejecutable nativo, multijugador completo ni campaña completa jugable. La referencia nativa se obtuvo por análisis estático autorizado, no ejecutando el juego original. Las pruebas de equipamiento/colocación son diagnósticas y no acreditan progreso natural por los 81 mapas.
El contrato numérico tipado se conserva en sp-contract.json; sp-constants.json mantiene la inspección inicial de bytes con varios tipos, sin utilizar sus lecturas de tipo incorrecto en el producto. La verificación final confirma fuentes originales y distribución principal sin cambios.
