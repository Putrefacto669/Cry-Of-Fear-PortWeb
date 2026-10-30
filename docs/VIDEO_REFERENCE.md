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
| `c_nightmare` | 5:55 | Cara del screamer (`headdy`) en primer plano, **muy oscura** | Screamer final con grito | Comprobado que aparece | En el port la cara salió **muy iluminada**. Hipótesis: iluminación del modelo o la luz parpadeante (`multiljusfl1`); la captura del port se hizo con noclip y otra posición | **Alta** (fidelidad visual) |
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
| Cara del screamer mucho más iluminada en el port | Fidelidad visual | Observada, causa sin demostrar | Repetir en el port sin noclip desde la posición del jugador y medir la luz del modelo (`env_model` y luces dinámicas) |
| Cono de luz del móvil | Jugabilidad / fidelidad | Sin comparar | Capturar el port en las escaleras de `c_start` y comparar con 9:00 |
| Animación del reflejo en el espejo | Fidelidad | Sin confirmar | Capturas seguidas en el port al disparar `spot9` |
| Escena del gato y estación de tren | Fidelidad | Sin verificar | Recorrer `c_intro` y el inicio de `c_nightmare` en el port |
| Aviso «Press TAB…» | Jugabilidad (orientación) | Sin verificar | Comprobar `cof_hint` al recoger la navaja |

No se cambió código a partir de este documento: cada diferencia necesita confirmarse primero en el
motor.

## Limitaciones

- Muestreo por puntos (cada 15–90 s, más denso cerca de eventos). Pueden faltar escenas breves.
- El vídeo no indica la versión del juego; el texto en inglés y el aviso de inventario sugieren la
  versión de Steam, sin confirmar.
- La comparación de iluminación desde vídeo comprimido es aproximada: sirve para señalar qué
  investigar, no para dar valores.
