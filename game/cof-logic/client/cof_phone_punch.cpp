// Phone feedback reconstructed from the original viewpunch event / client spring.
// This is presentation state, separate from SDK recoil and server aim.
#include "hud.h"
#include "cl_util.h"
#include "parsemsg.h"
#include <math.h>
static float angle[3],velocity[3],peak[3],lastApplied[3];
static unsigned kicks,frames,traceFrames;
static cvar_t *trace;
static int PunchMessage(const char*,int size,void *data)
{
 BEGIN_READ(data,size);float impulse[3];for(int i=0;i<3;++i)impulse[i]=READ_COORD();
 velocity[0]-=20*impulse[0];velocity[1]+=20*impulse[1];velocity[2]+=20*impulse[2];
 ++kicks;traceFrames=0;return 1;
}
static void PunchStatus()
{
 gEngfuncs.Con_Printf("COF/PHONEPUNCH state kicks=%u frames=%u angle=%g,%g,%g velocity=%g,%g,%g applied=%g,%g,%g peak=%g,%g,%g\n",kicks,frames,angle[0],angle[1],angle[2],velocity[0],velocity[1],velocity[2],lastApplied[0],lastApplied[1],lastApplied[2],peak[0],peak[1],peak[2]);
}
void CoF_ClientPhonePunchInit()
{
 gEngfuncs.pfnHookUserMsg("CoFPunch",PunchMessage);
 gEngfuncs.pfnAddCommand("cof_phone_punch_status",PunchStatus);
 trace=gEngfuncs.pfnRegisterVariable("cof_phone_punch_trace","0",0);
}
void CoF_ClientPhonePunchReset()
{
 for(int i=0;i<3;++i)angle[i]=velocity[i]=peak[i]=lastApplied[i]=0;
 kicks=frames=traceFrames=0;
}
void CoF_ClientPhonePunchView(float *view,float dt)
{
 for(int i=0;i<3;++i){lastApplied[i]=angle[i];view[i]+=angle[i];peak[i]=fmaxf(peak[i],fabsf(angle[i]));}
 // The original applies the previous angle to this frame, then advances the spring.
 float a2=0,v2=0;for(int i=0;i<3;++i){a2+=angle[i]*angle[i];v2+=velocity[i]*velocity[i];}
 if(dt<=0 || !isfinite(dt) || (sqrtf(a2)<=0.001f && sqrtf(v2)<=0.001f))return;
 float damping=fmaxf(0,1-9*dt),spring=fminf(2,fmaxf(0,65*dt));
 float old[3],oldVelocity[3];for(int i=0;i<3;++i){old[i]=angle[i];oldVelocity[i]=velocity[i];angle[i]+=dt*velocity[i];velocity[i]=velocity[i]*damping-angle[i]*spring;}
 angle[0]=fminf(89,fmaxf(-89,angle[0]));angle[1]=fminf(179,fmaxf(-179,angle[1]));angle[2]=fminf(89,fmaxf(-89,angle[2]));++frames;
 if(trace && trace->value && traceFrames++<8)gEngfuncs.Con_Printf("COF/PHONEPUNCH step dt=%.9g before=%.9g,%.9g,%.9g velocity=%.9g,%.9g,%.9g after=%.9g,%.9g,%.9g next=%.9g,%.9g,%.9g\n",dt,old[0],old[1],old[2],oldVelocity[0],oldVelocity[1],oldVelocity[2],angle[0],angle[1],angle[2],velocity[0],velocity[1],velocity[2]);
}