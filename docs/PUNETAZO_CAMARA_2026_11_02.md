# Puñetazo del celular: impulso de cámara — 2 de noviembre de 2026

## Alcance

Continuación de `820c739`, con árbol inicialmente limpio. Se implementó el impulso visual que faltaba en el puñetazo del teléfono, usando la ruta de evento comprobable del cliente original. Se mantuvieron las parejas celular/cuchillo y celular/Glock, el daño y su callback diferido. No se actualizaron `dist/`, GitHub Pages ni los recursos originales.

## Investigación de sólo lectura

Se consultaron los mismos `hl.dll` y `client.dll` originales, con Ghidra en `-readOnly -noanalysis`; los volcados `native-*.txt` se excluyen de Git.

- Servidor `10053a70`: antes de la animación 10/11 invoca `100f91b0(1,1,3)`.
- `100f91b0`: en su rama de evento llama a `events/viewpunch.sc` con esos tres valores. El flag `0x10` corresponde a `FEV_HOSTONLY` en el SDK: afecta al jugador que golpea. La otra rama escribe en campos internos del ejecutable original.
- Cliente `10052e00` entrega los valores a `100ae9a0`; este acumula velocidad angular `(-20*x,+20*y,+20*z)`. Para el puñetazo: **(-20,+20,+60)**.
- `100b2140` elige la evolución por resorte cuando maxClients > 1; para menos clientes conserva un decaimiento distinto del evento. Esta etapa adapta explícitamente la ruta por resorte al navegador. Se verificaron también las funciones vectoriales `10094510` (longitud), `10094770` (VectorMA) y `10094880` (escala), además del código ensamblador, para no deducir la ecuación sólo de tipos imprecisos del decompilador.
- Constantes leídas del PE original: multiplicador 20, amortiguación 9, resorte 65, máximo de coeficiente de resorte 2, límites pitch/roll ±89 y yaw ±179, umbral de longitudes 0,001. Datos tipados: `spring-constants-typed.json`; `spring-constants.json` conserva la inspección inicial de bytes como float/double, incluidos valores sin significado cuando se usa el tipo incorrecto.

La cámara recibe el ángulo acumulado de la iteración anterior y después avanza:

```
a = a + dt * v
v = v * max(0, 1 - 9*dt) - a * min(2, max(0, 65*dt))
a = clamp(a, [-89,-179,-89], [89,179,89])
```

No se sustituye este movimiento por un `punchangle.x` arbitrario. Tampoco se modifica el retroceso ya existente de Glock.

## Arquitectura y diferencias explícitas

La implementación adapta **la ruta de evento del cliente** al protocolo del port: mensaje `CoFPunch`, dirigido al jugador, con los tres valores originales. El cliente integra el resorte y suma su ángulo a la vista en el mismo punto funcional donde el SDK incorpora el feedback de eventos. Conserva el retroceso estándar por separado. No modifica el motor, el renderizador, `v_angle`, la posición del jugador ni las trazas de daño.

Esto no reconstruye los campos internos de la otra ruta del ejecutable original para un jugador ni afirma equivalencia de su física o serialización. Es una adaptación visual verificable de la ruta de evento, aplicada también a la sesión local del navegador. El movimiento transitorio de cámara se descarta en VidInit/carga/cambio de mapa; el golpe pendiente y el inventario conservan su persistencia de servidor. La equivalencia exacta de ese feedback con la rama interna de un jugador permanece pendiente.

## Archivos modificados

- `game/cof-logic/client/cof_phone_punch.cpp`: recepción del impulso, integración, aplicación a la vista y reinicio del feedback transitorio. Comando `cof_phone_punch_status`; opción `cof_phone_punch_trace=1` imprime como máximo ocho pasos por golpe. Por defecto no imprime pasos.
- `game/cof-logic/client/cof_client.cpp`: alta del mensaje y reinicio de estado.
- `game/cof-logic/cof/weapons_cof.cpp`: registro de `CoFPunch` e impulso únicamente desde `CCofMobile::SecondaryAttack`. En pareja, clic derecho sigue usando PrimaryAttack del teléfono y no emite el golpe.
- `patches/hlsdk/0001-root.patch`: integración mínima en `cl_dll/view.cpp`, después del retroceso estándar. Exportado del SDK real; `git apply --reverse --check` satisfactorio.
- `tools/e2e/phone_view_punch.mjs`: ratón real, recurrencia de pasos registrados contra la fórmula reconstruida, modos SMS/linterna, retorno al centro, reinicio al cargar y ausencia de nuevo golpe al cambiar luz en pareja.

## Compilación y build privada

