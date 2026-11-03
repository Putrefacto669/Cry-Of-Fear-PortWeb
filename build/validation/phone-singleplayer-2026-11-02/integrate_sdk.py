from pathlib import Path
p=Path('/root/cof-audits/audit-D3Kl5uly/game/hlsdk-portable/pm_shared/pm_shared.c');s=p.read_text();a='void PM_DropPunchAngle( vec3_t punchangle )\n{\n\tfloat len;'
b='''#ifdef __EMSCRIPTEN__
// CoF SP: PM vuser3 is angular punch velocity (original 10005260).
// Debug counters are outside movement/save state and never affect the recurrence.
static int cofPunchTrace[32];
void CoF_PunchSetTrace(int player, int frames)
{
 if(player>=0 && player<32)cofPunchTrace[player]=frames<0?0:frames>8?8:frames;
}
#endif
void PM_DropPunchAngle( vec3_t punchangle )
{
 float len;
#ifdef __EMSCRIPTEN__
 if(!pmove->multiplayer) {
  float dt=pmove->frametime,damping,spring;int i;
  vec3_t before,velocity;
  if(pmove->dead)pmove->vuser3[2]=670.0f;
  if(atoi(pmove->PM_Info_ValueForKey(pmove->physinfo,"chr"))==2)pmove->vuser3[0]=670.0f;
  if((double)Length(punchangle)<=0.001 && (double)Length(pmove->vuser3)<=0.001)return;
  VectorCopy(punchangle,before);VectorCopy(pmove->vuser3,velocity);
  VectorMA(punchangle,dt,pmove->vuser3,punchangle);
  damping=max(0.0f,1.0f-9.0f*dt);VectorScale(pmove->vuser3,damping,pmove->vuser3);
  spring=min(2.0f,max(0.0f,65.0f*dt));VectorMA(pmove->vuser3,-spring,punchangle,pmove->vuser3);
  for(i=0;i<3;i++){float limit=i==1?179.0f:89.0f;punchangle[i]=min(limit,max(-limit,punchangle[i]));}
  if(pmove->server && pmove->player_index>=0 && pmove->player_index<32 && cofPunchTrace[pmove->player_index]>0) {
   --cofPunchTrace[pmove->player_index];
   pmove->Con_Printf("COF/SPPUNCH step dt=%.9g before=%.9g,%.9g,%.9g velocity=%.9g,%.9g,%.9g after=%.9g,%.9g,%.9g next=%.9g,%.9g,%.9g\\n",dt,before[0],before[1],before[2],velocity[0],velocity[1],velocity[2],punchangle[0],punchangle[1],punchangle[2],pmove->vuser3[0],pmove->vuser3[1],pmove->vuser3[2]);
  }
  return;
 }
#endif'''
assert a in s;s=s.replace(a,b);p.write_text(s)
p=Path('/root/cof-audits/audit-D3Kl5uly/game/hlsdk-portable/dlls/client.cpp');s=p.read_text();a='#endif\n}\n\n/*\n=================\nCmdStart';b='''#endif
#ifdef __EMSCRIPTEN__
 // CoF uses cl_lw=0: preserve SP angular velocity for movement prediction,
 // instead of the stock weapon-prediction ammo encoding in vuser3.z.
 if(gpGlobals->maxClients<=1 && !sendweapons)cd->vuser3=pev->vuser3;
#endif
}

/*
=================
CmdStart''';assert a in s;s=s.replace(a,b);p.write_text(s)
p=Path('/root/cof-audits/audit-D3Kl5uly/game/hlsdk-portable/cl_dll/view.cpp');s=p.read_text().replace('void CoF_ClientPhonePunchView(float *,float);','void CoF_ClientPhonePunchView(float *,float,const float *);').replace('CoF_ClientPhonePunchView(pparams->viewangles,pparams->frametime);','CoF_ClientPhonePunchView(pparams->viewangles,pparams->frametime,pparams->punchangle);');p.write_text(s)