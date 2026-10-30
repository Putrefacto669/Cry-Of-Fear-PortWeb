# Referencia audiovisual: recorrido completo del juego original

Fuente: «Cry of Fear — FULL GAME Walkthrough Gameplay No Commentary», canal Gamer Max Channel,
<https://youtu.be/8P3wg4ENBZY>. Duración: 16 197 s (4 h 29 min 57 s). Sin narración ni capítulos en
la descripción.

Este documento complementa las pruebas del motor; no las sustituye. Ni el vídeo ni sus fotogramas
forman parte del producto ni se guardan en el repositorio.

## Cómo se obtuvo

- **Capacidad real.** El navegador integrado reproduce el vídeo. Se posicionó el elemento `<video>`
  en segundos concretos (`currentTime`), se pausó y se capturó el área del reproductor a calidad
  `hd1080` reducida para el análisis. No se analizó el audio.
- **Marcas de tiempo.** Cada marca de la tabla corresponde a un fotograma visto en ese segundo
  (±1 s por el posicionamiento). Los fotogramas son oscuros y están comprimidos: los detalles finos
  (texto pequeño, iluminación) tienen menos confianza que los hechos de escena.
- **Capítulos.** Un comentario del vídeo (aportado por el usuario) da: cap. 1 2:10, cap. 2 44:17,
  cap. 3 1:05:19, cap. 4 1:43:49, cap. 5 3:07:20, cap. 6 3:17:52, cap. 7 3:59:48, combate final
  4:19:49, conclusión 4:23:21. **No verificados**, salvo el inicio: a 2:00 ya empieza el preludio
  (`c_nightmare`) y el capítulo 1 del port (`c_start`) empieza a 6:05.
- **Mapas.** La correspondencia vídeo ↔ BSP se hizo con el contenido de cada mapa: `c_intro` usa
  `models/cutscene/kattscene.mdl` (el gato) y cambia a `c_nightmare`; `c_nightmare` usa
  `models/nightmare/1-4.mdl`, `headdy.mdl` y cambia a `c_start`.

Leyenda del estado del port: **comprobado** (visto funcionando en el port durante esta sesión),
**implementado** (existe código, sin comparación visual con el vídeo), **sin verificar**.

## Prólogo y preludio

| Mapa | Marca | Evento observado en el vídeo | Comportamiento esperado | Estado en el port | Diferencia comprobada | Prioridad |
|---|---|---|---|---|---|---|
| — | 0:40 | Pantalla «INTRODUCTION» con texto | Texto de introducción antes de jugar | Implementado (`hud.js`, mensaje `COF/HUD INTRO`) | — | Baja |
| `c_intro` | 1:00 | Gato tras unos barrotes, de noche | Escena del gato del prólogo | Sin verificar | — | Media |
| `c_nightmare` | 2:00–2:15 | Estación de tren de noche, vagón | Inicio de la cinemática del preludio | Comprobado en parte: la cinemática corre ~2 min; la estación no se identificó en el port | — | Media |
| `c_nightmare` | 2:45 | Interior del tren | Cinemática | Sin verificar | — | Baja |
| `c_nightmare` | 3:20 | Calle con farolas, Simon caminando | Cinemática con cámaras de `nightmulti` | Comprobado: misma calle y farolas | — | — |
| `c_nightmare` | 4:40 | Habitación con puerta y ventana | Se entrega la cámara (`cof_giveitems weapon_camera`) | Comprobado | — | — |
| `c_nightmare` | 5:00, 5:10, 5:35 | X blancas en la oscuridad, Simon con la cámara | Fotografiar las X (`camera_spot_trigger`) | Comprobado tras `f0f3d86` (antes estaban ocultas) | — | — |
| `c_nightmare` | 5:20 | Marco del espejo | Escena del espejo (`spot9`) | Comprobado | — | — |
| `c_nightmare` | 5:28 | Reflejo de Simon dentro del espejo, iluminado | `nightmare/4.mdl` con `scripted_sequence` | Comprobado que aparece y que el espejo (`break8w`) se rompe | No se pudo confirmar si la animación del golpe se ve completa en el port | Media |
| `c_nightmare` | 5:42 | Puerta abierta con luz al fondo | La foto abre la puerta donde estaba la X y enciende la luz | Comprobado | — | — |
| `c_nightmare` | 5:55 | Cara del screamer (`headdy`) en primer plano, muy oscura, **llena el encuadre** | Screamer final con grito | Comprobado que aparece, oscura como en el original (sección «Investigación del screamer») | La cara se ve **más pequeña** en el port (≈24° frente a ≈52° de ancho angular). Causa sin demostrar | Media |
| `c_nightmare` | 5:58–6:05 | Fundido a negro, pantalla de carga con las barras | Cambio a `c_start` | Comprobado | — | — |

## Inicio del capítulo 1

