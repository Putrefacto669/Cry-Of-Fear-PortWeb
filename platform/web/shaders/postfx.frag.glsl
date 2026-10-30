#version 300 es
// postfx.frag.glsl - Cry of Fear screen effects in a single pass over the finished frame
//
//   flashlight: Cry of Fear projects gfx/flashlight.tga from client.dll (no shader ships with the
//               game). Here the same cookie is applied in screen space: no depth buffer is
//               available to the page, so the cone has no distance falloff or occlusion.
//   grey:       cof_blackandwhite, client.dll's gl_grayscale pass: the frame drawn again in
//               grey over itself with alpha = strength / 255 (not cgshaders/black_fp.cg, which
//               inverts the image)
//   grain:      cl_noiseeffect, recreated as per-frame hashed noise, stronger in the shadows
//   vignette:   darkened corners
//
// One texture fetch for the scene plus one for the cookie keeps it cheap at 1080p/1440p.
precision mediump float;
precision highp int; // the hash needs 32-bit uints, mediump int may be 16-bit

uniform sampler2D uScene;
uniform sampler2D uCookie;

uniform float uTime;
uniform vec2  uResolution;

uniform float uFlashlight;      // 0..1, fades on/off
uniform vec2  uFlashlightSway;  // cone center offset in screen UV (head bob / lag)
uniform float uFlashlightGain;  // how much the cone multiplies the scene
uniform float uFlashlightSize;  // cone radius relative to screen height
uniform vec3  uFlashlightTint;

uniform float uGrey;            // 0..1: how much of the frame turns grey
uniform float uGrain;           // grain amplitude, 0 disables
uniform float uVignette;        // 0 disables
uniform float uBlur;            // screen blur radius in pixels, 0 disables

in vec2 vUV;
out vec4 fragColor;

// integer hash, stable across GPUs (no sin() precision issues on mediump)
float Hash( uvec3 v )
{
	v = v * 1664525u + 1013904223u;
	v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
	v ^= v >> 16u;
	v.x += v.y * v.z;
	return float( v.x & 0xffffu ) / 65535.0;
}

vec3 Grey( vec3 color, float amount )
{
	float luma = dot( color, vec3( 0.299, 0.587, 0.114 ));
	return mix( color, vec3( luma ), amount );
}

void main()
{
	vec3 color = texture( uScene, vUV ).rgb;

	if( uBlur > 0.0 )
	{
		vec2 px = uBlur / uResolution;
		vec3 b = color * 4.0;
		b += texture( uScene, vUV + vec2( px.x, 0.0 )).rgb;
		b += texture( uScene, vUV - vec2( px.x, 0.0 )).rgb;
		b += texture( uScene, vUV + vec2( 0.0, px.y )).rgb;
		b += texture( uScene, vUV - vec2( 0.0, px.y )).rgb;
		color = b / 8.0;
	}

	if( uFlashlight > 0.0 )
	{
		// cookie is square: map a circle of radius uFlashlightSize (in screen heights) onto it
		float aspect = uResolution.x / uResolution.y;
		vec2 p = ( vUV - 0.5 - uFlashlightSway ) * vec2( aspect, 1.0 ) / ( 2.0 * uFlashlightSize ) + 0.5;
		float cookie = all( greaterThanEqual( p, vec2( 0.0 ))) && all( lessThanEqual( p, vec2( 1.0 )))
			? texture( uCookie, p ).r : 0.0;

		// lightmapped surfaces are dark but not black: scaling them brings the albedo back
		vec3 lit = color * ( 1.0 + uFlashlightGain * cookie * uFlashlightTint );
		color = mix( color, lit, uFlashlight );
	}

	if( uGrey > 0.0 )
		color = Grey( color, uGrey );

	if( uVignette > 0.0 )
	{
		vec2 d = vUV - 0.5;
		color *= 1.0 - uVignette * dot( d, d ) * 2.0;
	}

	if( uGrain > 0.0 )
	{
		uvec3 seed = uvec3( uvec2( gl_FragCoord.xy ), uint( uTime * 24.0 )); // 24 fps film cadence
		float n = Hash( seed ) - 0.5;
		float luma = dot( color, vec3( 0.299, 0.587, 0.114 ));
		color += n * uGrain * ( 1.0 - 0.6 * luma );
	}

	fragColor = vec4( clamp( color, 0.0, 1.0 ), 1.0 );
}
