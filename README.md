# Cry of Fear Web

Port no oficial de **Cry of Fear** al navegador (WebAssembly + WebGL 2) sobre el motor de código
abierto [Xash3D FWGS](https://github.com/FWGS/xash3d-fwgs).

> **Estado: alfa.** El motor, el renderizado, el audio 3D y la carga de mapas funcionan en el
> navegador. Sobre la lógica de Half-Life (hlsdk-portable) ya hay parte de la de Cry of Fear
> (`game/cof-logic/cof/`): menú principal original, puertas `inter_door` con llaves, sprint con
> energía, barras de salud y energía, bolso (TAB), música, títulos de capítulo, objetivos y ayudas.
> Se empaquetan el Prólogo, el Preludio y el Capítulo 1 ("Lost in a city"). Faltan los enemigos,
> las armas de CoF y el resto de mecánicas.

**Controles** (los del juego original, `platform/game/cof_web.cfg`): **WASD** moverse, **SHIFT**
correr, **CTRL** o **C** agacharse, **E** usar, **TAB** bolso, **F** linterna, **Esc** menú.

## Créditos

- **Cry of Fear** © **Team Psykskallar** (Andreas Rönnberg y equipo) — <http://www.cry-of-fear.com>.
  Este port se publica **con permiso de su autor** y no es un producto oficial de Team Psykskallar.
- **Xash3D FWGS** — motor compatible con GoldSrc, por el equipo FWGS.
- **hlsdk-portable** — lógica de Half-Life portable, por el equipo FWGS a partir del SDK de Valve.
- **Emscripten**, **SDL2**, **stb_dxt** (Fabian Giesen / Sean Barrett) y el resto de dependencias
  listadas en [Licencias](#licencias).

## Condiciones de publicación

El permiso de Team Psykskallar para distribuir los assets va ligado a tres condiciones que este
proyecto se compromete a mantener:

1. **Créditos visibles** a Team Psykskallar en la página del juego (pie y panel "Acerca de").
2. **Código abierto**: todo el código del port se publica bajo GPL-3.0.
3. **Sin fines de lucro**: sin anuncios, donaciones, pagos, muros de pago ni monetización de ningún
   tipo, tampoco en forks que reutilicen los assets.

Quien haga un fork que incluya los assets de Cry of Fear necesita su propio permiso de
Team Psykskallar; el de este proyecto no se transfiere.

## Licencias

| Parte | Licencia |
|---|---|
| Código de este repositorio (herramientas, página web, parches, `game/cof-logic`) | [GPL-3.0](LICENSE) |
| Parches sobre Xash3D FWGS (`patches/xash3d/`) | GPL-3.0, como el motor |
| Parches sobre hlsdk-portable (`patches/hlsdk/`) | Licencia del Half-Life 1 SDK de Valve, como el SDK |
| Assets de Cry of Fear (mapas, modelos, texturas, sonidos, música) | © Team Psykskallar, todos los derechos reservados; **no** están bajo GPL y no se incluyen en este repositorio |
| `tools/texcomp/stb_dxt.h` | Dominio público |
| Emscripten · SDL2 | MIT/UIUC · zlib |

La lógica de juego provisional (hlsdk-portable) se carga como módulo separado del motor, igual que
en las distribuciones de Xash3D FWGS. La licencia del Half-Life 1 SDK solo permite distribuir gratis
y habla de juegos sobre el motor de Half-Life; usarla con Xash3D es lo habitual en la comunidad,
pero es una zona gris. El plan es que `game/cof-logic` la sustituya por código propio bajo GPL-3.0.

## Estructura

```
platform/web/      página, loader, Service Worker, post-proceso y shaders GLSL ES 3.00
patches/           cambios sobre Xash3D FWGS y hlsdk-portable (se aplican con tools/wsl/patches.sh)
game/cof-logic/    base de la reimplementación de la lógica de Cry of Fear (capa Win32 -> POSIX)
tools/             inventario y staging de assets, compresor de texturas, builds, ASan, e2e, despliegue
deploy/            cabeceras para Cloudflare Pages / Netlify / Vercel
```

Los assets no se versionan: `tools/stage_map.py` los toma de una instalación de Cry of Fear.

## Compilar

Requisitos: WSL2 con Ubuntu 24.04 y una instalación de Cry of Fear. Todo se ejecuta desde PowerShell.

```bash
wsl -d Ubuntu -- bash "<repo>/tools/wsl/setup_toolchain.sh"
```

```bash
wsl -d Ubuntu -- bash "<repo>/tools/wsl/patches.sh" apply
```

```bash
wsl -d Ubuntu -- bash "<repo>/tools/wsl/build_engine.sh"
```

```bash
wsl -d Ubuntu -- bash "<repo>/tools/wsl/build_game.sh"
```

```bash
wsl -d Ubuntu -- bash "<repo>/tools/wsl/build_tools.sh"
```

```bash
wsl -d Ubuntu -- python3 "<repo>/tools/stage_map.py" "<ruta de Cry of Fear>" c_cof_forest1 /root/cof-web/stage --texcomp /root/cof-web/build/tools/texcomp
```

```bash
wsl -d Ubuntu -- bash "<repo>/tools/wsl/package.sh"
```

```bash
wsl -d Ubuntu -- python3 "<repo>/tools/serve.py"
```

Después abre <http://localhost:8080/>. `<repo>` es la ruta de este repositorio vista desde WSL
(por ejemplo `/mnt/c/Users/<usuario>/Desktop/cof web`).

## Pruebas y depuración

- `tools/wsl/e2e.sh` — prueba de humo en Chromium sin interfaz: carga, caché del Service Worker,
  recarga y arranque sin conexión (instalar antes con `e2e_setup.sh`).
- `tools/wsl/build_native_asan.sh` + `leak_growth.sh` — ASan/LSan/UBSan en nativo y fugas que crecen
  con cada carga de mapa.
- `tools/wsl/build_asan.sh` — build web con ASan; en la página, `?debug=1` y `CoFDebug.leakTest()`.

## Publicar

`package.sh` deja en `~/cof-web/dist` todo lo necesario. Antes de subirlo:

- La página enlaza el código fuente desde "Acerca de", como exige la GPL. Por defecto apunta a
  <https://github.com/Putrefacto669/Cry-Of-Fear-PortWeb>; un fork debe cambiarlo con `COF_SOURCE_URL`.
- Copia la configuración de `deploy/` que corresponda al hosting (`_headers` para Cloudflare Pages y
  Netlify, `vercel.json` para Vercel).
- Comprueba límites y cabeceras con `tools/deploy_check.py` (y `--url` una vez publicado).

### GitHub Pages (despliegue actual)

`.github/workflows/pages.yml` publica la carpeta `dist/` del repositorio en cada push a `main` que la
cambie (o a mano desde Actions). No compila nada: `dist/` ya está versionado. Para activarlo una vez:
Settings → Pages → Build and deployment → Source: **GitHub Actions**. La web queda en
<https://putrefacto669.github.io/Cry-Of-Fear-PortWeb/>.

- Encaja en los límites: 822 MiB de sitio (máximo 1 GB) y ningún archivo de más de 100 MB.
- No hacen falta cabeceras: el motor no usa hilos (`"coi": false`). Los `.data` viajan como `.gz`
  que descomprime `sw.js`, porque Pages no comprime `application/octet-stream`.
- Todas las URL son relativas, así que funciona bajo la subruta `/Cry-Of-Fear-PortWeb/`.
- Límite blando de tráfico: 100 GB al mes, unos 300 jugadores nuevos (309 MiB cada uno la primera
  vez). Con más capítulos el sitio pasará de 1 GB y habrá que llevar los paquetes a otro sitio.

Cloudflare Pages ya no sirve tal cual: limita cada archivo a 25 MiB y 14 paquetes lo superan.
