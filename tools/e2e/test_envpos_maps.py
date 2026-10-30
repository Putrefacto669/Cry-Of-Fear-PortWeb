"""Read-only regression contract for the locally prepared Cry of Fear sky markers."""
import os
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from stage_map import read_entities

STAGE = Path(os.environ.get("COF_STAGE", str(Path.home() / "cof-web/stage")))

class EnvposContracts(unittest.TestCase):
    def test_original_marker_pairs_and_sky_models(self):
        expected = {
            "c_start": ("992 -2178 -739", "925.957 -810.043 -1409.05", 1),
            "c_start2": ("678 1542 -503", "612 2910 -1173", 1),
            "c_intro": ("2737 -1742 -643", "2671 -374 -1313", 2),
            "c_game_menu1": ("-1965 342 75", "-2058 1710 -1121", 1),
        }
        found = set()
        for bsp in STAGE.glob("maps/*/cryoffear/maps/*.bsp"):
            es = read_entities(bsp)
            markers = [e for e in es if e.get("classname", "").startswith("envpos_")]
            if not markers:
                continue
            found.add(bsp.stem)
            self.assertIn(bsp.stem, expected)
            world, sky, models = expected[bsp.stem]
            self.assertEqual(len(markers), 2)
            by = {e["classname"]: e for e in markers}
            self.assertEqual(by["envpos_world"]["origin"], world)
            self.assertEqual(by["envpos_world"]["health"], "80")
            self.assertEqual(by["envpos_sky"]["origin"], sky)
            for key, value in {"spawnflags": "3", "body": "25", "skin": "32"}.items():
                self.assertEqual(by["envpos_sky"][key], value)
            for e in markers:
                self.assertFalse(e.get("targetname"))
                self.assertFalse(e.get("target"))
            skies = [e for e in es if e.get("classname") == "env_model" and e.get("renderfx") == "137"]
            self.assertEqual(len(skies), models)
        self.assertEqual(found, set(expected), "all four prepared map fixtures are required")

if __name__ == "__main__":
    unittest.main()
