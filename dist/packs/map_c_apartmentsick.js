
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
      var PACKAGE_NAME = '/root/cof-web/dist/packs/map_c_apartmentsick.data';
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
Module['FS_createPath']("/rodir/cryoffear", "maps", true, true);
Module['FS_createPath']("/rodir/cryoffear", "materials", true, true);
Module['FS_createPath']("/rodir/cryoffear/materials", "maps", true, true);
Module['FS_createPath']("/rodir/cryoffear/materials/maps", "c_apartmentsick.bsp", true, true);
Module['FS_createPath']("/rodir/cryoffear", "models", true, true);
Module['FS_createPath']("/rodir/cryoffear/models", "Props", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "InomhusD", true, true);
Module['FS_createPath']("/rodir/cryoffear/models", "cutscene", true, true);
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
          }          Module['removeRunDependency']('datafile_/root/cof-web/dist/packs/map_c_apartmentsick.data');

      };
      Module['addRunDependency']('datafile_/root/cof-web/dist/packs/map_c_apartmentsick.data');

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
    loadPackage({"files": [{"filename": "/rodir/cryoffear/aurora/cof_vomit.aur", "start": 0, "end": 609}, {"filename": "/rodir/cryoffear/gfx/env/blackbk.tga", "start": 609, "end": 197235}, {"filename": "/rodir/cryoffear/gfx/env/blackdn.tga", "start": 197235, "end": 393861}, {"filename": "/rodir/cryoffear/gfx/env/blackft.tga", "start": 393861, "end": 590487}, {"filename": "/rodir/cryoffear/gfx/env/blacklf.tga", "start": 590487, "end": 787113}, {"filename": "/rodir/cryoffear/gfx/env/blackrt.tga", "start": 787113, "end": 983739}, {"filename": "/rodir/cryoffear/gfx/env/blackup.tga", "start": 983739, "end": 1180365}, {"filename": "/rodir/cryoffear/maps/c_apartmentsick.bsp", "start": 1180365, "end": 11561437}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/+0~white.dds", "start": 11561437, "end": 11562261}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/AAATRIGGER.dds", "start": 11562261, "end": 11562573}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/black.dds", "start": 11562573, "end": 11563397}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_concrete2.dds", "start": 11563397, "end": 11607229}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_cretestripe1.dds", "start": 11607229, "end": 11631957}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_cretestripe2.dds", "start": 11631957, "end": 11660789}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_cretewall5.dds", "start": 11660789, "end": 11714277}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_cretewast.dds", "start": 11714277, "end": 11769781}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_door3.dds", "start": 11769781, "end": 11797261}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_hissF.dds", "start": 11797261, "end": 11842869}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_hissFsb.dds", "start": 11842869, "end": 11888477}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_hogbla1S.dds", "start": 11888477, "end": 11890021}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_hogbla1Ssb.dds", "start": 11890021, "end": 11891565}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_hogbla2.dds", "start": 11891565, "end": 11902629}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_hogbla2sb.dds", "start": 11902629, "end": 11913693}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_hogdoor1b.dds", "start": 11913693, "end": 11935685}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_hoggg2sb.dds", "start": 11935685, "end": 12009597}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_hogglv1sb.dds", "start": 12009597, "end": 12053429}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_hoggolv1.dds", "start": 12053429, "end": 12097261}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_hogmur2B.dds", "start": 12097261, "end": 12126093}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_hogor3sb.dds", "start": 12126093, "end": 12153965}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_hogtrapsb1.dds", "start": 12153965, "end": 12157549}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_hogvagg2.dds", "start": 12157549, "end": 12231461}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_madwdsb.dds", "start": 12231461, "end": 12258941}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_matbordwd.dds", "start": 12258941, "end": 12286421}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_metallist.dds", "start": 12286421, "end": 12287965}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_rstmetal.dds", "start": 12287965, "end": 12331797}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_vitmobel.dds", "start": 12331797, "end": 12338093}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_vitmobelsb.dds", "start": 12338093, "end": 12362821}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c2_wawoodsb.dds", "start": 12362821, "end": 12406653}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c3a2_light2.dds", "start": 12406653, "end": 12414533}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_blurmetal.dds", "start": 12414533, "end": 12425597}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_brandsign.dds", "start": 12425597, "end": 12426421}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_ceil1.dds", "start": 12426421, "end": 12440229}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_elboxfront.dds", "start": 12440229, "end": 12451293}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_elboxside1.dds", "start": 12451293, "end": 12456901}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_elboxtop.dds", "start": 12456901, "end": 12462509}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_exit2l.dds", "start": 12462509, "end": 12463677}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_exit2o.dds", "start": 12463677, "end": 12464845}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_generic.dds", "start": 12464845, "end": 12508677}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_hogceil1.dds", "start": 12508677, "end": 12520805}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_hogdoor1.dds", "start": 12520805, "end": 12542797}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_hogstrm1.dds", "start": 12542797, "end": 12543109}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_hogtrappaF1.dds", "start": 12543109, "end": 12546693}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_hogvagg1.dds", "start": 12546693, "end": 12602197}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_keypad1.dds", "start": 12602197, "end": 12610541}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_lampa2ljus.dds", "start": 12610541, "end": 12612229}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_matbordwdS.dds", "start": 12612229, "end": 12615181}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_rstpipe.dds", "start": 12615181, "end": 12626261}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_tapet2.dds", "start": 12626261, "end": 12655349}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/c_wawood.dds", "start": 12655349, "end": 12699181}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/clip.dds", "start": 12699181, "end": 12699493}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/null.dds", "start": 12699493, "end": 12699805}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/r_gamstandoor1.dds", "start": 12699805, "end": 12721797}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/r_tapet22_1.dds", "start": 12721797, "end": 12732861}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/{c2_hissgaller.dds", "start": 12732861, "end": 12754861}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/{c2_hissgallers.dds", "start": 12754861, "end": 12776861}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/{c_fenceba2.dds", "start": 12776861, "end": 12798861}, {"filename": "/rodir/cryoffear/materials/maps/c_apartmentsick.bsp/{invisible.dds", "start": 12798861, "end": 12799357}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/brandlol.mdl", "start": 12799357, "end": 12857389}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/hogbergslampa.mdl", "start": 12857389, "end": 12885305}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/hogbergsop.mdl", "start": 12885305, "end": 12977189}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/lysrorreal.mdl", "start": 12977189, "end": 13255765}, {"filename": "/rodir/cryoffear/models/chainsawguy.mdl", "start": 13255765, "end": 14568833}, {"filename": "/rodir/cryoffear/models/cutscene/chainsawguy3.mdl", "start": 14568833, "end": 16396149}, {"filename": "/rodir/cryoffear/models/cutscene/chainsawguy4.mdl", "start": 16396149, "end": 17133569}, {"filename": "/rodir/cryoffear/models/cutscene/chainsawguy5.mdl", "start": 17133569, "end": 17155401}, {"filename": "/rodir/cryoffear/models/cutscene/chainsawguy6.mdl", "start": 17155401, "end": 19251913}, {"filename": "/rodir/cryoffear/models/cutscene/hiss.mdl", "start": 19251913, "end": 21106813}, {"filename": "/rodir/cryoffear/models/cutscene/hiss2.mdl", "start": 21106813, "end": 21375293}, {"filename": "/rodir/cryoffear/models/cutscene/hissidle2.mdl", "start": 21375293, "end": 21640485}, {"filename": "/rodir/cryoffear/sound/boss/sawer/chainsaw_attack.wav", "start": 21640485, "end": 21714045, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/chainsaw_loop.wav", "start": 21714045, "end": 21846511, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/chainsaw_start.wav", "start": 21846511, "end": 22859495, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/chainsawed_player.wav", "start": 22859495, "end": 22971579, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/eye_open.wav", "start": 22971579, "end": 23003567, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_alert10.wav", "start": 23003567, "end": 23170075, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_alert20.wav", "start": 23170075, "end": 23294535, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_alert30.wav", "start": 23294535, "end": 23426675, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_attack1.wav", "start": 23426675, "end": 23474335, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_attack2.wav", "start": 23474335, "end": 23534283, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_idle1.wav", "start": 23534283, "end": 23537153, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_idle2.wav", "start": 23537153, "end": 23540023, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_idle3.wav", "start": 23540023, "end": 23542893, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_idle4.wav", "start": 23542893, "end": 23545763, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_pain1.wav", "start": 23545763, "end": 23605861, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_pain2.wav", "start": 23605861, "end": 23650891, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/bodydrop1.wav", "start": 23650891, "end": 23692331, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/bodydrop2.wav", "start": 23692331, "end": 23735095, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step1.wav", "start": 23735095, "end": 23741077, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step2.wav", "start": 23741077, "end": 23747953, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step3.wav", "start": 23747953, "end": 23753889, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step4.wav", "start": 23753889, "end": 23762089, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/heartbeatsick.wav", "start": 23762089, "end": 24001621, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/hissscene/hissdoorstop.wav", "start": 24001621, "end": 24209963, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/hissscene/hissstartmovestop.wav", "start": 24209963, "end": 24408789, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/hissscene/slideclose.wav", "start": 24408789, "end": 24508071, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/hissscene/slideopen.wav", "start": 24508071, "end": 24600299, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/lightswitchon.wav", "start": 24600299, "end": 24650067, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/sawersteps.wav", "start": 24650067, "end": 24747153, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/sawpipe.wav", "start": 24747153, "end": 24820923, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/simon_vomit.wav", "start": 24820923, "end": 24892317, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doormove8.wav", "start": 24892317, "end": 24950799, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doorstop6.wav", "start": 24950799, "end": 25002841, "audio": 1}], "remote_package_size": 25002841});

  })();
