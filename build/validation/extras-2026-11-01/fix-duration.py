from pathlib import Path
r=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web')
p=r/'game/cof-logic/cof/extras.cpp';s=p.read_text().replace(' void Spawn(); void Precache(); void Think();',' void Spawn(); void Precache(); void Think(); void KeyValue(KeyValueData*);')
s=s.replace('float m_flStart,m_flEnd,m_flVolume,m_flNextSend;','float m_flStart,m_flEnd,m_flVolume,m_flNextSend,m_flDuration;')
s=s.replace(' DEFINE_FIELD(CCoFDevCommentary,m_hListener,FIELD_EHANDLE),',' DEFINE_FIELD(CCoFDevCommentary,m_hListener,FIELD_EHANDLE),\n DEFINE_FIELD(CCoFDevCommentary,m_flDuration,FIELD_FLOAT),')
s=s.replace('void CCoFDevCommentary::Precache()','''void CCoFDevCommentary::KeyValue(KeyValueData *kv)
{
 if(FStrEq(kv->szKeyName,"fuser2")){m_flDuration=atof(kv->szValue);pev->fuser2=m_flDuration;kv->fHandled=TRUE;}
 else CBaseEntity::KeyValue(kv);
}
void CCoFDevCommentary::Precache()''')
s=s.replace('gpGlobals->time+pev->fuser2','gpGlobals->time+m_flDuration');p.write_text(s)
p=Path('/root/cof-audits/audit-D3Kl5uly/game/hlsdk-portable/cl_dll/StudioModelRenderer.cpp');s=p.read_text();s=s.replace('extern void CoF_CostumeEnd();\n','').replace('extern void CoF_CostumeBegin(model_t *model, void *header);','extern void CoF_CostumeBegin(model_t *model, void *header);\nextern void CoF_CostumeEnd();');p.write_text(s)