from pathlib import Path
r=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web');sdk=Path('/root/cof-audits/audit-D3Kl5uly/game/hlsdk-portable')
p=r/'game/cof-logic/cof/weapons_cof.cpp';s=p.read_text().replace('static int gmsgCoFHands;','static int gmsgCoFHands;\nvoid CoF_LinkHandsMessages(){if(!gmsgCoFHands)gmsgCoFHands=REG_USER_MSG("CoFHands",12);}')
s=s.replace('if(!gmsgCoFHands)gmsgCoFHands=REG_USER_MSG("CoFHands",12);\n cof_phone_t', 'CoF_LinkHandsMessages();\n cof_phone_t');p.write_text(s)
p=r/'game/cof-logic/cof/atmosphere.cpp';s=p.read_text().replace('void CoF_LinkExtrasMessages( void );','void CoF_LinkExtrasMessages( void );\nvoid CoF_LinkHandsMessages();').replace('CoF_LinkExtrasMessages();','CoF_LinkExtrasMessages();\n CoF_LinkHandsMessages();');p.write_text(s)
p=r/'game/cof-logic/client/cof_client.cpp';s=p.read_text().replace('void CoF_ClientExtrasInit();','void CoF_ClientExtrasInit();\nvoid CoF_ClientHandsInit();void CoF_ClientHandsReset();').replace('CoF_ClientExtrasInit();\n', 'CoF_ClientExtrasInit();\n CoF_ClientHandsInit();\n')
# Avoid changing declarations into calls at file scope.
s=s.replace('void CoF_ClientExtrasInit();\n CoF_ClientHandsInit();\n','void CoF_ClientExtrasInit();\n')
s=s.replace('CoF_ClientExtrasReset();\n\tfor','CoF_ClientExtrasReset();\n CoF_ClientHandsReset();\n\tfor');p.write_text(s)
p=sdk/'cl_dll/GameStudioModelRenderer.cpp';s=p.read_text();s=s.replace('int R_StudioDrawModel( int flags )','extern void CoF_DrawOffhand(int flags);\nint R_StudioDrawModel( int flags )')
s=s.replace('return g_StudioRenderer.StudioDrawModel( flags );','int result=g_StudioRenderer.StudioDrawModel(flags);\n CoF_DrawOffhand(flags);return result;');p.write_text(s)
p=sdk/'cl_dll/StudioModelRenderer.cpp';s=p.read_text();s=s.replace('extern void CoF_CostumeEnd();','extern void CoF_CostumeEnd();\nextern void CoF_HandsMirror(float (*matrix)[4]);\nextern void CoF_HandsBeforePoints();extern void CoF_HandsAfterPoints();')
s=s.replace('AngleMatrix( angles, ( *m_protationmatrix ) );','AngleMatrix( angles, ( *m_protationmatrix ) );\n CoF_HandsMirror(*m_protationmatrix);')
s=s.replace('IEngineStudio.StudioDrawPoints();','CoF_HandsBeforePoints();\n\t\t\tIEngineStudio.StudioDrawPoints();\n\t\t\tCoF_HandsAfterPoints();');p.write_text(s)