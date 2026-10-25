#!/usr/bin/env python3
"""
stage_map.py - Copia a un directorio de staging un mapa de Cry of Fear y todo lo que referencia
(WADs, cielo, modelos, sprites, sonidos), más el conjunto mínimo de arranque del motor.

El directorio resultante se empaqueta con file_packager de Emscripten (ver tools/wsl/package.sh).

    python3 stage_map.py <cof_root> <map> <stage_dir>          # boot + mapa
    python3 stage_map.py <cof_root> --boot-only <stage_dir>    # solo arranque
    python3 stage_map.py <cof_root> <map> <stage_dir> --texcomp ~/cof-web/build/tools/texcomp
        # además: texturas del mapa como DDS BC1/BC3 en materials/ y solo los WADs que sigan
        # haciendo falta (agua/cielo o texturas que no se pudieron convertir)

Estructura de salida:
    <stage_dir>/boot/cryoffear/...      archivos comunes (liblist.gam, gfx.wad, resource/...)
    <stage_dir>/maps/<map>/cryoffear/... dependencias exclusivas del mapa
"""
from __future__ import annotations

import argparse
import re
import shutil
import struct
import subprocess
import sys
from pathlib import Path, PureWindowsPath

GAMEDIR = "cryoffear"
BSP_VERSION = 30
LUMP_ENTITIES = 0

# Arranque: lo que el motor y el menú necesitan antes de cargar cualquier mapa.
# gfx/bumpmaps (486 MiB) y gfx/vgui (147 MiB) se excluyen: los usa el renderer propio de CoF.
# config.cfg, user.scr y settings.scr no se copian: son del usuario y el motor los genera en /rwdir.
# valve.rc llama a stuffcmds: sin él no se ejecutan los +comandos (+map) de la línea de comandos.
BOOT_FILES = ["liblist.gam", "valve.rc", "delta.lst","titles.txt", "skill.cfg", "autoexec.cfg", "server.cfg",
              "listenserver.cfg", "menu_settings.txt", "sprcache", "coficon.tga", "coficon_big.tga",
              "640_textscheme.txt", "800_textscheme.txt", "1024_textscheme.txt",
              "1152_textscheme.txt", "1280_textscheme.txt", "1600_textscheme.txt",
              "gfx.wad", "decals.wad", "tempdecal.wad", "cached.wad",
              "gfx/palette.lmp", "gfx/palette.bmp", "gfx/colormap.lmp", "gfx/conback.lmp",
              "gfx/flashlight.tga"]  # cookie de la linterna para platform/web/postfx.js
BOOT_DIRS = ["gfx/shell", "resource", "sprites", "events"]

SKY_SUFFIXES = ("rt", "bk", "lf", "ft", "up", "dn")
ENT_RE = re.compile(r'"([^"]*)"\s+"([^"]*)"')


def read_entities(bsp: Path) -> list[dict[str, str]]:
    with bsp.open("rb") as f:
        version, = struct.unpack("<i", f.read(4))
        if version != BSP_VERSION:
            raise ValueError(f"{bsp.name}: BSP v{version}, se esperaba v{BSP_VERSION}")
        f.seek(4 + LUMP_ENTITIES * 8)
        ofs, size = struct.unpack("<ii", f.read(8))
        f.seek(ofs)
        text = f.read(size).decode("latin-1").rstrip("\0")
    ents = []
    for block in text.split("}"):
        if "{" in block:
            ents.append(dict(ENT_RE.findall(block)))
    return ents


def map_dependencies(game: Path, bsp: Path) -> tuple[set[str], list[str]]:
    """Devuelve (rutas relativas al gamedir que existen, referencias no encontradas)."""
    deps, missing = {f"maps/{bsp.name}"}, []
    ents = read_entities(bsp)
    world = ents[0] if ents else {}

    for w in filter(None, world.get("wad", "").split(";")):
        deps.add(PureWindowsPath(w).name.lower())
    sky = world.get("skyname")
    if sky:
        deps.update(f"gfx/env/{sky}{s}.tga" for s in SKY_SUFFIXES)

    for ent in ents:
        for value in ent.values():
            v = value.replace("\\", "/").lower()
            if v.endswith((".mdl", ".spr")):
                deps.add(v)
            elif v.endswith(".wav"):
                deps.add(v if v.startswith("sound/") else f"sound/{v}")
    # Mapas con el mismo nombre base: .res (lista de recursos) y overview
    for extra in (f"maps/{bsp.stem}.res", f"maps/{bsp.stem}.txt"):
        deps.add(extra)

    found = set()
    for d in deps:
        p = find_ci(game, d)
        if p:
            found.add(p.relative_to(game).as_posix())
        elif not d.endswith((".res", ".txt")):
            missing.append(d)
    return found, sorted(missing)


