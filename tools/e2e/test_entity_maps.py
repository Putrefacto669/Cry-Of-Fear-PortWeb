"""Read-only checks against prepared BSPs; never distribute the game fixtures.

COF_STAGE=/root/cof-web/stage python3 -B tools/e2e/test_entity_maps.py
"""
import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from stage_map import map_dependencies, read_entities

STAGE = Path(os.environ.get("COF_STAGE", str(Path.home() / "cof-web/stage")))


class CampaignMapContracts(unittest.TestCase):
    def test_cinematic_train_camera_routes(self):
        es = read_entities(self.bsp("c_start"))
        by = {e.get("targetname"): e for e in es if e.get("targetname")}
        self.assertEqual(by["kamera3"]["target"], "fokus3")
        self.assertEqual(by["fokus3"]["classname"], "func_train")
        self.assertEqual(by["fokus3"]["model"], "*135")
        self.assertEqual(by["fokus3"]["target"], "1stopp1")
        self.assertEqual(by["1stopp1"]["classname"], "path_track")
        self.assertEqual(by["1stopp1"]["target"], "1stopp2")
        self.assertEqual(by["1stopp2"]["target"], "1stopp1")
        es = read_entities(self.bsp("c_intro"))
        by = {e.get("targetname"): e for e in es if e.get("targetname")}
        self.assertEqual(by["2inkamera2"]["target"], "infokus2")
        self.assertEqual(by["infokus2"]["classname"], "func_tracktrain")
        self.assertEqual(by["infokus2"]["startspeed"], "10")
        self.assertEqual(by["infokus2"]["height"], "4")
        for node, following in [("instopp1", "instopp2"), ("instopp2", "instopp3"), ("instopp3", "instopp1")]:
            self.assertEqual(by[node]["classname"], "path_track")
            self.assertEqual(by[node]["target"], following)

    def bsp(self, name):
        path = STAGE / "maps" / name / "cryoffear/maps" / (name + ".bsp")
        if not path.is_file():
            self.skipTest("prepared BSP unavailable: " + str(path))
        return path

    def test_c_intro_motion_manager_autostart_contract(self):
        managers = [e for e in read_entities(self.bsp("c_intro")) if e.get("classname") == "motion_manager"]
        self.assertEqual(len(managers), 1)
        self.assertEqual(managers[0]["target"], "*locus")
        self.assertEqual(managers[0]["origin"], "2719 -1794 -613")
        self.assertFalse(managers[0].get("targetname"))
        self.assertFalse(managers[0].get("m_iszPosition"))
        self.assertFalse(managers[0].get("m_iszFacing"))

    def test_trigger_sound_prepared_map_contracts(self):
        zones = [e for e in read_entities(self.bsp("c_start")) if e.get("classname") == "trigger_sound"]
        expected = [17, 0, 17, 8, 17, 23, 23, 17, 0, 8, 0, 0, 0, 2]
        self.assertEqual({e["model"]: int(e["roomtype"]) for e in zones},
                         {f"*{222+i}": room for i, room in enumerate(expected)})
        for zone in zones:
            self.assertEqual(zone.get("delay"), "0")
            self.assertFalse(zone.get("targetname"))
            self.assertFalse(zone.get("master"))
            self.assertFalse(zone.get("target"))
        apartment = [e for e in read_entities(self.bsp("c_apartment1")) if e.get("classname") == "trigger_sound"]
        self.assertEqual(len(apartment), 1)
        self.assertEqual(apartment[0]["model"], "*202")
        self.assertNotIn("roomtype", apartment[0])

    def test_c_start_changevalues_and_activation_order(self):
        entities = read_entities(self.bsp("c_start"))
        changes = {e["targetname"]: (e["target"], e["netname"], e["m_iszNewValue"])
                   for e in entities if e.get("classname") == "trigger_changevalue"}
        self.assertEqual(changes, {
            "bchange1": ("sub1", "linenumber", "13"),
            "cchange2": ("simon3", "body", "1"),
            "slower_subbchange1": ("sub1", "linenumber", "2"),
            "slower_subbchange2": ("sub1", "linenumber", "3"),
            "slower_subbchange3": ("sub1", "linenumber", "4"),
        })
        manager = next(e for e in entities if e.get("targetname") == "slower_cam2_mm")
        for change, use in [("slower_subbchange1", "sub1"), ("slower_subbchange2", "sub1#1"), ("slower_subbchange3", "sub1#2")]:
            self.assertLess(float(manager[change]), float(manager[use]))
        manager = next(e for e in entities if e.get("targetname") == "multiblack")
        self.assertLess(float(manager["bchange1"]), float(manager["sub1"]))

    def test_c_start_model_animation_contracts(self):
        entities = read_entities(self.bsp("c_start"))
        models = {e["targetname"]: e for e in entities
                  if e.get("classname") == "env_model" and e.get("targetname")}
        expected = {
            "sequence1": ("lieonground", "getup1", "1", "0"),
            "sequence2": ("look_idle", "getsms1", "1", "0"),
            "simon3": ("idlegetsms2", "getsms2", "1", "0"),
            "sblacker": ("idle", "walk", "1", "0"),
            "slower_arms": ("open_door", "idle", "0", "1"),
        }
        for name, contract in expected.items():
            self.assertEqual(tuple(models[name][k] for k in
                                   ("m_iszSequence_On", "m_iszSequence_Off", "m_iAction_On", "m_iAction_Off")), contract)
        self.assertEqual(models["slower_arms"]["spawnflags"], "1")
        managers = {e.get("targetname"): e for e in entities if e.get("classname") == "multi_manager"}
        self.assertEqual(managers["slower_arms_mm"]["slower_arms"], "0")
        self.assertEqual(managers["multiblack"]["sblacker"], "0.1")

    def test_triggeron_destinations_start_disabled(self):
        for name in ("c_start", "c_start2", "c_apartment1", "c_apartmentsick"):
            entities = read_entities(self.bsp(name))
            for gate in (e for e in entities if e.get("classname") == "cof_triggeron"):
                target = next(e for e in entities if e.get("targetname") == gate["target"])
                self.assertIn(target["classname"], ("trigger_once", "trigger_multiple"))
                self.assertEqual(target["iuser1"], "1")

    def test_boss_images_are_staged_from_real_entity_keys(self):
        bsp = self.bsp("c_apartmentsick")
        bossbar = next(e for e in read_entities(bsp) if e.get("classname") == "cof_bosshealthbar")
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "maps").mkdir()
            copy = root / "maps" / bsp.name
            shutil.copyfile(bsp, copy)
            for key in ("fulltga", "emptytga"):
                image = root / bossbar[key]
                image.parent.mkdir(parents=True, exist_ok=True)
                image.write_bytes(b"test fixture, not game artwork")
            found, missing = map_dependencies(root, copy)
            for key in ("fulltga", "emptytga"):
                self.assertIn(bossbar[key], found)
                self.assertNotIn(bossbar[key], missing)


if __name__ == "__main__":
    unittest.main(verbosity=2)
