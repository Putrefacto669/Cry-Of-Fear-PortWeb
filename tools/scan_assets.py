#!/usr/bin/env python3
"""
scan_assets.py - Inventario de assets de Cry of Fear para planificar el port a WebAssembly.

Escanea la instalación original, valida cabeceras binarias (BSP v30, MDL IDST v10, WAV RIFF),
detecta duplicados y estima el peso tras compresión para la build web.

Uso:
    python scan_assets.py "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Cry of Fear" -o reports
    python scan_assets.py <ruta> --hash        # además detecta duplicados por SHA-1 (más lento)

Salida (en el directorio -o):
    assets_inventory.csv   - una fila por archivo
    assets_report.json     - totales, top N, por carpeta, duplicados, estimaciones
    (resumen en consola)
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import struct
import sys
import time
from collections import defaultdict
from dataclasses import dataclass, asdict, field
from pathlib import Path

# Tipos objetivo del pedido + tipos relacionados que también pesan en la build web.
PRIMARY_EXT = {".bsp": "map", ".mdl": "model", ".wav": "sound"}
SECONDARY_EXT = {
    ".wad": "texture_wad", ".spr": "sprite", ".tga": "image", ".bmp": "image",
    ".mp3": "music", ".ogg": "music", ".avi": "video", ".wmv": "video",
    ".res": "resource_list", ".txt": "text", ".cfg": "config",
    ".dll": "native_binary", ".exe": "native_binary",
}

# Ratios de compresión estimados para la build web (conservadores).
#  - BSP/MDL/WAD: gzip/brotli en el empaquetado .data (no se recodifican, el motor los lee crudos).
#  - WAV: transcodificación a Ogg Vorbis q3 (~112 kbps) o Opus 64-96 kbps.
EST_RATIO = {
    "map": 0.45, "model": 0.55, "texture_wad": 0.50, "sprite": 0.50,
    "sound": 0.12, "music": 1.0, "image": 0.40, "video": 1.0,
}
GOLDSRC_BSP_VERSION = 30
MDL_MAGIC, MDL_SEQ_MAGIC, MDL_VERSION = b"IDST", b"IDSQ", 10


@dataclass
class Asset:
    rel_path: str
    ext: str
    category: str
    size: int
    valid_header: bool | None = None
    notes: str = ""
    # Metadatos opcionales
    wav_rate: int | None = None
    wav_channels: int | None = None
    wav_bits: int | None = None
    wav_format: int | None = None
    duration_s: float | None = None
    mdl_name: str | None = None
    sha1: str | None = None
    meta: dict = field(default_factory=dict)


def human(n: float) -> str:
    for unit in ("B", "KiB", "MiB", "GiB"):
        if abs(n) < 1024:
            return f"{n:,.1f} {unit}"
        n /= 1024
    return f"{n:,.1f} TiB"


def inspect_bsp(fp, a: Asset) -> None:
    head = fp.read(4)
    if len(head) < 4:
        a.valid_header, a.notes = False, "truncado"
        return
    (version,) = struct.unpack("<i", head)
    a.valid_header = version == GOLDSRC_BSP_VERSION
    a.meta["bsp_version"] = version
    if not a.valid_header:
        a.notes = f"BSP v{version} (GoldSrc espera v30)"


def inspect_mdl(fp, a: Asset) -> None:
    head = fp.read(8 + 64)
    if len(head) < 8:
        a.valid_header, a.notes = False, "truncado"
        return
    magic, version = head[:4], struct.unpack("<i", head[4:8])[0]
    a.meta["mdl_version"] = version
    if magic == MDL_SEQ_MAGIC:
        a.valid_header, a.notes = True, "sequence group (IDSQ)"
    else:
        a.valid_header = magic == MDL_MAGIC and version == MDL_VERSION
        if not a.valid_header:
            a.notes = f"magic={magic!r} v{version}"
    if magic == MDL_MAGIC and len(head) >= 72:
        a.mdl_name = head[8:72].split(b"\0", 1)[0].decode("latin-1", "replace")


def inspect_wav(fp, a: Asset) -> None:
    riff = fp.read(12)
    if len(riff) < 12 or riff[:4] != b"RIFF" or riff[8:12] != b"WAVE":
        a.valid_header, a.notes = False, "no es RIFF/WAVE"
        return
    byte_rate = data_size = None
    # Recorre chunks hasta encontrar fmt y data (sin leer las muestras).
    while True:
        hdr = fp.read(8)
        if len(hdr) < 8:
            break
        cid, csize = hdr[:4], struct.unpack("<I", hdr[4:8])[0]
        if cid == b"fmt ":
            fmt = fp.read(csize)
            if len(fmt) >= 16:
                a.wav_format, a.wav_channels, a.wav_rate, byte_rate, _, a.wav_bits = \
                    struct.unpack("<HHIIHH", fmt[:16])
            if csize % 2:
                fp.seek(1, os.SEEK_CUR)
        elif cid == b"data":
            data_size = csize
            break
        else:
            fp.seek(csize + (csize % 2), os.SEEK_CUR)  # incluye "cue " (loops de GoldSrc)
    a.valid_header = a.wav_rate is not None
    if byte_rate and data_size:
        a.duration_s = round(data_size / byte_rate, 3)
    if a.wav_format not in (None, 1):
        a.notes = f"formato no PCM (0x{a.wav_format:04x})"


INSPECTORS = {".bsp": inspect_bsp, ".mdl": inspect_mdl, ".wav": inspect_wav}


def sha1_of(path: Path, bufsize: int = 1 << 20) -> str:
    h = hashlib.sha1()
    with path.open("rb") as f:
        while chunk := f.read(bufsize):
            h.update(chunk)
    return h.hexdigest()


def scan(root: Path, do_hash: bool, include_all: bool) -> tuple[list[Asset], int, int]:
    assets: list[Asset] = []
    total_files = total_bytes = 0
    for dirpath, _, files in os.walk(root):
        for name in files:
            p = Path(dirpath) / name
            try:
                size = p.stat().st_size
            except OSError:
                continue
            total_files += 1
            total_bytes += size
            ext = p.suffix.lower()
            cat = PRIMARY_EXT.get(ext) or SECONDARY_EXT.get(ext)
            if cat is None:
                if not include_all:
                    continue
                cat = "other"
            a = Asset(rel_path=str(p.relative_to(root)).replace("\\", "/"),
                      ext=ext, category=cat, size=size)
            if ext in INSPECTORS:
                try:
                    with p.open("rb") as f:
                        INSPECTORS[ext](f, a)
                except (OSError, struct.error) as e:
                    a.valid_header, a.notes = False, f"error: {e}"
            if do_hash and ext in PRIMARY_EXT:
                a.sha1 = sha1_of(p)
            assets.append(a)
    return assets, total_files, total_bytes


def build_report(root: Path, assets: list[Asset], total_files: int, total_bytes: int,
                 top_n: int) -> dict:
    by_cat = defaultdict(lambda: {"count": 0, "bytes": 0})
    by_top_dir = defaultdict(lambda: defaultdict(int))
    for a in assets:
        by_cat[a.category]["count"] += 1
        by_cat[a.category]["bytes"] += a.size
        top = a.rel_path.split("/", 1)[0] if "/" in a.rel_path else "."
        by_top_dir[top][a.category] += a.size

    for cat, v in by_cat.items():
        ratio = EST_RATIO.get(cat)
        v["human"] = human(v["bytes"])
        v["est_web_bytes"] = int(v["bytes"] * ratio) if ratio is not None else None
        v["est_web_human"] = human(v["est_web_bytes"]) if ratio is not None else "excluir"

    primary = [a for a in assets if a.ext in PRIMARY_EXT]
    wavs = [a for a in assets if a.ext == ".wav" and a.valid_header]
    wav_profile = defaultdict(int)
    for w in wavs:
        wav_profile[f"{w.wav_rate}Hz/{w.wav_bits}bit/{w.wav_channels}ch"] += 1

    dupes = {}
    if any(a.sha1 for a in primary):
        groups = defaultdict(list)
        for a in primary:
            groups[a.sha1].append(a)
        dupes = {h: [x.rel_path for x in g] for h, g in groups.items() if len(g) > 1}
    dup_waste = sum(next(a.size for a in primary if a.sha1 == h) * (len(v) - 1)
                    for h, v in dupes.items())

    est_total = sum(v["est_web_bytes"] or 0 for v in by_cat.values()
                    if v["est_web_bytes"] is not None)

    def top(ext):
        return [{"path": a.rel_path, "size": a.size, "human": human(a.size)}
                for a in sorted((x for x in assets if x.ext == ext),
                                key=lambda x: x.size, reverse=True)[:top_n]]

    return {
        "root": str(root),
        "generated": time.strftime("%Y-%m-%d %H:%M:%S"),
        "install_total": {"files": total_files, "bytes": total_bytes, "human": human(total_bytes)},
        "by_category": dict(sorted(by_cat.items(), key=lambda kv: -kv[1]["bytes"])),
        "by_top_dir": {k: {c: human(b) for c, b in v.items()} for k, v in by_top_dir.items()},
        "primary_summary": {
            ext: {"count": sum(1 for a in assets if a.ext == ext),
                  "bytes": (b := sum(a.size for a in assets if a.ext == ext)),
                  "human": human(b),
                  "invalid_headers": [a.rel_path for a in assets
                                      if a.ext == ext and a.valid_header is False]}
            for ext in PRIMARY_EXT
        },
        "wav_profiles": dict(sorted(wav_profile.items(), key=lambda kv: -kv[1])),
        "wav_total_duration_min": round(sum(w.duration_s or 0 for w in wavs) / 60, 1),
        "top_bsp": top(".bsp"), "top_mdl": top(".mdl"), "top_wav": top(".wav"),
        "duplicates": dupes,
        "duplicate_waste": {"bytes": dup_waste, "human": human(dup_waste)},
        "estimated_web_payload": {"bytes": est_total, "human": human(est_total),
                                  "note": "Ratios en EST_RATIO; video/binarios nativos excluidos."},
    }


def write_csv(path: Path, assets: list[Asset]) -> None:
    cols = ["rel_path", "ext", "category", "size", "valid_header", "notes", "wav_rate",
            "wav_channels", "wav_bits", "wav_format", "duration_s", "mdl_name", "sha1"]
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        for a in sorted(assets, key=lambda x: (x.category, -x.size)):
            w.writerow(asdict(a))


def print_summary(r: dict) -> None:
    print(f"\n== Cry of Fear asset scan: {r['root']}")
    print(f"   Instalación total: {r['install_total']['files']:,} archivos, "
          f"{r['install_total']['human']}\n")
    print(f"   {'categoría':<15}{'archivos':>10}{'peso':>14}{'estimado web':>16}")
    for cat, v in r["by_category"].items():
        print(f"   {cat:<15}{v['count']:>10,}{v['human']:>14}{v['est_web_human']:>16}")
    print(f"\n   Payload web estimado: {r['estimated_web_payload']['human']}")
    print(f"   Audio WAV total: {r['wav_total_duration_min']} min; perfiles: "
          + ", ".join(f"{k} x{v}" for k, v in list(r["wav_profiles"].items())[:4]))
    for ext, s in r["primary_summary"].items():
        if s["invalid_headers"]:
            print(f"   ! {len(s['invalid_headers'])} {ext} con cabecera inesperada")
    if r["duplicates"]:
        print(f"   Duplicados: {len(r['duplicates'])} grupos, "
              f"desperdicio {r['duplicate_waste']['human']}")
    print("\n   Mapas más pesados:")
    for t in r["top_bsp"][:5]:
        print(f"     {t['human']:>12}  {t['path']}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("root", type=Path, help="Carpeta raíz de Cry of Fear")
    ap.add_argument("-o", "--out", type=Path, default=Path("reports"))
    ap.add_argument("--hash", action="store_true", help="SHA-1 de bsp/mdl/wav para detectar duplicados")
    ap.add_argument("--all", action="store_true", help="Incluir extensiones no reconocidas como 'other'")
    ap.add_argument("--top", type=int, default=20)
    args = ap.parse_args()

    if not args.root.is_dir():
        print(f"No existe la carpeta: {args.root}", file=sys.stderr)
        return 2
    t0 = time.perf_counter()
    assets, nfiles, nbytes = scan(args.root, args.hash, args.all)
    report = build_report(args.root, assets, nfiles, nbytes, args.top)
    args.out.mkdir(parents=True, exist_ok=True)
    write_csv(args.out / "assets_inventory.csv", assets)
    (args.out / "assets_report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False),
                                                 encoding="utf-8")
    print_summary(report)
    print(f"\n   Reportes en {args.out.resolve()}  ({time.perf_counter() - t0:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
