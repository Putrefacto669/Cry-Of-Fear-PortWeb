#version 300 es
// water.frag.glsl - GLSL ES 3.00 translation of cryoffear/cgshaders/water_fp.cg
//
// The fp20_water_fp.cg variant uses offsettex2D (NV_texture_shader, GeForce 3 era) plus an
// "Identity" texture as a lookup table. On ES 3.00 that whole trick is the explicit form below,
// which is exactly what water_fp.cg computes, so both variants collapse into this shader.
precision mediump float;

uniform sampler2D uOffsetTex; // TEXUNIT0: distortion map, uses .r/.g
uniform sampler2D uDecalTex;  // TEXUNIT2: what is seen through the water
uniform sampler2D uMaskTex;   // TEXUNIT3: where the effect applies, uses .r
uniform vec4 uTexOffset;      // 2x2 offset matrix: xy scales .r, zw scales .g

in vec2 vTexCoord0;
in vec2 vTexCoord1;
in vec2 vTexCoord3;
out vec4 fragColor;

void main()
{
	vec4 offset = texture( uOffsetTex, vTexCoord0 );
	vec2 uv = vTexCoord1 + uTexOffset.xy * offset.xx + uTexOffset.zw * offset.yy;

	vec4 color = vec4( texture( uDecalTex, uv ).rgb, 1.0 );
	float mask = texture( uMaskTex, vTexCoord3 ).r;

	fragColor = color * mask;
}
