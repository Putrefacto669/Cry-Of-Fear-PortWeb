// Browser adapters for the original commentary stream and Clothes message.
(() => {
  'use strict';
  // Native CClothesMenu (1001f2b0) puts the list in the right half, leaving Simon visible on the left.
  const names = ['Default clothes', 'David Leatherhoff suit', 'ModDB hoodie', 'Hello Kitty suit',
    'Afraid of Monsters suit', 'Camouflage hoodie', 'Half-Life Creations hoodie', 'Black Metal suit',
    'Team Psykskallar hoodie', 'Awesome suit', 'Sick Simon suit', 'AoM Twitcher suit'];  const authors = ['Minuit', 'ruMpel', 'Sporkeh', 'DragonNOR', 'BerZerk', 'Mr. Sunabouzu - On Sporkeh'];
  let panel, caption, checkbox, stream, blobUrl, commentaryId = 0, clothesOpen = false;
  let unlocks = 0, selected = 0, mask = 0, volume = .8, hooks = {}, menuClothes = false;
  const cmd = text => { if (window.CoFRuntimeReady) Module.ccall('Xash_Cmd', null, ['string'], [text + '\n']); };
  const ensure = () => {
    if (panel) return;
    const style = document.createElement('style');
    style.textContent = `
      /* the native CClothesMenu (client.dll 1001f2b0) over a W x H screen: buttons H/12 high; the list at x = W/2,
         W/2 wide, from the top; Close at (0, H - H/12) and Reset at (W/4, H - H/12), W/4 wide. ColorButtons with
         the "credits" font: text white alpha 200, no fill, borders black and white alpha 128, the chosen one red
         alpha 32 (11/11/2026; it replaces the boxed panel of 07/11) */
      #cof-clothes { display:none; position:absolute; inset:0; z-index:15; pointer-events:none;
        font:clamp(11px,2.7vh,24px) "Trebuchet MS",Tahoma,Arial,sans-serif; }
      #cof-clothes.on { display:block; }
      #cof-clothes button { position:absolute; height:8.3333%; box-sizing:border-box; margin:0; padding:0 4px;
        pointer-events:auto; cursor:pointer; font:inherit; color:rgba(255,255,255,.78); background:transparent;
        border:1px solid rgba(255,255,255,.5); border-right-color:rgba(0,0,0,.5); border-bottom-color:rgba(0,0,0,.5);
        text-shadow:0 1px 2px #000; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      #cof-clothes button:hover:not(:disabled), #cof-clothes button:focus-visible { color:#fff; outline:none; }
      #cof-clothes button:disabled { cursor:default; color:rgba(255,255,255,.55); }
      #cof-clothes button[aria-pressed=true] { background:rgba(255,0,0,.125); }
      #cof-commentary { display:none; position:absolute; left:10%; right:10%; bottom:8%; z-index:15;
        color:#ddd; text-align:center; font:clamp(13px,2.1vh,22px) Arial,sans-serif; text-shadow:0 2px 3px black; }
      #cof-commentary.on { display:block; }
      #cof-dev-option { position:absolute; left:20%; top:78%; color:#ddd; font:clamp(10px,1.8vh,18px) Arial,sans-serif; }
    `;
    document.head.append(style);
    panel = document.createElement('section'); panel.id = 'cof-clothes'; panel.setAttribute('aria-label', 'Clothes');
    // the list: costumes 1..11 and the Custom hoodie (setclothes 12 with a player's custom_hoodie.tga, which the
    // port does not support: shown locked); the default clothes are Reset, as in the original
    const row = (label, left, top, width) => {
      const button = document.createElement('button'); button.textContent = label;
      Object.assign(button.style, { left: `${left}%`, top: `${top}%`, width: `${width}%` }); panel.append(button);
      return button;
    };
    for (let i = 1; i <= 12; i++) {
      const button = row('', 50, (i - 1) * 100 / 12, 50); button.dataset.costume = i;
      if (i < names.length) button.addEventListener('click', () => cmd(`setclothes ${i}`));
    }
    const close = row('Close', 0, 100 - 100 / 12, 25); close.dataset.close = '1';
    close.addEventListener('click', closeClothes);
    const reset = row('Reset', 25, 100 - 100 / 12, 25); reset.dataset.reset = '1';
    reset.addEventListener('click', () => cmd('setclothes 0'));
    caption = document.createElement('div'); caption.id = 'cof-commentary';
    document.querySelector('main').append(panel, caption);
  };
  const renderClothes = () => {
    ensure();
    for (const button of panel.querySelectorAll('[data-costume]')) {
      const i = +button.dataset.costume, enabled = i < names.length && !!(mask & (1 << (i - 1)));
      button.disabled = !enabled; const label=enabled ? names[i] : 'Locked';
      if(button.textContent!==label)button.textContent=label;
      button.setAttribute('aria-pressed', String(selected === i));
    }
    panel.classList.toggle('on', clothesOpen);
    panel.setAttribute('aria-label', menuClothes ? 'Items / Clothes' : 'Clothes');
    if(menuClothes)window.CoFHUD?.showClothesMenu(clothesOpen);
  };
  function closeClothes() {
    cmd('closeclothes');
    if(!menuClothes){clothesOpen=false;try { document.getElementById('canvas').requestPointerLock()?.catch(() => {}); } catch (_) {}}
  }
  const stopCommentary = () => {
    if (stream) { stream.pause(); stream.removeAttribute('src'); stream.load(); stream = null; }
    if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
    if (commentaryId) hooks.end?.();
    commentaryId = 0;
    caption?.classList.remove('on');
  };
  const playCommentary = (args) => {
    ensure();
    const [idText, offsetText, remainingText, authorText, file, ...custom] = args;
    const id = +idText, offset = +offsetText || 0;
    if (commentaryId === id && stream) return; // periodic synchronization must not restart the recording
    stopCommentary();
    // The original PlayMP3 message uses mp3/commentary/*.wav. Never resolve it under sound/.
    if (!/^commentary\/[a-z0-9_/-]+\.wav$/i.test(file)) return;
    try {
      const bytes = FS.readFile(window.CoFHUD.resolvePath(`/rodir/cryoffear/mp3/${file}`));
      blobUrl = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
      stream = new Audio(blobUrl); stream.volume = volume;
      const audio = stream;
      audio.addEventListener('loadedmetadata', () => {
        if (stream !== audio) return;
        if (offset > 0 && Number.isFinite(audio.duration)) audio.currentTime = Math.min(offset, audio.duration);
      }, { once: true });
      const start = () => audio.play().catch(error => {
        if (error.name === 'NotAllowedError') {
          const resume = () => { if (stream === audio) audio.play().catch(() => {}); };
          addEventListener('keydown', resume, { once: true, capture: true });
          addEventListener('pointerdown', resume, { once: true, capture: true });
        } else console.warn('cof commentary:', error.message);
      });
      commentaryId = id; hooks.begin?.();
      const title = custom.length && custom[0] !== '-' ? custom.join(' ') : (authors[+authorText] || '');
      caption.textContent = `${title}${title ? ' - ' : ''}Press Enter to skip`;
      caption.classList.add('on');
      start();
    } catch (error) { console.warn('cof commentary:', error.message); stopCommentary(); }
  };
  const refreshOption = () => {
    const sheet = document.querySelector('#cof-menu .board .sheet');
    if (!sheet) return;
    if (!checkbox) {
      const label = document.createElement('label'); label.id = 'cof-dev-option';
      checkbox = document.createElement('input'); checkbox.type = 'checkbox';
      checkbox.addEventListener('change', () => cmd(`dev_commentary ${checkbox.checked ? 1 : 0}`));
      label.append(checkbox, document.createTextNode(' Enable developer commentary')); sheet.append(label);
    }
    checkbox.disabled = !(unlocks & 0x400000);
  };
  addEventListener('keydown', e => {
    if (commentaryId && e.code === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); cmd('cof_commentary_skip'); }
    else if (clothesOpen && e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); closeClothes(); }
  }, true);
  window.CoFExtras = {
    get clothesOpen() { return clothesOpen; },
    setHooks(value) { hooks = value; },
    setVolume(value) { volume = Math.max(0, Math.min(1, value)); if (stream) stream.volume = volume; },
    onMap() { window.CoFPostFX?.set({ nightvision: false });window.CoFPostFX?.setPreviewTexture(0,0,0);window.CoFHUD?.showClothesMenu(false);stopCommentary(); clothesOpen = false;menuClothes=false; panel?.classList.remove('on'); },
    handle(command, args) {
      if(command==='CLOTHESGPU')window.CoFPostFX?.setPreviewTexture(+args[0],+args[1],+args[2]);
      else if (command === 'NIGHTVISION') window.CoFPostFX?.set({ nightvision: args[0] === '1' });
      else if (command === 'EXTRAS') { unlocks = +args[0]; selected = +args[1]; refreshOption(); }
      else if (command === 'CLOTHES') {
        mask = +args[0]; selected = +args[1]; const open = args[2] === '1';menuClothes=args[3]==='1';
        if (open && !clothesOpen && document.pointerLockElement) document.exitPointerLock();
        clothesOpen = open; renderClothes();
      } else if (command === 'COMMENTARY') playCommentary(args);
      else if (command === 'COMMENTARYSTOP' && +args[0] === commentaryId) stopCommentary();
    }
  };
})();
