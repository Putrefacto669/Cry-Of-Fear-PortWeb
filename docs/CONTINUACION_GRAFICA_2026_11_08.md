# Continuación de fidelidad gráfica — 8 de noviembre de 2026

Repositorio de trabajo: `C:\Users\josue\OneDrive\Desktop\Cry Of Fear Web Alpha Version\Cry-Of-Fear-Port-Web`.

Se retomó la tarea después de la interrupción. La base sigue en `12963131db259e3f0c6b74d2932ee3d2f317326b`; se conservaron todos los cambios sin confirmar y los resultados anteriores. Esta continuación no autoriza ni realiza publicación, commits, pushes o cambios en `dist/`.

## Estado recuperado

La candidata privada `66cf767ece53` incorpora la niebla lineal comprobada en `client.dll` y los pesos originales de la ruta flotante de escala de grises. El cliente y renderer se compilaron con Emscripten y se verificaron dentro del navegador. El servidor, los paquetes de mapas y el motor principal conservan sus bytes anteriores.

El informe completo se encuentra en [FIDELIDAD_GRAFICA_2026_11_07.md](FIDELIDAD_GRAFICA_2026_11_07.md), y la auditoría previa en [AUDITORIA_GRAFICA_ORIGINAL_2026_11_07.md](AUDITORIA_GRAFICA_ORIGINAL_2026_11_07.md).

Los resultados de ejecución conservados son:

- Gris: 18/18 regresiones satisfactorias en la candidata intermedia.
- Niebla: 17/18 satisfactorias en la primera ejecución final. La prueba de voces falló antes de conectar; su repetición pasó, incluida la señal de voz antes y después de cargar.
- Niebla real: distancias, colores, apagado y restauración comprobados mediante los shaders utilizados por las llamadas de dibujo.
- Ropa: menú y módulos comprobados en Chromium; doce opciones, desbloqueos y persistencia comprobados en Firefox tras repetir un inicio fallido.
- Capturas: 36 imágenes del port con framebuffer comprobado de 800×600. No constituyen pares nativo/port equivalentes.

El fallo intermitente de arranque sigue sin causa demostrada. No se aumentaron los límites ni se descartaron los intentos fallidos.

## Verificación tras la interrupción

Se repitió la auditoría de integridad y correspondencia con las fuentes, sin repetir las suites de navegador cuyos resultados ya estaban completos. El auditor ahora admite nombres nuevos de salida y rechaza sobrescribir un resultado anterior.

Evidencia de esta continuación:

- `build/validation/graphics-2026-11-07/windows-check-2026-11-08.json`.
- `build/validation/graphics-2026-11-07/final-audit-2026-11-08.json`.

La comprobación recorre los hashes del manifiesto, las parejas gzip/datos, las DLL y BSP originales, los módulos utilizados por las pruebas, las cuatro instancias `multiscene1`, la aplicabilidad del parche sobre la fuente compilada y la ausencia de cambios locales en `dist/`. Los archivos históricos de verificación permanecen intactos.

## Pendientes y orden de trabajo

1. **Lightmaps y materiales:** reconstruir la composición de capas 61/62/63 tanto para superficies como para iluminación de modelos. Se localizaron 350 recursos únicos de normales/especular asociados a las cinco escenas; su consumidor gráfico todavía no está implementado.
2. **Referencia nativa:** Steam ya pudo iniciar el original legítimamente. Falta una forma comprobada de registrar posición, orientación y fase para obtener pares comparables de las cinco escenas. No controlar la partida del usuario mientras la esté jugando.
3. **Postprocesado:** completar activación y orden de viñeta y blur. Conservar el ruido original y evitar superponer aproximaciones.
4. **Escaleras y eventos:** la animación de `cof_ladder_manager` sigue sustituida por un fundido y traslado. Las 20 X de `c_nightmare` tienen destinos definidos; aún falta validar sus apariciones en recorrido natural. Las notas sobre cuerda, apartamentos y baños están registradas, sin dar por resuelta su progresión.

No se declara terminada la fidelidad gráfica completa. La candidata permanece en `/root/cof-audits/graphics-20261107/candidate-linear-fog`; no se ha instalado en la distribución publicada.
