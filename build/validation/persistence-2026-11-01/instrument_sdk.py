from pathlib import Path
sdk=Path('/root/cof-audits/audit-D3Kl5uly/game/hlsdk-portable/dlls')
p=sdk/'cbase.h';s=p.read_text();anchor='// Ugly technique to override base member functions'
helper='''#if defined(__EMSCRIPTEN__) && !defined(CLIENT_DLL)
void CoF_RecordCallback(const void *value, unsigned size, const char *name);
void CoF_DumpCallbacks(void);
extern cvar_t cof_save_debug;
template<class T> inline T CoF_ObserveCallback(T value, const char *name)
{
 CoF_RecordCallback(&value, sizeof(value), name);
 return value;
}
#endif

'''
s=s.replace(anchor,helper+anchor,1)
# Preserve the assignment and function type; only record its diagnostic label.
for macro in ('SetThink','SetTouch','SetUse','SetBlocked','SetMoveDone'):
 lines=s.splitlines(True);out=[]
 for line in lines:
  if line.startswith('#define '+macro+'(') and ' = static_cast' in line:
   prefix,expr=line.rstrip('\n').split(' = ',1)
   out.append('#if defined(__EMSCRIPTEN__) && !defined(CLIENT_DLL)\n'+prefix+' = CoF_ObserveCallback('+expr+', #a)\n#else\n'+line+'#endif\n')
  else:out.append(line)
 s=''.join(out)
p.write_text(s)
p=sdk/'cbase.cpp';s=p.read_text();anchor='// Global Savedata for Delay'
helper=r'''#ifdef __EMSCRIPTEN__
// Diagnostic labels only: never serialize process-local pointer bytes.
cvar_t cof_save_debug = { "cof_save_debug", "0" };
struct CofCallbackLabel { unsigned words[2]; const char *name; };
static CofCallbackLabel cofCallbackLabels[1024];
static unsigned cofCallbackCount;
void CoF_RecordCallback(const void *value, unsigned size, const char *name)
{
 if(size!=sizeof(cofCallbackLabels[0].words))return;
 unsigned words[2];memcpy(words,value,size);if(!words[0]&&!words[1])return;
 for(unsigned i=0;i<cofCallbackCount;++i)
  if(!memcmp(words,cofCallbackLabels[i].words,size)&&!strcmp(name,cofCallbackLabels[i].name))return;
 if(cofCallbackCount==1024)return;
 memcpy(cofCallbackLabels[cofCallbackCount].words,words,size);
 cofCallbackLabels[cofCallbackCount++].name=name;
}
void CoF_DumpCallbacks(void)
{
 for(unsigned i=0;i<cofCallbackCount;++i)
  ALERT(at_console,"COF/REG raw=%x:%x name=%s\n",cofCallbackLabels[i].words[0],cofCallbackLabels[i].words[1],cofCallbackLabels[i].name);
 for(int i=0;i<gpGlobals->maxEntities;++i){edict_t *ed=INDEXENT(i);if(!ed||ed->free||!ed->pvPrivateData)continue;
  CBaseEntity *e=CBaseEntity::Instance(ed);unsigned f[4][2];
  memcpy(f[0],&e->m_pfnThink,8);memcpy(f[1],&e->m_pfnTouch,8);memcpy(f[2],&e->m_pfnUse,8);memcpy(f[3],&e->m_pfnBlocked,8);
  ALERT(at_console,"COF/STATE id=%d class=%s target=%s model=%s think=%x:%x touch=%x:%x use=%x:%x blocked=%x:%x next=%g now=%g health=%g dead=%d sequence=%d frame=%g origin=%g,%g,%g\n",
   i,STRING(e->pev->classname),STRING(e->pev->targetname),STRING(e->pev->model),f[0][0],f[0][1],f[1][0],f[1][1],f[2][0],f[2][1],f[3][0],f[3][1],e->pev->nextthink,gpGlobals->time,e->pev->health,e->pev->deadflag,e->pev->sequence,e->pev->frame,e->pev->origin.x,e->pev->origin.y,e->pev->origin.z);
 }
}
#endif

'''.replace('\\"','"')
s=s.replace(anchor,helper+anchor,1);p.write_text(s)
p=sdk/'game.cpp';s=p.read_text().replace('extern void CoF_RegisterWeaponSkill( void );','extern void CoF_RegisterWeaponSkill( void );\n#ifdef __EMSCRIPTEN__\nextern cvar_t cof_save_debug;\n#endif',1).replace('\tCoF_RegisterWeaponSkill();','\tCoF_RegisterWeaponSkill();\n#ifdef __EMSCRIPTEN__\n\tCVAR_REGISTER(&cof_save_debug);\n#endif',1);p.write_text(s)
p=sdk/'util.cpp';s=p.read_text();anchor='\t\tcase FIELD_FUNCTION:\n\t\t\tWriteFunction( pTest->fieldName, (void **)pOutputData, pTest->fieldSize );'
replacement='''\t\tcase FIELD_FUNCTION:
#ifdef __EMSCRIPTEN__
            if(cof_save_debug.value){
             CBaseEntity *entity=(CBaseEntity*)pBaseData;unsigned words[2];memcpy(words,pOutputData,8);
             ALERT(at_console,"COF/SAVEFN id=%d class=%s target=%s model=%s section=%s field=%s raw=%x:%x named=%d\\n",entity->entindex(),STRING(entity->pev->classname),STRING(entity->pev->targetname),STRING(entity->pev->model),pname,pTest->fieldName,words[0],words[1],NAME_FOR_FUNCTION(*(void**)pOutputData)!=NULL);
            }
#endif
\t\t\tWriteFunction( pTest->fieldName, (void **)pOutputData, pTest->fieldSize );'''
assert anchor in s;s=s.replace(anchor,replacement,1);p.write_text(s)
print('Instrumented callback assignments, save fields and read-only state dump')
