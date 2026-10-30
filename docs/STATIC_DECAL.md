# env_static_decal

Calcomanías fijas de los mapas: hojas en el suelo, grafitis y carteles en las paredes. En el
capítulo 1 hay 63 (c_intro 4, c_nightmare 3, c_start 28, c_start2 28); antes del port el motor
decía `No spawn function for "env_static_decal"` y las paredes salían limpias.

## Contrato (SDK 1.3 de Team Psykskallar, `cry_of_fear.fgd`)

| Clave | Uso |
|---|---|
| `netname` | Nombre del grupo en `gfx/decals/decalinfo.txt` |
| `skin` | Dirección donde buscar la superficie: 0 automática, 1 −X, 2 +X, 3 −Y, 4 +Y, 5 −Z, 6 +Z |
| `angles` | Aparece en 28 entidades de c_start, pero no está en el FGD: se ignora |

`decalinfo.txt` agrupa texturas de `gfx/decals/*.tga`: uno o más nombres de grupo y un bloque
`{ textura ancho alto solapamiento }` por variante (ancho y alto en unidades del mundo). Un grupo
con varias líneas elige una al azar.

Las imágenes son TGA de 24 bits sin alfa con fondo gris 128: se dibujan con mezcla 2× modulate
(`GL_DST_COLOR, GL_SRC_COLOR`). El gris deja la pared igual, lo oscuro la oscurece y lo claro la
aclara, y la iluminación del mapa se conserva porque se multiplica sobre lo ya dibujado.

## Implementación

- Servidor, `game/cof-logic/cof/static_decal.cpp`:
  - Al aparecer, elige la variante del grupo y la guarda en la partida, así que una partida
    cargada muestra la misma.
  - Cada vez que se reinicia el HUD (mapa nuevo, partida cargada) la reenvía con el mensaje
    `CoFDecal`: punto de la superficie, entidad tocada, textura, ancho y alto.
  - La superficie se busca con trazas de hasta 64 unidades en las direcciones permitidas y se
    queda la más cercana.
  - La llamada está en `CBasePlayer::UpdateClientData`, junto a `CoF_SendEnvpos`
    (`patches/hlsdk`).
- Cliente, `game/cof-logic/client/cof_decals.cpp`:
  - Pide la RenderAPI de Xash exportando `HUD_GetRenderInterface`, sin sustituir ninguna función
    del renderer.
  - Carga `gfx/decals/<textura>.tga` y la dispara con `R_FireCustomDecal`. La escala es el ancho
    de la textura entre el ancho de `decalinfo.txt`: 512 px / 128 unidades = 4.
  - Usa `FDECAL_PERMANENT`, para que los agujeros de bala no las desplacen, y `FDECAL_DONTSAVE`,
    porque el servidor las vuelve a mandar.
  - No repite una calcomanía que ya está en el nivel actual.
- Motor, `patches/xash3d`, `ref/gl/gl_decals.c`: `DrawSingleDecal` usa la mezcla 2× para las
  texturas cuyo nombre empieza por `gfx/decals/`.
- Paquetes, `tools/stage_map.py`: `decalinfo.txt` va en boot y cada mapa lleva solo las texturas
  de sus grupos.

## Diferencias con el original

- La orientación de la textura sale de los ejes de textura de la superficie (`R_DecalFixMirroring`);
  el original puede girarlas de otra forma.
- Si no hay superficie a 64 unidades, la calcomanía no se pone. El alcance del original no se
  conoce.
