"""Contracts against private original maps/resources; no original asset is embedded."""
import os,sys,unittest,hashlib
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from stage_map import read_entities,map_dependencies
STAGE=Path(os.environ.get('COF_STAGE',str(Path.home()/'cof-web/stage')))
GAME=Path(os.environ['COF_ORIGINAL']) if 'COF_ORIGINAL' in os.environ else None
MAPS='c_game_menu1 c_intro c_nightmare c_start c_start2 c_apartment1 c_apartment2 c_apartment3 c_apartment4 c_apartment5 c_apartmentsick'.split()
class ExtrasContracts(unittest.TestCase):
 def test_real_instances_and_references(self):
  rows=[(m,e) for m in MAPS for e in read_entities(STAGE/'maps'/m/'cryoffear/maps'/f'{m}.bsp')]
  self.assertEqual(sum(e.get('classname')=='cof_developer_commentary' for _,e in rows),22)
  for cls in ('cof_hoodie','cof_clothesmenu','item_nightvision'):
   self.assertEqual(sum(e.get('classname')==cls for _,e in rows),1)
  comments=[e for _,e in rows if e.get('classname')=='cof_developer_commentary']
  self.assertEqual(len({e['noise'].lower() for e in comments}),21)
  self.assertTrue(all(float(e['fuser2'])>0 for e in comments))
  es={e.get('targetname'):e for m,e in rows if m=='c_start' and e.get('targetname')}
  self.assertEqual(es['clothes']['cameraent'],'clothescamera')
  self.assertEqual(es['clothes']['simonent'],'simonclothes')
  self.assertEqual(es['clothescamera']['classname'],'trigger_camera')
 def test_staged_original_extras(self):
  if not GAME:self.skipTest('Set COF_ORIGINAL to verify original hashes')
  audio=set()
  for path in ('sound/unlockables/nv_on.wav','sound/unlockables/nv_off.wav'):
   self.check_copy('c_start',path)
  for m in MAPS:
   bsp=STAGE/'maps'/m/'cryoffear/maps'/f'{m}.bsp'
   deps,missing=map_dependencies(GAME,bsp)
   for e in read_entities(bsp):
    if e.get('classname')=='cof_developer_commentary':
     path='mp3/'+e['noise'];audio.add(path.lower());self.assertIn(path,deps)
     self.assertNotIn('sound/'+e['noise'],deps)
     self.check_copy(m,path)
   for path in ('models/developer_commentary.mdl','models/items/w_nightvision.mdl'):
    if path in deps:self.check_copy(m,path)
  self.assertEqual(len(audio),21)
  textures=list((STAGE/'shared_extras/cryoffear/models/costumes').rglob('*'))
  textures=[p for p in textures if p.suffix.lower()=='.tga']
  self.assertGreaterEqual(len(textures),29)
  for p in textures:self.assertEqual(p.read_bytes(),(GAME/p.relative_to(STAGE/'shared_extras/cryoffear')).read_bytes())
 def check_copy(self,m,path):
  p=STAGE/'maps'/m/'cryoffear'/path
  if not p.exists():p=STAGE/'boot/cryoffear'/path
  self.assertEqual(hashlib.sha256(p.read_bytes()).digest(),hashlib.sha256((GAME/path).read_bytes()).digest(),path)
if __name__=='__main__':unittest.main(verbosity=2)