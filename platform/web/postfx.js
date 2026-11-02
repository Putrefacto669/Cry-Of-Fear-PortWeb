// postfx.js - Efectos de pantalla de Cry of Fear (linterna, gris, grano, viñeta) sobre WebGL 2.
//
// Se ejecuta justo después de cada frame del motor (MainLoop.postMainLoop), en el mismo contexto:
//   1. copia el backbuffer a una textura (copyTexSubImage2D)
//   2. dibuja un triángulo a pantalla completa con shaders/postfx.frag.glsl
// El renderer del motor asume que su estado GL persiste entre frames, así que todo lo que se toca
// se guarda y se restaura.
//
// API: CoFPostFX.set({ flashlight: true, grain: 0.06, grey: 0, vignette: 0.35 })
//      CoFPostFX.stats()  -> coste medio por frame en ms (CPU, incluye la copia)
// The legacy screen-space flashlight remains available through set() for diagnostics.
// Gameplay input belongs to the server: CoFLight drives the renderer's COF_SPOT_KEY.
// A separate KeyF toggle diverges from the phone's SMS mode and from restored saves.
(() => {
  "use strict";

  const settings = {
    flashlight: false,
    // El original suma luz al albedo; aquí solo existe el frame ya iluminado (valores de 3-8/255 en
    // el bosque), así que hay que multiplicar fuerte para un resultado parecido.
    flashlightGain: 12.0,     // ganancia en el centro del cono
    flashlightSize: 0.5,      // radio del cono en alturas de pantalla
    flashlightTint: [1.0, 0.93, 0.8], // halógeno cálido
    grey: 0,                  // 0..1, cof_blackandwhite (strength / 255)
    grain: 0.06,              // cl_noiseeffect 1 en autoexec.cfg
    vignette: 0.35,
    blur: 0,                  // radio en píxeles; CoF "cof_blur" (gl_screenblur)
  };

  let gl = null;
  let prog = null;
  let vao = null;
  let sceneTex = null;
  let cookieTex = null;
  let sceneW = 0;
  let sceneH = 0;
  let loc = {};
  let flashlightLevel = 0;           // 0..1 con fundido
  const sway = [0, 0];               // retardo del cono respecto a la vista
  const swayVel = [0, 0];
  let lastTime = performance.now();
  let costSum = 0;
  let costFrames = 0;

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };

  // gfx/flashlight.tga: TGA tipo 2, 24 bits, origen abajo-izquierda. Si falta, cono procedural.
  const loadCookie = () => {
    const size = 512;
    let pixels = null;
    try {
      const d = FS.readFile("/rodir/cryoffear/gfx/flashlight.tga");
      const w = d[12] | (d[13] << 8), h = d[14] | (d[15] << 8), bpp = d[16];
      if (d[2] === 2 && bpp === 24 && w === size && h === size) {
        pixels = new Uint8Array(size * size);
        const ofs = 18 + d[0];
        let max = 1;
        for (let i = 0; i < size * size; i++) max = Math.max(max, (pixels[i] = d[ofs + i * 3 + 2])); // canal R (BGR)
        // el original llega a ~99/255 en el centro porque client.dll lo suma a su luz;
        // normalizado, uFlashlightGain es directamente la ganancia en el centro del cono
        for (let i = 0; i < size * size; i++) pixels[i] = (pixels[i] * 255) / max;
      }
    } catch (_) { /* sin datos del juego */ }
    if (!pixels) {
      pixels = new Uint8Array(size * size);
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const r = Math.hypot(x - size / 2, y - size / 2) / (size / 2);
        pixels[y * size + x] = 255 * Math.max(0, 1 - r * r);
      }
    }
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, size, size, 0, gl.RED, gl.UNSIGNED_BYTE, pixels);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  };

  const init = (sources) => {
    gl = GLctx;
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, sources.vert));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, sources.frag));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    for (const n of ["uScene", "uCookie", "uTime", "uResolution", "uFlashlight", "uFlashlightSway",
      "uFlashlightGain", "uFlashlightSize", "uFlashlightTint", "uGrey", "uGrain", "uVignette", "uBlur"]) {
      loc[n] = gl.getUniformLocation(prog, n);
    }
    vao = gl.createVertexArray(); // vacío: los vértices salen de gl_VertexID
    sceneTex = gl.createTexture();
    cookieTex = loadCookie();
  };

  // Estado GL que el pase modifica
  const save = () => ({
    program: gl.getParameter(gl.CURRENT_PROGRAM),
    vao: gl.getParameter(gl.VERTEX_ARRAY_BINDING),
    activeTexture: gl.getParameter(gl.ACTIVE_TEXTURE),
    tex0: (gl.activeTexture(gl.TEXTURE0), gl.getParameter(gl.TEXTURE_BINDING_2D)),
    sampler0: gl.getParameter(gl.SAMPLER_BINDING),
    tex1: (gl.activeTexture(gl.TEXTURE1), gl.getParameter(gl.TEXTURE_BINDING_2D)),
    sampler1: gl.getParameter(gl.SAMPLER_BINDING),
    drawFb: gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING),
    readFb: gl.getParameter(gl.READ_FRAMEBUFFER_BINDING),
    viewport: gl.getParameter(gl.VIEWPORT),
    blend: gl.isEnabled(gl.BLEND),
    depth: gl.isEnabled(gl.DEPTH_TEST),
    cull: gl.isEnabled(gl.CULL_FACE),
    scissor: gl.isEnabled(gl.SCISSOR_TEST),
    stencil: gl.isEnabled(gl.STENCIL_TEST),
    colorMask: gl.getParameter(gl.COLOR_WRITEMASK),
    unpackAlign: gl.getParameter(gl.UNPACK_ALIGNMENT),
  });

  const restore = (s) => {
    gl.useProgram(s.program);
    gl.bindVertexArray(s.vao);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, s.tex1); gl.bindSampler(1, s.sampler1);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, s.tex0); gl.bindSampler(0, s.sampler0);
    gl.activeTexture(s.activeTexture);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, s.drawFb);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, s.readFb);
    gl.viewport(s.viewport[0], s.viewport[1], s.viewport[2], s.viewport[3]);
    for (const [cap, on] of [[gl.BLEND, s.blend], [gl.DEPTH_TEST, s.depth], [gl.CULL_FACE, s.cull],
      [gl.SCISSOR_TEST, s.scissor], [gl.STENCIL_TEST, s.stencil]]) {
      if (on) gl.enable(cap); else gl.disable(cap);
    }
    gl.colorMask(s.colorMask[0], s.colorMask[1], s.colorMask[2], s.colorMask[3]);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, s.unpackAlign);
  };

  const active = () => settings.flashlight || flashlightLevel > 0 || settings.grey > 0 || settings.blur > 0 || settings.grain > 0 || settings.vignette > 0;

  const frame = () => {
    if (!gl || !active()) return;
    const t0 = performance.now();
    const dt = Math.min(0.1, (t0 - lastTime) / 1000);
    lastTime = t0;

    // fundido de la linterna y muelle del retardo del cono
    flashlightLevel = Math.max(0, Math.min(1, flashlightLevel + (settings.flashlight ? 8 : -8) * dt));
    for (let i = 0; i < 2; i++) {
      swayVel[i] += (-sway[i] * 60 - swayVel[i] * 12) * dt;
      sway[i] += swayVel[i] * dt;
    }

    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const s = save();

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneTex);
    gl.bindSampler(0, null);
    if (w !== sceneW || h !== sceneH) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      sceneW = w; sceneH = h;
    }
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, w, h);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, cookieTex);
    gl.bindSampler(1, null);

    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
    for (const cap of [gl.BLEND, gl.DEPTH_TEST, gl.CULL_FACE, gl.SCISSOR_TEST, gl.STENCIL_TEST]) gl.disable(cap);
    gl.colorMask(true, true, true, true);

    gl.useProgram(prog);
    gl.bindVertexArray(vao);
    gl.uniform1i(loc.uScene, 0);
    gl.uniform1i(loc.uCookie, 1);
    gl.uniform1f(loc.uTime, t0 / 1000);
    gl.uniform2f(loc.uResolution, w, h);
    gl.uniform1f(loc.uFlashlight, flashlightLevel);
    gl.uniform2f(loc.uFlashlightSway, sway[0], sway[1]);
    gl.uniform1f(loc.uFlashlightGain, settings.flashlightGain);
    gl.uniform1f(loc.uFlashlightSize, settings.flashlightSize);
    gl.uniform3fv(loc.uFlashlightTint, settings.flashlightTint);
    // Native client.dll gl_grayscale override while nightvision is visible: 0.6.
    gl.uniform1f(loc.uGrey, settings.nightvision ? 0.6 : settings.grey);
    gl.uniform1f(loc.uGrain, settings.grain);
    gl.uniform1f(loc.uVignette, settings.vignette);
    gl.uniform1f(loc.uBlur, settings.blur);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    restore(s);
    costSum += performance.now() - t0;
    costFrames++;
  };

  // el cono se queda atrás al girar y vuelve con un muelle, como la linterna en la mano
  document.addEventListener("mousemove", (e) => {
    if (!document.pointerLockElement) return;
    swayVel[0] -= e.movementX * 0.002;
    swayVel[1] += e.movementY * 0.002;
  });

  window.CoFPostFX = {
    // carga los shaders y se engancha al bucle; el contexto GL lo crea el motor más tarde
    async attach() {
      const [vert, frag] = await Promise.all(
        ["shaders/postfx.vert.glsl", "shaders/postfx.frag.glsl"].map((u) => fetch(u).then((r) => r.text())));
      MainLoop.postMainLoop.push(() => {
        if (!gl && typeof GLctx !== "undefined" && GLctx) init({ vert, frag });
        frame();
      });
    },
    set(opts) { Object.assign(settings, opts); return { ...settings }; },
    get() { return { ...settings }; },
    stats() {
      const ms = costFrames ? costSum / costFrames : 0;
      costSum = 0; costFrames = 0;
      return { msPerFrame: +ms.toFixed(3), size: [sceneW, sceneH] };
    },
  };
})();