_ci_cache: dict[Path, dict[str, str]] = {}


def find_ci(root: Path, rel: str) -> Path | None:
    """Búsqueda insensible a mayúsculas (los mapas de GoldSrc mezclan mayúsculas libremente)."""
    cur = root
    for part in rel.split("/"):
        if cur not in _ci_cache:
            try:
                _ci_cache[cur] = {c.name.lower(): c.name for c in cur.iterdir()}
            except (FileNotFoundError, NotADirectoryError):
                return None
        name = _ci_cache[cur].get(part.lower())
        if name is None:
            return None
        cur = cur / name
    return cur if cur.is_file() else None


def copy_set(game: Path, rels: set[str], dest: Path) -> int:
    total = 0
    for rel in sorted(rels):
        src, dst = game / rel, dest / GAMEDIR / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        if not dst.exists() or dst.stat().st_size != src.stat().st_size:
            shutil.copy2(src, dst)
        total += src.stat().st_size
    return total


def compress_textures(texcomp: Path, game: Path, bsp_rel: str, dest: Path) -> set[str] | None:
    """Escribe los DDS en dest/cryoffear/materials/ y devuelve los WADs (en minúsculas) que el
    motor sigue necesitando. None si alguna textura no se encontró: entonces hay que dejar los WADs."""
    out = subprocess.run([str(texcomp), str(game), bsp_rel, str(dest / GAMEDIR)],
                         capture_output=True, text=True)
    for line in out.stderr.splitlines():
        print(f"  {line}")
    if out.returncode not in (0, 3):
        raise RuntimeError(f"texcomp falló ({out.returncode})")
    stats = dict(kv.split("=", 1) for kv in out.stdout.split())
    print(f"  texturas: {stats['converted']} a DDS, VRAM {stats['rgba_mib']} MiB RGBA -> {stats['dds_mib']} MiB"
          f" ({stats['skipped']} agua/cielo, {stats['missing']} sin encontrar)")
    if out.returncode == 3:
        return None
    return {w.lower() for w in stats["wads_needed"].split(",") if w}


def boot_set(game: Path) -> set[str]:
    rels = {f for f in BOOT_FILES if (game / f).is_file()}
    for d in BOOT_DIRS:
        rels.update(p.relative_to(game).as_posix() for p in (game / d).rglob("*") if p.is_file())
    return rels


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("root", type=Path, help="Carpeta raíz de Cry of Fear")
    ap.add_argument("map", nargs="?", help="Nombre del mapa sin .bsp")
    ap.add_argument("stage", type=Path)
    ap.add_argument("--boot-only", action="store_true")
    ap.add_argument("--texcomp", type=Path, help="binario de tools/texcomp: convierte texturas a DDS")
    args = ap.parse_args()

    game = args.root / GAMEDIR
    boot = boot_set(game)
    size = copy_set(game, boot, args.stage / "boot")
    print(f"boot: {len(boot)} archivos, {size / 2**20:.1f} MiB")

    if args.boot_only:
        return 0
    if not args.map:
        ap.error("falta el mapa (o usa --boot-only)")
    bsp = find_ci(game, f"maps/{args.map}.bsp")
    if not bsp:
        print(f"No existe maps/{args.map}.bsp", file=sys.stderr)
        return 2
    deps, missing = map_dependencies(game, bsp)
    deps -= boot
    map_stage = args.stage / "maps" / args.map
    if map_stage.exists():
        shutil.rmtree(map_stage)  # que no queden WADs o DDS de una pasada anterior

    if args.texcomp:
        needed = compress_textures(args.texcomp, game, bsp.relative_to(game).as_posix(), map_stage)
        if needed is not None:
            wads = {d for d in deps if d.endswith(".wad")}
            dropped = {w for w in wads if Path(w).name.lower() not in needed}
            deps -= dropped
            mib = sum((game / w).stat().st_size for w in dropped) / 2**20
            print(f"  WADs fuera del paquete: {len(dropped)} ({mib:.1f} MiB)")

    size = copy_set(game, deps, map_stage)
    print(f"{args.map}: {len(deps)} archivos, {size / 2**20:.1f} MiB")
    for m in missing:
        print(f"  ! referencia no encontrada: {m}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
