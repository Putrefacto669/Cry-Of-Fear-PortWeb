#version 300 es
// black.vert.glsl - GLSL ES 3.00 translation of cryoffear/cgshaders/black_vp.cg
//
// Cg -> GLSL ES 3.00: POSITION/TEXCOORD0 semantics become explicit attribute locations,
// mul(ModelViewProj, pos) becomes uModelViewProj * pos (column-major on both sides).
layout(location = 0) in vec4 aPosition;
layout(location = 1) in vec4 aTexCoord0;

uniform mat4 uModelViewProj;
out vec2 vTexCoord0;

void main()
{
	vTexCoord0 = aTexCoord0.xy;
	gl_Position = uModelViewProj * aPosition;
}
