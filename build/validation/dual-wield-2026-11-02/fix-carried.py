from pathlib import Path
r=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web')
p=r/'game/cof-logic/cof/weapons_cof.cpp';s=p.read_text().replace('static CCofMobile *CarriedMobile(CBasePlayer *p)','''static CBasePlayerItem *FindCarried(CBasePlayer *p,const char *name)
{
 for(int slot=0;slot<MAX_ITEM_TYPES;++slot)
  for(CBasePlayerItem *item=p->m_rgpPlayerItems[slot];item;item=item->m_pNext)
   if(FClassnameIs(item->pev,name))return item;
 return NULL;
}
static CCofMobile *CarriedMobile(CBasePlayer *p)''').replace('(CCofMobile*)p->HasNamedPlayerItem("weapon_mobile")','(CCofMobile*)FindCarried(p,"weapon_mobile")').replace('CBasePlayerItem *right=p->HasNamedPlayerItem(weapon)','CBasePlayerItem *right=FindCarried(p,weapon)');p.write_text(s)
p=r/'game/cof-logic/client/cof_hands.cpp';s=p.read_text().replace('static cl_entity_t g_offhand;\n','').replace(';memset(&g_offhand,0,sizeof(g_offhand))','');s=s.replace('g_offhand=primary;','cl_entity_t offhand=primary;').replace('g_offhand','offhand');p.write_text(s)