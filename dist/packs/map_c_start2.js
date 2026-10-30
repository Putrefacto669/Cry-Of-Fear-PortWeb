
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
      var PACKAGE_NAME = '/root/cof-audits/audit-D3Kl5uly/dist/packs/map_c_start2.data';
      var REMOTE_PACKAGE_BASE = 'map_c_start2.data';
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
Module['FS_createPath']("/rodir/cryoffear/materials/maps", "c_start2.bsp", true, true);
Module['FS_createPath']("/rodir/cryoffear", "models", true, true);
Module['FS_createPath']("/rodir/cryoffear/models", "Props", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "Blandat", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "Fordon", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "InomhusD", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "Mobler", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "UtomhusD", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "Vaxter", true, true);
Module['FS_createPath']("/rodir/cryoffear/models", "cutscene", true, true);
Module['FS_createPath']("/rodir/cryoffear/models", "items", true, true);
Module['FS_createPath']("/rodir/cryoffear/models", "props", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/props", "inomhusd", true, true);
Module['FS_createPath']("/rodir/cryoffear", "sound", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "ambience", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "boss", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound/boss", "sawer", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "buttons", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "common", true, true);
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
          }          Module['removeRunDependency']('datafile_/root/cof-audits/audit-D3Kl5uly/dist/packs/map_c_start2.data');

      };
      Module['addRunDependency']('datafile_/root/cof-audits/audit-D3Kl5uly/dist/packs/map_c_start2.data');

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
    loadPackage({"files": [{"filename": "/rodir/cryoffear/aurora/cof_leaves.aur", "start": 0, "end": 676}, {"filename": "/rodir/cryoffear/gfx/env/blackbk.tga", "start": 676, "end": 197302}, {"filename": "/rodir/cryoffear/gfx/env/blackdn.tga", "start": 197302, "end": 393928}, {"filename": "/rodir/cryoffear/gfx/env/blackft.tga", "start": 393928, "end": 590554}, {"filename": "/rodir/cryoffear/gfx/env/blacklf.tga", "start": 590554, "end": 787180}, {"filename": "/rodir/cryoffear/gfx/env/blackrt.tga", "start": 787180, "end": 983806}, {"filename": "/rodir/cryoffear/gfx/env/blackup.tga", "start": 983806, "end": 1180432}, {"filename": "/rodir/cryoffear/maps/c_start2.bsp", "start": 1180432, "end": 19817323}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/+0~white.dds", "start": 19817323, "end": 19818147}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/AAATRIGGER.dds", "start": 19818147, "end": 19818459}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/CLIP.dds", "start": 19818459, "end": 19818771}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/NULL.dds", "start": 19818771, "end": 19819083}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/black.dds", "start": 19819083, "end": 19819907}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_aband7.dds", "start": 19819907, "end": 19863739}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_affaer1.dds", "start": 19863739, "end": 19907571}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_affaer3.dds", "start": 19907571, "end": 19951403}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_affaer4.dds", "start": 19951403, "end": 19995235}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_affaer5.dds", "start": 19995235, "end": 20082763}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_affaer6.dds", "start": 20082763, "end": 20170291}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_asfalfl1.dds", "start": 20170291, "end": 20214123}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_asfalt01.dds", "start": 20214123, "end": 20257955}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_blurmetal.dds", "start": 20257955, "end": 20269019}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_buildingp1.dds", "start": 20269019, "end": 20443923}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_cafewa.dds", "start": 20443923, "end": 20487755}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_concrete2.dds", "start": 20487755, "end": 20531587}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_cretewall5.dds", "start": 20531587, "end": 20585075}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_cretewast.dds", "start": 20585075, "end": 20640579}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_door2.dds", "start": 20640579, "end": 20668043}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_dorrlistg.dds", "start": 20668043, "end": 20669411}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gabyggn1.dds", "start": 20669411, "end": 20756939}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gabyggn1s.dds", "start": 20756939, "end": 20778931}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gabyggn2.dds", "start": 20778931, "end": 20822763}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gabyggn2s.dds", "start": 20822763, "end": 20833827}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gabyggn3.dds", "start": 20833827, "end": 20844891}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gabyggn3s.dds", "start": 20844891, "end": 20847763}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gadoor1.dds", "start": 20847763, "end": 20891595}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gadorr1.dds", "start": 20891595, "end": 20935427}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gadorr2.dds", "start": 20935427, "end": 20957419}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gafloor1.dds", "start": 20957419, "end": 21001251}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gafloor2.dds", "start": 21001251, "end": 21045083}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_galamps1.dds", "start": 21045083, "end": 21047955}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_galist1.dds", "start": 21047955, "end": 21053595}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_galucka1.dds", "start": 21053595, "end": 21064659}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_galucka2.dds", "start": 21064659, "end": 21075723}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gamsta1.dds", "start": 21075723, "end": 21119555}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gamsta1w.dds", "start": 21119555, "end": 21163387}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gamsta2.dds", "start": 21163387, "end": 21207219}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gamsta2w.dds", "start": 21207219, "end": 21251051}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gamsta3.dds", "start": 21251051, "end": 21294883}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gamsta3w.dds", "start": 21294883, "end": 21338715}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gamstawa1.dds", "start": 21338715, "end": 21362787}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gamstawa2.dds", "start": 21362787, "end": 21386859}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gaskulpt.dds", "start": 21386859, "end": 21474387}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gawallfor.dds", "start": 21474387, "end": 21518219}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gawood1.dds", "start": 21518219, "end": 21562051}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gawood2.dds", "start": 21562051, "end": 21736955}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_grendflr.dds", "start": 21736955, "end": 21780787}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_hamnclock.dds", "start": 21780787, "end": 21797315}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_hogfence1big.dds", "start": 21797315, "end": 21841147}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_hoggolv1.dds", "start": 21841147, "end": 21884979}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_hogmarwa.dds", "start": 21884979, "end": 21900531}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_hogmatta1.dds", "start": 21900531, "end": 21917779}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_leaves.dds", "start": 21917779, "end": 21945259}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_lyktstolle.dds", "start": 21945259, "end": 21945747}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_metalbrunn.dds", "start": 21945747, "end": 21951387}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_metalthing.dds", "start": 21951387, "end": 21984307}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_roofblack.dds", "start": 21984307, "end": 22000859}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_selecta1.dds", "start": 22000859, "end": 22022851}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_selecta3.dds", "start": 22022851, "end": 22044843}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_skylt2.dds", "start": 22044843, "end": 22049291}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_skyltstang.dds", "start": 22049291, "end": 22054931}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_storkyrkan.dds", "start": 22054931, "end": 22142459}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_submove4.dds", "start": 22142459, "end": 22186291}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_trottoka.dds", "start": 22186291, "end": 22188891}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_vfl3.dds", "start": 22188891, "end": 22191843}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c3_door1.dds", "start": 22191843, "end": 22208395}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c3_door3.dds", "start": 22208395, "end": 22230387}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_asfalt01.dds", "start": 22230387, "end": 22274219}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_asfaltplva.dds", "start": 22274219, "end": 22277451}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_asfaltside.dds", "start": 22277451, "end": 22285843}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_asplattr.dds", "start": 22285843, "end": 22302947}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_backdoor1.dds", "start": 22302947, "end": 22316443}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_blurmetalbig.dds", "start": 22316443, "end": 22360275}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_bricks5S.dds", "start": 22360275, "end": 22371339}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_build1win1.dds", "start": 22371339, "end": 22404259}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_build5win.dds", "start": 22404259, "end": 22421507}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_building1.dds", "start": 22421507, "end": 22596411}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_building2S.dds", "start": 22596411, "end": 22629331}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_buildwhole2.dds", "start": 22629331, "end": 22804235}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_buildwhole3.dds", "start": 22804235, "end": 22957315}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_ceil1.dds", "start": 22957315, "end": 22971123}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_cretemur1.dds", "start": 22971123, "end": 22987675}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_cretewall4.dds", "start": 22987675, "end": 23031507}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_cretewall5.dds", "start": 23031507, "end": 23084995}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_cretewast.dds", "start": 23084995, "end": 23140499}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_cretewastave1.dds", "start": 23140499, "end": 23196003}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_cretewastave2.dds", "start": 23196003, "end": 23251507}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_cretewastkl2.dds", "start": 23251507, "end": 23307011}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_door1.dds", "start": 23307011, "end": 23329003}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_door2.dds", "start": 23329003, "end": 23356467}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_dorrlistg.dds", "start": 23356467, "end": 23357835}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_drkmetal.dds", "start": 23357835, "end": 23401667}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_drkrstmetal.dds", "start": 23401667, "end": 23445499}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_generic.dds", "start": 23445499, "end": 23489331}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_glasssharp.dds", "start": 23489331, "end": 23533163}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_grass02.dds", "start": 23533163, "end": 23576995}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_hogmur2B.dds", "start": 23576995, "end": 23605827}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_husnummer.dds", "start": 23605827, "end": 23606651}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_lampa4ram.dds", "start": 23606651, "end": 23608339}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_lyktstolle.dds", "start": 23608339, "end": 23608827}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_matta7.dds", "start": 23608827, "end": 23619235}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_metallist.dds", "start": 23619235, "end": 23620779}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_rstblpipe.dds", "start": 23620779, "end": 23622323}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_rstmetal.dds", "start": 23622323, "end": 23666155}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_rstpipe.dds", "start": 23666155, "end": 23677235}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_sewerwall.dds", "start": 23677235, "end": 23704715}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_stair.dds", "start": 23704715, "end": 23708979}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_stairfront.dds", "start": 23708979, "end": 23714619}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_stenmur.dds", "start": 23714619, "end": 23735267}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_stenmur2.dds", "start": 23735267, "end": 23762747}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_stensido1.dds", "start": 23762747, "end": 23784739}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_tbana_F.dds", "start": 23784739, "end": 23828571}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_tbana_S1.dds", "start": 23828571, "end": 23872403}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_tbana_S2.dds", "start": 23872403, "end": 23919019}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_tbana_S3.dds", "start": 23919019, "end": 23962851}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_tbana_T.dds", "start": 23962851, "end": 23984843}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_tbanapost10.dds", "start": 23984843, "end": 23991843}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_tunnelwabig.dds", "start": 23991843, "end": 24046611}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_vitmobel.dds", "start": 24046611, "end": 24052907}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_wawood.dds", "start": 24052907, "end": 24096739}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/cn_asplattr.dds", "start": 24096739, "end": 24140571}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/cn_bricks3.dds", "start": 24140571, "end": 24162563}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/cn_cretee1.dds", "start": 24162563, "end": 24206395}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/cn_cretee2.dds", "start": 24206395, "end": 24250227}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/cn_cretekl2.dds", "start": 24250227, "end": 24294059}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/cn_cretewl5.dds", "start": 24294059, "end": 24381587}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/cn_cretewt.dds", "start": 24381587, "end": 24425419}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/cn_cretkl1.dds", "start": 24425419, "end": 24469251}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/cn_stair.dds", "start": 24469251, "end": 24472139}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/cn_stenmur.dds", "start": 24472139, "end": 24515971}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/cn_stupror.dds", "start": 24515971, "end": 24521611}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/po_buildgen.dds", "start": 24521611, "end": 24532675}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/po_mtldrkblue.dds", "start": 24532675, "end": 24543739}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/r_sthlight.dds", "start": 24543739, "end": 24544563}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/r_tsgarage.dds", "start": 24544563, "end": 24555627}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/r_whitethings.dds", "start": 24555627, "end": 24561923}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/{blue.dds", "start": 24561923, "end": 24562419}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/{c2_galampm1.dds", "start": 24562419, "end": 24584419}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/{c2_hogfence1.dds", "start": 24584419, "end": 24611283}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/{c2_lovpomark1.dds", "start": 24611283, "end": 24652451}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/{c_fence.dds", "start": 24652451, "end": 24671747}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/{invisible.dds", "start": 24671747, "end": 24672243}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/{pv_gravrail.dds", "start": 24672243, "end": 24716099}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/{pv_orlflrgrt.dds", "start": 24716099, "end": 24803635}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/{r_list2.dds", "start": 24803635, "end": 24820963}, {"filename": "/rodir/cryoffear/models/Props/Blandat/lejon1.mdl", "start": 24820963, "end": 24896059}, {"filename": "/rodir/cryoffear/models/Props/Blandat/linne.mdl", "start": 24896059, "end": 25309023}, {"filename": "/rodir/cryoffear/models/Props/Blandat/pumpa.mdl", "start": 25309023, "end": 25607715}, {"filename": "/rodir/cryoffear/models/Props/Blandat/start2streetadd.mdl", "start": 25607715, "end": 25617675}, {"filename": "/rodir/cryoffear/models/Props/Fordon/aud.mdl", "start": 25617675, "end": 25897359}, {"filename": "/rodir/cryoffear/models/Props/Fordon/foretag.mdl", "start": 25897359, "end": 26441387}, {"filename": "/rodir/cryoffear/models/Props/Fordon/foretag_2.mdl", "start": 26441387, "end": 26985415}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/blomma1.mdl", "start": 26985415, "end": 27100611}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/blomma2.mdl", "start": 27100611, "end": 27447179}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/cafe_chair2.mdl", "start": 27447179, "end": 27718007}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/cafe_monitor.mdl", "start": 27718007, "end": 28188115}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/cafe_painting.mdl", "start": 28188115, "end": 28379507}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/cigaretter.mdl", "start": 28379507, "end": 28407871}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/cup.mdl", "start": 28407871, "end": 28506171}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/datorpryl.mdl", "start": 28506171, "end": 28608279}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/glass.mdl", "start": 28608279, "end": 28620427}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/glass_cup.mdl", "start": 28620427, "end": 28628271}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/glass_rose.mdl", "start": 28628271, "end": 28666591}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/kanallampa.mdl", "start": 28666591, "end": 28758403}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/lysrorreal.mdl", "start": 28758403, "end": 29036979}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/pet_bottle.mdl", "start": 29036979, "end": 29295499}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/shrub_pot.mdl", "start": 29295499, "end": 29319867}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/skitpobord2.mdl", "start": 29319867, "end": 29482211}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/skitpobord3.mdl", "start": 29482211, "end": 29651011}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/wine_bottle.mdl", "start": 29651011, "end": 29990099}, {"filename": "/rodir/cryoffear/models/Props/Mobler/2msoffa3.mdl", "start": 29990099, "end": 30486875}, {"filename": "/rodir/cryoffear/models/Props/Mobler/pc_chair.mdl", "start": 30486875, "end": 30777027}, {"filename": "/rodir/cryoffear/models/Props/Mobler/stormyslampaoff.mdl", "start": 30777027, "end": 30884131}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/bag3.mdl", "start": 30884131, "end": 31155011}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/bag4.mdl", "start": 31155011, "end": 31425959}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/cykel2.mdl", "start": 31425959, "end": 31909383}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/cykel3.mdl", "start": 31909383, "end": 32392843}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/gamlastan_light1.mdl", "start": 32392843, "end": 32668555}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/gamlastan_light3.mdl", "start": 32668555, "end": 32936235}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/sandlada.mdl", "start": 32936235, "end": 33180843}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/selbox.mdl", "start": 33180843, "end": 33205991}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/skrap.mdl", "start": 33205991, "end": 33781167}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/soptunna.mdl", "start": 33781167, "end": 34250119}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/stadlyktrund2.mdl", "start": 34250119, "end": 34328651}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/stadlyktrund4.mdl", "start": 34328651, "end": 34410935}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/bigtree1.mdl", "start": 34410935, "end": 35051875}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/buske.mdl", "start": 35051875, "end": 35263975}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/nakettrad4.mdl", "start": 35263975, "end": 35898155}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/stortrad2.mdl", "start": 35898155, "end": 36459783}, {"filename": "/rodir/cryoffear/models/Props/sky_sphere4.mdl", "start": 36459783, "end": 36765007}, {"filename": "/rodir/cryoffear/models/chainsawguy.mdl", "start": 36765007, "end": 38078075}, {"filename": "/rodir/cryoffear/models/cutscene/followme.mdl", "start": 38078075, "end": 38990191}, {"filename": "/rodir/cryoffear/models/items/generic_note.mdl", "start": 38990191, "end": 39004071}, {"filename": "/rodir/cryoffear/models/props/inomhusd/cafe_monitor.mdl", "start": 39004071, "end": 39474179}, {"filename": "/rodir/cryoffear/sound/ambience/klocka.wav", "start": 39474179, "end": 39916649, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/kyrkklockor.wav", "start": 39916649, "end": 41067893, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/loud_thunder.wav", "start": 41067893, "end": 41198845, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/shower_room_drips.wav", "start": 41198845, "end": 41856071, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/vind1.wav", "start": 41856071, "end": 43207857, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/vind2.wav", "start": 43207857, "end": 43958043, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/vind3.wav", "start": 43958043, "end": 44967813, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/chainsaw_attack.wav", "start": 44967813, "end": 45041373, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/chainsaw_loop.wav", "start": 45041373, "end": 45173839, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/chainsaw_start.wav", "start": 45173839, "end": 46186823, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/chainsawed_player.wav", "start": 46186823, "end": 46298907, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/eye_open.wav", "start": 46298907, "end": 46330895, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_alert10.wav", "start": 46330895, "end": 46497403, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_alert20.wav", "start": 46497403, "end": 46621863, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_alert30.wav", "start": 46621863, "end": 46754003, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_attack1.wav", "start": 46754003, "end": 46801663, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_attack2.wav", "start": 46801663, "end": 46861611, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_idle1.wav", "start": 46861611, "end": 46864481, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_idle2.wav", "start": 46864481, "end": 46867351, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_idle3.wav", "start": 46867351, "end": 46870221, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_idle4.wav", "start": 46870221, "end": 46873091, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_pain1.wav", "start": 46873091, "end": 46933189, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_pain2.wav", "start": 46933189, "end": 46978219, "audio": 1}, {"filename": "/rodir/cryoffear/sound/buttons/latchlocked1.wav", "start": 46978219, "end": 47004407, "audio": 1}, {"filename": "/rodir/cryoffear/sound/buttons/latchunlocked1.wav", "start": 47004407, "end": 47028111, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step1.wav", "start": 47028111, "end": 47034093, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step2.wav", "start": 47034093, "end": 47040969, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step3.wav", "start": 47040969, "end": 47046905, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step4.wav", "start": 47046905, "end": 47055105, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doormove1.wav", "start": 47055105, "end": 47105451, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doormove2.wav", "start": 47105451, "end": 47123671, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doormove9.wav", "start": 47123671, "end": 47202229, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doorstop2.wav", "start": 47202229, "end": 47307617, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doorstop8.wav", "start": 47307617, "end": 47341505, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/shutter_locked.wav", "start": 47341505, "end": 47363613, "audio": 1}], "remote_package_size": 47363613});

  })();
