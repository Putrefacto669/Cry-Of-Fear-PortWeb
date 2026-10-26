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
    const language = lang === 0 && /^es\b/i.test(navigator.language || "") ? "spanish" : LANGS[lang] || "english";
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

  // items: "inventoryitems/...txt" or "...txt:count" (ammo, syringes); quick: names per slot
  const bag = { open: false, el: null, items: [], counts: [], quick: ["-", "-", "-"], selected: -1, objective: "" };
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
      #cof-bag .slot .count { position:absolute; right:6%; bottom:4%; color:#eee; font:bold clamp(10px, 1.8vh, 18px) Arial, sans-serif;
                              text-shadow:0 0 3px #000, 0 0 2px #000; }
      #cof-bag .slot .name { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; padding:4%;
                             color:#ddd; font:clamp(9px, 1.4vh, 14px)/1.2 Arial, sans-serif; text-align:center; }
      #cof-bag .slot.quick.armed { box-shadow:0 0 0 2px rgba(255,80,80,.6) inset; cursor:pointer; }
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
      if (!slot) return;
      if (slot.dataset.quick !== undefined) {
        // with an item selected, a quick slot takes it (only weapons; the server checks)
        if (bag.selected >= 0) engineCmd(`cof_quickset ${+slot.dataset.quick + 1} ${bag.selected}`);
        return;
      }
      if (slot.dataset.item === undefined) return;
      bag.selected = +slot.dataset.item;
      renderBag();
    });
    sheet.addEventListener("dblclick", (e) => {
      const slot = e.target.closest(".slot");
      if (slot && slot.dataset.item !== undefined) engineCmd(`cof_equip ${slot.dataset.item}`);
    });
    loadTga(`${VGUI}/640_inventory.tga`).then((url) => { sheet.querySelector(".bg").src = url; })
      .catch((e) => console.warn("cof bag:", e.message));
    bag.el = el;
    document.querySelector("main").appendChild(el);
  };

  // the picture, or the item's name when the game has none (Glock ammo)
  const setPicture = (img, path, fallback) => {
    const showName = () => {
      if (!fallback) return;
      const name = document.createElement("div");
      name.className = "name";
      name.textContent = fallback;
      img.replaceWith(name);
    };
    if (!path) { showName(); return; }
    loadTga(`${GAME}/${path}`).then((url) => { img.src = url; }).catch(showName);
  };

  const renderBag = () => {
    if (!bag.el) return;
    const slots = [...bag.el.querySelectorAll(".slot")];
    for (const slot of slots) { slot.replaceChildren(); delete slot.dataset.item; slot.classList.remove("sel"); }
    slots.slice(6).forEach((slot, q) => {
      slot.dataset.quick = q;
      slot.classList.add("quick");
      slot.classList.toggle("armed", bag.selected >= 0);
      const name = bag.quick[q];
      const i = bag.items.findIndex((def) => (readItem(def).classname || "").toLowerCase() === name.toLowerCase());
      if (i < 0) return;
      const img = document.createElement("img");
      img.alt = "";
      setPicture(img, readItem(bag.items[i]).quick_picture || readItem(bag.items[i]).inventory_picture);
      slot.appendChild(img);
    });
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
      slots[at].appendChild(img);
      setPicture(img, readItem(def).inventory_picture, readItem(def).nice_name);
      if (bag.counts[i] >= 0) {
        const count = document.createElement("span");
        count.className = "count";
        count.textContent = bag.counts[i];
        slots[at].appendChild(count);
      }
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

  const playMusic = (channel, loop, file, fadeSeconds) => {
    stopMusic(channel, fadeSeconds);
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

  const stopMusic = (channel, fadeSeconds) => {
    const audio = music.get(channel);
    if (audio) { music.delete(channel); fadeOut(audio, fadeSeconds > 0 ? fadeSeconds * 1000 : 600); }
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
    if (typeof setRain === "function" && rain.canvas) setRain(0, 0, 0);
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
      const text = readText("hints.txt");
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


  // --- subtitles, phone messages, notes, password and keypad dialogs (puzzles.cpp) -------------
  // The game ships its texts in several languages: Spanish when the browser is in Spanish.
  const SPANISH = /^es\b/i.test(navigator.language || "");
  const textCache = new Map();
  const readText = (rel) => {
    if (textCache.has(rel)) return textCache.get(rel);
    let text = "";
    for (const path of SPANISH ? [`${GAME}/txtfiles/languages/spanish/${rel}`, `${GAME}/txtfiles/${rel}`] : [`${GAME}/txtfiles/${rel}`]) {
      try { text = new TextDecoder("latin1").decode(FS.readFile(resolveCi(path))); break; } catch (_) { /* next */ }
    }
    textCache.set(rel, text);
    return text;
  };
  const lineOf = (rel, n) => (readText(rel).split(/\r?\n/)[n - 1] || "").trim();

  let panel = null;
  const ensurePanel = () => {
    if (panel) return;
    const style = document.createElement("style");
    style.textContent = `
      #cof-sub { position:absolute; left:50%; bottom:13%; transform:translateX(-50%); max-width:min(86%, 900px);
                 z-index:11; pointer-events:none; color:#f2f2f2; text-align:center;
                 font:clamp(13px, 2.3vh, 22px)/1.35 Arial, sans-serif; text-shadow:0 0 4px #000, 0 0 2px #000;
                 opacity:0; transition:opacity .3s ease; }
      #cof-sub.on { opacity:1; }
      #cof-sms { position:absolute; right:3%; top:6%; max-width:min(40%, 360px); z-index:11; pointer-events:none;
                 padding:.7em 1em; background:rgba(10,20,10,.85); border:1px solid rgba(160,220,160,.4);
                 color:#cfe8cf; font:clamp(12px, 1.9vh, 17px)/1.4 "Courier New", monospace; opacity:0; transition:opacity .4s; }
      #cof-sms.on { opacity:1; }
      #cof-dialog { position:absolute; inset:0; z-index:14; display:none; align-items:center; justify-content:center;
                    background:rgba(0,0,0,.6); container-type:size; }
      #cof-dialog.on { display:flex; }
      #cof-dialog .paper { max-width:min(80cqw, 560px); max-height:80cqh; overflow:auto; padding:1.6em 2em;
                           background:#e9e4d6; color:#222; white-space:pre-line; font:clamp(13px, 2.2vh, 19px)/1.5 Georgia, serif;
                           box-shadow:0 8px 30px #000; }
      #cof-dialog .picture { max-width:90cqw; max-height:88cqh; }
      #cof-dialog .close { position:absolute; right:3%; top:3%; color:#ddd; font:16px Arial, sans-serif; cursor:pointer; }
      #cof-dialog form { display:flex; flex-direction:column; gap:.8em; padding:1.5em 2em; background:#101418;
                         border:1px solid #3a4550; color:#9fd29f; font:clamp(13px, 2vh, 18px) "Courier New", monospace; }
      #cof-dialog input { all:unset; border-bottom:1px solid #9fd29f; padding:.2em; min-width:14em; }
      #cof-dialog .keypad { position:relative; aspect-ratio:640 / 480; width:min(86cqw, calc(86cqh * 4 / 3)); }
      #cof-dialog .keypad img { position:absolute; inset:0; width:100%; height:100%; }
      #cof-dialog .keypad .screen { position:absolute; left:${250 / 640 * 100}%; top:${42 / 480 * 100}%;
                         width:${143 / 640 * 100}%; height:${26 / 480 * 100}%; display:flex; align-items:center;
                         justify-content:center; color:#162; font:bold clamp(12px, 2.4vh, 22px) "Courier New", monospace; }
      #cof-dialog .keypad .key { position:absolute; cursor:pointer; }
      #cof-dialog .keypad .key:hover { background:rgba(255,255,255,.08); }
    `;
    document.head.appendChild(style);
    const sub = document.createElement("div");
    sub.id = "cof-sub";
    const sms = document.createElement("div");
    sms.id = "cof-sms";
    const dialog = document.createElement("div");
    dialog.id = "cof-dialog";
    dialog.addEventListener("click", (e) => { if (e.target === dialog || e.target.classList.contains("close")) closeDialog(); });
    addEventListener("keydown", (e) => {
      if (!dialog.classList.contains("on")) return;
      // the dialog has the keyboard: keep it from the engine (TAB, E, movement...)
      if (e.key === "Escape") closeDialog();
      if (!dialog.querySelector("input")) e.stopPropagation();
    }, true);
    panel = { sub, sms, dialog, subTimer: 0, smsTimer: 0 };
    document.querySelector("main").append(sub, sms, dialog);
  };

  const flash = (el, key, text, ms) => {
    ensurePanel();
    el.textContent = text;
    el.classList.toggle("on", !!text);
    clearTimeout(panel[key]);
    panel[key] = setTimeout(() => el.classList.remove("on"), ms);
  };

  // "*" at the end of a subtitle marks the long ones in the original
  const showSubtitle = (n) => {
    const line = lineOf("subtitles.txt", n);
    if (line) flash(panel?.sub || (ensurePanel(), panel.sub), "subTimer", line.replace(/\*$/, ""), line.endsWith("*") ? 5000 : 3500);
  };

  const showSms = (n) => {
    const line = lineOf("phone_messages.txt", n + 1).replace(/^"|"$/g, "");
    if (line) flash(panel?.sms || (ensurePanel(), panel.sms), "smsTimer", line, 7000);
  };

  const openDialog = (content) => {
    ensurePanel();
    if (document.pointerLockElement) document.exitPointerLock();
    const close = document.createElement("div");
    close.className = "close";
    close.textContent = "✕";
    panel.dialog.replaceChildren(content, close);
    panel.dialog.classList.add("on");
  };

  const closeDialog = () => {
    if (!panel) return;
    panel.dialog.classList.remove("on");
    panel.dialog.replaceChildren();
    try { const p = document.getElementById("canvas").requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (_) { /* click */ }
  };

  const showNote = (file) => {
    const paper = document.createElement("div");
    paper.className = "paper";
    let text = "";
    for (const path of SPANISH ? [`${GAME}/notes/languages/spanish/${file}`, `${GAME}/notes/${file}`] : [`${GAME}/notes/${file}`]) {
      try { text = new TextDecoder("latin1").decode(FS.readFile(resolveCi(path))); break; } catch (_) { /* next */ }
    }
    paper.textContent = text || file;
    openDialog(paper);
  };

  const showNoteText = (text) => {
    const paper = document.createElement("div");
    paper.className = "paper";
    paper.textContent = text;
    openDialog(paper);
  };

  const showImage = (rel) => {
    const img = document.createElement("img");
    img.className = "picture";
    img.alt = "";
    loadTga(`${GAME}/${rel}`).then((url) => { img.src = url; }).catch((e) => console.warn("cof image:", e.message));
    openDialog(img);
  };

  const showComputer = (ent) => {
    const form = document.createElement("form");
    form.innerHTML = `<div>${SPANISH ? "Contraseña" : "Password"}:</div><input type="password" autocomplete="off" spellcheck="false">`;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = form.querySelector("input").value.trim().replace(/\s+/g, "");
      if (text) engineCmd(`cof_password ${ent} ${text}`);
    });
    openDialog(form);
    setTimeout(() => form.querySelector("input").focus(), 50);
  };

  // keypad3.tga: 3x3 keys, the display above them (pixels of the 640x480 image)
  const KEYPAD_KEYS = { x: 166, y: 84, w: 103, h: 99 };
  const showKeypad = (ent) => {
    const pad = document.createElement("div");
    pad.className = "keypad";
    pad.innerHTML = `<img alt=""><div class="screen"></div>`;
    loadTga(`${VGUI}/keypad3.tga`).then((url) => { pad.querySelector("img").src = url; }).catch(() => {});
    const screen = pad.querySelector(".screen");
    let digits = "";
    for (let i = 0; i < 9; i++) {
      const key = document.createElement("div");
      key.className = "key";
      Object.assign(key.style, {
        left: pct(KEYPAD_KEYS.x + (i % 3) * KEYPAD_KEYS.w, 640), top: pct(KEYPAD_KEYS.y + Math.floor(i / 3) * KEYPAD_KEYS.h, 480),
        width: pct(KEYPAD_KEYS.w, 640), height: pct(KEYPAD_KEYS.h, 480),
      });
      key.addEventListener("click", () => {
        digits = (digits + (i + 1)).slice(-4);
        screen.textContent = digits;
        if (digits.length === 4) engineCmd(`cof_keypad ${ent} ${digits}`);
      });
      pad.appendChild(key);
    }
    pad.dataset.keypad = "1";
    openDialog(pad);
  };

  const answer = (ok) => {
    const screen = panel && panel.dialog.querySelector(".screen");
    if (screen) screen.textContent = ok ? "OK" : "----";
    const input = panel && panel.dialog.querySelector("input");
    if (input) { input.value = ""; input.placeholder = ok ? "" : (SPANISH ? "incorrecta" : "wrong"); }
    if (ok) setTimeout(closeDialog, 600);
  };


  // --- pause menu (Esc in game) ---------------------------------------------------------------
  // The engine's own menu is Half-Life's; in game Esc opens this one instead, with the art of
  // the original menu. hud.js is loaded before the engine, so this capture listener runs first.
  const pause = { el: null, open: false, engine: false };

  const ensurePause = () => {
    if (pause.el) return;
    const style = document.createElement("style");
    style.textContent = `
      #cof-pause { position:absolute; inset:0; z-index:15; display:none; background:rgba(0,0,0,.72); user-select:none; }
      #cof-pause.on { display:block; }
      #cof-pause .logo { position:absolute; left:4%; top:7%; width:min(46%, 640px); }
      #cof-pause .buttons { position:absolute; left:6%; top:34%; display:flex; flex-direction:column; gap:1.2vh;
                            width:min(30%, 380px); }
      #cof-pause button { all:unset; cursor:pointer; position:relative; aspect-ratio:280 / 38; }
      #cof-pause button img { position:absolute; inset:0; width:100%; height:100%; }
      #cof-pause button img.mo { opacity:0; transition:opacity .12s; }
      #cof-pause button:hover img.mo { opacity:1; }
      #cof-pause button.text { display:flex; align-items:center; justify-content:center; color:#eee;
                               font:clamp(14px, 2.6vh, 26px) Arial, sans-serif; text-shadow:0 0 8px rgba(255,255,255,.35); }
      #cof-pause button.text:hover { color:#c00; text-shadow:none; }
    `;
    document.head.appendChild(style);
    const el = document.createElement("div");
    el.id = "cof-pause";
    const logo = document.createElement("img");
    logo.className = "logo";
    logo.alt = "Cry of Fear";
    setPictureAbs(logo, `${VGUI}/menu_logo.tga`);
    const buttons = document.createElement("div");
    buttons.className = "buttons";
    const textButton = (label, action) => {
      const b = document.createElement("button");
      b.className = "text";
      b.textContent = label;
      b.dataset.action = action;
      return b;
    };
    const artButton = (art, action) => {
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
      return b;
    };
    buttons.append(textButton(SPANISH ? "Continuar" : "Resume", "resume"), artButton("loadgame", "load"),
      artButton("options", "options"), textButton(SPANISH ? "Menú principal" : "Main menu", "menu"));
    buttons.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (b) pauseAction(b.dataset.action);
    });
    el.append(logo, buttons);
    pause.el = el;
    document.querySelector("main").appendChild(el);
  };

  const setPaused = (on) => {
    ensurePause();
    pause.open = on;
    pause.el.classList.toggle("on", on);
    // Xash only has "pause", a toggle: send it when the state really changes
    if (on !== pause.engine) { engineCmd("pause"); pause.engine = on; }
    if (on && document.pointerLockElement) document.exitPointerLock();
  };

  const pauseAction = (action) => {
    if (action === "resume") {
      setPaused(false);
      try { const p = document.getElementById("canvas").requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (_) { /* */ }
    } else if (action === "load") {
      setPaused(false);
      engineCmd("menu_loadgame");
    } else if (action === "options") {
      setPaused(false);
      engineCmd("menu_options");
    } else if (action === "menu") {
      setPaused(false);
      stopAllMusic();
      // started with ?map=: the menu pack may not be mounted yet
      const load = window.CoFPreload ? window.CoFPreload(MENU_MAP).catch(() => false) : Promise.resolve();
      load.then(() => engineCmd(`map ${MENU_MAP}`));
    }
  };

  // the key up of an Esc taken here must not reach the engine either
  let escapeTaken = false;
  addEventListener("keydown", (e) => {
    if (e.key !== "Escape" && e.keyCode !== 27) return;
    // the main menu and the dialogs of hud.js keep Esc
    if (menu.visible || !window.CoFRuntimeReady || !currentMapName()) return;
    if (panel && panel.dialog.classList.contains("on")) return;
    escapeTaken = true;
    e.stopImmediatePropagation();
    e.preventDefault();
    if (e.repeat) return;
    if (bag.open) { engineCmd("+inventory"); engineCmd("-inventory"); return; }
    setPaused(!pause.open);
  }, true);
  addEventListener("keyup", (e) => {
    if ((e.key === "Escape" || e.keyCode === 27) && escapeTaken) {
      escapeTaken = false;
      e.stopImmediatePropagation();
    }
  }, true);

  const currentMapName = () => (window.CoFCurrentMap ? window.CoFCurrentMap() : "");


  // --- rain (rain_settings, effects_cof.cpp) ---------------------------------------------------
  // Streaks on a canvas over the game while the server says the player is under the sky.
  const rain = { canvas: null, ctx: null, drops: [], target: 0, slant: 0, raf: 0 };

  const ensureRain = () => {
    if (rain.canvas) return;
    const c = document.createElement("canvas");
    c.id = "cof-rain";
    Object.assign(c.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "9" });
    document.querySelector("main").appendChild(c);
    rain.canvas = c;
    rain.ctx = c.getContext("2d");
  };

  const rainFrame = () => {
    const { canvas, ctx } = rain;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    // the number of drops eases towards the target: rain starts and stops softly
    while (rain.drops.length < rain.target) rain.drops.push({ x: Math.random() * w, y: Math.random() * h, v: 0.7 + Math.random() * 0.6 });
    if (rain.drops.length > rain.target) rain.drops.length = Math.max(rain.target, rain.drops.length - 8);
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(190, 200, 215, 0.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const len = h * 0.045, fall = h * 0.035;
    for (const d of rain.drops) {
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + rain.slant * len, d.y + len);
      d.y += fall * d.v;
      d.x += rain.slant * fall * d.v;
      if (d.y > h) { d.y = -len; d.x = Math.random() * w; }
      if (d.x > w) d.x -= w; else if (d.x < 0) d.x += w;
    }
    ctx.stroke();
    rain.raf = rain.drops.length ? requestAnimationFrame(rainFrame) : 0;
    if (!rain.raf) ctx.clearRect(0, 0, w, h);
  };

  const setRain = (drips, windX, windY) => {
    ensureRain();
    rain.target = Math.min(450, Math.round(drips / 6));
    rain.slant = Math.max(-0.6, Math.min(0.6, (windX + windY) / 1500));
    if (!rain.raf && (rain.target || rain.drops.length)) rain.raf = requestAnimationFrame(rainFrame);
  };

  // chapter titles come from the levels, in English
  const CHAPTERS_ES = {
    "lost in a city": "Perdido en una ciudad",
    "who is that doctor?": "¿Quién es ese doctor?",
  };
  const translateChapter = (title) => {
    if (!SPANISH) return title;
    const m = /^chapter\s+(\d+)\s*-\s*(.+)$/i.exec(title.trim());
    if (!m) return title;
    return `Capítulo ${m[1]} - ${CHAPTERS_ES[m[2].toLowerCase()] || m[2]}`;
  };

  window.CoFHUD = {
    get bagOpen() { return bag.open; },
    get menuOpen() { return menu.visible; },
    get paused() { return pause.open; },
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
        case "INV": {
          const entries = args.slice(1, 1 + (parseInt(args[0], 10) || 0));
          bag.items = entries.map((e) => e.replace(/:\d+$/, ""));
          bag.counts = entries.map((e) => (/:(\d+)$/.exec(e) ? +RegExp.$1 : -1));
          if (bag.selected >= bag.items.length) bag.selected = -1;
          renderBag();
          break;
        }
        case "QUICK":
          bag.quick = [args[0] || "-", args[1] || "-", args[2] || "-"];
          renderBag();
          break;
        case "INVTOGGLE":
          toggleBag();
          break;
        case "MUSIC":
          if (args[2]) playMusic(parseInt(args[0], 10) || 0, args[1] === "1", args[2], parseFloat(args[3]) || 0);
          break;
        case "MUSICSTOP":
          stopMusic(parseInt(args[0], 10) || 0);
          break;
        case "RAIN":
          setRain(+args[0] || 0, +args[1] || 0, +args[2] || 0);
          break;
        case "CHAPTER":
          showChapter(translateChapter(rest));
          break;
        case "OBJECTIVE":
          setObjective(rest);
          break;
        case "HINT":
          if (args[0]) showHint(args[0]);
          break;
        case "SUB":
          showSubtitle(parseInt(args[0], 10) || 0);
          break;
        case "SMS":
          showSms(parseInt(args[0], 10) || 0);
          break;
        case "NOTE":
          if (args[0]) showNote(args[0]);
          break;
        case "IMAGE":
          if (args[0]) showImage(args[0]);
          break;
        case "COMPUTER":
          showComputer(parseInt(args[0], 10) || 0);
          break;
        case "KEYPAD":
          showKeypad(parseInt(args[0], 10) || 0);
          break;
        case "GRANTED":
        case "DENIED":
          answer(cmd === "GRANTED");
          break;
        case "CODE":
          // the code note of the original: shown on paper and kept as the objective text
          if (args[0]) {
            showNoteText(`${SPANISH ? "Código" : "Code"}: ${args[0]}`);
            bag.objective = `${bag.objective ? `${bag.objective}\n` : ""}${SPANISH ? "Código" : "Code"}: ${args[0]}`;
          }
          break;
        case "SAVED":
          flash(panel?.sub || (ensurePanel(), panel.sub), "subTimer", `${SPANISH ? "Partida guardada" : "Game saved"}${rest ? ` · ${rest}` : ""}`, 3000);
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
