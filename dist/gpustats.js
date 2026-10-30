// gpustats.js - Estimación de VRAM de texturas y renderbuffers en WebGL 2.
//
// Se carga ANTES que el motor: envuelve los métodos de WebGL2RenderingContext que reservan memoria
// y lleva la cuenta por objeto textura y por nivel de mipmap. Es una estimación: el driver puede
// alinear o rellenar (RGB8 se guarda como RGBA8, por eso se cuenta a 4 bytes).
//
//   CoFGPU.vram()            -> { totalMiB, compressedMiB, uncompressedMiB, textures, ..., top }
//   ?vram=1 en la URL        -> panel en pantalla que se actualiza cada segundo
(() => {
  "use strict";

  const P = WebGL2RenderingContext.prototype;
  const GL = WebGL2RenderingContext;

  // bloques de 4x4: bytes por bloque
  const BLOCK_BYTES = {
    0x83F0: 8, 0x83F1: 8,       // DXT1 RGB / RGBA (BC1)
    0x83F2: 16, 0x83F3: 16,     // DXT3 / DXT5 (BC2 / BC3)
    0x8C4C: 8, 0x8C4D: 16, 0x8C4E: 16, 0x8C4F: 16, // S3TC sRGB
    0x8E8C: 16, 0x8E8D: 16, 0x8E8E: 16, 0x8E8F: 16, // BPTC (BC6H / BC7)
    0x9274: 8, 0x9278: 16,      // ETC2 RGB8 / RGBA8
  };
  const FORMAT_NAME = { 0x83F0: "BC1", 0x83F1: "BC1a", 0x83F2: "BC2", 0x83F3: "BC3", 0x8E8C: "BC7" };

  const SIZED_BPP = {
    [GL.R8]: 1, [GL.RG8]: 2, [GL.RGB8]: 4, [GL.RGBA8]: 4, [GL.SRGB8_ALPHA8]: 4,
    [GL.RGB565]: 2, [GL.RGBA4]: 2, [GL.RGB5_A1]: 2, [GL.RGB10_A2]: 4,
    [GL.R16F]: 2, [GL.RG16F]: 4, [GL.RGBA16F]: 8, [GL.R32F]: 4, [GL.RGBA32F]: 16,
    [GL.DEPTH_COMPONENT16]: 2, [GL.DEPTH_COMPONENT24]: 4, [GL.DEPTH24_STENCIL8]: 4,
    [GL.DEPTH_COMPONENT32F]: 4, [GL.DEPTH32F_STENCIL8]: 8, [GL.STENCIL_INDEX8]: 1,
  };

  const bppOf = (internalformat, format, type) => {
    if (SIZED_BPP[internalformat]) return SIZED_BPP[internalformat];
    if (type === GL.UNSIGNED_SHORT_5_6_5 || type === GL.UNSIGNED_SHORT_4_4_4_4 || type === GL.UNSIGNED_SHORT_5_5_5_1) return 2;
    const comps = { [GL.ALPHA]: 1, [GL.LUMINANCE]: 1, [GL.LUMINANCE_ALPHA]: 2, [GL.RED]: 1, [GL.RG]: 2, [GL.RGB]: 4, [GL.RGBA]: 4 }[format] || 4;
    const size = type === GL.FLOAT ? 4 : type === GL.HALF_FLOAT ? 2 : 1;
    return comps * size;
  };

  // textura -> { levels: Map("face:level" -> bytes), compressed, format, w, h }
  const textures = new Map();
  const renderbuffers = new Map();

  const bound = (gl, target) => gl.getParameter(target === GL.TEXTURE_2D ? GL.TEXTURE_BINDING_2D
    : target === GL.TEXTURE_3D ? GL.TEXTURE_BINDING_3D
    : target === GL.TEXTURE_2D_ARRAY ? GL.TEXTURE_BINDING_2D_ARRAY : GL.TEXTURE_BINDING_CUBE_MAP);

  const record = (gl, target, level, w, h, bytes, compressed, format) => {
    const tex = bound(gl, target);
    if (!tex) return;
    let e = textures.get(tex);
    if (!e) textures.set(tex, (e = { levels: new Map(), compressed, format, w, h }));
    e.levels.set(`${target}:${level}`, bytes);
    if (level === 0) { e.w = w; e.h = h; e.compressed = compressed; e.format = format; }
  };

  const calls = {};
  const wrap = (name, after) => {
    const orig = P[name];
    P[name] = function (...a) {
      calls[name] = (calls[name] || 0) + 1;
      const r = orig.apply(this, a);
      try { after.call(this, a); } catch (_) { /* nunca romper el render por la estadística */ }
      return r;
    };
  };

  wrap("texImage2D", function (a) {
    if (a.length < 9) return; // variante con ImageData/HTMLImageElement: no la usa el motor
    const [target, level, ifmt, w, h, , format, type] = a;
    record(this, target, level, w, h, w * h * bppOf(ifmt, format, type), false, ifmt);
  });
  wrap("texStorage2D", function ([target, levels, ifmt, w, h]) {
    const blocks = BLOCK_BYTES[ifmt];
    for (let l = 0, lw = w, lh = h; l < levels; l++, lw = Math.max(1, lw >> 1), lh = Math.max(1, lh >> 1)) {
      const bytes = blocks ? Math.ceil(lw / 4) * Math.ceil(lh / 4) * blocks : lw * lh * (SIZED_BPP[ifmt] || 4);
      record(this, target, l, lw, lh, bytes * (target === GL.TEXTURE_CUBE_MAP ? 6 : 1), !!blocks, ifmt);
    }
  });
  wrap("compressedTexImage2D", function ([target, level, ifmt, w, h]) {
    const bytes = Math.ceil(w / 4) * Math.ceil(h / 4) * (BLOCK_BYTES[ifmt] || 16);
    record(this, target, level, w, h, bytes, true, ifmt);
  });
  wrap("compressedTexSubImage2D", function () { /* solo cuenta: la memoria la reservó texStorage2D */ });
  wrap("texSubImage2D", function () {});
  wrap("copyTexImage2D", function ([target, level, ifmt, , , w, h]) {
    record(this, target, level, w, h, w * h * bppOf(ifmt, ifmt, GL.UNSIGNED_BYTE), false, ifmt);
  });
  wrap("generateMipmap", function ([target]) {
    const tex = bound(this, target);
    const e = tex && textures.get(tex);
    if (!e) return;
    const base = e.levels.get(`${target}:0`) || 0;
    let level = 1;
    for (let lw = e.w >> 1, lh = e.h >> 1; lw >= 1 || lh >= 1; lw >>= 1, lh >>= 1, level++) {
      e.levels.set(`${target}:${level}`, base / Math.pow(4, level));
      if (lw <= 1 && lh <= 1) break;
    }
  });
  wrap("deleteTexture", function ([tex]) { textures.delete(tex); });
  wrap("renderbufferStorage", function ([, ifmt, w, h]) {
    renderbuffers.set(this.getParameter(GL.RENDERBUFFER_BINDING), w * h * (SIZED_BPP[ifmt] || 4));
  });
  wrap("renderbufferStorageMultisample", function ([, samples, ifmt, w, h]) {
    renderbuffers.set(this.getParameter(GL.RENDERBUFFER_BINDING), w * h * (SIZED_BPP[ifmt] || 4) * Math.max(1, samples));
  });
  wrap("deleteRenderbuffer", function ([rb]) { renderbuffers.delete(rb); });

  const MiB = (b) => +(b / 1048576).toFixed(2);

  const vram = () => {
    let compressed = 0, uncompressed = 0, nCompressed = 0;
    const all = [];
    for (const e of textures.values()) {
      let bytes = 0;
      for (const b of e.levels.values()) bytes += b;
      if (e.compressed) { compressed += bytes; nCompressed++; } else uncompressed += bytes;
      all.push({ bytes, w: e.w, h: e.h, format: FORMAT_NAME[e.format] || `0x${e.format.toString(16)}` });
    }
    let rb = 0;
    for (const b of renderbuffers.values()) rb += b;
    const canvas = document.getElementById("canvas");
    // backbuffer: color + depth/stencil, el navegador puede tener otro más para componer
    const backbuffer = canvas ? canvas.width * canvas.height * 8 : 0;
    all.sort((x, y) => y.bytes - x.bytes);
    return {
      totalMiB: MiB(compressed + uncompressed + rb + backbuffer),
      compressedMiB: MiB(compressed), uncompressedMiB: MiB(uncompressed),
      renderbufferMiB: MiB(rb), backbufferMiB: MiB(backbuffer),
      textures: textures.size, compressedTextures: nCompressed,
      top: all.slice(0, 8).map((t) => `${t.w}x${t.h} ${t.format} ${MiB(t.bytes)}MiB`),
    };
  };

  window.CoFGPU = { vram, calls: () => ({ ...calls }) };

  if (new URLSearchParams(location.search).get("vram") === "1") {
    addEventListener("DOMContentLoaded", () => {
      const el = document.createElement("div");
      el.style.cssText = "position:fixed;left:8px;bottom:30vh;margin-bottom:8px;padding:4px 8px;" +
        "background:rgba(0,0,0,.7);color:#9f9;font:12px ui-monospace,monospace;pointer-events:none;white-space:pre";
      document.body.appendChild(el);
      setInterval(() => {
        const v = vram();
        el.textContent = `VRAM ~${v.totalMiB} MiB  texturas ${v.textures} (${v.compressedTextures} comprimidas)\n` +
          `  sin comprimir ${v.uncompressedMiB} MiB · comprimidas ${v.compressedMiB} MiB · backbuffer ${v.backbufferMiB} MiB`;
      }, 1000);
    });
  }
})();
