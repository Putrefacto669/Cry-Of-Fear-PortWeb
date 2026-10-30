"""Contract of the real c_start padlock and c_start2 clue; no game assets shipped."""
import os,sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from stage_map import read_entities,map_dependencies
STAGE=Path(os.environ.get("COF_STAGE",str(Path.home()/"cof-web/stage")))
class PadlockMapContract(unittest.TestCase):
 def test_padlock_gate_and_original_clue(self):
  es=read_entities(STAGE/'maps/c_start/cryoffear/maps/c_start.bsp')
  by={e['targetname']:e for e in es if e.get('targetname')}
  self.assertEqual(by['padbutton']['target'],'padlock')
  self.assertEqual(by['padlock']['message'],'padcam')
  self.assertEqual(by['padlock']['target'],'multi_pad')
  self.assertEqual(by['padcam']['classname'],'door_prop_view')
  self.assertEqual(by['sd_door1_lock']['message'],'sd_door1')
  self.assertFalse(by['sd_door1_lock'].get('newlockedby'))
  self.assertFalse(by['sd_door1'].get('lockedby'))
  self.assertIn('sd_door1_lock',by['multi_pad'])
  self.assertEqual(by['killpadbutton']['killtarget'],'padbutton')
  starts=[e for e in es if e.get('targetname')=='multiscene1']
  self.assertEqual(len(starts),4)
  self.assertTrue(any('sd_door1_lock' in e for e in starts))
  clue=read_entities(STAGE/'maps/c_start2/cryoffear/maps/c_start2.bsp')
  pc=next(e for e in clue if e.get('targetname')=='computeron')
  self.assertEqual(pc['classname'],'cof_computer')
  self.assertEqual(pc['target'],'multimystery')
  self.assertTrue(any(e['classname']=='cof_passwordnote' and not e.get('usertype') for e in clue))
  self.assertTrue(any(e['classname']=='trigger_changelevel' and e.get('map')=='c_start' for e in clue))
if __name__=='__main__':unittest.main()
