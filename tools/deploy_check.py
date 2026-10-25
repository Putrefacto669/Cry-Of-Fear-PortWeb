#!/usr/bin/env python3
"""
deploy_check.py - Revisa un dist/ antes de publicarlo y, opcionalmente, un despliegue ya publicado.

    python3 deploy_check.py [dist]                       límites por hosting y compresión
    python3 deploy_check.py [dist] --url https://...     además: cabeceras y MIME del sitio publicado

Límites (planes gratuitos, comprobados en octubre de 2026; ver docs/DEPLOY.md para las fuentes):
  Cloudflare Pages  25 MiB por archivo, 20 000 archivos, _headers, tráfico estático ilimitado
  GitHub Pages      1 GB de sitio, 100 MB por archivo (git), sin cabeceras propias, 100 GB/mes blando
  Vercel Hobby      100 MB por despliegue con la CLI, solo uso no comercial, 100 GB/mes
  Netlify Free      300 créditos/mes (~15 GB de tráfico), _headers / netlify.toml
"""
from __future__ import annotations

import argparse
import gzip
import sys
import urllib.request
from pathlib import Path

MiB = 1024 * 1024
LIMITS = {
    #                   por archivo, total,     nº archivos
    "Cloudflare Pages": (25 * MiB, None, 20_000),
    "GitHub Pages": (100 * MiB, 1024 * MiB, None),
    "Vercel Hobby": (None, 100 * MiB, None),
    "Netlify Free": (None, None, None),
}
EXPECTED_MIME = {".wasm": "application/wasm", ".js": "javascript", ".html": "text/html",
                 ".data": "application/octet-stream"}


def check_dist(dist: Path) -> bool:
    files = [p for p in dist.rglob("*") if p.is_file()]
    total = sum(p.stat().st_size for p in files)
    biggest = sorted(files, key=lambda p: p.stat().st_size, reverse=True)[:6]
    print(f"== {dist}: {len(files)} archivos, {total / MiB:.1f} MiB")

    print("\n   archivo                            tamaño    gzip -9")
    for p in biggest:
        size = p.stat().st_size
        gz = len(gzip.compress(p.read_bytes(), 9))
        print(f"   {p.relative_to(dist).as_posix():32} {size / MiB:7.1f} MiB  {100 * gz / size:5.1f} %")

    ok_all = True
    print("\n   hosting            ¿cabe?")
    for host, (per_file, total_max, count_max) in LIMITS.items():
        problems = []
        if per_file:
            over = [p for p in files if p.stat().st_size > per_file]
            if over:
                problems.append(f"{len(over)} archivo(s) > {per_file // MiB} MiB ({over[0].name})")
        if total_max and total > total_max:
            problems.append(f"total {total / MiB:.0f} MiB > {total_max // MiB} MiB")
        if count_max and len(files) > count_max:
            problems.append(f"{len(files)} archivos > {count_max}")
        print(f"   {host:18} {'sí' if not problems else 'NO: ' + '; '.join(problems)}")
        if host == "Cloudflare Pages" and problems:
            ok_all = False
    return ok_all


def check_url(url: str, dist: Path) -> bool:
    print(f"\n== {url}")
    probes = ["", "xash3d.wasm", "xash3d.js", "sw.js", "packs/boot.data"]
    ok_all = True
    for path in probes:
        req = urllib.request.Request(url.rstrip("/") + "/" + path, method="HEAD")
        try:
            with urllib.request.urlopen(req, timeout=20) as res:
                h = {k.lower(): v for k, v in res.headers.items()}
        except Exception as e:  # noqa: BLE001 - informe, no lógica
            print(f"   {path or '/':20} ERROR {e}")
            ok_all = False
            continue
        ext = Path(path).suffix or ".html"
        mime_ok = EXPECTED_MIME.get(ext, "") in h.get("content-type", "")
        coop = h.get("cross-origin-opener-policy") == "same-origin"
        coep = h.get("cross-origin-embedder-policy") in ("require-corp", "credentialless")
        notes = []
        if not mime_ok:
            notes.append(f"MIME {h.get('content-type')}")
            ok_all = False
        if path == "" and not (coop and coep):
            notes.append("sin COOP/COEP (solo necesario con hilos; el SW puede añadirlos: COF_SW_COI=1)")
        print(f"   {path or '/':20} {'ok' if not notes else '; '.join(notes)}  [{h.get('cache-control', '-')}]")
    return ok_all


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("dist", nargs="?", type=Path, default=Path.home() / "cof-web/dist")
    ap.add_argument("--url", help="sitio ya publicado a comprobar")
    args = ap.parse_args()
    ok = check_dist(args.dist)
    if args.url:
        ok = check_url(args.url, args.dist) and ok
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