| Mapa | Marca | Evento observado en el vídeo | Comportamiento esperado | Estado en el port | Diferencia comprobada | Prioridad |
|---|---|---|---|---|---|---|
| `c_start` | 6:20 | Simon en el suelo del callejón, subtítulo «How did I get here?» | Cinemática de despertar | Comprobado (subtítulo en español) | — | — |
| `c_start` | 6:40 | Simon junto a una pared con grafitis | Grafitis como calcomanías (`env_static_decal`) | Comprobado tras `b182b0b` (antes no había grafitis) | — | — |
| `c_start` | 7:00 | Navaja en mano; aviso «Press TAB to access your inventory» | Pista de `cof_hint` | Sin verificar si el aviso aparece | — | Media |
| `c_start` | 7:40 | Móvil en la mano con la pantalla encendida y un mensaje | `weapon_mobile` + SMS (`phone_messages.txt`) | Implementado | Sin comparar | Media |
| `c_start` | 9:00 | Escaleras iluminadas por el móvil con un cono claro | El móvil hace de linterna | Implementado (`FlashlightTurnOn` + cono de `postfx.js`) | Sin comparar intensidad ni forma del cono | **Alta** (jugabilidad: es la única luz) |
| `c_start` | 11:40 | Lectura de una nota (papel sobre fondo oxidado) | Visor de notas | Implementado (`hud.js`) | Sin comparar | Baja |
| `c_start` | 13:20 | Calle con edificios y una bicicleta, móvil encendido | Exterior de `c_start` | Sin verificar | — | Baja |
| — | 16:40 | Pasillo con sangre en el suelo | Calcomanías de sangre | Sin verificar | — | Media |

## Diferencias clasificadas

| Diferencia | Tipo | Estado | Siguiente paso |
|---|---|---|---|
| Cara del screamer más pequeña en el port | Fidelidad visual | Observada, causa sin demostrar (ver abajo) | Capturar el port a 16:9 y repetir fotogramas del vídeo entre 5:54 y 5:56 |
| Cono de luz del móvil | Jugabilidad / fidelidad | Sin comparar | Capturar el port en las escaleras de `c_start` y comparar con 9:00 |
| Animación del reflejo en el espejo | Fidelidad | Sin confirmar | Capturas seguidas en el port al disparar `spot9` |
| Escena del gato y estación de tren | Fidelidad | Sin verificar | Recorrer `c_intro` y el inicio de `c_nightmare` en el port |
| Aviso «Press TAB…» | Jugabilidad (orientación) | Sin verificar | Comprobar `cof_hint` al recoger la navaja |

No se cambió código a partir de este documento: cada diferencia necesita confirmarse primero en el
motor.

## Investigación del screamer (`c_nightmare`, 5:55)

Capturas del port en `build/validation/screamer-2026-10-30/` (renders propios, sin posproceso:
`fx=0`), tomadas sin noclip disparando `multispotea`, la lógica del propio nivel.

**Hechos:**

- El nivel teletransporta al jugador a `beforetelet` (`-739,-1416,-320`, ángulo 270) al empezar el
  screamer. En el port, `viewpos` da `-738.97,-1415.97,-255.94`, ángulo 270.
- El `CCofTeleport` del `hl.dll` original (función de la vtable en `0x100a7990`, Ghidra, solo
  lectura) hace lo mismo: origen del destino con `z − mins.z + constante`, ángulos del destino en
  `angles` y `v_angle`, `fixangle` y velocidad a cero. La posición de la cámara es la misma.
- `headdy.mdl` tiene dos secuencias: `idle` (51 fotogramas a 1 fps) y `action` (51 a 30 fps, 1,7 s).
  Ninguna tiene movimiento lineal y la caja de `action` apenas cambia: la cara no se acerca a la
  cámara.
- Vista como jugador, la cara está **oscura** en el port, igual que en el original. La primera
  impresión de «muy iluminada» venía de una captura con noclip desde otra posición: **descartada**.
- Tamaño: en el port la cara ocupa ≈46 % de la altura del lienzo; en el vídeo llena el encuadre.
  Estimado con FOV Hor+ (90° para 4:3): ≈24° de ancho angular en el port frente a ≈52° en el vídeo.
- `client.dll` original: FOV por defecto 90; el mensaje `SetFOV` con 2 da 60° y con 3 da 30°, con
  transición suave; el resultado se multiplica por `cl_fovmultiplier`. En `hl.dll` las únicas
  escrituras literales en el FOV del jugador (`m_iFOV`) son reinicios a 0.

**Hipótesis no demostradas:** un zoom de cámara que no se ha encontrado en el código; un
`cl_fovmultiplier` menor que 1 en la configuración de quien grabó el vídeo (no verificable desde el
vídeo); diferencias de proporción del lienzo en las capturas del port (2,8:1, no 16:9).

**Decisión:** no se cambia código. No hay un defecto demostrado.

**Nota sobre las capturas sin interfaz:** en ellas el modelo de la cámara en mano sale blanco, sin
textura. En las capturas del mismo día en el navegador de la app (GPU real) la cámara y las manos sí
tenían textura, así que se atribuye a SwiftShader, el renderizador por software de las pruebas, y no
se considera un fallo del port. Esto puede afectar también a la observación de «manos blancas tras
cargar» de la auditoría, que se hizo con el mismo renderizador; está sin comprobar.

## Limitaciones

- Muestreo por puntos (cada 15–90 s, más denso cerca de eventos). Pueden faltar escenas breves.
- El vídeo no indica la versión del juego; el texto en inglés y el aviso de inventario sugieren la
  versión de Steam, sin confirmar.
- La comparación de iluminación desde vídeo comprimido es aproximada: sirve para señalar qué
  investigar, no para dar valores.
