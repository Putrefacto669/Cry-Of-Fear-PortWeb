// hud.js - Cry of Fear overlays: main menu, logos, introductions, health/stamina bars, bag, music.
//
// The server emits one-line text markers (see game/cof-logic/cof/hud.cpp); loader.js
// forwards them here. Images come straight from the mounted game data, so no extra
// copies are added to the distribution. TGA 2.0 type 2 (uncompressed true-color) is
// enough for every asset used by these messages.
(() => {
  "use strict";

  // --- loading screen ---------------------------------------------------------------------------
  // While a level loads the engine shows Half-Life's own loading screen (the lambda and the
  // console). Cry of Fear's is black: this covers the game from the first frame and at every
  // level change, until the player is in the level (the first COF/HUD STAT after the spawn).
  const loading = (() => {
    const style = document.createElement("style");
    style.textContent = `
      #cof-loading { position:absolute; inset:0; z-index:16; background:#000; display:flex; align-items:flex-end;
                     justify-content:flex-end; padding:0 4% 4% 0; pointer-events:none; opacity:1;
                     transition:opacity .5s ease; }
      #cof-loading.off { opacity:0; }
      #cof-loading span { color:#bbb; font:clamp(13px, 2vh, 20px) Arial, sans-serif; letter-spacing:.08em; }
    `;
    document.head.appendChild(style);
    const el = document.createElement("div");
    el.id = "cof-loading";
    el.innerHTML = `<span>${/^es\b/i.test(navigator.language || "") ? "Cargando…" : "Loading…"}</span>`;
    const attach = () => (document.querySelector("main") || document.body).appendChild(el);
    if (document.querySelector("main")) attach(); else addEventListener("DOMContentLoaded", attach);
    let waiting = true, timer = 0, onDone = null;
    const hide = () => {
      if (!waiting) return;
      waiting = false;
      clearTimeout(timer);
      // a few frames so the first image of the level is on screen before it shows
      setTimeout(() => { el.classList.add("off"); if (onDone) { const f = onDone; onDone = null; f(); } }, 400);
    };
    return {
      show(then) {
        waiting = true;
        onDone = then || null;
        el.classList.remove("off");
        clearTimeout(timer);
        timer = setTimeout(hide, 30000); // never stuck on black
      },
      ready: hide,
      get active() { return waiting; },
    };
  })();

  const LOGOS = ["logo", "andreas", "james", "jordy", "stig", "lasse", "aina"];
  const TYPES = ["sp", "doc", "coop"];

  // Subtitle language, chosen on the original's "SUBTITLE LANGUAGE" screen (language_settings.tga).
  // cof_subtitlelanguage values of the original client: 1 English (its default), 2 Dutch, 3 French,
  // 4 German, 5 Norwegian, 6 Spanish, 7 Swedish. The texts live in txtfiles/languages/<name>/,
  // notes/languages/<name>/ and gfx/vgui/introductions/<name>/; English uses the root files.
  const LANGUAGE_CODES = { english: 1, dutch: 2, french: 3, german: 4, norwegian: 5, spanish: 6, swedish: 7 };
  const LANGUAGE_NAMES = { english: "English", swedish: "Svenska", norwegian: "Norsk", dutch: "Nederlands",
                           french: "Français", german: "Deutsch", spanish: "Español" };
  const LANGUAGE_KEY = "cofLanguage";
  const browserLanguage = () => {
    const l = (navigator.language || "").toLowerCase();
    if (l.startsWith("es")) return "spanish";
    if (l.startsWith("de")) return "german";
    if (l.startsWith("fr")) return "french";
    if (l.startsWith("nl")) return "dutch";
    if (/^(nb|nn|no)\b/.test(l)) return "norwegian";
    if (l.startsWith("sv")) return "swedish";
    return "english";
  };
  let gameLanguage = (() => {
    try { const saved = localStorage.getItem(LANGUAGE_KEY); if (LANGUAGE_CODES[saved]) return saved; } catch (_) { /* private mode */ }
    return browserLanguage();
  })();

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

  // like the original client, the language is this client's setting (cof_subtitlelanguage)
  const introPath = (mode, language) => {
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

  const toggleIntro = (mode) => {
    ensureDom();
    if (introVisible) {
      introVisible = false;
      introImg.style.opacity = "0";
      setTimeout(() => { if (!introVisible) introImg.hidden = true; }, 300);
      return;
    }
    if (introBusy) return;
    introBusy = true;
    const path = introPath(mode, gameLanguage);
    const fallback = introPath(mode, "english");
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
  // empties from the top. Like the original client.dll, both are always on screen while playing,
  // except in the prelude (c_nightmare) and while the HUD is hidden (HIDEHUD_ALL / HIDEHUD_HEALTH).
  const GAME = "/rodir/cryoffear";
  const VGUI = `${GAME}/gfx/vgui`;
  const status = { health: 100, stamina: 100, sprint: 0, hide: 0 };
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
    bars = { box, health: makeBar("healthbar"), stamina: makeBar("staminabar") };
    box.append(bars.health, bars.stamina);
    document.querySelector("main").appendChild(box);
  };

  const setBar = (el, value) => {
    el.querySelector(".clip").style.height = `${Math.max(0, Math.min(100, value))}%`;
  };

  const refreshBars = () => {
    if (!bars) return;
    const on = !(status.hide & 0xc) && currentMapName() !== "c_nightmare" && !loading.active;
    bars.health.classList.toggle("on", on);
    bars.stamina.classList.toggle("on", on);
  };

  const updateStatus = (health, stamina, sprint, hide) => {
    ensureBars();
    Object.assign(status, { health, stamina, sprint, hide });
    setBar(bars.health, health);
    setBar(bars.stamina, stamina);
    refreshBars();
  };

  // UnreadSMS: 640_hudelem_smsicon.tga until the phone is taken out (player_cof.cpp)
  let smsIcon = null;
  const setSmsIcon = (on) => {
    if (!smsIcon) {
      smsIcon = document.createElement("img");
      smsIcon.id = "cof-smsicon";
      smsIcon.alt = "";
      Object.assign(smsIcon.style, { position: "absolute", right: "3%", bottom: "6%", width: "calc(32px * clamp(1, 100vh / 480px, 2.4))",
        zIndex: 11, pointerEvents: "none", display: "none" });
      loadTga(`${VGUI}/640_hudelem_smsicon.tga`).then((url) => { smsIcon.src = url; })
        .catch((e) => console.warn("cof sms icon:", e.message));
      document.querySelector("main").appendChild(smsIcon);
    }
    smsIcon.style.display = on ? "block" : "none";
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

  // the item menu of the original: inventory_weapons.tga (EQUIP, COMBINE, DROP, DUAL WIELD, 1 2 3) and
  // inventory_items.tga (USE, COMBINE, DROP), 126 px wide with 42 px rows, opened next to the slot
  const MENU_W = 126, MENU_ROW = 42;
  const WEAPON_MENU = ["equip", "combine", "drop", "dual", "quick"];
  const ITEM_MENU = ["use", "combine", "drop"];
  // inventory/*.wav, played by the original client.dll for each action
  const bagSound = (name) => engineCmd(`play inventory/inventory_${name}.wav\n`);

  // items: "inventoryitems/...txt" or "...txt:count" (ammo, syringes); quick: names per slot
  const bag = { open: false, el: null, items: [], counts: [], quick: ["-", "-", "-"], selected: -1, objective: "", menu: null,
    dualFrom: -1 };  // DUAL WIELD waits for a second item: the next slot clicked
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
                 z-index:12; background:#000; container-type:size; }
      #cof-bag.on { display:flex; }
      #cof-bag > img.rust { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
      #cof-bag .sheet { position:relative; aspect-ratio:${BAG_W} / ${BAG_H}; width:min(94cqw, calc(92cqh * ${BAG_W / BAG_H})); }
      #cof-bag .sheet > img.bg { position:absolute; inset:0; width:100%; height:100%; }
      #cof-bag .menu { position:absolute; display:none; z-index:2; }
      #cof-bag .menu.on { display:block; }
      #cof-bag .menu img { display:block; width:100%; height:100%; }
      #cof-bag .menu .row { position:absolute; left:0; width:100%; cursor:pointer; }
      #cof-bag .menu .row:hover, #cof-bag .menu .row.q:hover { background:rgba(255,255,255,.12); }
      #cof-bag .menu .row.q { width:33.34%; }
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
    el.innerHTML = `<img class="rust" alt=""><div class="sheet"><img class="bg" alt=""><div class="menu"><img alt=""></div></div>`;
    const sheet = el.querySelector(".sheet");
    bag.menu = el.querySelector(".menu");
    loadTga(`${VGUI}/backgroundtoall.TGA`).then((url) => { el.querySelector(".rust").src = url; })
      .catch((e) => console.warn("cof bag background:", e.message));
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
      const row = e.target.closest(".menu .row");
      if (row) { bagAction(row.dataset.act, +row.dataset.q || 0); return; }
      const slot = e.target.closest(".slot");
      if (!slot) { closeMenu(); return; }
      if (slot.dataset.quick !== undefined) {
        // with an item selected, a quick slot takes it (only weapons; the server checks)
        if (bag.selected >= 0) { engineCmd(`cof_quickset ${+slot.dataset.quick + 1} ${bag.selected}`); bagSound("click"); }
        closeMenu();
        return;
      }
      if (slot.dataset.item === undefined) { closeMenu(); return; }
      if (bag.dualFrom >= 0 && +slot.dataset.item !== bag.dualFrom) {
        engineCmd(`cof_dualwield ${bag.dualFrom} ${slot.dataset.item}`);
        bag.dualFrom = -1;
        bagSound("click");
        closeMenu();
        return;
      }
      bag.selected = +slot.dataset.item;
      renderBag();
      openMenu(slot);
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

  const isWeapon = (i) => /^inventoryitems\/weapons\//i.test(bag.items[i] || "");

  const closeMenu = () => { if (bag.menu) bag.menu.classList.remove("on"); };

  // like the original, the menu opens at the slot's right edge, 5 px up and left
  const openMenu = (slot) => {
    const weapon = isWeapon(bag.selected);
    const rows = weapon ? WEAPON_MENU : ITEM_MENU;
    const menu = bag.menu;
    const x = (parseFloat(slot.style.left) / 100) * BAG_W + SLOT - 5;
    const y = (parseFloat(slot.style.top) / 100) * BAG_H - 5;
    place(menu, Math.min(x, BAG_W - MENU_W), Math.min(y, BAG_H - rows.length * MENU_ROW), MENU_W, rows.length * MENU_ROW);
    menu.replaceChildren(menu.querySelector("img") || document.createElement("img"));
    loadTga(`${VGUI}/${weapon ? "inventory_weapons" : "inventory_items"}.tga`).then((url) => { menu.querySelector("img").src = url; })
      .catch((e) => console.warn("cof bag menu:", e.message));
    rows.forEach((act, r) => {
      const cells = act === "quick" ? [1, 2, 3] : [0];
      cells.forEach((q, c) => {
        const row = document.createElement("div");
        row.className = act === "quick" ? "row q" : "row";
        row.dataset.act = act;
        if (q) row.dataset.q = q;
        Object.assign(row.style, { top: `${(r / rows.length) * 100}%`, height: `${100 / rows.length}%`, left: `${c * 33.33}%` });
        menu.appendChild(row);
      });
    });
    menu.classList.add("on");
    bagSound("toggle");
  };

  // EQUIP / USE take it in the hands (cof_equip: the server only equips real weapons), 1 2 3 put a weapon
  // in a quick select slot. COMBINE, DROP and DUAL WIELD are not in the port yet: the original's "no" sound.
  const bagAction = (act, q) => {
    const i = bag.selected;
    closeMenu();
    if (i < 0) return;
    if (act === "equip" || (act === "use" && isWeapon(i))) {
      engineCmd(`cof_equip ${i}`);
      bagSound("click");
      toggleBag();
    } else if (act === "quick") {
      engineCmd(`cof_quickset ${q} ${i}`);
      bagSound("click");
    } else if (act === "dual") {
      // the server only accepts the phone with the knife: the next slot clicked is the second item
      bag.dualFrom = i;
      bagSound("click");
    } else {
      bagSound("no");
    }
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
    closeMenu();
    bagSound(bag.open ? "open" : "close");
    if (bag.open) {
      if (bag.selected >= bag.items.length) bag.selected = -1;
      renderBag();
      // the cursor is needed to pick items; clicking the game captures it again
      if (document.pointerLockElement) document.exitPointerLock();
    } else {
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
  let musicVolume = 0.8;   // Options panel

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
    audio.volume = musicVolume;
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
    else if (action === "load") showLoadGame();
    else if (action === "options") showOptions();
  };

  const startGame = async (skill) => {
    // the click is a user gesture: capture the mouse now, the map takes a moment to load
    try { const p = document.getElementById("canvas").requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (_) { /* */ }
    showMenu(false);
    stopAllMusic();
    loading.show();
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

  let bossBar = null;
  const updateBoss = (health, maximum, full, empty) => {
    if (!bossBar && maximum <= 0) return;
    if (!bossBar) {
      bossBar = document.createElement("div");
      bossBar.id = "cof-bossbar";
      bossBar.setAttribute("role", "progressbar");
      bossBar.setAttribute("aria-label", "Boss health");
      bossBar.style.cssText = "position:absolute;bottom:5%;left:20%;width:60%;height:18px;background:#222;border:1px solid #777;z-index:12;pointer-events:none";
      const fill = document.createElement("div");
      fill.className = "fill";
      fill.style.cssText = "height:100%;width:100%;background-color:#900";
      bossBar.appendChild(fill);
      document.querySelector("main").appendChild(bossBar);
    }
    bossBar.hidden = !(maximum > 0);
    const ratio = maximum > 0 ? Math.max(0, Math.min(1, health / maximum)) : 0;
    bossBar.setAttribute("aria-valuemin", "0");
    bossBar.setAttribute("aria-valuemax", String(maximum));
    bossBar.setAttribute("aria-valuenow", String(health));
    const fill = bossBar.firstElementChild;
    // Clip the full texture without stretching its artwork as health falls.
    fill.style.clipPath = `inset(0 ${(1 - ratio) * 100}% 0 0)`;
    for (const [el, path] of [[fill, full], [bossBar, empty]]) {
      if (!path || path === "-") {
        el.dataset.texture = "";
        el.style.backgroundImage = "";
        continue;
      }
      if (el.dataset.texture === path) continue;
      el.dataset.texture = path;
      loadTga(`/rodir/cryoffear/${path}`).then(url => {
        if (el.dataset.texture !== path) return;
        el.style.backgroundImage = `url("${url}")`;
        el.style.backgroundSize = "100% 100%";
      }).catch(() => { /* visible color fallback when the image was not staged */ });
    }
  };

  // loader.js reports every map the server spawns
  const onMap = (name) => {
    updateBoss(0, 0, "-", "-");
    if (!optionsApplied) applyOptions();
    if (typeof setRain === "function" && rain.canvas) setRain(0, 0, 0);
    const isMenu = name === MENU_MAP;
    showMenu(false);
    loading.show(() => showMenu(isMenu));
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
  // The game ships its texts in seven languages (gameLanguage); the port's own labels are in Spanish
  // when that is the chosen language and in English otherwise.
  let SPANISH = gameLanguage === "spanish";
  const localized = (dir, rel) => gameLanguage === "english" ? [`${GAME}/${dir}/${rel}`]
    : [`${GAME}/${dir}/languages/${gameLanguage}/${rel}`, `${GAME}/${dir}/${rel}`];
  const textCache = new Map();
  const readText = (rel) => {
    if (textCache.has(rel)) return textCache.get(rel);
    let text = "";
    for (const path of localized("txtfiles", rel)) {
      try { text = new TextDecoder("latin1").decode(FS.readFile(resolveCi(path))); break; } catch (_) { /* next */ }
    }
    textCache.set(rel, text);
    return text;
  };

  // the SUBTITLE LANGUAGE screen: texts, notes and introductions follow, and the engine gets the
  // original cvar (cof_introduction reads it on the server)
  let languageSynced = false;
  const syncLanguage = () => {
    languageSynced = true;
    engineCmd(`cof_subtitlelanguage ${LANGUAGE_CODES[gameLanguage]}\n`);
  };
  const setLanguage = (name) => {
    if (!LANGUAGE_CODES[name]) return;
    gameLanguage = name;
    SPANISH = name === "spanish";
    try { localStorage.setItem(LANGUAGE_KEY, name); } catch (_) { /* private mode */ }
    textCache.clear();
    hintsCache = null;
    syncLanguage();
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
      // SDL captures document key events and cancels browser defaults, including
      // password typing and implicit Enter submission. Keep dialog keys here.
      e.stopPropagation();
    }, true);
    addEventListener("keypress", e => { if (dialog.classList.contains("on")) e.stopPropagation(); }, true);
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

  // the phone's screen shows the original English text; in other languages, the translation as a subtitle
  const showSmsTranslation = (n) => {
    if (gameLanguage === "english") return;
    const line = lineOf("phone_messages.txt", n + 1).replace(/^"|"$/g, "");
    if (line) flash(panel?.sub || (ensurePanel(), panel.sub), "subTimer", line, 6000);
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
    for (const path of localized("notes", file)) {
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


  // The original Padlock message owns a transparent overlay over the model view.
  let padlockPanel=null;
  const showPadlock = (open) => {
    if(!padlockPanel) {
      const overlay=document.createElement("div");overlay.id="cof-padlock";
      Object.assign(overlay.style,{position:"absolute",inset:"0",zIndex:"14",display:"none",containerType:"size"});
      const controls=document.createElement("div");
      Object.assign(controls.style,{position:"absolute",bottom:"0",left:"50%",transform:"translateX(-50%)",width:"min(300px,62.5cqh,100cqw)",aspectRatio:"3 / 1"});
      const img=document.createElement("img");Object.assign(img.style,{width:"100%",height:"100%",position:"absolute"});
      loadTga(`${GAME}/gfx/vgui/puzzle/padlock_buttons.tga`).then(url=>img.src=url).catch(e=>console.error("padlock UI",e));
      controls.append(img);
      for(let i=0;i<5;i++) {
        const b=document.createElement("button");b.type="button";b.setAttribute("aria-label",i<4?`Rotate wheel ${i+1}`:"Cancel padlock");
        b.dataset.wheel=i<4?i+1:"cancel";
        Object.assign(b.style,{position:"absolute",left:`${(i<4?18+i*66:117)/3}%`,top:i<4?"20%":"86%",width:"22%",height:i<4?"66%":"14%",border:"0",background:"transparent",cursor:"pointer"});
        b.addEventListener("click",()=>engineCmd(i<4?`padlockrotate ${i+1}`:"padlockcancel"));controls.append(b);
      }
      overlay.append(controls);document.querySelector("main").append(overlay);padlockPanel=overlay;
      for(const event of ["mousedown","mouseup","mousemove","click"]) overlay.addEventListener(event,e=>e.stopPropagation());
      addEventListener("keydown",e=>{if(overlay.style.display==="none")return;
        e.preventDefault();e.stopImmediatePropagation();if(e.key==="Escape")engineCmd("padlockcancel");
      },true);
    }
    padlockPanel.style.display=open?"block":"none";
    if(open&&document.pointerLockElement) document.exitPointerLock();
    if(!open) {try {const p=document.getElementById("canvas").requestPointerLock();if(p&&p.catch)p.catch(()=>{});}catch(_) {}}
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
      showLoadGame();
    } else if (action === "options") {
      showOptions();
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
    if(padlockPanel && padlockPanel.style.display!=="none") { e.preventDefault();e.stopImmediatePropagation();escapeTaken=true;if(!e.repeat)engineCmd("padlockcancel");return; }
    // the dialogs of hud.js (notes, keypad) close themselves with their own listener
    if (panel && panel.dialog.classList.contains("on")) return;
    // Esc never reaches the engine: its menu is Half-Life's
    escapeTaken = true;
    e.stopImmediatePropagation();
    e.preventDefault();
    if (e.repeat) return;
    if (closeSheet()) return;
    if (menu.visible) { menu.board.classList.remove("on"); return; }
    if (!window.CoFRuntimeReady || !currentMapName() || loading.active) return;
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


  // --- messages in the middle of the screen (CoF_CenterPrint) ---------------------------------
  // They come from the levels in English; these are the ones of the prologue, prelude and
  // chapter 1. Unknown ones stay in English.
  const CENTER_ES = {
    "I need to check out the other door first.": "Primero tengo que revisar la otra puerta.",
    "The door won't budge.": "La puerta no se mueve.",
    "The door won't budge": "La puerta no se mueve.",
    "What the... The door won't open now.": "¿Qué...? Ahora la puerta no se abre.",
    "The doors won't budge.": "Las puertas no se mueven.",
    "The shutter is closed. It won't budge.": "La persiana está cerrada. No se mueve.",
    "You unlocked the door.": "Has abierto la cerradura.",
    "This hall door is locked.": "La puerta de este pasillo está cerrada con llave.",
    "Can't call the elevator. It must be stuck somewhere.": "No puedo llamar al ascensor. Debe de estar atascado en algún sitio.",
    "There's a keypad next to the elevator.": "Hay un teclado junto al ascensor.",
    "The door is locked.": "La puerta está cerrada con llave.",
    "Seems like it's locked from the other side.": "Parece que está cerrada por el otro lado.",
    "The lock is jammed. Can't open it.": "La cerradura está atascada. No puedo abrirla.",
    "I can't open it. Did it jam?": "No puedo abrirla. ¿Se habrá atascado?",
    "You got a handgun.": "Has conseguido una pistola.",
    "I need to go to the fourth floor.": "Tengo que ir a la cuarta planta.",
    "What? Someone locked it.": "¿Qué? Alguien la ha cerrado con llave.",
    "The doors have been completely blocked!": "¡Han bloqueado las puertas por completo!",
    "I can view videotapes with this.": "Con esto puedo ver cintas de vídeo.",
    "You inserted the Videotape.": "Has metido la cinta de vídeo.",
    "I can't open this door, they have blocked it.": "No puedo abrir esta puerta, la han bloqueado.",
    "What the?! Somebody's blocked the door!": "¿¡Qué!? ¡Alguien ha bloqueado la puerta!",
    "You will need a rope or something to climb down.": "Necesitaré una cuerda o algo para bajar.",
    "You have placed the rope.": "Has colocado la cuerda.",
    "I can't carry any more.": "No puedo llevar nada más.",
    "I don't need that right now.": "Ahora no me hace falta.",
  };

  let centerBox = null;
  const showCenter = (text) => {
    if (!centerBox) {
      const style = document.createElement("style");
      style.textContent = `
        #cof-center { position:absolute; left:50%; top:62%; transform:translateX(-50%); max-width:min(80%, 760px);
                      z-index:11; pointer-events:none; color:#f0f0f0; text-align:center;
                      font:clamp(14px, 2.4vh, 24px)/1.35 Arial, sans-serif; text-shadow:0 0 6px #000, 0 0 2px #000;
                      opacity:0; transition:opacity .25s ease; }
        #cof-center.on { opacity:1; }
      `;
      document.head.appendChild(style);
      centerBox = { el: document.createElement("div"), timer: 0 };
      centerBox.el.id = "cof-center";
      document.querySelector("main").appendChild(centerBox.el);
    }
    centerBox.el.textContent = (SPANISH && CENTER_ES[text.trim()]) || text;
    centerBox.el.classList.add("on");
    clearTimeout(centerBox.timer);
    centerBox.timer = setTimeout(() => centerBox.el.classList.remove("on"), 3500);
  };


  // --- Load game and Options panels: the engine's own (Half-Life's) never show ------------------
  // The tape recorders save to one slot ("cof_last", puzzles.cpp). The page remembers which level
  // it was, so loading can fetch that level's pack first.
  const SAVES_KEY = "cofSaves";
  const OPTIONS_KEY = "cofOptions";
  const readJson = (key, def) => { try { return JSON.parse(localStorage.getItem(key)) || def; } catch (_) { return def; } };
  const writeJson = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* private mode */ } };

  const rememberSave = (place) => {
    const saves = readJson(SAVES_KEY, {});
    saves.cof_last = { map: currentMapName(), place, time: Date.now() };
    writeJson(SAVES_KEY, saves);
  };

  const options = Object.assign({ sensitivity: 3, volume: 0.8, music: 0.8, brightness: 1 }, readJson(OPTIONS_KEY, {}));
  let optionsApplied = false;
  const applyOptions = () => {
    engineCmd(`sensitivity ${options.sensitivity}`);
    engineCmd(`volume ${options.volume}`);
    engineCmd(`brightness ${options.brightness}`);
    musicVolume = options.music;
    for (const audio of music.values()) audio.volume = musicVolume;
    optionsApplied = true;
  };

  let sheetPanel = null;
  const ensureSheet = () => {
    if (sheetPanel) return;
    const style = document.createElement("style");
    style.textContent = `
      #cof-sheet { position:absolute; inset:0; z-index:17; display:none; align-items:center; justify-content:center;
                   background:rgba(0,0,0,.78); user-select:none; }
      #cof-sheet.on { display:flex; }
      #cof-sheet .box { min-width:min(80%, 420px); max-width:min(90%, 560px); padding:1.4em 1.8em; background:#0d0d0d;
                        border:1px solid #333; box-shadow:0 0 40px #000; color:#ddd; font:clamp(13px, 2vh, 18px) Arial, sans-serif; }
      #cof-sheet h2 { margin:0 0 .8em; font:clamp(16px, 2.8vh, 26px) Arial, sans-serif; letter-spacing:.08em; color:#eee; }
      #cof-sheet .row { display:flex; align-items:center; justify-content:space-between; gap:1em; margin:.55em 0; }
      #cof-sheet input[type=range] { width:55%; accent-color:#a00; }
      #cof-sheet button { all:unset; cursor:pointer; padding:.35em .9em; border:1px solid #444; color:#eee; }
      #cof-sheet button:hover { color:#c00; border-color:#700; }
      #cof-sheet .save { padding:.6em .8em; border:1px solid #333; cursor:pointer; margin:.4em 0; }
      #cof-sheet .save:hover { border-color:#700; color:#fff; }
      #cof-sheet .actions { margin-top:1em; display:flex; justify-content:flex-end; gap:.6em; }
      #cof-sheet .empty { color:#888; }
    `;
    document.head.appendChild(style);
    const el = document.createElement("div");
    el.id = "cof-sheet";
    el.addEventListener("click", (e) => { if (e.target === el) closeSheet(); });
    sheetPanel = { el, onClose: null };
    document.querySelector("main").appendChild(el);
  };

  const openSheet = (title, body, onClose) => {
    ensureSheet();
    const box = document.createElement("div");
    box.className = "box";
    const h = document.createElement("h2");
    h.textContent = title;
    const actions = document.createElement("div");
    actions.className = "actions";
    const back = document.createElement("button");
    back.textContent = SPANISH ? "Volver" : "Back";
    back.addEventListener("click", () => closeSheet());
    actions.appendChild(back);
    box.append(h, body, actions);
    sheetPanel.el.replaceChildren(box);
    sheetPanel.el.classList.add("on");
    sheetPanel.onClose = onClose || null;
  };

  const closeSheet = () => {
    if (!sheetPanel || !sheetPanel.el.classList.contains("on")) return false;
    sheetPanel.el.classList.remove("on");
    const f = sheetPanel.onClose;
    sheetPanel.onClose = null;
    if (f) f();
    return true;
  };

  const showLoadGame = (onClose) => {
    const body = document.createElement("div");
    const saves = readJson(SAVES_KEY, {});
    const names = Object.keys(saves);
    if (!names.length) {
      const p = document.createElement("div");
      p.className = "empty";
      p.textContent = SPANISH ? "No hay partidas guardadas. Usa una grabadora para guardar." : "No saved games. Use a tape recorder to save.";
      body.appendChild(p);
    }
    for (const name of names) {
      const s = saves[name];
      const row = document.createElement("div");
      row.className = "save";
      const when = new Date(s.time).toLocaleString(SPANISH ? "es" : "en");
      row.textContent = `${s.place || s.map} · ${when}`;
      row.addEventListener("click", async () => {
        sheetPanel.onClose = null;
        closeSheet();
        showMenu(false);
        if (pause.open) setPaused(false);
        stopAllMusic();
        loading.show();
        if (window.CoFPreload && s.map) await window.CoFPreload(s.map).catch(() => false);
        engineCmd(`load ${name}`);
      });
      body.appendChild(row);
    }
    openSheet(SPANISH ? "CARGAR PARTIDA" : "LOAD GAME", body, onClose);
  };

  // The original SUBTITLE LANGUAGE screen: language_settings.tga (640x480) with a 3x3 grid of flags,
  // 157x115 px cells at x 83/241/399 and y 64/181/298. Order of the original image.
  const LANGUAGE_GRID = [["english", 0, 0], ["swedish", 1, 0], ["norwegian", 2, 0],
                         ["dutch", 0, 1], ["french", 1, 1], ["german", 2, 1], ["spanish", 0, 2]];
  let languageStyle = false;
  const showLanguage = (onClose) => {
    if (!languageStyle) {
      languageStyle = true;
      const style = document.createElement("style");
      style.textContent = `
        .cof-lang { position:relative; width:min(640px, 100%); aspect-ratio:640 / 480; margin:0 auto; }
        .cof-lang img { position:absolute; inset:0; width:100%; height:100%; }
        /* #cof-sheet: must beat the "#cof-sheet button" rule of the sheet, which would make them static */
        #cof-sheet .cof-lang button { all:unset; position:absolute; cursor:pointer; box-sizing:border-box; }
        #cof-sheet .cof-lang button:hover, #cof-sheet .cof-lang button:focus-visible { box-shadow:inset 0 0 0 3px rgba(255,255,255,.55); }
        #cof-sheet .cof-lang button.on { box-shadow:inset 0 0 0 4px #f0d27a; }
      `;
      document.head.appendChild(style);
    }
    const board = document.createElement("div");
    board.className = "cof-lang";
    const img = document.createElement("img");
    img.alt = "";
    board.appendChild(img);
    loadTga(`${VGUI}/language_settings.tga`).then((url) => { img.src = url; })
      .catch((e) => console.warn("cof language screen:", e.message));
    for (const [name, col, row] of LANGUAGE_GRID) {
      const button = document.createElement("button");
      button.type = "button";
      button.title = LANGUAGE_NAMES[name];
      button.setAttribute("aria-label", LANGUAGE_NAMES[name]);
      button.classList.toggle("on", name === gameLanguage);
      Object.assign(button.style, { left: `${((83 + col * 158) / 640) * 100}%`, top: `${((64 + row * 117) / 480) * 100}%`,
        width: `${(157 / 640) * 100}%`, height: `${(115 / 480) * 100}%` });
      button.addEventListener("click", () => { setLanguage(name); closeSheet(); });
      board.appendChild(button);
    }
    openSheet(SPANISH ? "IDIOMA DE LOS SUBTÍTULOS" : "SUBTITLE LANGUAGE", board, onClose);
  };

  const showOptions = (onClose) => {
    const body = document.createElement("div");
    const slider = (label, key, min, max, step) => {
      const row = document.createElement("div");
      row.className = "row";
      const span = document.createElement("span");
      span.textContent = label;
      const input = document.createElement("input");
      Object.assign(input, { type: "range", min, max, step, value: options[key] });
      input.addEventListener("input", () => {
        options[key] = +input.value;
        writeJson(OPTIONS_KEY, options);
        applyOptions();
      });
      row.append(span, input);
      body.appendChild(row);
    };
    slider(SPANISH ? "Sensibilidad del ratón" : "Mouse sensitivity", "sensitivity", 0.5, 10, 0.1);
    slider(SPANISH ? "Volumen" : "Volume", "volume", 0, 1, 0.05);
    slider(SPANISH ? "Música" : "Music", "music", 0, 1, 0.05);
    slider(SPANISH ? "Brillo" : "Brightness", "brightness", 0, 2, 0.05);
    const row = document.createElement("div");
    row.className = "row";
    const span = document.createElement("span");
    span.textContent = SPANISH ? "Pantalla completa" : "Fullscreen";
    const fs = document.createElement("button");
    fs.textContent = SPANISH ? "Activar" : "Enable";
    fs.addEventListener("click", () => document.getElementById("canvas").parentElement.requestFullscreen({ navigationUI: "hide" }).catch(() => {}));
    row.append(span, fs);
    body.appendChild(row);
    const langRow = document.createElement("div");
    langRow.className = "row";
    const langLabel = document.createElement("span");
    langLabel.textContent = SPANISH ? "Idioma de los subtítulos" : "Subtitle language";
    const langButton = document.createElement("button");
    langButton.textContent = LANGUAGE_NAMES[gameLanguage];
    // back to these options afterwards, relabelled in the new language
    langButton.addEventListener("click", () => showLanguage(() => showOptions(onClose)));
    langRow.append(langLabel, langButton);
    body.appendChild(langRow);
    openSheet(SPANISH ? "OPCIONES" : "OPTIONS", body, onClose);
  };

  window.CoFHUD = {
    get bagOpen() { return bag.open; },
    get menuOpen() { return menu.visible; },
    get paused() { return pause.open; },
    onMap,
    handle(line) {
      if (!languageSynced) syncLanguage();  // the first server line: the engine is up
      const [cmd, ...args] = line.trim().split(/\s+/);
      const rest = line.trim().slice(cmd.length).trim();
      switch (cmd) {
        case "BOSS":
          updateBoss(Number(args[0]) || 0, Number(args[1]) || 0, args[2], args[3]);
          break;
        case "LOGO":
          showLogo(parseInt(args[0], 10) || 0);
          break;
        case "INTRO":
          toggleIntro(parseInt(args[0], 10) || 0);
          break;
        case "BW":
          // strength 0..255: how much of the frame turns grey (0 = colour again)
          if (window.CoFPostFX) CoFPostFX.set({ grey: Math.min(Math.max(parseInt(args[0], 10) || 0, 0), 255) / 255 });
          break;
        case "BLUR": {
          const on = (parseInt(args[0], 10) || 0) !== 0;
          const strength = parseFloat(args[1]) || 1;
          if (window.CoFPostFX) CoFPostFX.set({ blur: on ? Math.max(1, Math.min(8, strength)) : 0 });
          break;
        }
        case "STAT":
          if (loading.active) loading.ready();
          updateStatus(+args[0] || 0, +args[1] || 0, +args[2] || 0, +args[3] || 0);
          break;
        case "SMSICON":
          setSmsIcon(args[0] === "1");
          break;
        case "SMSREAD":
          // the message is on the phone's screen (in English, like the original): its translation below
          showSmsTranslation(parseInt(args[0], 10) || 0);
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
          // TAB on the main menu or while a level loads: nothing (the bag is for the game)
          if (bag.open || (!menu.visible && !loading.active && !pause.open)) toggleBag();
          break;
        case "MUSIC":
          if (args[2]) playMusic(parseInt(args[0], 10) || 0, args[1] === "1", args[2], parseFloat(args[3]) || 0);
          break;
        case "MUSICSTOP":
          stopMusic(parseInt(args[0], 10) || 0);
          break;
        case "CENTER":
          if (rest) showCenter(rest);
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
        case "PADLOCK":
          showPadlock(parseInt(args[0],10)!==0);
          break;
        case "PADCLUE":
          showNoteText(`${SPANISH?"C\u00f3digo del candado":"Padlock code"}: ${args[0]}`);
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
          rememberSave(rest);
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