Emscripten 4.0.11. Primera compilación fallida por declaraciones duplicadas introducidas al insertar Init/Reset; se corrigieron sin modificar APIs del motor. Segunda compilación **PASS, 1,997 s**, con el nuevo archivo incluido y cliente/servidor enlazados. Ambos registros se conservan.

Build: `/root/cof-audits/dual-20261102/dist-phone-impulse`, puerto local **8123**, manifiesto **12e9a543628b**.

- Servidor montado: `1e5a3e23cfb3621d25e3e1740555a10a7d0efc6b4b484bd425673366dd2b7307`.
- Cliente montado: `c68b689e0ec6ba117ec88cfcd8640de67c47f20ff705217b4ce124dee1ca5889`.
- Renderizador conservado: `8db286f9132d53133c1a9887ef78bf0735dd264962846f2db6b66350d11e0eec`.

## Resultados dirigidos

Evidencia en `build/validation/phone-impulse-2026-11-02/`. Playwright 1.64.1, Chromium 156, audio silenciado.

`view-second/result.json`: **PASS**, cero errores JS. Se verificó impulso inicial (-20,20,60), ocho pasos con los tiempos de frames reales contra la ecuación reconstruida y suma efectiva a la vista. El máximo depende del frametime, como la fórmula original: en este ensayo se observaron 2,08° de pitch/yaw y 6,24° de roll. No se usa una animación de cámara fija independiente del tiempo.

Tras 3,2 segundos de espera, el ángulo quedó aproximadamente en (-0,000060,+0,000060,+0,000180) y la evolución se detuvo por el umbral original. Tras cargar quedó en cero, sin reproducir un impulso antiguo. Se verificó un golpe nuevo en SMS sin cambiar el modo, y después celular+cuchillo: clic derecho cambió la luz conservando el contador de golpes. La captura `phone-feedback.png` fue inspeccionada.

`view-first` conserva un fallo del parser de la prueba: el último componente de `peak` incluía el salto de línea del fence y se convertía a NaN. Los pasos numéricos anteriores ya eran correctos. Se ajustó únicamente la lectura de registros; no se cambiaron límites de tiempo ni la implementación para ocultar el fallo.

Los ensayos baseline sobre puerto 8122 conservan la ausencia del comando/mecanismo nuevo en el cliente anterior; no se presentan como ejecución del juego original. Las referencias nativas proceden del análisis estático autorizado, no de ejecutar sus DLL.

## Combinaciones adicionales

`map-weapons.json` y `map-weapon-links.json` recogen los once BSP preparados, incluidas referencias de entidades que entregan armas. Los usos relevantes funcionales siguen siendo teléfono, cuchillo y Glock; la cámara fotográfica y la jeringa tienen funciones separadas. FAMAS, hacha, booklaser y MP5 aparecen como pickups con compatibilidad parcial previa, no como nuevas armas completas verificadas para DUAL WIELD.

No se habilitaron parejas basadas únicamente en el nombre de un pickup. Ampliar el sistema a P345, VP70, revólver, linterna u otras armas exige reconstruir y validar primero cada arma, sus recursos, munición, recarga y clasificación de una mano. Se recomienda empezar por una de las armas de una mano de la siguiente sección de campaña que se vaya a preparar.
## Regresiones y conclusión

En la build privada nueva pasaron las pruebas completas de parejas/recarga con restauración fría (`hands-persistence`), daño y único impacto pendiente al cargar (`punch-persistence`), perfil y transición de visión nocturna (`extras`), PCM de voces sin HRTF (`voice`) y **39/39 callbacks** en carga normal/fría, con cinco monstruos animados (`callbacks`). Los logs anteriores se conservaron separados.

`source-verification.json` confirma DLL originales idénticas, módulos privados y distribución principal sin diff. Las pruebas usan únicamente el servidor/cliente WebAssembly; no se ejecutaron DLL nativas.

La etapa añade feedback visual basado en una ruta comprobable del original y mantiene los controles y operaciones del servidor ya validados. No declara completada toda la implementación nativa del teléfono ni amplía artificialmente las combinaciones a armas que siguen siendo pickups parciales. Queda por reconstruir la rama interna original de un jugador y validar las armas de una mano de los próximos mapas preparados.
Resultado de la suite general: **14/14 suites de navegador PASS, 9/9 contratos BSP PASS y Pointer Lock PASS** (`regressions/`). Se conservaron las cuatro instancias de `multiscene1`, los fences de 30 segundos y los recursos BSP originales. El parche del SDK pasa la comprobación inversa; el código fuente pasa la comprobación de espacios, excluyendo las líneas de contexto del parche anidado.