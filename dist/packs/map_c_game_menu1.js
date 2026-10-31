
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
      var PACKAGE_NAME = '/root/cof-audits/audit-D3Kl5uly/dist-ui/packs/map_c_game_menu1.data';
      var REMOTE_PACKAGE_BASE = 'map_c_game_menu1.data';
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
Module['FS_createPath']("/rodir/cryoffear/materials/maps", "c_game_menu1.bsp", true, true);
Module['FS_createPath']("/rodir/cryoffear", "models", true, true);
Module['FS_createPath']("/rodir/cryoffear/models", "Props", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "Blandat", true, true);
Module['FS_createPath']("/rodir/cryoffear", "sound", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "ambience", true, true);

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
          }          Module['removeRunDependency']('datafile_/root/cof-audits/audit-D3Kl5uly/dist-ui/packs/map_c_game_menu1.data');

      };
      Module['addRunDependency']('datafile_/root/cof-audits/audit-D3Kl5uly/dist-ui/packs/map_c_game_menu1.data');

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
    loadPackage({"files": [{"filename": "/rodir/cryoffear/gfx/env/blue22bk.TGA", "start": 0, "end": 196652}, {"filename": "/rodir/cryoffear/gfx/env/blue22dn.TGA", "start": 196652, "end": 393304}, {"filename": "/rodir/cryoffear/gfx/env/blue22ft.TGA", "start": 393304, "end": 589956}, {"filename": "/rodir/cryoffear/gfx/env/blue22lf.TGA", "start": 589956, "end": 786608}, {"filename": "/rodir/cryoffear/gfx/env/blue22rt.TGA", "start": 786608, "end": 983260}, {"filename": "/rodir/cryoffear/gfx/env/blue22up.TGA", "start": 983260, "end": 1179912}, {"filename": "/rodir/cryoffear/maps/c_game_menu1.bsp", "start": 1179912, "end": 7257429}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/+0~white.dds", "start": 7257429, "end": 7258253}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/AAATRIGGER.dds", "start": 7258253, "end": 7258565}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/CLIP.dds", "start": 7258565, "end": 7258877}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/NULL.dds", "start": 7258877, "end": 7259189}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/black.dds", "start": 7259189, "end": 7260013}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/c2_basfloor1.dds", "start": 7260013, "end": 7303845}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/c2_bricks1.dds", "start": 7303845, "end": 7347677}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/c2_cretewall5.dds", "start": 7347677, "end": 7401165}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/c2_cretz1.dds", "start": 7401165, "end": 7444997}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/c2_newrails.dds", "start": 7444997, "end": 7488829}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/c2_roof1.dds", "start": 7488829, "end": 7505381}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/c2_roofblack.dds", "start": 7505381, "end": 7521933}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/c_basror.dds", "start": 7521933, "end": 7527541}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/c_hogskylt2.dds", "start": 7527541, "end": 7530773}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/c_jord2.dds", "start": 7530773, "end": 7574605}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/c_jord23.dds", "start": 7574605, "end": 7618437}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/c_rstmetal.dds", "start": 7618437, "end": 7662269}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/c_tbana_F.dds", "start": 7662269, "end": 7706101}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/c_tbana_S1.dds", "start": 7706101, "end": 7749933}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/c_tbana_S2.dds", "start": 7749933, "end": 7796549}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/c_tbana_S3.dds", "start": 7796549, "end": 7840381}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/c_tbana_T.dds", "start": 7840381, "end": 7862373}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/cn_buini3.dds", "start": 7862373, "end": 7906205}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/cn_buini4.dds", "start": 7906205, "end": 7928197}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/cn_buini6.dds", "start": 7928197, "end": 7972029}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/cn_buini7.dds", "start": 7972029, "end": 8015861}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/cn_cretewl5.dds", "start": 8015861, "end": 8103389}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/cn_hamn1.dds", "start": 8103389, "end": 8190917}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/cn_hamn2.dds", "start": 8190917, "end": 8278445}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/cn_tbana_S1.dds", "start": 8278445, "end": 8322277}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/cn_tbana_S2.dds", "start": 8322277, "end": 8368893}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/origin.dds", "start": 8368893, "end": 8369205}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/red.dds", "start": 8369205, "end": 8369517}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/{c_fencebig.dds", "start": 8369517, "end": 8446157}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/{c_fencesmall.dds", "start": 8446157, "end": 8451117}, {"filename": "/rodir/cryoffear/materials/maps/c_game_menu1.bsp/{c_kraftelS.dds", "start": 8451117, "end": 8473149}, {"filename": "/rodir/cryoffear/models/Props/Blandat/byggnader.mdl", "start": 8473149, "end": 9649033}, {"filename": "/rodir/cryoffear/models/Props/Blandat/crows.mdl", "start": 9649033, "end": 9731869}, {"filename": "/rodir/cryoffear/models/Props/sky_sphere4.mdl", "start": 9731869, "end": 10037093}, {"filename": "/rodir/cryoffear/sound/ambience/menu_ambience.wav", "start": 10037093, "end": 13932809, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/train_long_pass1.wav", "start": 13932809, "end": 15191341, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/train_long_pass2.wav", "start": 15191341, "end": 16485833, "audio": 1}], "remote_package_size": 16485833});

  })();
