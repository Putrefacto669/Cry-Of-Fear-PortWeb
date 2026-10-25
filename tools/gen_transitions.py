#!/usr/bin/env python3
"""
gen_transitions.py - Genera platform/web/transitions.json a partir de los BSP.

    python3 gen_transitions.py <cof_root> [-o salida]

<cof_root> es el directorio que contiene cryoffear/ (el mismo que acepta stage_map.py).
Cada mapa apunta a los mapas destino de sus trigger_changelevel; loader.js usa este grafo
para precargar en segundo plano el siguiente capitulo mientras se juega el actual.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from stage_map import GAMEDIR, read_entities


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("root", type=Path, help="directorio que contiene cryoffear/")
    ap.add_argument("-o", "--output", type=Path,
                    default=Path(__file__).resolve().parent.parent / "platform/web/transitions.json")
    args = ap.parse_args()

    maps = {p.stem.lower(): p for p in (args.root / GAMEDIR / "maps").glob("*.bsp")}
    out: dict[str, list[str]] = {}
    for name, bsp in sorted(maps.items()):
        try:
            ents = read_entities(bsp)
        except Exception as e:
            print(f"aviso: {bsp.name}: {e}", file=sys.stderr)
            continue
        targets = sorted({e["map"].strip().lower().removesuffix(".bsp")
                          for e in ents
                          if e.get("map", "").strip().lower().removesuffix(".bsp") in maps})
        targets = [t for t in targets if t != name]
        if targets:
            out[name] = targets

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(out, indent=1, sort_keys=True) + "\n", encoding="utf-8")
    print(f"{args.output}: {len(out)} mapas, {sum(map(len, out.values()))} transiciones")
    return 0


if __name__ == "__main__":
    sys.exit(main())
