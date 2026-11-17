# Rendimiento y cámara táctil

Base pública `eeebe6d` / `e9110520a5d6`. Candidata local `http://127.0.0.1:8142/?sw=0`. Se compiló el cliente Emscripten y se conservaron el servidor y el renderizador publicados.

- La primera candidata local mantuvo su canvas horizontal completo y limitó el DPR interno a 1. La candidata actual usa la resolución adaptable descrita abajo. El HUD sigue a resolución de navegador.
- Los arrastres de la mitad derecha capturan su puntero y acumulan los desplazamientos en píxeles CSS hasta el siguiente cuadro. Al soltar se conserva el desplazamiento pendiente. Al cancelar se descarta la entrada pendiente y queda disponible un nuevo toque. El cliente WASM recibe los deltas por la ruta normal de movimiento Xash y mantiene la sensibilidad del juego.
- Se evita leer la altura del registro al imprimir en modo móvil sin depuración. El siguiente mapa se monta según se necesita. El menú puede seguir preparando el primer mapa. El parámetro `prefetch=1` permite conservar la precarga automática en diagnóstico.

## Resultados

Chromium SwiftShader, `c_start2`, 844 × 390 CSS px, DPR emulado 3, medición serial en el mismo equipo. El buffer de la build pública fue 1266 × 585 y el de la candidata 844 × 390. El intervalo mediano de animación pasó de 133,3 ms a 83,3 ms y el p95 de 283,3 ms a 216,6 ms en esa muestra. El máximo todavía llegó a ~650 ms en la candidata. El resultado no caracteriza el rendimiento de un móvil real.

Cinco arrastres cortos consecutivos y el siguiente gesto tras una cancelación cambiaron correctamente los ángulos en ambas builds. El ensayo no reprodujo la pérdida intermitente reportada en el teléfono. La candidata también pasó giro con joystick y disparo simultáneos, regreso de la cámara después de cancelar, apertura y cierre del bolso y escritorio con teclado y Pointer Lock. La transición solicitada por diagnóstico desde `c_start2` a `c_start` montó su paquete al pedir el cambio; no se observó esa descarga durante el intervalo de juego previo. El montaje bajo demanda puede hacer más larga la transición.

Pendiente medir en el dispositivo afectado y localizar el origen de los picos restantes. La publicación y la jugabilidad nativa no se modificaron. Registros en `build/validation/mobile-performance-20261115`.

## Resolución móvil adaptable

Pausa → Opciones → Resolución del juego. Automática parte de 1× y ajusta entre 0,8× y 1,5× según los tiempos de los frames del bucle de Emscripten. Limita el buffer a 750 000 píxeles y al DPR del dispositivo. Escalar hacia arriba requiere cuatro ventanas rápidas. Los perfiles manuales Rendimiento y Nitidez fijan los extremos y se guardan en el navegador. El escenario ocupa el canvas completo en los tres modos. SDL cambia el buffer sin tocar el tamaño CSS y la aplicación lo difiere mientras haya dedos sobre el HUD o el canvas.

En una pantalla emulada de 844 × 390 y DPR 3 se verificaron buffers de 675 × 312, 844 × 390 y 1266 × 585. Las pruebas de `c_start2` y `c_apartment1` comprobaron el giro de la cámara durante un cambio solicitado con el dedo presionado, cinco gestos cortos y recuperación tras cancelar. También se verificó el selector desde el menú de pausa. La ejecución diagnóstica de escritorio verificó teclado y Pointer Lock. El ensayo de `c_nightmare` agotó 90 segundos esperando que apareciera el botón de salto. Esa escena queda pendiente de verificar en esta ronda.

### Tirones y perfil WebGL

En `c_start2`, Chromium/SwiftShader atribuyó 2,77 s de una muestra de 3,53 s a `WebGL.getError`, llamado desde el renderizador WASM. Una prueba A/B con la cvar del motor `gl_check_errors` a resolución fija 1266 × 585 eliminó esas muestras al desactivarla, pero el p95 mejoró en la primera comparación y empeoró en la segunda, tanto en `c_start2` como en `c_apartment1`. Se conservaron las comprobaciones originales. La atribución del perfil mide dónde esperó Chromium y el A/B no demuestra que eliminar esa espera sea una mejora de fluidez.

Los ajustes de resolución reducen el trabajo por píxel pero los picos persisten en SwiftShader. El rendimiento y los gestos del teléfono que reportó el problema siguen pendientes de medir físicamente. Las pruebas de esta ronda no requirieron recompilar WASM. Se reutilizó el cliente previamente compilado y los módulos de servidor y renderer de la publicación.

### GPU de Windows y reproducción

Edge con ANGLE/D3D11 identificó una NVIDIA GeForce RTX 4060 Laptop GPU (driver 32.0.16.1062). En `c_start2` con pantalla y tacto emulados, Nitidez registró mediana/p95 de 18,2/24,3 ms y Rendimiento de 12,1/18,1 ms. Pasaron el cambio de resolución desde el menú, el cambio diferido al soltar el dedo y los giros del personaje. Se trata de GPU física de escritorio con emulación táctil. El ensayo de `c_nightmare` con esta GPU también agotó los 90 segundos esperando el botón de salto.

Ejecutar `node tools/e2e/mobile_adaptive_resolution.mjs http://127.0.0.1:8140 c_start2 resolution` o usar `c_apartment1`. Los registros por mapa, las dos capturas de `c_start2` y el perfil se guardaron localmente en `build/validation/mobile-performance-20261115/adaptive`. Se conservó el intento inicial fallido del arnés A/B, cuya confirmación de órdenes requería activar `sv_cheats` en la sesión diagnóstica.

## Integración de publicación

La candidata se integró sobre `914b3ae` (manifiesto `963e89b2be10`). Conserva la decodificación DXT, el arreglo del diálogo táctil, la descarga anticipada sin montaje en móvil y los ajustes de frecuencia y viñeta. El selector adapta la preferencia anterior de resolución baja al perfil Rendimiento. El manifiesto integrado es `d0cbd1fc6dbd`. En el paquete del motor solo cambió el cliente, SHA-256 `cecee05b8547dea2fee075d0af73e2b3bb8e8f5fe66026ac04f3a4ad63d94d0b`.

Se comprobaron los hashes de los 97 archivos del manifiesto y la equivalencia de las 15 copias gzip. Pasó nuevamente la prueba de resolución y giros táctiles en `c_start2` y `c_apartment1` sirviendo el dist integrado.
