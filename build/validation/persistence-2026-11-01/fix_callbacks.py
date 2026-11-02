from pathlib import Path
sdk=Path('/root/cof-audits/audit-D3Kl5uly/game/hlsdk-portable/dlls')
repo=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web')
p=sdk/'cbase.h';s=p.read_text();anchor='void CoF_RecordCallback(const void *value, unsigned size, const char *name);'
insert='''void CoF_AddSavedCallback(const char *name,const void *value,unsigned size);
const char *CoF_SavedCallbackName(const void *value,unsigned size);
bool CoF_RestoreSavedCallback(const char *name,void *value,unsigned size);
template<class T> inline void CoF_RegisterSavedCallback(const char *name,T value)
{ CoF_AddSavedCallback(name,&value,sizeof(value)); }
#define COF_SAVE_THINK(C,M) CoF_RegisterSavedCallback("cof::" #C "::" #M,static_cast<BASEPTR>(&C::M))
#define COF_SAVE_TOUCH(C,M) CoF_RegisterSavedCallback("cof::" #C "::" #M,static_cast<ENTITYFUNCPTR>(&C::M))
#define COF_SAVE_USE(C,M) CoF_RegisterSavedCallback("cof::" #C "::" #M,static_cast<USEPTR>(&C::M))
'''
assert anchor in s;p.write_text(s.replace(anchor,insert+anchor,1))
p=sdk/'util.cpp';s=p.read_text();anchor='\tfunctionName = NAME_FOR_FUNCTION( *data );';s=s.replace(anchor,anchor+'\n#ifdef __EMSCRIPTEN__\n\tif(!functionName)functionName=CoF_SavedCallbackName(data,gSizes[FIELD_FUNCTION]);\n#endif',1)
old='''\telse
\t\tALERT( at_error, "Invalid function pointer in entity!\\n" );''';new='''\telse
\t{
\t\tALERT( at_error, "Invalid function pointer in entity!\\n" );
#ifdef __EMSCRIPTEN__
        // Keep the declared field count aligned even when a callback is unknown.
        // It stays explicitly null on restore and the original warning remains.
        BufferField(pname,1,"");
#endif
\t}''';assert old in s;s=s.replace(old,new,1)
anchor="\t\t\t\t\tcase FIELD_FUNCTION:\n";pos=s.index(anchor,s.index('int CRestore::ReadField'))
insert='''#ifdef __EMSCRIPTEN__
                        if(!strncmp((char*)pInputData,"cof::",5)){
                         if(!CoF_RestoreSavedCallback((char*)pInputData,pOutputData,gSizes[FIELD_FUNCTION]))return -1;
                         break;
                        }
#endif
''';s=s[:pos]+s[pos:].replace(anchor,anchor+insert,1);p.write_text(s)
p=sdk/'game.cpp';s=p.read_text().replace('extern cvar_t cof_save_debug;','extern cvar_t cof_save_debug;\nextern void CoF_RegisterPersistenceCallbacks(void);',1).replace('\tCVAR_REGISTER(&cof_save_debug);','\tCVAR_REGISTER(&cof_save_debug);\n\tCoF_RegisterPersistenceCallbacks();',1);p.write_text(s)
hooks=[(sdk/'monstermaker.cpp','Maker','CMonsterMaker', [('THINK','MakerThink'),('USE','ToggleUse'),('USE','CyclicUse')]),(sdk/'buttons.cpp','Spark','CEnvSpark',[('THINK','SparkThink'),('USE','SparkStart'),('USE','SparkStop')]),(repo/'game/cof-logic/cof/atmosphere.cpp','Fog','CEnvFog',[('THINK','FogThink')]),(repo/'game/cof-logic/cof/effects_cof.cpp','DynLight','CEnvDynLight',[('THINK','LightThink')]),(repo/'game/cof-logic/cof/teleport.cpp','Teleport','CCofTriggerTeleport',[('TOUCH','TeleportTouch')]),(repo/'game/cof-logic/cof/hud.cpp','Zoom','CCofCameraZoom',[('THINK','ReturnFOV')])]
for p,label,cls,methods in hooks:
 s=p.read_text();s+='\n#ifdef __EMSCRIPTEN__\nvoid CoF_Register'+label+'Callbacks(void)\n{\n'+''.join(' COF_SAVE_'+kind+'('+cls+','+method+');\n' for kind,method in methods)+'}\n#endif\n';p.write_text(s)
print('Installed explicit, cold-load-capable named callback fallback; unknown warnings retained')
