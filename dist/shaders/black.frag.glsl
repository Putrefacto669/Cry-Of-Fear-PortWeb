#version 300 es
// black.frag.glsl - GLSL ES 3.00 translation of cryoffear/cgshaders/black_fp.cg (and fp20_black_fp.cg)
//
// Cg -> GLSL ES 3.00:
//   tex2D(DecalTex, uv)      -> texture(uDecalTex, uv)
//   float4 COLOR output      -> out vec4 fragColor (clamped to [0,1] on write, like the fixed pipeline)
//   expand(x)  (fp20 variant) -> 2.0 * (x - 0.5), which is what black_fp.cg spells out by hand
precision mediump float;

uniform sampler2D uDecalTex;
in vec2 vTexCoord0;
out vec4 fragColor;

void main()
{
	vec4 color = texture( uDecalTex, vTexCoord0 );

	// the original divides the channel sum by 0.5 (i.e. 2 * (r + g + b)), kept as is
	float luma = ( color.r + color.g + color.b ) / 0.5;
	luma = 2.0 * ( luma - 0.5 );

	fragColor = vec4( vec3( 0.2 - luma ), 1.0 );
}
