
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
      var PACKAGE_NAME = '/root/cof-audits/claude-campaign-20261115/cand-fog/packs/map_c_sewer.data';
      var REMOTE_PACKAGE_BASE = 'map_c_sewer.data';
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
Module['FS_createPath']("/rodir/cryoffear", "gfx", true, true);
Module['FS_createPath']("/rodir/cryoffear/gfx", "env", true, true);
Module['FS_createPath']("/rodir/cryoffear", "maps", true, true);
Module['FS_createPath']("/rodir/cryoffear", "materials", true, true);
Module['FS_createPath']("/rodir/cryoffear/materials", "maps", true, true);
Module['FS_createPath']("/rodir/cryoffear/materials/maps", "c_sewer.bsp", true, true);
Module['FS_createPath']("/rodir/cryoffear", "models", true, true);
Module['FS_createPath']("/rodir/cryoffear/models", "Props", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "Fordon", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "InomhusD", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "UtomhusD", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "Vaxter", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "fpsc", true, true);
Module['FS_createPath']("/rodir/cryoffear/models", "debris", true, true);
Module['FS_createPath']("/rodir/cryoffear/models", "weapons", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/weapons", "nightstick", true, true);
Module['FS_createPath']("/rodir/cryoffear", "mp3", true, true);
Module['FS_createPath']("/rodir/cryoffear/mp3", "commentary", true, true);
Module['FS_createPath']("/rodir/cryoffear/mp3/commentary", "James", true, true);
Module['FS_createPath']("/rodir/cryoffear", "sound", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "ambience", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "buttons", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "common", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "doors", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "sewer", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "sewmo", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "weapons", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound/weapons", "nightstick", true, true);

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
          }          Module['removeRunDependency']('datafile_/root/cof-audits/claude-campaign-20261115/cand-fog/packs/map_c_sewer.data');

      };
      Module['addRunDependency']('datafile_/root/cof-audits/claude-campaign-20261115/cand-fog/packs/map_c_sewer.data');

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
    loadPackage({"files": [{"filename": "/rodir/cryoffear/gfx/env/blackbk.tga", "start": 0, "end": 196626}, {"filename": "/rodir/cryoffear/gfx/env/blackdn.tga", "start": 196626, "end": 393252}, {"filename": "/rodir/cryoffear/gfx/env/blackft.tga", "start": 393252, "end": 589878}, {"filename": "/rodir/cryoffear/gfx/env/blacklf.tga", "start": 589878, "end": 786504}, {"filename": "/rodir/cryoffear/gfx/env/blackrt.tga", "start": 786504, "end": 983130}, {"filename": "/rodir/cryoffear/gfx/env/blackup.tga", "start": 983130, "end": 1179756}, {"filename": "/rodir/cryoffear/maps/c_sewer.bsp", "start": 1179756, "end": 7991935}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/AAATRIGGER.dds", "start": 7991935, "end": 7992247}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/CLIP.dds", "start": 7992247, "end": 7992559}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/NULL.dds", "start": 7992559, "end": 7992871}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/black.dds", "start": 7992871, "end": 7993695}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c0a0yellow.dds", "start": 7993695, "end": 7998983}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c2_metallist.dds", "start": 7998983, "end": 8000527}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c2_rstmetal.dds", "start": 8000527, "end": 8044359}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c_asfaltpl2.dds", "start": 8044359, "end": 8077279}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c_asfaltplva.dds", "start": 8077279, "end": 8080511}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c_asfaltwreck.dds", "start": 8080511, "end": 8124343}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c_blurmetal.dds", "start": 8124343, "end": 8135407}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c_build3wa.dds", "start": 8135407, "end": 8244807}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c_buildwhole2.dds", "start": 8244807, "end": 8419711}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c_ceil1.dds", "start": 8419711, "end": 8433519}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c_concrete1.dds", "start": 8433519, "end": 8477351}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c_cretemur1.dds", "start": 8477351, "end": 8493903}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c_cretewall4.dds", "start": 8493903, "end": 8537735}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c_cretewall5.dds", "start": 8537735, "end": 8591223}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c_cretewast.dds", "start": 8591223, "end": 8646727}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c_cretewastkl2.dds", "start": 8646727, "end": 8702231}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c_door1.dds", "start": 8702231, "end": 8724223}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c_dorrlistg.dds", "start": 8724223, "end": 8725591}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c_drkmetal.dds", "start": 8725591, "end": 8769423}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c_drkrstmetal.dds", "start": 8769423, "end": 8813255}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c_elboxfront.dds", "start": 8813255, "end": 8824319}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c_elboxside1.dds", "start": 8824319, "end": 8829927}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c_generic.dds", "start": 8829927, "end": 8873759}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c_grass02.dds", "start": 8873759, "end": 8917591}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c_kokmetalO.dds", "start": 8917591, "end": 8938239}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c_lampa_toaF.dds", "start": 8938239, "end": 8939927}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c_metallist.dds", "start": 8939927, "end": 8941471}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c_rstpipe.dds", "start": 8941471, "end": 8952551}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c_sewerwall.dds", "start": 8952551, "end": 8980031}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c_stair.dds", "start": 8980031, "end": 8984295}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c_stairfront.dds", "start": 8984295, "end": 8989935}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c_stenmur2.dds", "start": 8989935, "end": 9017415}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/c_wawood.dds", "start": 9017415, "end": 9061247}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/cn_stenmur.dds", "start": 9061247, "end": 9105079}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/origin.dds", "start": 9105079, "end": 9105391}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/r_fade.dds", "start": 9105391, "end": 9111031}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/{blue.dds", "start": 9111031, "end": 9111527}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/{gratestep3.dds", "start": 9111527, "end": 9123991}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/{invisible.dds", "start": 9123991, "end": 9124487}, {"filename": "/rodir/cryoffear/materials/maps/c_sewer.bsp/{r_list2.dds", "start": 9124487, "end": 9141815}, {"filename": "/rodir/cryoffear/models/Props/Fordon/foretag.mdl", "start": 9141815, "end": 9685843}, {"filename": "/rodir/cryoffear/models/Props/Fordon/polisbil_blood.mdl", "start": 9685843, "end": 10210711}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/kanallampa.mdl", "start": 10210711, "end": 10302523}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/lysrorreal.mdl", "start": 10302523, "end": 10581099}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/flesh_bag.mdl", "start": 10581099, "end": 10855979}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/soptunna.mdl", "start": 10855979, "end": 11324931}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/stadlyktrund.mdl", "start": 11324931, "end": 11449671}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/stadlyktrund4.mdl", "start": 11449671, "end": 11531955}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/stadsbank.mdl", "start": 11531955, "end": 11782335}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/nakettrad3.mdl", "start": 11782335, "end": 12532055}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/nakettrad5.mdl", "start": 12532055, "end": 13079235}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/parktrad2.mdl", "start": 13079235, "end": 13698515}, {"filename": "/rodir/cryoffear/models/Props/fpsc/operating_light_soiled.mdl", "start": 13698515, "end": 13792627}, {"filename": "/rodir/cryoffear/models/Props/fpsc/operating_table_soiled.mdl", "start": 13792627, "end": 14070167}, {"filename": "/rodir/cryoffear/models/debris/sewer_bar_gib.mdl", "start": 14070167, "end": 14074359}, {"filename": "/rodir/cryoffear/models/developer_commentary.mdl", "start": 14074359, "end": 14241915}, {"filename": "/rodir/cryoffear/models/sewmo.mdl", "start": 14241915, "end": 15215951}, {"filename": "/rodir/cryoffear/models/weapons/nightstick/v_nightstick.mdl", "start": 15215951, "end": 16411887}, {"filename": "/rodir/cryoffear/models/weapons/nightstick/w_nightstick.mdl", "start": 16411887, "end": 16682327}, {"filename": "/rodir/cryoffear/mp3/commentary/James/sewer_j1.wav", "start": 16682327, "end": 17904411, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/city_cold_wind.wav", "start": 17904411, "end": 19835781, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/police_radio_city.wav", "start": 19835781, "end": 20682491, "audio": 1}, {"filename": "/rodir/cryoffear/sound/buttons/latchlocked1.wav", "start": 20682491, "end": 20708679, "audio": 1}, {"filename": "/rodir/cryoffear/sound/buttons/latchunlocked1.wav", "start": 20708679, "end": 20732383, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step1.wav", "start": 20732383, "end": 20738365, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step2.wav", "start": 20738365, "end": 20745241, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step3.wav", "start": 20745241, "end": 20751177, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step4.wav", "start": 20751177, "end": 20759377, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/null.wav", "start": 20759377, "end": 20760621, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/car_door_locked.wav", "start": 20760621, "end": 20779269, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doormove1.wav", "start": 20779269, "end": 20829615, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doormove10.wav", "start": 20829615, "end": 20850305, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doorstop7.wav", "start": 20850305, "end": 20880887, "audio": 1}, {"filename": "/rodir/cryoffear/sound/sewer/tunnel_drips.wav", "start": 20880887, "end": 21139473, "audio": 1}, {"filename": "/rodir/cryoffear/sound/sewer/wind_tunnels.wav", "start": 21139473, "end": 21471379, "audio": 1}, {"filename": "/rodir/cryoffear/sound/sewmo/break_free.wav", "start": 21471379, "end": 21581697, "audio": 1}, {"filename": "/rodir/cryoffear/sound/sewmo/claw_miss1.wav", "start": 21581697, "end": 21585919, "audio": 1}, {"filename": "/rodir/cryoffear/sound/sewmo/claw_miss2.wav", "start": 21585919, "end": 21590141, "audio": 1}, {"filename": "/rodir/cryoffear/sound/sewmo/claw_miss3.wav", "start": 21590141, "end": 21594363, "audio": 1}, {"filename": "/rodir/cryoffear/sound/sewmo/claw_strike1.wav", "start": 21594363, "end": 21632465, "audio": 1}, {"filename": "/rodir/cryoffear/sound/sewmo/claw_strike2.wav", "start": 21632465, "end": 21670567, "audio": 1}, {"filename": "/rodir/cryoffear/sound/sewmo/claw_strike3.wav", "start": 21670567, "end": 21708669, "audio": 1}, {"filename": "/rodir/cryoffear/sound/sewmo/out_water.wav", "start": 21708669, "end": 21734585, "audio": 1}, {"filename": "/rodir/cryoffear/sound/sewmo/sewmo_alert10.wav", "start": 21734585, "end": 21793209, "audio": 1}, {"filename": "/rodir/cryoffear/sound/sewmo/sewmo_alert20.wav", "start": 21793209, "end": 21851225, "audio": 1}, {"filename": "/rodir/cryoffear/sound/sewmo/sewmo_alert30.wav", "start": 21851225, "end": 21905063, "audio": 1}, {"filename": "/rodir/cryoffear/sound/sewmo/sewmo_attack1.wav", "start": 21905063, "end": 21940251, "audio": 1}, {"filename": "/rodir/cryoffear/sound/sewmo/sewmo_attack2.wav", "start": 21940251, "end": 21976737, "audio": 1}, {"filename": "/rodir/cryoffear/sound/sewmo/sewmo_pain1.wav", "start": 21976737, "end": 22001775, "audio": 1}, {"filename": "/rodir/cryoffear/sound/sewmo/sewmo_pain2.wav", "start": 22001775, "end": 22017017, "audio": 1}, {"filename": "/rodir/cryoffear/sound/sewmo/tunga_miss.wav", "start": 22017017, "end": 22055005, "audio": 1}, {"filename": "/rodir/cryoffear/sound/sewmo/tunga_strike1.wav", "start": 22055005, "end": 22092993, "audio": 1}, {"filename": "/rodir/cryoffear/sound/sewmo/tunga_strike2.wav", "start": 22092993, "end": 22131095, "audio": 1}, {"filename": "/rodir/cryoffear/sound/weapons/nightstick/nightstick_hitbody1.wav", "start": 22131095, "end": 22135157, "audio": 1}, {"filename": "/rodir/cryoffear/sound/weapons/nightstick/nightstick_hitbody2.wav", "start": 22135157, "end": 22140255, "audio": 1}, {"filename": "/rodir/cryoffear/sound/weapons/nightstick/nightstick_hitwall1.wav", "start": 22140255, "end": 22146169, "audio": 1}, {"filename": "/rodir/cryoffear/sound/weapons/nightstick/nightstick_hitwall2.wav", "start": 22146169, "end": 22151549, "audio": 1}, {"filename": "/rodir/cryoffear/sound/weapons/nightstick/nightstick_swing.wav", "start": 22151549, "end": 22158391, "audio": 1}], "remote_package_size": 22158391});

  })();
