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
    <stage_dir>/mp3/...                 música (ambient_fmodstream): va suelta en dist/mp3/ y el
                                        navegador la reproduce en streaming, fuera de los paquetes
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
              # HUD/cinematics (platform/web/hud.js): cof_logo/cof_introduction messages
              "gfx/vgui/640_logo_logo.tga", "gfx/vgui/640_logo_andreas.tga",
              "gfx/vgui/640_logo_james.tga", "gfx/vgui/640_logo_jordy.tga",
              "gfx/vgui/640_logo_stig.tga", "gfx/vgui/640_logo_lasse.tga",
              "gfx/vgui/640_logo_aina.tga",
              "gfx/vgui/introductions/english/english_sp.TGA",
              "gfx/vgui/introductions/english/english_doc.TGA",
              "gfx/vgui/introductions/english/english_coop.TGA",
              "gfx/vgui/introductions/spanish/spanish_sp.TGA",
              "gfx/vgui/introductions/spanish/spanish_doc.TGA",
              # bolso, salud y energía (hud.js)
              "gfx/vgui/640_inventory.tga", "gfx/vgui/640_healthbar.tga",
              "gfx/vgui/640_healthbar_bar.tga", "gfx/vgui/640_healthbar_barempty.tga",
              "gfx/vgui/640_staminabar.tga", "gfx/vgui/640_staminabar_bar.tga",
              "gfx/vgui/640_staminabar_barempty.tga",
              "sound/items/gunpickup2.wav",  # recoger armas (player_cof.cpp)
              "models/ammo/clip.mdl",  # ammo_glock (weapons_cof.cpp)
              "models/tape_recorder.mdl",  # grabadoras para guardar (puzzles.cpp)
              "txtfiles/hints.txt",  # textos de cof_hint y cof_objective (hud.js)
              # subtítulos, SMS, notas, contraseñas y teclado (puzzles.cpp, hud.js)
              "txtfiles/subtitles.txt", "txtfiles/phone_messages.txt",
              "txtfiles/languages/spanish/subtitles.txt", "txtfiles/languages/spanish/hints.txt",
              "txtfiles/languages/spanish/phone_messages.txt", "gfx/vgui/keypad3.tga",
              "gfx/vgui/640_pass1.tga", "gfx/vgui/640_pass2.tga", "gfx/vgui/640_pass3.tga",
              "gfx/vgui/640_pass4.tga", "gfx/vgui/640_pass5.tga", "gfx/vgui/640_pass6.tga",
              "gfx/vgui/640_pass7.tga", "gfx/vgui/640_pass8.tga",
              # menú principal original (hud.js)
              "gfx/vgui/menu_logo.tga", "gfx/vgui/640_difficulty.tga",
              "gfx/vgui/menu/newgame.TGA", "gfx/vgui/menu/newgame_mo.TGA",
              "gfx/vgui/menu/loadgame.TGA", "gfx/vgui/menu/loadgame_mo.TGA",
              "gfx/vgui/menu/options.TGA", "gfx/vgui/menu/options_mo.TGA",
              "gfx/palette.lmp", "gfx/palette.bmp", "gfx/colormap.lmp", "gfx/conback.lmp",
              "gfx/flashlight.tga"]  # cookie de la linterna para platform/web/postfx.js
# inventoryitems/*.txt describen cada objeto del bolso (nombre, imágenes, sonido de recogida)
BOOT_DIRS = ["gfx/shell", "resource", "sprites", "events", "inventoryitems",
             "gfx/vgui/items", "gfx/vgui/weapons", "gfx/vgui/hints",
             # armas de weapons_cof.cpp: el jugador las lleva de un mapa a otro
             "models/weapons/switchblade", "models/weapons/glock", "models/weapons/syringe",
             "models/weapons/mobile", "sound/weapons/switchblade", "sound/weapons/glock",
             "sound/weapons/syringe", "sound/weapons/mobile", "models/weapons/camera",
             "sound/weapons/camera", "notes"]
