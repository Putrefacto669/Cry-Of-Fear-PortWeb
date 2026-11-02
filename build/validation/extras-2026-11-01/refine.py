from pathlib import Path
p=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web/game/cof-logic/cof/extras.cpp');s=p.read_text()
s=s.replace('if(!s || !(g_unlocks & NIGHTVISION_UNLOCK) || !(player->pev->button & IN_USE))return;','if(!s || !(g_unlocks & NIGHTVISION_UNLOCK) || !(((CBasePlayer*)player)->m_afButtonPressed & IN_USE))return;')
s=s.replace(' if(s->nightState!=100 && s->nightState!=101)return;', ''' if(s->nightState!=100 && s->nightState!=101) {
  if(s->nightWeapon && gpGlobals->time>s->nightTime) {
   CBasePlayerItem *item=(CBasePlayerItem*)(CBaseEntity*)s->nightWeapon;
   player->m_pActiveItem=item;item->Deploy();s->nightWeapon=NULL;
  }
  return;
 }''')
s=s.replace('s->nightTime=gpGlobals->time+1;','s->nightTime=gpGlobals->time+0.7f;')
s=s.replace(' if(s->nightWeapon) {CBasePlayerItem *item=(CBasePlayerItem*)(CBaseEntity*)s->nightWeapon;player->m_pActiveItem=item;item->Deploy();s->nightWeapon=NULL;}','')
p.write_text(s)