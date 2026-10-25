
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
      var PACKAGE_NAME = '/root/cof-web/dist/packs/map_c_cof_forest1.data';
      var REMOTE_PACKAGE_BASE = 'map_c_cof_forest1.data';
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
Module['FS_createPath']("/rodir/cryoffear/materials/maps", "c_cof_forest1.bsp", true, true);
Module['FS_createPath']("/rodir/cryoffear", "models", true, true);
Module['FS_createPath']("/rodir/cryoffear/models", "Props", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "UtomhusD", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "Vaxter", true, true);
Module['FS_createPath']("/rodir/cryoffear", "sound", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "ambience", true, true);
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
          }          Module['removeRunDependency']('datafile_/root/cof-web/dist/packs/map_c_cof_forest1.data');

      };
      Module['addRunDependency']('datafile_/root/cof-web/dist/packs/map_c_cof_forest1.data');

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
    loadPackage({"files": [{"filename": "/rodir/cryoffear/gfx/env/blackbk.tga", "start": 0, "end": 196626}, {"filename": "/rodir/cryoffear/gfx/env/blackdn.tga", "start": 196626, "end": 393252}, {"filename": "/rodir/cryoffear/gfx/env/blackft.tga", "start": 393252, "end": 589878}, {"filename": "/rodir/cryoffear/gfx/env/blacklf.tga", "start": 589878, "end": 786504}, {"filename": "/rodir/cryoffear/gfx/env/blackrt.tga", "start": 786504, "end": 983130}, {"filename": "/rodir/cryoffear/gfx/env/blackup.tga", "start": 983130, "end": 1179756}, {"filename": "/rodir/cryoffear/maps/c_cof_forest1.bsp", "start": 1179756, "end": 7500020}, {"filename": "/rodir/cryoffear/materials/maps/c_cof_forest1.bsp/CLIP.dds", "start": 7500020, "end": 7500332}, {"filename": "/rodir/cryoffear/materials/maps/c_cof_forest1.bsp/HINT.dds", "start": 7500332, "end": 7500644}, {"filename": "/rodir/cryoffear/materials/maps/c_cof_forest1.bsp/aaatrigger.dds", "start": 7500644, "end": 7500956}, {"filename": "/rodir/cryoffear/materials/maps/c_cof_forest1.bsp/c2_sbergvg1.dds", "start": 7500956, "end": 7632180}, {"filename": "/rodir/cryoffear/materials/maps/c_cof_forest1.bsp/c2_sbergvg2.dds", "start": 7632180, "end": 7763404}, {"filename": "/rodir/cryoffear/materials/maps/c_cof_forest1.bsp/c2_sbergvg3.dds", "start": 7763404, "end": 7894628}, {"filename": "/rodir/cryoffear/materials/maps/c_cof_forest1.bsp/c2_sgras1.dds", "start": 7894628, "end": 7938460}, {"filename": "/rodir/cryoffear/materials/maps/c_cof_forest1.bsp/c2_sgras3.dds", "start": 7938460, "end": 7982292}, {"filename": "/rodir/cryoffear/materials/maps/c_cof_forest1.bsp/c2_sgraswl.dds", "start": 7982292, "end": 8047972}, {"filename": "/rodir/cryoffear/materials/maps/c_cof_forest1.bsp/c2_sgraswl2.dds", "start": 8047972, "end": 8113652}, {"filename": "/rodir/cryoffear/materials/maps/c_cof_forest1.bsp/c2_sgraswl4.dds", "start": 8113652, "end": 8201180}, {"filename": "/rodir/cryoffear/materials/maps/c_cof_forest1.bsp/c2_sskogswl2.dds", "start": 8201180, "end": 8288708}, {"filename": "/rodir/cryoffear/materials/maps/c_cof_forest1.bsp/c2_sstamm1.dds", "start": 8288708, "end": 8310732}, {"filename": "/rodir/cryoffear/materials/maps/c_cof_forest1.bsp/c2_sstamm2.dds", "start": 8310732, "end": 8319124}, {"filename": "/rodir/cryoffear/materials/maps/c_cof_forest1.bsp/c2_sstamm3.dds", "start": 8319124, "end": 8341148}, {"filename": "/rodir/cryoffear/materials/maps/c_cof_forest1.bsp/c2_sstatex1.dds", "start": 8341148, "end": 8384980}, {"filename": "/rodir/cryoffear/materials/maps/c_cof_forest1.bsp/c2_ssten1.dds", "start": 8384980, "end": 8428812}, {"filename": "/rodir/cryoffear/materials/maps/c_cof_forest1.bsp/c2_stenst1.dds", "start": 8428812, "end": 8472644}, {"filename": "/rodir/cryoffear/materials/maps/c_cof_forest1.bsp/c_door7.dds", "start": 8472644, "end": 8494636}, {"filename": "/rodir/cryoffear/materials/maps/c_cof_forest1.bsp/c_dorrlistg.dds", "start": 8494636, "end": 8496004}, {"filename": "/rodir/cryoffear/materials/maps/c_cof_forest1.bsp/c_jord2.dds", "start": 8496004, "end": 8539836}, {"filename": "/rodir/cryoffear/materials/maps/c_cof_forest1.bsp/c_wawood.dds", "start": 8539836, "end": 8583668}, {"filename": "/rodir/cryoffear/materials/maps/c_cof_forest1.bsp/null.dds", "start": 8583668, "end": 8583980}, {"filename": "/rodir/cryoffear/materials/maps/c_cof_forest1.bsp/{c2_skvisti1.dds", "start": 8583980, "end": 8671516}, {"filename": "/rodir/cryoffear/materials/maps/c_cof_forest1.bsp/{invisible.dds", "start": 8671516, "end": 8672012}, {"filename": "/rodir/cryoffear/materials/maps/c_cof_forest1.bsp/{r_list2.dds", "start": 8672012, "end": 8689340}, {"filename": "/rodir/cryoffear/materials/maps/c_cof_forest1.bsp/{tu_kvistarvagg.dds", "start": 8689340, "end": 8776876}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/ssten1.mdl", "start": 8776876, "end": 8952372}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/ssten2.mdl", "start": 8952372, "end": 9140348}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/sstenar.mdl", "start": 9140348, "end": 9507284}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/aspar.mdl", "start": 9507284, "end": 9970340}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/aspdunge.mdl", "start": 9970340, "end": 10084864}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/buske.mdl", "start": 10084864, "end": 10296964}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/granmodel3.mdl", "start": 10296964, "end": 10668176}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/grenaradd_large.mdl", "start": 10668176, "end": 10692768}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/grenaradd_small.mdl", "start": 10692768, "end": 10703536}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/litengran1.mdl", "start": 10703536, "end": 10970100}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/skogskrap.mdl", "start": 10970100, "end": 11089752}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/skogsris.mdl", "start": 11089752, "end": 11675616}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/smoaspar.mdl", "start": 11675616, "end": 11908468}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/stammar.mdl", "start": 11908468, "end": 11988656}, {"filename": "/rodir/cryoffear/sound/ambience/cricketsnight.wav", "start": 11988656, "end": 15225384, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/vind3.wav", "start": 15225384, "end": 16235154, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doormove1.wav", "start": 16235154, "end": 16285500, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doormove4.wav", "start": 16285500, "end": 16338126, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doorstop4.wav", "start": 16338126, "end": 16366732, "audio": 1}], "remote_package_size": 16366732});

  })();
