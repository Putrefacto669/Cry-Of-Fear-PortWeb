// hud.js - Cry of Fear overlays: main menu, logos, introductions, health/stamina bars, bag, music.
//
// The server emits one-line text markers (see game/cof-logic/cof/hud.cpp); loader.js
// forwards them here. Images come straight from the mounted game data, so no extra
// copies are added to the distribution. TGA 2.0 type 2 (uncompressed true-color) is
// enough for every asset used by these messages.
(() => {
  "use strict";

  const LOGOS = ["logo", "andreas", "james", "jordy", "stig", "lasse", "aina"];
  const LANGS = { 0: "english", 2: "dutch", 3: "french", 4: "german", 5: "norwegian", 6: "spanish", 7: "swedish" };
  const TYPES = ["sp", "doc", "coop"];

  const cache = new Map();
  let logoImg = null;
  let introImg = null;
  let logoTimer = 0;
  let logoToken = 0;
  let introVisible = false;
  let introBusy = false;

  const ensureDom = () => {
    if (logoImg) return;
    const style = document.createElement("style");
    style.textContent = `
      #cof-hud { position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
                 pointer-events:none; z-index:10; overflow:hidden; }
      #cof-hud img { position:absolute; max-width:90%; max-height:86%; width:auto; height:auto;
                     opacity:0; transition:opacity .25s ease; image-rendering:auto; }
    `;
    document.head.appendChild(style);

    const box = document.createElement("div");
    box.id = "cof-hud";
    logoImg = document.createElement("img");
    logoImg.alt = "";
    introImg = document.createElement("img");
    introImg.alt = "";
    box.append(introImg, logoImg);
    document.querySelector("main").appendChild(box);
  };

  // The definition files and the maps mix upper and lower case freely; MEMFS does not.
  const resolveCi = (path) => {
    if (FS.analyzePath(path).exists) return path;
    let cur = "";
    for (const part of path.split("/").filter(Boolean)) {
      const want = part.toLowerCase();
      const hit = FS.readdir(cur || "/").find((n) => n.toLowerCase() === want);
      if (!hit) throw new Error(`no existe ${path}`);
      cur += `/${hit}`;
    }
    return cur;
  };

  // Returns a data: URL. TGA type 2, 24/32 bpp, uncompressed; descriptor bit 5 = top origin.
  const loadTga = (path) => {
    if (cache.has(path)) return Promise.resolve(cache.get(path));
    return Promise.resolve().then(() => {
      const d = FS.readFile(resolveCi(path));
      const idLen = d[0], imageType = d[2], w = d[12] | (d[13] << 8), h = d[14] | (d[15] << 8);
      const bpp = d[16], desc = d[17];
      if (imageType !== 2 || (bpp !== 24 && bpp !== 32) || !w || !h) throw new Error("TGA no soportado");
      const src = 18 + idLen;
      const out = new ImageData(w, h);
      const rgba = out.data;
      const top = (desc & 0x20) !== 0;
      const px = bpp >> 3;
      for (let y = 0; y < h; y++) {
        const sy = top ? y : h - 1 - y;
        for (let x = 0; x < w; x++) {
          const si = src + (sy * w + x) * px;
          const di = (y * w + x) * 4;
          rgba[di + 0] = d[si + 2];
          rgba[di + 1] = d[si + 1];
          rgba[di + 2] = d[si + 0];
          rgba[di + 3] = px === 4 ? d[si + 3] : 255;
        }
      }
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d").putImageData(out, 0, 0);
      const url = c.toDataURL("image/png");
      cache.set(path, url);
      return url;
    });
  };

  const logoPath = (index) => {
    const name = LOGOS[index];
    return name ? `/rodir/cryoffear/gfx/vgui/640_logo_${name}.tga` : null;
  };

  const introPath = (mode, lang) => {
    const language = LANGS[lang] || "english";
    const type = TYPES[mode] || "sp";
    return `/rodir/cryoffear/gfx/vgui/introductions/${language}/${language}_${type}.TGA`;
  };

  const showLogo = (index) => {
    ensureDom();
    const path = logoPath(index);
    if (!path) return;
    const token = ++logoToken;
    clearTimeout(logoTimer);
    loadTga(path).then((url) => {
      if (token !== logoToken) return;
      logoImg.src = url;
      logoImg.hidden = false;
      void logoImg.offsetWidth;
      logoImg.style.opacity = "1";
      const duration = index === 0 ? 5000 : 3000;
      logoTimer = setTimeout(() => {
        if (token !== logoToken) return;
        logoImg.style.opacity = "0";
        setTimeout(() => { if (token === logoToken) logoImg.hidden = true; }, 300);
      }, duration);
    }).catch((e) => console.warn("cof logo:", e.message));
  };

  const toggleIntro = (mode, lang) => {
    ensureDom();
    if (introVisible) {
      introVisible = false;
      introImg.style.opacity = "0";
      setTimeout(() => { if (!introVisible) introImg.hidden = true; }, 300);
      return;
    }
    if (introBusy) return;
    introBusy = true;
    const path = introPath(mode, lang);
    const fallback = introPath(mode, 0);
    loadTga(path).catch((e) => {
      if (fallback === path) throw e;
      return loadTga(fallback);
    }).then((url) => {
      introBusy = false;
      introImg.src = url;
      introImg.hidden = false;
      introVisible = true;
      void introImg.offsetWidth;
      introImg.style.opacity = "1";
    }).catch((e) => {
      introBusy = false;
      console.warn(`cof intro (${path}): ${e.message}`);
    });
  };


  // --- health and stamina bars ------------------------------------------------------------------
  // 640_healthbar.tga / 640_staminabar.tga are 32x160 frames; the 11x118 bar sits at (10,3) and
  // empties from the top. Stamina shows while it is not full, health when it changes or with the bag.
  const GAME = "/rodir/cryoffear";
  const VGUI = `${GAME}/gfx/vgui`;
  const status = { health: 100, stamina: 100, sprint: 0 };
  let bars = null;

  const makeBar = (kind) => {
    const el = document.createElement("div");
    el.className = "cof-bar";
    el.innerHTML = `<img class="frame" alt=""><div class="fill"><img class="empty" alt=""><div class="clip"><img class="full" alt=""></div></div>`;
    Promise.all([`${VGUI}/640_${kind}.tga`, `${VGUI}/640_${kind}_barempty.tga`, `${VGUI}/640_${kind}_bar.tga`].map(loadTga))
      .then(([frame, empty, full]) => {
        el.querySelector(".frame").src = frame;
        el.querySelector(".empty").src = empty;
        el.querySelector(".full").src = full;
      }).catch((e) => console.warn(`cof ${kind}:`, e.message));
    return el;
  };

  const ensureBars = () => {
    if (bars) return;
    const style = document.createElement("style");
    style.textContent = `
      #cof-status { position:absolute; left:2.5%; bottom:6%; display:flex; gap:6px; pointer-events:none; z-index:11; }
      .cof-bar { --u: clamp(1, calc(100vh / 480px), 2.4); position:relative; width:calc(32px * var(--u));
                 height:calc(160px * var(--u)); opacity:0; transition:opacity .4s ease; }
      .cof-bar.on { opacity:1; }
      .cof-bar img { position:absolute; display:block; }
      .cof-bar .frame { inset:0; width:100%; height:100%; }
      .cof-bar .fill { position:absolute; left:calc(10px * var(--u)); top:calc(3px * var(--u));
                       width:calc(11px * var(--u)); height:calc(118px * var(--u)); }
      .cof-bar .empty { left:0; top:0; width:100%; height:100%; }
      .cof-bar .clip { position:absolute; left:0; bottom:0; width:100%; height:100%; overflow:hidden;
                       transition:height .15s linear; }
      .cof-bar .full { left:0; bottom:0; width:100%; height:calc(118px * var(--u)); }
    `;
    document.head.appendChild(style);
    const box = document.createElement("div");
    box.id = "cof-status";
    bars = { box, health: makeBar("healthbar"), stamina: makeBar("staminabar"), healthTimer: 0 };
    box.append(bars.health, bars.stamina);
    document.querySelector("main").appendChild(box);
  };

  const setBar = (el, value) => {
    el.querySelector(".clip").style.height = `${Math.max(0, Math.min(100, value))}%`;
  };

  const showHealth = (ms) => {
    bars.health.classList.add("on");
    clearTimeout(bars.healthTimer);
    if (ms) bars.healthTimer = setTimeout(() => { if (!bag.open) bars.health.classList.remove("on"); }, ms);
  };

  const updateStatus = (health, stamina, sprint) => {
    ensureBars();
    const hurt = health !== status.health;
    Object.assign(status, { health, stamina, sprint });
    setBar(bars.health, health);
    setBar(bars.stamina, stamina);
    bars.stamina.classList.toggle("on", stamina < 100 || sprint > 0 || bag.open);
    if (hurt) showHealth(4000);
  };

  // --- bag (TAB) ----------------------------------------------------------------------------------
  // 640_inventory.tga is 748x480: three slots for the bag, three pockets, the item description,
  // quick select and the current objective. Positions in that image's pixels.
  const BAG_W = 748, BAG_H = 480;
  const SLOT = 97;
  const SLOTS = [[37, 74], [139, 74], [241, 74],     // bag: weapons
                 [37, 232], [139, 232], [241, 232],  // pockets: keys and items
                 [404, 74], [506, 74], [608, 74]];   // quick select (not wired yet)
  const DESC_BOX = [37, 354, 301, 97];
  const OBJECTIVE_BOX = [404, 354, 301, 97];
  const ITEM_RE = /"([^"]+)"\s*\{\s*data\s+"([^"]*)"\s*\}/g;

  const bag = { open: false, el: null, items: [], selected: -1, objective: "" };
  const itemCache = new Map();

  const readItem = (def) => {
    if (itemCache.has(def)) return itemCache.get(def);
    const fields = {};
    try {
      const text = new TextDecoder("latin1").decode(FS.readFile(resolveCi(`${GAME}/${def}`)));
      for (const [, k, v] of text.matchAll(ITEM_RE)) fields[k.toLowerCase()] = v;
    } catch (e) {
      console.warn(`cof item ${def}:`, e.message);
    }
    itemCache.set(def, fields);
    return fields;
  };

  const pct = (v, total) => `${(v / total) * 100}%`;
  const place = (el, x, y, w, h) => {
    Object.assign(el.style, { left: pct(x, BAG_W), top: pct(y, BAG_H), width: pct(w, BAG_W), height: pct(h, BAG_H) });
  };

  const ensureBag = () => {
    if (bag.el) return;
    const style = document.createElement("style");
    style.textContent = `
      #cof-bag { position:absolute; inset:0; display:none; align-items:center; justify-content:center;
                 z-index:12; background:rgba(0,0,0,.55); container-type:size; }
      #cof-bag.on { display:flex; }
      #cof-bag .sheet { position:relative; aspect-ratio:${BAG_W} / ${BAG_H}; width:min(94cqw, calc(92cqh * ${BAG_W / BAG_H})); }
      #cof-bag .sheet > img.bg { position:absolute; inset:0; width:100%; height:100%; }
      #cof-bag .slot { position:absolute; display:flex; align-items:center; justify-content:center; }
      #cof-bag .slot[data-item] { cursor:pointer; }
      #cof-bag .slot img { width:100%; height:100%; object-fit:contain; }
      #cof-bag .slot.sel { outline:2px solid rgba(255,255,255,.75); outline-offset:-2px; }
      #cof-bag .desc, #cof-bag .objective { position:absolute; display:flex; align-items:center; justify-content:center;
                        color:#ddd; font:clamp(10px, 1.7vh, 16px)/1.35 Arial, sans-serif; text-align:center; }
      #cof-bag .desc img { max-width:100%; max-height:100%; }
    `;
    document.head.appendChild(style);
    const el = document.createElement("div");
    el.id = "cof-bag";
    el.innerHTML = `<div class="sheet"><img class="bg" alt=""></div>`;
    const sheet = el.querySelector(".sheet");
    for (const [x, y] of SLOTS) {
      const slot = document.createElement("div");
      slot.className = "slot";
      place(slot, x, y, SLOT, SLOT);
      sheet.appendChild(slot);
    }
    const desc = document.createElement("div");
    desc.className = "desc";
    place(desc, ...DESC_BOX);
    const objective = document.createElement("div");
    objective.className = "objective";
    place(objective, ...OBJECTIVE_BOX);
    sheet.append(desc, objective);
    sheet.addEventListener("click", (e) => {
      const slot = e.target.closest(".slot");
      if (!slot || slot.dataset.item === undefined) return;
      bag.selected = +slot.dataset.item;
      renderBag();
    });
    loadTga(`${VGUI}/640_inventory.tga`).then((url) => { sheet.querySelector(".bg").src = url; })
      .catch((e) => console.warn("cof bag:", e.message));
    bag.el = el;
    document.querySelector("main").appendChild(el);
  };

  const setPicture = (img, path) => {
    if (path) loadTga(`${GAME}/${path}`).then((url) => { img.src = url; }).catch((e) => console.warn("cof item:", e.message));
  };

  const renderBag = () => {
    if (!bag.el) return;
    const slots = [...bag.el.querySelectorAll(".slot")];
    for (const slot of slots) { slot.replaceChildren(); delete slot.dataset.item; slot.classList.remove("sel"); }
    // weapons to the bag, keys and the rest to the pockets; when one side is full, the other
    const free = [0, 1, 2, 3, 4, 5];
    const take = (preferred) => {
      const at = preferred.find((n) => free.includes(n)) ?? free[0];
      if (at !== undefined) free.splice(free.indexOf(at), 1);
      return at;
    };
    bag.items.forEach((def, i) => {
      const at = take(/^inventoryitems\/weapons\//i.test(def) ? [0, 1, 2] : [3, 4, 5]);
      if (at === undefined) return;
      const img = document.createElement("img");
      img.alt = readItem(def).nice_name || "";
      setPicture(img, readItem(def).inventory_picture);
      slots[at].appendChild(img);
      slots[at].dataset.item = i;
      slots[at].classList.toggle("sel", i === bag.selected);
    });

    const desc = bag.el.querySelector(".desc");
    desc.replaceChildren();
    const sel = bag.items[bag.selected];
    if (sel) {
      const fields = readItem(sel);
      if (fields.check_picture) {
        const img = document.createElement("img");
        img.alt = fields.nice_name || "";
        setPicture(img, fields.check_picture);
        desc.appendChild(img);
      } else {
        desc.textContent = fields.nice_name || sel;
      }
    }
    bag.el.querySelector(".objective").textContent = bag.objective;
  };

  const toggleBag = () => {
    ensureBag();
    ensureBars();
    bag.open = !bag.open;
    bag.el.classList.toggle("on", bag.open);
    if (bag.open) {
      if (bag.selected >= bag.items.length) bag.selected = -1;
      renderBag();
      showHealth(0);
      bars.stamina.classList.add("on");
      // the cursor is needed to pick items; clicking the game captures it again
      if (document.pointerLockElement) document.exitPointerLock();
    } else {
      showHealth(1500);
      updateStatus(status.health, status.stamina, status.sprint);
      // TAB is a recent user gesture, so the browser usually accepts this without a click
      try {
        const p = document.getElementById("canvas").requestPointerLock();
        if (p && p.catch) p.catch(() => {});
      } catch (_) { /* the next click on the game captures it */ }
    }
  };

  // short notice when something goes into the bag: the item's "check" picture
  const showPickup = (def) => {
    ensureDom();
    const fields = readItem(def);
    if (!fields.check_picture) return;
    const token = ++logoToken;
    clearTimeout(logoTimer);
    loadTga(`${GAME}/${fields.check_picture}`).then((url) => {
      if (token !== logoToken) return;
      logoImg.src = url;
      logoImg.hidden = false;
      void logoImg.offsetWidth;
      logoImg.style.opacity = "1";
      logoTimer = setTimeout(() => {
        if (token !== logoToken) return;
        logoImg.style.opacity = "0";
        setTimeout(() => { if (token === logoToken) logoImg.hidden = true; }, 300);
      }, 2500);
    }).catch((e) => console.warn("cof pickup:", e.message));
  };


  // --- music (ambient_fmodstream) -------------------------------------------------------------
  // The mp3 files are served next to the page (package.sh -> dist/mp3/) and streamed by <audio>,
  // so they never take engine memory. One player per channel ("frags" of the entity).
  const music = new Map();
  const MUSIC_VOLUME = 0.8;

  const fadeOut = (audio, ms = 600) => {
    const start = audio.volume, t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      audio.volume = start * (1 - k);
      if (k < 1) requestAnimationFrame(step); else { audio.pause(); audio.removeAttribute("src"); }
    };
    step();
  };

  const playMusic = (channel, loop, file) => {
    stopMusic(channel);
    const audio = new Audio(`mp3/${file.toLowerCase()}`);
    audio.loop = loop;
    audio.volume = MUSIC_VOLUME;
    music.set(channel, audio);
    audio.play().catch((e) => {
      if (e.name !== "NotAllowedError") { console.warn(`cof music ${file}:`, e.message); return; }
      // autoplay blocked until the page gets a click or a key (the menu music on first load)
      const resume = () => { if (music.get(channel) === audio) audio.play().catch(() => {}); };
      addEventListener("pointerdown", resume, { once: true, capture: true });
      addEventListener("keydown", resume, { once: true, capture: true });
    });
  };

  const stopMusic = (channel) => {
    const audio = music.get(channel);
    if (audio) { music.delete(channel); fadeOut(audio); }
  };

  const stopAllMusic = () => { for (const ch of [...music.keys()]) stopMusic(ch); };

  // --- main menu ----------------------------------------------------------------------------------
  // The original GameUI draws gfx/vgui/menu/*.tga (white text, *_mo red on hover) over the
  // c_game_menu1 map. New game opens the difficulty board (640_difficulty.tga, 640x480).
  const MENU_MAP = "c_game_menu1";
  const FIRST_MAP = "c_intro";
  const MENU_BUTTONS = [["newgame", "new"], ["loadgame", "load"], ["options", "options"]];
  const DIFFICULTY = [[122, 92, 396, 70, 1], [122, 168, 396, 68, 2], [122, 242, 396, 70, 3],
                      [122, 318, 396, 68, 3], [97, 408, 448, 48, 0]]; // x, y, w, h, skill (0: back)

  const menu = { el: null, board: null, visible: false };

  const engineCmd = (text) => {
    try { Module.ccall("Xash_Cmd", null, ["string"], [text]); } catch (e) { console.warn("cof cmd:", e.message); }
  };

  const ensureMenu = () => {
    if (menu.el) return;
    const style = document.createElement("style");
    style.textContent = `
      #cof-menu { position:absolute; inset:0; z-index:13; display:none; user-select:none; container-type:size; }
      #cof-menu.on { display:block; }
      #cof-menu .logo { position:absolute; left:4%; top:7%; width:min(46%, 640px); }
      #cof-menu .buttons { position:absolute; left:6%; top:34%; display:flex; flex-direction:column; gap:1.2vh;
                           width:min(30%, 380px); }
      #cof-menu .buttons button { all:unset; cursor:pointer; position:relative; aspect-ratio:280 / 38; }
      #cof-menu .buttons img { position:absolute; inset:0; width:100%; height:100%; }
      #cof-menu .buttons img.mo { opacity:0; transition:opacity .12s; }
      #cof-menu .buttons button:hover img.mo, #cof-menu .buttons button:focus-visible img.mo { opacity:1; }
      #cof-menu .board { position:absolute; inset:0; display:none; align-items:center; justify-content:center;
                         background:rgba(0,0,0,.6); }
      #cof-menu .board.on { display:flex; }
      #cof-menu .board .sheet { position:relative; aspect-ratio:640 / 480; width:min(90cqw, calc(90cqh * 4 / 3)); }
      #cof-menu .board .sheet img { position:absolute; inset:0; width:100%; height:100%; }
      #cof-menu .board .hit { position:absolute; cursor:pointer; }
      #cof-menu .board .hit:hover { background:rgba(255,40,40,.12); box-shadow:0 0 0 1px rgba(255,80,80,.5) inset; }
    `;
    document.head.appendChild(style);

    const el = document.createElement("div");
    el.id = "cof-menu";
    const logo = document.createElement("img");
    logo.className = "logo";
    logo.alt = "Cry of Fear";
    setPictureAbs(logo, `${VGUI}/menu_logo.tga`);
    const buttons = document.createElement("div");
    buttons.className = "buttons";
    for (const [art, action] of MENU_BUTTONS) {
      const b = document.createElement("button");
      b.dataset.action = action;
      b.setAttribute("aria-label", art);
      const up = document.createElement("img");
      const mo = document.createElement("img");
      up.alt = mo.alt = "";
      mo.className = "mo";
      setPictureAbs(up, `${VGUI}/menu/${art}.tga`);
      setPictureAbs(mo, `${VGUI}/menu/${art}_mo.tga`);
      b.append(up, mo);
      buttons.appendChild(b);
    }
    buttons.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (b) menuAction(b.dataset.action);
    });

    const board = document.createElement("div");
    board.className = "board";
    board.innerHTML = `<div class="sheet"><img alt=""></div>`;
    const sheet = board.querySelector(".sheet");
    setPictureAbs(sheet.querySelector("img"), `${VGUI}/640_difficulty.tga`);
    for (const [x, y, w, h, skill] of DIFFICULTY) {
      const hit = document.createElement("div");
      hit.className = "hit";
      Object.assign(hit.style, { left: pct(x, 640), top: pct(y, 480), width: pct(w, 640), height: pct(h, 480) });
      hit.addEventListener("click", () => (skill ? startGame(skill) : board.classList.remove("on")));
      sheet.appendChild(hit);
    }
    el.append(logo, buttons, board);
    menu.el = el;
    menu.board = board;
    document.querySelector("main").appendChild(el);
  };

  const setPictureAbs = (img, path) => {
    loadTga(path).then((url) => { img.src = url; }).catch((e) => console.warn("cof menu:", e.message));
  };

  const menuAction = (action) => {
    if (action === "new") menu.board.classList.add("on");
    // load and options are the engine's own dialogs (mainui)
    else if (action === "load") engineCmd("menu_loadgame");
    else if (action === "options") engineCmd("menu_options");
  };

  const startGame = async (skill) => {
    // the click is a user gesture: capture the mouse now, the map takes a moment to load
    try { const p = document.getElementById("canvas").requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (_) { /* */ }
    showMenu(false);
    stopAllMusic();
    if (window.CoFPreload) await window.CoFPreload(FIRST_MAP).catch(() => false);
    engineCmd(`skill ${skill}`);
    engineCmd(`map ${FIRST_MAP}`);
  };

  const showMenu = (on) => {
    ensureMenu();
    menu.visible = on;
    menu.el.classList.toggle("on", on);
    menu.board.classList.remove("on");
    if (on && document.pointerLockElement) document.exitPointerLock();
  };

  // loader.js reports every map the server spawns
  const onMap = (name) => {
    const isMenu = name === MENU_MAP;
    showMenu(isMenu);
    if (isMenu) {
      // fetch the first chapter in the background while the menu is up
      setTimeout(() => { if (menu.visible && window.CoFPreload) window.CoFPreload(FIRST_MAP).catch(() => {}); }, 4000);
    }
  };


  // --- chapter titles, objectives and hints ---------------------------------------------------
  // txtfiles/hints.txt holds both: blocks of line1..lineN, "*" stands for the key in cfgbutton.
  const KEY_NAMES = { "+sprint": "SHIFT", "+inventory": "TAB", "+objectives": "B", "+duck": "CTRL",
                      "+use": "E", "+attack": "MOUSE1", "+attack2": "MOUSE2", "+reload": "R",
                      "+dodge": "ALT", flashlight: "F", "+jump": "SPACE" };
  let hintsCache = null;
  const hints = () => {
    if (hintsCache) return hintsCache;
    hintsCache = {};
    try {
      const text = new TextDecoder("latin1").decode(FS.readFile(resolveCi(`${GAME}/txtfiles/hints.txt`)));
      for (const [, name, body] of text.matchAll(/^\s*([\w-]+)\s*\{([^}]*)\}/gm)) {
        const fields = {};
        for (const [, k, v] of body.matchAll(/(\w+)\s+"([^"]*)"/g)) fields[k] = v;
        hintsCache[name.toLowerCase()] = fields;
      }
    } catch (e) {
      console.warn("cof hints:", e.message);
    }
    return hintsCache;
  };
  const hintText = (key) => {
    const h = hints()[key.toLowerCase()];
    if (!h) return "";
    const lines = Object.keys(h).filter((k) => /^line\d+$/.test(k)).sort().map((k) => h[k]);
    const button = KEY_NAMES[h.cfgbutton] || h.nobutton || "";
    return lines.map((l) => l.replace(/\*/g, button)).join("\n");
  };

  let textBox = null;
  const ensureText = () => {
    if (textBox) return;
    const style = document.createElement("style");
    style.textContent = `
      #cof-chapter { position:absolute; left:0; right:0; top:38%; text-align:center; z-index:11; pointer-events:none;
                     color:#e8e8e8; font:clamp(18px, 4vh, 44px) Georgia, serif; letter-spacing:.06em;
                     text-shadow:0 0 12px #000, 0 0 3px #000; opacity:0; transition:opacity 1.2s ease; }
      #cof-hint { position:absolute; left:50%; bottom:8%; transform:translateX(-50%); max-width:min(80%, 720px);
                  z-index:11; pointer-events:none; padding:.8em 1.2em; background:rgba(0,0,0,.72);
                  border:1px solid rgba(255,255,255,.25); color:#ddd; white-space:pre-line; text-align:center;
                  font:clamp(12px, 1.9vh, 18px)/1.45 Arial, sans-serif; opacity:0; transition:opacity .4s ease; }
      #cof-chapter.on, #cof-hint.on { opacity:1; }
    `;
    document.head.appendChild(style);
    const chapter = document.createElement("div");
    chapter.id = "cof-chapter";
    const hint = document.createElement("div");
    hint.id = "cof-hint";
    textBox = { chapter, hint, chapterTimer: 0, hintTimer: 0 };
    document.querySelector("main").append(chapter, hint);
  };

  const showChapter = (title) => {
    ensureText();
    textBox.chapter.textContent = title;
    textBox.chapter.classList.add("on");
    clearTimeout(textBox.chapterTimer);
    textBox.chapterTimer = setTimeout(() => textBox.chapter.classList.remove("on"), 5000);
  };

  const showHint = (key) => {
    const text = hintText(key);
    if (!text) return;
    ensureText();
    textBox.hint.textContent = text;
    textBox.hint.classList.add("on");
    clearTimeout(textBox.hintTimer);
    textBox.hintTimer = setTimeout(() => textBox.hint.classList.remove("on"), 9000);
  };

  const setObjective = (key) => {
    bag.objective = key ? hintText(key) || key : "";
    renderBag();
  };

  window.CoFHUD = {
    get bagOpen() { return bag.open; },
    get menuOpen() { return menu.visible; },
    onMap,
    handle(line) {
      const [cmd, ...args] = line.trim().split(/\s+/);
      const rest = line.trim().slice(cmd.length).trim();
      switch (cmd) {
        case "LOGO":
          showLogo(parseInt(args[0], 10) || 0);
          break;
        case "INTRO":
          toggleIntro(parseInt(args[0], 10) || 0, parseInt(args[1], 10) || 0);
          break;
        case "BW":
          if (window.CoFPostFX) CoFPostFX.set({ black: (parseInt(args[0], 10) || 0) > 0 });
          break;
        case "BLUR": {
          const on = (parseInt(args[0], 10) || 0) !== 0;
          const strength = parseFloat(args[1]) || 1;
          if (window.CoFPostFX) CoFPostFX.set({ blur: on ? Math.max(1, Math.min(8, strength)) : 0 });
          break;
        }
        case "STAT":
          updateStatus(+args[0] || 0, +args[1] || 0, +args[2] || 0);
          break;
        case "INV":
          bag.items = args.slice(1, 1 + (parseInt(args[0], 10) || 0));
          if (bag.selected >= bag.items.length) bag.selected = -1;
          renderBag();
          break;
        case "INVTOGGLE":
          toggleBag();
          break;
        case "MUSIC":
          if (args[2]) playMusic(parseInt(args[0], 10) || 0, args[1] === "1", args[2]);
          break;
        case "MUSICSTOP":
          stopMusic(parseInt(args[0], 10) || 0);
          break;
        case "CHAPTER":
          showChapter(rest);
          break;
        case "OBJECTIVE":
          setObjective(rest);
          break;
        case "HINT":
          if (args[0]) showHint(args[0]);
          break;
        case "PICKUP":
          if (args[0]) showPickup(args[0]);
          break;
        default:
          break;
      }
    },
  };
})();
