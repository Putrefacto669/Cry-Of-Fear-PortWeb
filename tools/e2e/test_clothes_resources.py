"""Contracts against the authorized original assets, never embedded fixtures."""
import hashlib,os,struct,sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from stage_map import boot_set,shared_extras_set,read_entities,find_ci
GAME=Path(os.environ['COF_ORIGINAL'])
STAGE=Path(os.environ['COF_STAGE'])
class ClothesResources(unittest.TestCase):
 def test_original_menu_model_and_sequence(self):
  path='models/cutscene/simon_clothes.mdl';source=find_ci(GAME,path)
  self.assertIn(source.relative_to(GAME).as_posix(),shared_extras_set(GAME))
  actual=find_ci(STAGE/'shared_extras/cryoffear',path)
  self.assertEqual(actual.read_bytes(),source.read_bytes())
  data=source.read_bytes();self.assertEqual(data[:4],b'IDST')
  count,index=struct.unpack_from('<ii',data,164)
  self.assertIn(b'clothes_1',[data[index+i*176:index+i*176+32].split(b'\0')[0] for i in range(count)])
  es=read_entities(GAME/'maps/c_start.bsp');model=next(e for e in es if e.get('targetname')=='simonclothes')
  self.assertEqual(model['model'].lower(),path)
  self.assertEqual(model['m_iszSequence_On'],'clothes_1')
 def test_original_noise_and_menu_art(self):
  self.assertIn('gfx/vgui/menu/unlockables.TGA',boot_set(GAME))
  for path in ['sprites/subtle_noise.spr','gfx/vgui/menu/unlockables.TGA','gfx/vgui/menu/unlockables_mo.TGA']:
   self.assertEqual(find_ci(STAGE/'boot/cryoffear',path).read_bytes(),find_ci(GAME,path).read_bytes())
  data=find_ci(GAME,'sprites/subtle_noise.spr').read_bytes();self.assertEqual(data[:4],b'IDSP')
  self.assertEqual(struct.unpack_from('<iii',data,20),(256,256,20))
 def test_bsp_and_shared_model_survive_deduplication(self):
  for name in ['c_intro','c_nightmare','c_start','c_apartment1','c_apartmentsick']:
   self.assertEqual(hashlib.sha256((STAGE/'maps'/name/'cryoffear/maps'/f'{name}.bsp').read_bytes()).digest(),hashlib.sha256((GAME/'maps'/f'{name}.bsp').read_bytes()).digest())
  # One mounted copy, accessible before a campaign starts and after c_start loads.
  self.assertTrue((STAGE/'shared_extras/cryoffear/models/cutscene/simon_clothes.mdl').is_file())
  self.assertFalse((STAGE/'maps/c_start/cryoffear/models/cutscene/simon_clothes.mdl').exists())
if __name__=='__main__':unittest.main(verbosity=2)
