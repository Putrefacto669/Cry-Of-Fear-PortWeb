# Validación independiente de Studio en Pages

Validación del 8 de noviembre de 2026 sobre el commit `f690bc6` y el manifiesto `511886d6b3de`.

Se descargaron seis archivos de Pages y se compararon sus SHA-256 con `dist/`. Coinciden el manifiesto, el Service Worker, los tres archivos de `packs/engine` y `xash3d.wasm`. La copia congelada también pasó el control de todos los recursos declarados por el manifiesto. El renderer en el paquete tiene SHA-256 `f440e4a16db8083f0ce61451f73d50ed33fa84a5e6a5efa47ae2d90ea3696500`. [Alpha pública](https://putrefacto669.github.io/Cry-Of-Fear-PortWeb/)

El parche raíz coincide con las fuentes canónicas revisadas según `git apply --reverse --check`. La curva aplica `pow(x, gamma)` y los colores de `renderfx` 101 y 167 coinciden con las constantes extraídas del cliente original. Los valores de esos dos efectos se cotejaron en el código. El inventario anterior encontró cero modelos Studio colocados con esos valores en los once BSP examinados.

El contrato independiente compila las funciones de iluminación y gamma extraídas de las fuentes congeladas. Pasaron **14 de 14 casos**, incluidos los tres fallos de la candidata `7befffc1bd8c`.

| Caso de gamma | Resultado |
|---|---:|
| Entrada 0,5 y gamma 2 | 0,25 |
| Entrada 0,25 y gamma 0,5 | 0,5 |
| Entrada 0,5, gamma 2, contraste 1,5 y brillo 0,01 | 0,385 |

Chromium 156.0.8078.4 y Firefox 157.0 ejecutaron los módulos de la copia congelada en localhost. Pasaron la lectura de frames, los cambios de mapa y el ciclo de linterna apagada, encendida y apagada. El servidor confirmó luz encendida antes de guardar y después de restaurar. El arnés de Chromium observó 271.673 llamadas de dibujo con escala 1 y 1.006 con escala 2, sin valores fuera de esos dos. Firefox usó la variante con instrumentación de dibujo desactivada. Las capturas conservadas corresponden al port.

`extras_interactions` pasó en la repetición independiente. Se verificaron la trampilla, el uso de la llave desde el bolso y la interacción de la puerta tras restaurar, con posicionamiento diagnóstico. El fallo previo de Claude y los timeouts previos de Firefox siguen documentados como intermitencias de causa desconocida. Esta pasada cubre los contratos seleccionados de la publicación.

Los hashes públicos y los resultados de esta etapa están en `build/validation/studio-published-511886d6b3de/`. Los contratos conservan sus límites anteriores de conexión y confirmación. Las ejecuciones de navegador usan un origen local y las verificaciones de Pages se limitan a los archivos descargados.
