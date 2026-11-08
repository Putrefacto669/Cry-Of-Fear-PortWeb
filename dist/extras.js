// Browser adapters for the original commentary stream and Clothes message.
(() => {
  'use strict';
  // Native CClothesMenu (1001f2b0) puts the list in the right half, leaving Simon visible on the left.
  const names = ['Default clothes', 'David Leatherhoff suit', 'ModDB hoodie', 'Hello Kitty suit',
    'Afraid of Monsters suit', 'Camouflage hoodie', 'Half-Life Creations hoodie', 'Black Metal suit',
    'Team Psykskallar hoodie', 'Awesome suit', 'Sick Simon suit', 'AoM Twitcher suit'];
  const authors = ['Minuit', 'ruMpel', 'Sporkeh', 'DragonNOR', 'BerZerk', 'Mr. Sunabouzu - On Sporkeh'];
  let panel, caption, checkbox, stream, blobUrl, commentaryId = 0, clothesOpen = false;
  let unlocks = 0, selected = 0, mask = 0, volume = .8, hooks = {}, menuClothes = false;
  const cmd = text => { if (window.CoFRuntimeReady) Module.ccall('Xash_Cmd', null, ['string'], [text + '\n']); };
  const ensure = () => {
    if (panel) return;
    const style = document.createElement('style');
    style.textContent = `
      #cof-clothes { display:none; position:absolute; right:3%; top:5%; z-index:15; width:min(300px,43%);
        max-height:90%; overflow-y:auto; box-sizing:border-box; padding:12px; background:rgba(0,0,0,.72); color:#ddd; font:clamp(12px,1.8vh,18px) Arial,sans-serif; }
      #cof-clothes.on { display:flex; flex-direction:column; gap:4px; }
      #cof-clothes button { flex-shrink:0; background:#171717; color:#ddd; border:1px solid #666; padding:5px; cursor:pointer; }
      #cof-clothes button:disabled { color:#777; cursor:default; }
      #cof-clothes button[aria-pressed=true] { border-color:#c9a57a; }
      #cof-clothes [data-close] { position:sticky; bottom:0; z-index:1; }
      #cof-commentary { display:none; position:absolute; left:10%; right:10%; bottom:8%; z-index:15;
        color:#ddd; text-align:center; font:clamp(13px,2.1vh,22px) Arial,sans-serif; text-shadow:0 2px 3px black; }
      #cof-commentary.on { display:block; }
      #cof-dev-option { position:absolute; left:20%; top:78%; color:#ddd; font:clamp(10px,1.8vh,18px) Arial,sans-serif; }
    `;
    document.head.append(style);
    panel = document.createElement('section'); panel.id = 'cof-clothes'; panel.setAttribute('aria-label', 'Clothes');
    const title = document.createElement('strong'); title.textContent = 'Clothes'; panel.append(title);
    for (let i = 0; i < names.length; i++) {
      const button = document.createElement('button'); button.dataset.costume = i;
      button.addEventListener('click', () => cmd(`setclothes ${i}`)); panel.append(button);
    }
    const close = document.createElement('button'); close.textContent = 'Exit'; close.dataset.close = '1';
    close.addEventListener('click', closeClothes); panel.append(close);
    caption = document.createElement('div'); caption.id = 'cof-commentary';
    document.querySelector('main').append(panel, caption);
  };
  const renderClothes = () => {
    ensure();
    for (const button of panel.querySelectorAll('[data-costume]')) {
      const i = +button.dataset.costume, enabled = i === 0 || !!(mask & (1 << (i - 1)));
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
