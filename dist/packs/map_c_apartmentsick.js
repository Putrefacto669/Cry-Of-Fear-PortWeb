
  var Module = typeof Module != 'undefined' ? Module : {};

  Module['expectedDataFileDownloads'] ??= 0;
  Module['expectedDataFileDownloads']++;
  (() => {
    // Do not attempt to redownload the virtual filesystem data when in a pthread or a Wasm Worker context.
    var isPthread = typeof ENVIRONMENT_IS_PTHREAD != 'undefined' && ENVIRONMENT_IS_PTHREAD;
    var isWasmWorker = typeof ENVIRONMENT_IS_WASM_WORKER != 'undefined' && ENVIRONMENT_IS_WASM_WORKER;
    if (isPthread || isWasmWorker) return;
    function loadPackage(metadata) {

      var PACKAGE_PATH = '';
      if (typeof window === 'object') {
        PACKAGE_PATH = window['encodeURIComponent'](window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')) + '/');
      } else if (typeof process === 'undefined' && typeof location !== 'undefined') {
        // web worker
        PACKAGE_PATH = encodeURIComponent(location.pathname.substring(0, location.pathname.lastIndexOf('/')) + '/');
      }
      var PACKAGE_NAME = '/root/cof-audits/extras-20261101/dist-fourth/packs/map_c_apartmentsick.data';
      var REMOTE_PACKAGE_BASE = 'map_c_apartmentsick.data';
      var REMOTE_PACKAGE_NAME = Module['locateFile'] ? Module['locateFile'](REMOTE_PACKAGE_BASE, '') : REMOTE_PACKAGE_BASE;
var REMOTE_PACKAGE_SIZE = metadata['remote_package_size'];

      function fetchRemotePackage(packageName, packageSize, callback, errback) {
        
        Module['dataFileDownloads'] ??= {};
        fetch(packageName)
          .catch((cause) => Promise.reject(new Error(`Network Error: ${packageName}`, {cause}))) // If fetch fails, rewrite the error to include the failing URL & the cause.
          .then((response) => {
            if (!response.ok) {
              return Promise.reject(new Error(`${response.status}: ${response.url}`));
            }

            if (!response.body && response.arrayBuffer) { // If we're using the polyfill, readers won't be available...
              return response.arrayBuffer().then(callback);
            }

            const reader = response.body.getReader();
            const iterate = () => reader.read().then(handleChunk).catch((cause) => {
              return Promise.reject(new Error(`Unexpected error while handling : ${response.url} ${cause}`, {cause}));
            });

            const chunks = [];
            const headers = response.headers;
            const total = Number(headers.get('Content-Length') ?? packageSize);
            let loaded = 0;

            const handleChunk = ({done, value}) => {
              if (!done) {
                chunks.push(value);
                loaded += value.length;
                Module['dataFileDownloads'][packageName] = {loaded, total};

                let totalLoaded = 0;
                let totalSize = 0;

                for (const download of Object.values(Module['dataFileDownloads'])) {
                  totalLoaded += download.loaded;
                  totalSize += download.total;
                }

                Module['setStatus']?.(`Downloading data... (${totalLoaded}/${totalSize})`);
                return iterate();
              } else {
                const packageData = new Uint8Array(chunks.map((c) => c.length).reduce((a, b) => a + b, 0));
                let offset = 0;
                for (const chunk of chunks) {
                  packageData.set(chunk, offset);
                  offset += chunk.length;
                }
                callback(packageData.buffer);
              }
            };

            Module['setStatus']?.('Downloading data...');
            return iterate();
          });
      };

      function handleError(error) {
        console.error('package error:', error);
      };

      var fetchedCallback = null;
      var fetched = Module['getPreloadedPackage'] ? Module['getPreloadedPackage'](REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE) : null;

      if (!fetched) fetchRemotePackage(REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE, (data) => {
        if (fetchedCallback) {
          fetchedCallback(data);
          fetchedCallback = null;
        } else {
          fetched = data;
        }
      }, handleError);

    function runWithFS(Module) {

      function assert(check, msg) {
        if (!check) throw msg + new Error().stack;
      }
Module['FS_createPath']("/", "rodir", true, true);
Module['FS_createPath']("/rodir", "cryoffear", true, true);
Module['FS_createPath']("/rodir/cryoffear", "aurora", true, true);
Module['FS_createPath']("/rodir/cryoffear", "gfx", true, true);
Module['FS_createPath']("/rodir/cryoffear/gfx", "env", true, true);
Module['FS_createPath']("/rodir/cryoffear/gfx", "vgui", true, true);
Module['FS_createPath']("/rodir/cryoffear/gfx/vgui", "boss", true, true);
Module['FS_createPath']("/rodir/cryoffear", "maps", true, true);
Module['FS_createPath']("/rodir/cryoffear", "materials", true, true);
Module['FS_createPath']("/rodir/cryoffear/materials", "maps", true, true);
Module['FS_createPath']("/rodir/cryoffear/materials/maps", "c_apartmentsick.bsp", true, true);
Module['FS_createPath']("/rodir/cryoffear", "models", true, true);
Module['FS_createPath']("/rodir/cryoffear/models", "Props", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "InomhusD", true, true);
Module['FS_createPath']("/rodir/cryoffear/models", "cutscene", true, true);
Module['FS_createPath']("/rodir/cryoffear", "mp3", true, true);
Module['FS_createPath']("/rodir/cryoffear/mp3", "commentary", true, true);
Module['FS_createPath']("/rodir/cryoffear/mp3/commentary", "Andreas", true, true);
Module['FS_createPath']("/rodir/cryoffear/mp3/commentary", "James", true, true);
Module['FS_createPath']("/rodir/cryoffear", "sound", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "boss", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound/boss", "sawer", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "common", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "cutscene", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound/cutscene", "hissscene", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound/cutscene", "start", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "doors", true, true);

      /** @constructor */
      function DataRequest(start, end, audio) {
        this.start = start;
        this.end = end;
        this.audio = audio;
      }
      DataRequest.prototype = {
        requests: {},
        open: function(mode, name) {
          this.name = name;
          this.requests[name] = this;
          Module['addRunDependency'](`fp ${this.name}`);
        },
        send: function() {},
        onload: function() {
          var byteArray = this.byteArray.subarray(this.start, this.end);
          this.finish(byteArray);
        },
        finish: function(byteArray) {
          var that = this;
          // canOwn this data in the filesystem, it is a slide into the heap that will never change
          Module['FS_createDataFile'](this.name, null, byteArray, true, true, true);
          Module['removeRunDependency'](`fp ${that.name}`);
          this.requests[this.name] = null;
        }
      };

      var files = metadata['files'];
      for (var i = 0; i < files.length; ++i) {
        new DataRequest(files[i]['start'], files[i]['end'], files[i]['audio'] || 0).open('GET', files[i]['filename']);
      }

      function processPackageData(arrayBuffer) {
        assert(arrayBuffer, 'Loading data file failed.');
        assert(arrayBuffer.constructor.name === ArrayBuffer.name, 'bad input to processPackageData');
        var byteArray = new Uint8Array(arrayBuffer);
        var curr;
        // Reuse the bytearray from the XHR as the source for file reads.
          DataRequest.prototype.byteArray = byteArray;
          var files = metadata['files'];
          for (var i = 0; i < files.length; ++i) {
            DataRequest.prototype.requests[files[i].filename].onload();
          }          Module['removeRunDependency']('datafile_/root/cof-audits/extras-20261101/dist-fourth/packs/map_c_apartmentsick.data');

      };
      Module['addRunDependency']('datafile_/root/cof-audits/extras-20261101/dist-fourth/packs/map_c_apartmentsick.data');

      Module['preloadResults'] ??= {};

      Module['preloadResults'][PACKAGE_NAME] = {fromCache: false};
      if (fetched) {
        processPackageData(fetched);
        fetched = null;
      } else {
        fetchedCallback = processPackageData;
      }

    }
    if (Module['calledRun']) {
      runWithFS(Module);
    } else {
      (Module['preRun'] ??= []).push(runWithFS); // FS is not initialized yet, wait for it
    }

    }
    loadPackage({"files": [{"filename": "/rodir/cryoffear/aurora/cof_vomit.aur", "start": 0, "end": 609}, {"filename": "/rodir/cryoffear/gfx/env/blackbk.tga", "start": 609, "end": 197235}, {"filename": "/rodir/cryoffear/gfx/env/blackdn.tga", "start": 197235, "end": 393861}, {"filename": "/rodir/cryoffear/gfx/env/blackft.tga", "start": 393861, "end": 590487}, {"filename": "/rodir/cryoffear/gfx/env/blacklf.tga", "start": 590487, "end": 787113}, {"filename": "/rodir/cryoffear/gfx/env/blackrt.tga", "start": 787113, "end": 983739}, {"filename": "/rodir/cryoffear/gfx/env/blackup.tga", "start": 983739, "end": 1180365}, {"filename": "/rodir/cryoffear/gfx/vgui/boss/sawer_health_empty.tga", "start": 1180365, "end": 1216409}, {"filename": "/rodir/cryoffear/gfx/vgui/boss/sawer_health_full.tga", "start": 1216409, "end": 1252453}, {"filename": "/rodir/cryoffear/maps/c_apartmentsick.bsp", "start": 1252453, "end": 11633525}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/+0~white.dds", "start": 11633525, "end": 11634349}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/AAATRIGGER.dds", "start": 11634349, "end": 11634661}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/black.dds", "start": 11634661, "end": 11635485}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_concrete2.dds", "start": 11635485, "end": 11679317}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_cretestripe1.dds", "start": 11679317, "end": 11704045}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_cretestripe2.dds", "start": 11704045, "end": 11732877}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_cretewall5.dds", "start": 11732877, "end": 11786365}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_cretewast.dds", "start": 11786365, "end": 11841869}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_door3.dds", "start": 11841869, "end": 11869349}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_hissF.dds", "start": 11869349, "end": 11914957}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_hissFsb.dds", "start": 11914957, "end": 11960565}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_hogbla1S.dds", "start": 11960565, "end": 11962109}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_hogbla1Ssb.dds", "start": 11962109, "end": 11963653}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_hogbla2.dds", "start": 11963653, "end": 11974717}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_hogbla2sb.dds", "start": 11974717, "end": 11985781}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_hogdoor1b.dds", "start": 11985781, "end": 12007773}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_hoggg2sb.dds", "start": 12007773, "end": 12081685}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_hogglv1sb.dds", "start": 12081685, "end": 12125517}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_hoggolv1.dds", "start": 12125517, "end": 12169349}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_hogmur2B.dds", "start": 12169349, "end": 12198181}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_hogor3sb.dds", "start": 12198181, "end": 12226053}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_hogtrapsb1.dds", "start": 12226053, "end": 12229637}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_hogvagg2.dds", "start": 12229637, "end": 12303549}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_madwdsb.dds", "start": 12303549, "end": 12331029}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_matbordwd.dds", "start": 12331029, "end": 12358509}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_metallist.dds", "start": 12358509, "end": 12360053}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_rstmetal.dds", "start": 12360053, "end": 12403885}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_vitmobel.dds", "start": 12403885, "end": 12410181}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_vitmobelsb.dds", "start": 12410181, "end": 12434909}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_wawoodsb.dds", "start": 12434909, "end": 12478741}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c3a2_light2.dds", "start": 12478741, "end": 12486621}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_blurmetal.dds", "start": 12486621, "end": 12497685}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_brandsign.dds", "start": 12497685, "end": 12498509}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_ceil1.dds", "start": 12498509, "end": 12512317}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_elboxfront.dds", "start": 12512317, "end": 12523381}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_elboxside1.dds", "start": 12523381, "end": 12528989}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_elboxtop.dds", "start": 12528989, "end": 12534597}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_exit2l.dds", "start": 12534597, "end": 12535765}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_exit2o.dds", "start": 12535765, "end": 12536933}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_generic.dds", "start": 12536933, "end": 12580765}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_hogceil1.dds", "start": 12580765, "end": 12592893}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_hogdoor1.dds", "start": 12592893, "end": 12614885}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_hogstrm1.dds", "start": 12614885, "end": 12615197}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_hogtrappaF1.dds", "start": 12615197, "end": 12618781}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_hogvagg1.dds", "start": 12618781, "end": 12674285}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_keypad1.dds", "start": 12674285, "end": 12682629}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_lampa2ljus.dds", "start": 12682629, "end": 12684317}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_matbordwdS.dds", "start": 12684317, "end": 12687269}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_rstpipe.dds", "start": 12687269, "end": 12698349}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_tapet2.dds", "start": 12698349, "end": 12727437}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_wawood.dds", "start": 12727437, "end": 12771269}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/clip.dds", "start": 12771269, "end": 12771581}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/null.dds", "start": 12771581, "end": 12771893}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/r_gamstandoor1.dds", "start": 12771893, "end": 12793885}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/r_tapet22_1.dds", "start": 12793885, "end": 12804949}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/{c2_hissgaller.dds", "start": 12804949, "end": 12826949}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/{c2_hissgallers.dds", "start": 12826949, "end": 12848949}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/{c_fenceba2.dds", "start": 12848949, "end": 12870949}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/{invisible.dds", "start": 12870949, "end": 12871445}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/brandlol.mdl", "start": 12871445, "end": 12929477}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/hogbergslampa.mdl", "start": 12929477, "end": 12957393}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/hogbergsop.mdl", "start": 12957393, "end": 13049277}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/lysrorreal.mdl", "start": 13049277, "end": 13327853}, {"filename": "/rodir/cryoffear/models/chainsawguy.mdl", "start": 13327853, "end": 14640921}, {"filename": "/rodir/cryoffear/models/cutscene/chainsawguy3.mdl", "start": 14640921, "end": 16468237}, {"filename": "/rodir/cryoffear/models/cutscene/chainsawguy4.mdl", "start": 16468237, "end": 17205657}, {"filename": "/rodir/cryoffear/models/cutscene/chainsawguy5.mdl", "start": 17205657, "end": 17227489}, {"filename": "/rodir/cryoffear/models/cutscene/chainsawguy6.mdl", "start": 17227489, "end": 19324001}, {"filename": "/rodir/cryoffear/models/cutscene/hiss.mdl", "start": 19324001, "end": 21178901}, {"filename": "/rodir/cryoffear/models/cutscene/hiss2.mdl", "start": 21178901, "end": 21447381}, {"filename": "/rodir/cryoffear/models/cutscene/hissidle2.mdl", "start": 21447381, "end": 21712573}, {"filename": "/rodir/cryoffear/models/developer_commentary.mdl", "start": 21712573, "end": 21880129}, {"filename": "/rodir/cryoffear/mp3/commentary/Andreas/apartmentsick_1.wav", "start": 21880129, "end": 23701687, "audio": 1}, {"filename": "/rodir/cryoffear/mp3/commentary/James/apartmentsick_j1.wav", "start": 23701687, "end": 25308909, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/chainsaw_attack.wav", "start": 25308909, "end": 25382469, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/chainsaw_loop.wav", "start": 25382469, "end": 25514935, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/chainsaw_start.wav", "start": 25514935, "end": 26527919, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/chainsawed_player.wav", "start": 26527919, "end": 26640003, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/eye_open.wav", "start": 26640003, "end": 26671991, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_alert10.wav", "start": 26671991, "end": 26838499, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_alert20.wav", "start": 26838499, "end": 26962959, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_alert30.wav", "start": 26962959, "end": 27095099, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_attack1.wav", "start": 27095099, "end": 27142759, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_attack2.wav", "start": 27142759, "end": 27202707, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_idle1.wav", "start": 27202707, "end": 27205577, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_idle2.wav", "start": 27205577, "end": 27208447, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_idle3.wav", "start": 27208447, "end": 27211317, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_idle4.wav", "start": 27211317, "end": 27214187, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_pain1.wav", "start": 27214187, "end": 27274285, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_pain2.wav", "start": 27274285, "end": 27319315, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/bodydrop1.wav", "start": 27319315, "end": 27360755, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/bodydrop2.wav", "start": 27360755, "end": 27403519, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step1.wav", "start": 27403519, "end": 27409501, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step2.wav", "start": 27409501, "end": 27416377, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step3.wav", "start": 27416377, "end": 27422313, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step4.wav", "start": 27422313, "end": 27430513, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/heartbeatsick.wav", "start": 27430513, "end": 27670045, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/hissscene/hissdoorstop.wav", "start": 27670045, "end": 27878387, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/hissscene/hissstartmovestop.wav", "start": 27878387, "end": 28077213, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/hissscene/slideclose.wav", "start": 28077213, "end": 28176495, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/hissscene/slideopen.wav", "start": 28176495, "end": 28268723, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/lightswitchon.wav", "start": 28268723, "end": 28318491, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/sawersteps.wav", "start": 28318491, "end": 28415577, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/sawpipe.wav", "start": 28415577, "end": 28489347, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/simon_vomit.wav", "start": 28489347, "end": 28560741, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doormove8.wav", "start": 28560741, "end": 28619223, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doorstop6.wav", "start": 28619223, "end": 28671265, "audio": 1}], "remote_package_size": 28671265});

  })();
