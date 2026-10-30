#version 300 es
// water.vert.glsl - GLSL ES 3.00 translation of cryoffear/cgshaders/water_vp.cg
//
// Not wired yet: it has to be bound by the renderer when drawing water surfaces
// (ref/gl), it cannot run as a screen-space pass like flashlight/grain/black.
layout(location = 0) in vec4 aPosition;
layout(location = 1) in vec4 aTexCoord0;

uniform mat4 uModelViewProj;
uniform float uScreen; // flScreen: vertical scroll of the decal lookup

out vec2 vTexCoord0; // offset (normal) map
out vec2 vTexCoord1; // base coordinate for the refracted lookup
out vec2 vTexCoord2; // scrolled decal coordinate (used by the fp20 path)
out vec2 vTexCoord3; // mask

void main()
{
	vTexCoord0 = aTexCoord0.xy;
	vTexCoord1 = aTexCoord0.xy;
	vTexCoord2 = vec2( aTexCoord0.x, aTexCoord0.y + uScreen );
	vTexCoord3 = aTexCoord0.xy;
	gl_Position = uModelViewProj * aPosition;
}