# Enemigos de game/cof-logic/cof/monsters.cpp: el modelo y los sonidos los pone el código, no el BSP.
# Se buscan por classname y por la "monstertype" de los monstermaker.
MONSTER_ASSETS = {
    "monster_slower": ["models/slower.mdl", "sound/slower"],
    "monster_slower3": ["models/slower3.mdl", "sound/slower3", "sound/slower"],
    "monster_faster": ["models/faster.mdl", "sound/faster"],
    "monster_child": ["models/children.mdl", "sound/children"],
    "monster_baby": ["models/baby.mdl", "sound/baby"],
    "monster_crazybitch": ["models/crazywoman.mdl", "sound/crazylady"],
    "monster_bosschainsaw": ["models/chainsawguy.mdl", "sound/boss/sawer"],
    # puzzles.cpp
    "tape_recorder": ["models/tape_recorder.mdl"],
}
ITEM_FIELD_RE = re.compile(r'"([^"]+)"\s*\{\s*data\s+"([^"]*)"\s*\}')

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


def map_music(game: Path, bsp: Path) -> set[Path]:
    """mp3 de ambient_fmodstream y de la clave "music" de inter_door; el original los busca en mp3/
    y la música del menú en media/."""
    out = set()
    for ent in read_entities(bsp):
        names = [ent.get("music", "")]
        if ent.get("classname") == "ambient_fmodstream":
            names.append(ent.get("message", ""))
        for name in names:
            if not name.lower().endswith(".mp3"):
                continue
            p = find_ci(game, f"mp3/{name}") or find_ci(game, f"media/{name}")
            if p:
                out.add(p)
    return out


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
        # armas de CoF que se recogen del suelo: el modelo no está en el BSP (player_cof.cpp)
        cls = ent.get("classname", "")
        for monster in (cls, ent.get("monstertype", "")):
            for rel in MONSTER_ASSETS.get(monster, []):
                d = game / rel
                if d.is_dir():
                    deps.update(f.relative_to(game).as_posix() for f in d.iterdir() if f.is_file())
                else:
                    deps.add(rel)
            if monster in MONSTER_ASSETS:
                deps.update(f"sound/common/npc_step{i}.wav" for i in range(1, 5))
        if cls.startswith("weapon_"):
            short = cls[len("weapon_"):]
            deps.add(f"models/weapons/{short}/w_{short}.mdl")
        for value in ent.values():
            v = value.replace("\\", "/").lower()
            if v.endswith((".mdl", ".spr")):
                deps.add(v)
            elif v.endswith(".wav"):
                deps.add(v if v.startswith("sound/") else f"sound/{v}")
            elif v.startswith("inventoryitems/") and v.endswith(".txt"):
                deps.update(item_dependencies(game, v))
            elif v.endswith(".aur"):
                # sistema de partículas (atmosphere.cpp): el archivo y su sprite
                deps.add(v)
                aur = find_ci(game, v)
                m = aur and re.search(r'"sprite"\s+"([^"]+)"', aur.read_text(encoding="latin-1"))
                if m:
                    deps.add(m.group(1).lower())
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


def item_dependencies(game: Path, rel: str) -> set[str]:
    """Modelo y sonido de recogida de un objeto (inventoryitems/*.txt); las imágenes van en boot."""
    p = find_ci(game, rel)
    if not p:
        return set()
    fields = dict(ITEM_FIELD_RE.findall(p.read_text(encoding="latin-1")))
    out = set()
    if fields.get("3dmdl"):
        out.add(fields["3dmdl"].lower())
    if fields.get("pickup_sound"):
        out.add(f"sound/{fields['pickup_sound'].lower()}")
    return out


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
                         capture_output=True, text=True, encoding="latin-1")  # nombres de textura de los WAD
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
    music = map_music(game, bsp)
    (args.stage / "mp3").mkdir(parents=True, exist_ok=True)
    for src in music:
        dst = args.stage / "mp3" / src.name.lower()
        if not dst.exists() or dst.stat().st_size != src.stat().st_size:
            shutil.copy2(src, dst)
    if music:
        print(f"  música: {len(music)} mp3, {sum(p.stat().st_size for p in music) / 2**20:.1f} MiB")
    for m in missing:
        print(f"  ! referencia no encontrada: {m}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
