# Entrada táctil y render en pantallas densas

Base pública `5929f63`, manifiesto `4e6cb6608ea9`. Candidata local `http://127.0.0.1:8141/?sw=0`.

## Observaciones

- Chromium con viewport 844 × 390 y DPR 3 configuró un buffer WebGL de 2079 × 1167 para un canvas CSS de 693 × 390. Con el límite móvil de DPR 1,5, el buffer pasó a 1039 × 583. Esto representa aproximadamente un 75 % menos de píxeles. El tiempo entre frames se midió con SwiftShader y varió entre ejecuciones. No es una medida de FPS en el teléfono reportado.
- En la versión pública, cuando se redujo la altura de 390 a 365 CSS px durante el gesto, el observador soltó los botones que seguían pulsados. La candidata difiere el registro de zonas hasta que se sueltan los contactos. Conserva la cancelación por pérdida de foco y al abrir menús.
- Mantener Agacharse y deslizar ese pulgar hacia arriba envía los comandos originales de agacharse y saltar. El otro pulgar puede seguir moviendo el joystick. Las pulsaciones duplicadas de salto mantienen su propio estado hasta que se suelta el último contacto.

## Verificación

En `c_start2` y `c_nightmare`, el servidor WebAssembly recibió simultáneamente avance, agacharse y salto. Los botones independientes siguieron pulsados durante un cambio de tamaño. Al cancelar, los bits volvieron a cero y la cámara respondió al arrastre siguiente. En Chromium de escritorio volvieron a pasar teclado y Pointer Lock.

Se verificó la combinación dentro de la pesadilla. Queda pendiente localizar y atravesar la ventana exacta con el dispositivo del usuario. No se modificaron las colisiones ni la física. El paquete publicado permanece en su versión anterior.

`tools/e2e/mobile_crouch_jump.mjs` reproduce la prueba. Registros en `build/validation/mobile-input-20261115`. El tope de DPR se aplica al empaquetar el runtime Emscripten y solo se selecciona en modo móvil.

La primera ejecución de la pesadilla alcanzó gameplay y pasó. La repetición agotó los 90 segundos con el HUD táctil aún oculto. El origen de esa espera y el cruce de la ventana siguen abiertos.

En horizontal el canvas móvil ocupa toda la vista. Verificado a 844 × 390, 932 × 430 y 667 × 375 CSS px con buffers de 1266 × 585, 1398 × 645 y 1000 × 562. El área táctil sigue las proporciones nuevas que recibe Xash. Tras cambiar entre los tres tamaños pasaron avance, salto agachado, cancelación y cámara. Se conservan las capturas y los intentos anteriores.
