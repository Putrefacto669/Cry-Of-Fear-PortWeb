(() => {
  const launcher = document.getElementById("launcher");
  if (!launcher) return;
  const storage = "cof-input-device-v1";
  const guideStorage = "cof-touch-guide-v1";
  const valid = value => value === "pc" || value === "mobile";
  const read = name => { try { return localStorage.getItem(name); } catch (_) { return null; } };
  const save = (name, value) => { try { localStorage.setItem(name, value); } catch (_) {} };
  const override = new URL(location.href).searchParams.get("input");
  const stored = read(storage);
  let device = valid(override) ? override : valid(stored) ? stored : null;
  let guideSeen = read(guideStorage) === "1";
  const main = document.querySelector("main");
  const play = document.getElementById("play");
  const languageGate = document.getElementById("launcher-language");
  const canvas = document.getElementById("canvas");
  const english = () => (window.CoFLauncher?.language || read("cofLauncherLanguage")) !== "spanish";
  const t = (es, en) => english() ? en : es;
  const button = (parent, text, action) => {
    const element = document.createElement("button");
    element.type = "button";
    element.textContent = text;
    if (action) element.addEventListener("click", action);
    parent.append(element);
    return element;
  };

  const settings = document.createElement("div");
  settings.className = "cof-device-settings";
  launcher.querySelector(".lb-hero").append(settings);
  const change = button(settings, "", showDevice);
  const guide = button(settings, "", showGuide);
  const dialog = document.createElement("dialog");
  dialog.id = "cof-device-dialog";
  const title = document.createElement("h2");
  title.id = "cof-device-title";
  dialog.setAttribute("aria-labelledby", title.id);
  const content = document.createElement("div");
  dialog.append(title, content);
  launcher.append(dialog);
  const close = () => dialog.close();
  function showDevice() {
    title.textContent = t("¿Dónde vas a jugar?", "How will you play?");
    content.replaceChildren();
    button(content, t("PC · Teclado y ratón", "PC · Keyboard and mouse"), () => select("pc"));
    button(content, t("Móvil · Pantalla táctil", "Mobile · Touchscreen"), () => select("mobile"));
    if (!dialog.open) dialog.showModal();
  }
  function select(next) {
    device = next;
    save(storage, device);
    labels();
    if (device === "mobile" && !guideSeen) showGuide();
    else close();
  }
  function showGuide() {
    title.textContent = t("Controles táctiles", "Touch controls");
    content.replaceChildren();
    const diagram = document.createElement("div");
    diagram.className = "cof-touch-diagram";
    for (const [symbol, text] of [
      ["✥", t("Mueve el joystick izquierdo", "Move the left stick")],
      ["↔", t("Arrastra la derecha para mirar", "Swipe on the right to look")],
      ["◎", t("Ataque, Usar y Recargar", "Attack, Use and Reload")],
      ["▣", t("Bolso y accesos 1, 2 y 3", "Bag and quick slots 1, 2 and 3")],
      ["▤", t("Consulta notas y objetivos", "Read notes and objectives")],
      ["Ⅱ", t("Para combinar armas, abre el bolso. Las escaleras requieren una validación táctil aparte.", "Use the bag to combine weapons. Touch controls for ladders still need validation.")]
    ]) {
      const item = document.createElement("div");
      const icon = document.createElement("b");
      icon.textContent = symbol;
      icon.setAttribute("aria-hidden", "true");
      item.append(icon, text);
      diagram.append(item);
    }
    const tip = document.createElement("p");
    tip.textContent = t("Gira el teléfono para jugar en horizontal.", "Turn your phone to play in landscape.");
    content.append(diagram, tip);
    const acknowledge = () => { guideSeen = true; save(guideStorage, "1"); close(); };
    button(content, t("Entendido, comenzar", "Got it, start"), () => { acknowledge(); play.click(); });
    button(content, t("Omitir guía", "Skip guide"), acknowledge);
    if (!dialog.open) dialog.showModal();
    content.querySelector("button").focus();
  }
  function labels() {
    change.textContent = t("Dispositivo", "Input device") + (device ? " · " + (device === "pc" ? "PC" : t("Móvil", "Mobile")) : "");
    guide.textContent = t("Ver guía nuevamente", "View touch guide");
    guide.hidden = device !== "mobile";
  }
  function checkLauncher() {
    if (launcher.hidden || !languageGate?.hidden) return;
    labels();
    if (!device && !dialog.open) showDevice();
  }
  const launcherObserver = new MutationObserver(checkLauncher);
  for (const node of [launcher, languageGate].filter(Boolean)) launcherObserver.observe(node, {attributeFilter:["hidden"]});
  dialog.addEventListener("cancel", event => {
    if (!device || (device === "mobile" && !guideSeen)) event.preventDefault();
  });
  play.addEventListener("click", event => {
    if (device && (device !== "mobile" || guideSeen)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (device) showGuide();
    else showDevice();
  }, true);
  labels();

  const controls = document.createElement("div");
  controls.id = "cof-touch-controls";
  controls.hidden = true;
  const stick = document.createElement("div");
  stick.className = "cof-touch-stick";
  stick.setAttribute("role", "img");
  stick.setAttribute("aria-label", t("Joystick de movimiento", "Movement joystick"));
  const thumb = document.createElement("span");
  stick.append(thumb);
  for (const direction of ["up", "right", "down", "left"]) {
    const mark = document.createElement("i");
    mark.className = direction;
    mark.setAttribute("aria-hidden", "true");
    stick.append(mark);
  }
  const actions = document.createElement("div");
  actions.className = "cof-touch-actions";
  const rotation = document.createElement("div");
  const rotationHint = document.createElement("p");
  rotation.append(rotationHint);
  rotation.className = "cof-touch-rotation";
  rotation.hidden = true;
  controls.append(stick, actions, rotation);
  main.append(controls);

  const pressed = new Map();
  let attackButton;
  let ladderAvailable = false;
  let climbing = false;
  let climbDirection = null;
  const command = value => window.Module.ccall("Xash_Cmd", null, ["string"], [value + "\n"]);
  const release = (element, id) => {
    const current = pressed.get(element);
    if (!current || (id !== undefined && current.id !== id)) return;
    pressed.delete(element);
    command("-" + current.action);
    if (element.hasPointerCapture(current.id)) element.releasePointerCapture(current.id);
    element.classList.remove("pressed");
  };
  const resetButtons = () => { for (const element of pressed.keys()) release(element); };
  let stickPress = null;
  function changeClimbDirection(next) {
    if (climbDirection === next) return;
    if (climbDirection) command("-" + climbDirection);
    climbDirection = next;
    if (next) command("+" + next);
  }
  function releaseStick(event) {
    if (!stickPress || (event && event.pointerId !== stickPress.id)) return;
    stickPress = null;
    changeClimbDirection(null);
    thumb.style.transform = "";
  }
  function startStick(event) {
    if (blocked || stickPress) return;
    const box = stick.getBoundingClientRect();
    const x = box.left + box.width / 2, y = box.top + box.height / 2;
    const radius = box.width / 2;
    if (Math.hypot(event.clientX - x, event.clientY - y) > radius) return;
    stickPress = {id:event.pointerId, x, y, radius};
    moveStick(event);
  }
  function moveStick(event) {
    if (event.pointerId !== stickPress?.id) return;
    const {x, y, radius} = stickPress;
    const dx = (event.clientX - x) / radius, dy = (event.clientY - y) / radius;
    const limit = Math.max(1, Math.hypot(dx, dy));
    if (climbing) changeClimbDirection(dy < -.28 ? "forward" : dy > .28 ? "back" : null);
    thumb.style.transform = `translate(${dx / limit * 66}%, ${dy / limit * 66}%)`;
  }
  function registerTouchZones() {
    const view = canvas.getBoundingClientRect();
    const area = stick.getBoundingClientRect();
    if (!view.width || !view.height || !area.width) return;
    const x1 = (area.left - view.left) / view.width;
    const y1 = (area.top - view.top) / view.height;
    const x2 = (area.right - view.left) / view.width;
    const y2 = (area.bottom - view.top) / view.height;
    if (climbing) {
      command("touch_removebutton cof_web_look; touch_removebutton cof_web_joy");
      return;
    }
    // The Xash circle uses TOUCH_FL_CLIENT (4) and TOUCH_FL_STICK (2048).
    command('touch_addbutton cof_web_look "" "_look" 0.5 0 1 1 0 0 0 0 4');
    command(`touch_addbutton cof_web_joy "" "_joy" ${x1} ${y1} ${x2} ${y2} 0 0 0 0 2052`);
  }
  const clearTouches = () => {
    resetButtons();
    releaseStick();
    if (configured) {
      command("touch_removebutton cof_web_joy; touch_setclientonly 0; touch_setclientonly 1");
      if (!blocked) registerTouchZones();
    }
  };
  const bindings = [
    ["attack", "Ataque", "Attack"],
    ["use", "Usar", "Use"], ["reload", "Recargar", "Reload"],
    ["jump", "Saltar", "Jump"], ["duck", "Agachar", "Crouch"],
    ["sprint", "Correr", "Sprint"],
    ["objectives", "Objetivos", "Objectives"]
  ];
  const icons = {
    pause: "M8 5v14 M16 5v14",
    inventory: "M4 13 19 11l2 9-16 2ZM4 13l3 4 10-1 2-5M9 17l.5 2m5-3 .5 2M5 15Q0 5 6 3q5-2 13 9",
    objectives: "M7 4h10v16H7z M10 8h4m-4 4h4m-4 4h3",
    flashlight: "m5 20 9-9 1-5 4 4-5 1m-9 9-2-2 9-9m6-5 1-2m2 5 2-1",
    ladder: "M7 3v18M17 3v18M7 6h10M7 10h10M7 14h10M7 18h10",
    attack: "M3 19l4-4 2 2-4 4a1.4 1.4 0 0 1-2-2ZM7 13l4 4m-2-3 6-7 6-4c0 5-3 9-10 13",
    reload: "M12 3a9 9 0 0 0-8 6m0-3v3h3m5 12a9 9 0 0 0 8-6m0 3v-3h-3m-7 2-3-1 4-10 3 1Z",
    use: "M7 13V7a1 1 0 0 1 2 0v5-8a1 1 0 0 1 2 0v8-9a1 1 0 0 1 2 0v9-7a1 1 0 0 1 2 0v8l2-2q2-2 3 0l-3 6q-2 4-5 4-4 0-6-4l-2-4q0-2 2-1l1 1",
    sprint: "M17 4h.01M5 20l5-5m1 6 4-5-4-3 3-5 3 4h4m-7-4-5-1-4 4",
    duck: "M16 6h.01M14 10l-5 4 5 2-3 4H6m8-10 2 4 4 1",
    jump: "M12 5h.01M12 9v6m0-5L5 6m7 4 7-4m-7 9-4 6m4-6 4 6"
  };
  function actionButton(action, label, invoke) {
    const element = button(actions, label, invoke);
    element.dataset.action = action;
    const path = icons[action];
    if (path) {
      element.setAttribute("aria-label", label);
      element.title = label;
      const ns = "http://www.w3.org/2000/svg";
      const icon = document.createElementNS(ns, "svg");
      icon.setAttribute("viewBox", "0 0 24 24");
      icon.setAttribute("aria-hidden", "true");
      const shape = document.createElementNS(ns, "path");
      shape.setAttribute("d", path);
      icon.append(shape);
      element.replaceChildren(icon);
    }
    return element;
  }
  function setLadderAvailable(available) {
    if (!attackButton || ladderAvailable === available) return;
    ladderAvailable = available;
    const label = available ? t("Usar escalera", "Use ladder") : t("Ataque", "Attack");
    attackButton.setAttribute("aria-label", label);
    attackButton.title = label;
    attackButton.dataset.ladder = available ? "1" : "0";
    attackButton.querySelector("path").setAttribute("d", available ? icons.ladder : icons.attack);
  }
  function setClimbing(active) {
    if (!running || climbing === active) return;
    climbing = active;
    setLadderAvailable(false);
    controls.classList.toggle("climbing", active);
    clearTouches();
  }
  function escape() {
    for (const type of ["keydown", "keyup"]) {
      window.dispatchEvent(new KeyboardEvent(type, {key:"Escape", code:"Escape", cancelable:true}));
    }
  }
  let configured = false;
  let running = false;
  let blocked = true;
  let mapShown = false;
  async function prepareScreen() {
    if (device !== "mobile") return;
    document.body.classList.add("cof-mobile-active");
    const root = document.documentElement;
    if (!document.fullscreenElement && root.requestFullscreen) {
      try { await root.requestFullscreen({navigationUI:"hide"}); }
      catch (_) { /* The menu remains usable when fullscreen is unavailable. */ }
    }
    try { await screen.orientation?.lock?.("landscape"); }
    catch (_) { /* The player can rotate the phone manually. */ }
  }

  function tick() {
    const hud = window.CoFHUD;
    const portrait = innerHeight > innerWidth;
    const next = !mapShown || document.hidden || portrait || hud.menuOpen || hud.bagOpen ||
      hud.paused || hud.cameraHidesHud || hud.interactionOpen || window.CoFExtras?.clothesOpen ||
      !document.getElementById("disclaimer").hidden;
    if (next && !blocked) clearTouches();
    blocked = next;
    controls.hidden = !mapShown;
    const wasHidden = stick.hidden;
    actions.hidden = stick.hidden = blocked;
    if (configured && wasHidden && !blocked) registerTouchZones();
    rotation.hidden = !mapShown || !portrait || hud.menuOpen || hud.paused || hud.bagOpen ||
      Boolean(window.CoFExtras?.clothesOpen) || hud.interactionOpen;
    requestAnimationFrame(tick);
  }
  function start() {
    if (device !== "mobile" || running) return;
    running = true;
    document.body.classList.add("cof-mobile-active");
    canvas.addEventListener("pointerdown", startStick);
    canvas.addEventListener("pointermove", moveStick);
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) {
      canvas.addEventListener(event, releaseStick);
    }
    new ResizeObserver(() => { if (configured && !blocked) clearTouches(); }).observe(canvas);
    rotationHint.textContent = t("Gira el teléfono para jugar en horizontal", "Turn your phone sideways to play");
    if (document.documentElement.requestFullscreen || screen.orientation?.lock) {
      button(rotation, t("Intentar pantalla completa", "Try fullscreen"), prepareScreen);
    }
    for (const [action, spanish, label] of bindings) {
      const element = actionButton(action, t(spanish, label));
      if (action === "attack") attackButton = element;
      element.addEventListener("pointerdown", event => {
        if (blocked || event.button !== 0 || pressed.has(element)) return;
        event.preventDefault();
        element.setPointerCapture(event.pointerId);
        if (action === "attack" && ladderAvailable) {
          command("cof_useladder");
          return;
        }
        pressed.set(element, {id:event.pointerId, action});
        command("+" + action);
        element.classList.add("pressed");
      });
      for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
        element.addEventListener(type, event => release(element, event.pointerId));
      }
    }
    actionButton("flashlight", t("Linterna", "Flashlight"), () => { if (!blocked) command("flashlight"); });
    for (const slot of [1, 2, 3]) {
      const quick = actionButton("quick" + slot, String(slot), () => {
        if (blocked) return;
        command(`quicksel ${slot}`);
        for (const key of actions.querySelectorAll("[data-action^=quick]")) key.classList.toggle("quick-selected", key === quick);
      });
      quick.setAttribute("aria-label", t("Acceso rápido ", "Quick slot ") + slot);
    }
    actionButton("pause", t("Pausa", "Pause"), escape);
    const toggleBag = () => { command("+inventory"); command("-inventory"); };
    actionButton("inventory", t("Bolso de Simon", "Simon's bag"), toggleBag);
    for (const event of ["blur", "pagehide"]) window.addEventListener(event, clearTouches);
    document.addEventListener("visibilitychange", () => { if (document.hidden) clearTouches(); });
    canvas.addEventListener("touchcancel", clearTouches);
    requestAnimationFrame(tick);
  }
  function onMap() {
    if (!running) return;
    clearTouches();
    if (!configured) {
      command("touch_setclientonly 1");
      configured = true;
    }
    setClimbing(false);
    setLadderAvailable(false);
    mapShown = true;
    if (!blocked) registerTouchZones();
  }
  window.CoFMobile = Object.freeze({get active() { return device === "mobile"; }, prepareScreen, start, onMap, setLadderAvailable, setClimbing});
})();
