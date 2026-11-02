"""Read-only prepared BSP/factory inventory. Does not copy original game assets."""
import json
import re
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from stage_map import read_entities

stage, sdk, source, output = map(Path, sys.argv[1:])
if output.exists():
    raise SystemExit(f"Refusing to overwrite {output}")
factories = {}
for root in (sdk / "dlls", source / "game/cof-logic/cof"):
    for file in sorted(root.rglob("*.cpp")):
        for name in re.findall(r"LINK_ENTITY_TO_CLASS\s*\(\s*(\w+)\s*,", file.read_text(errors="replace")):
            factories.setdefault(name, []).append(str(file.relative_to(root)))
rows = []
extras = {"cof_developer_commentary", "cof_hoodie", "cof_clothesmenu", "item_nightvision"}
for bsp in sorted(stage.glob("maps/*/cryoffear/maps/*.bsp")):
    entities = read_entities(bsp)
    counts = Counter(e.get("classname", "") for e in entities)
    # info_node is consumed by the engine's node builder; excluded as a factory gap.
    gaps = {name: n for name, n in counts.items() if name not in factories and name not in {"info_node", "info_node_air"}}
    selected = [e for e in entities if e.get("classname") in extras
                or any("hellokitty" in v.lower() for v in e.values())]
    names = {e["targetname"] for e in selected if e.get("targetname")}
    links = [e for e in entities if e not in selected and any(v in names for v in e.values())]
    rows.append({"map": bsp.stem, "entities": len(entities), "counts": dict(sorted(counts.items())),
                 "factory_gaps": gaps, "extras": selected, "incoming_links": links})
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps({"method": "Static LINK_ENTITY_TO_CLASS inventory; runtime logs required to confirm gaps",
                              "maps": rows}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"Inventoried {len(rows)} prepared BSPs; no game assets copied")
