# Anexo: las 27 entidades y los 39 callbacks de c_apartment1

Índices del proceso de diagnóstico anterior a la corrección. Los edicts cambian al restaurar: se correlacionaron classname, targetname/model y origen, no solo el índice. No es una lista de 39 entidades.

| Edict | Classname | Identidad y origen | Callbacks omitidos antes de corregir |
|---:|---|---|---|
| 247 | env_fog | `ingenfog`, (-770,-448,204) | m_pfnThink → CEnvFog::FogThink |
| 287 | monster_child | `models/children.mdl`, (-195,680,141.031) | m_pfnThink → CBaseMonster::CallMonsterThink; m_pfnUse → CBaseMonster::MonsterUse |
| 288 | ammo_glock | `models/ammo/clip.mdl`, (601,242,-40) | m_pfnTouch → CBasePlayerAmmo::DefaultTouch |
| 289 | monstermaker | `spawnm2`, (709,-156,25) | m_pfnThink → CBaseEntity::SUB_DoNothing; m_pfnUse → CMonsterMaker::ToggleUse |
| 304 | trigger_cofteleport | `*127`, (0,0,0) | m_pfnTouch → CCofTriggerTeleport::TeleportTouch |
| 324 | ammo_glock | `models/ammo/clip.mdl`, (-1959,2146,0) | m_pfnTouch → CBasePlayerAmmo::DefaultTouch |
| 338 | monster_child | `models/children.mdl`, (446,-150,447.031) | m_pfnThink → CBaseMonster::CallMonsterThink; m_pfnUse → CBaseMonster::MonsterUse |
| 346 | ammo_glock | `models/ammo/clip.mdl`, (-1139,834,141) | m_pfnTouch → CBasePlayerAmmo::DefaultTouch |
| 353 | monstermaker | `spawnm3`, (815,1568,159) | m_pfnThink → CBaseEntity::SUB_DoNothing; m_pfnUse → CMonsterMaker::ToggleUse |
| 357 | monstermaker | `horankes`, (-767,-160,2) | m_pfnThink → CBaseEntity::SUB_DoNothing; m_pfnUse → CMonsterMaker::ToggleUse |
| 379 | monstermaker | `ss1mm`, (-568,751,142) | m_pfnThink → CBaseEntity::SUB_DoNothing; m_pfnUse → CMonsterMaker::ToggleUse |
| 402 | env_spark | `sparkzz2`, (-310,-161,251) | m_pfnUse → CEnvSpark::SparkStart |
| 406 | monstermaker | `monsterro`, (-13,-162,143) | m_pfnThink → CBaseEntity::SUB_DoNothing; m_pfnUse → CMonsterMaker::ToggleUse |
| 407 | env_spark | `sparkzz1`, (-54,-161,251) | m_pfnUse → CEnvSpark::SparkStart |
| 412 | weapon_syringe | `models/weapons/syringe/w_syringe.mdl`, (1120,1200,141) | m_pfnTouch → CBasePlayerItem::DefaultTouch |
| 413 | weapon_syringe | `models/weapons/syringe/w_syringe.mdl`, (-1624,2120,39) | m_pfnTouch → CBasePlayerItem::DefaultTouch |
| 427 | monster_child | `models/children.mdl`, (-613,578,142.031) | m_pfnThink → CBaseMonster::CallMonsterThink; m_pfnUse → CBaseMonster::MonsterUse |
| 442 | env_spark | `sparkalossheh`, (765,1348,252) | m_pfnUse → CEnvSpark::SparkStart |
| 501 | env_spark | `sprakaeleoie`, (1067,1155,252) | m_pfnUse → CEnvSpark::SparkStart |
| 510 | monster_baby | `models/baby.mdl`, (715,-68,165.031) | m_pfnThink → CBaseMonster::CallMonsterThink; m_pfnUse → CBaseMonster::MonsterUse |
| 511 | monster_baby | `models/baby.mdl`, (724,-168,165.031) | m_pfnThink → CBaseMonster::CallMonsterThink; m_pfnUse → CBaseMonster::MonsterUse |
| 539 | ammo_glock | `models/ammo/clip.mdl`, (581,-54,447) | m_pfnTouch → CBasePlayerAmmo::DefaultTouch |
| 540 | env_dynlight | `kalashaha`, (1067,1157,250) | m_pfnThink → CEnvDynLight::LightThink |
| 541 | env_dynlight | `kostymkuk2`, (766,1349,250) | m_pfnThink → CEnvDynLight::LightThink |
| 548 | env_dynlight | `cutljus`, (-806,-160,296) | m_pfnThink → CEnvDynLight::LightThink |
| 670 | monstermaker | `ss2mm`, (-1908,2181,3) | m_pfnThink → CBaseEntity::SUB_DoNothing; m_pfnUse → CMonsterMaker::ToggleUse |
| 673 | monstermaker | `spawnsyringe`, (-576,499,180) | m_pfnThink → CBaseEntity::SUB_DoNothing; m_pfnUse → CMonsterMaker::ToggleUse |
