
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
      var PACKAGE_NAME = '/root/cof-audits/flashlight-20261031/dist-view/packs/map_c_start2.data';
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
Module['FS_createPath']("/rodir/cryoffear/gfx", "decals", true, true);
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
          }          Module['removeRunDependency']('datafile_/root/cof-audits/flashlight-20261031/dist-view/packs/map_c_start2.data');

      };
      Module['addRunDependency']('datafile_/root/cof-audits/flashlight-20261031/dist-view/packs/map_c_start2.data');

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
    loadPackage({"files": [{"filename": "/rodir/cryoffear/aurora/cof_leaves.aur", "start": 0, "end": 676}, {"filename": "/rodir/cryoffear/gfx/decals/klister1.tga", "start": 676, "end": 787152}, {"filename": "/rodir/cryoffear/gfx/decals/klister2.tga", "start": 787152, "end": 1573628}, {"filename": "/rodir/cryoffear/gfx/decals/klotter2.tga", "start": 1573628, "end": 2360104}, {"filename": "/rodir/cryoffear/gfx/decals/klotter3.tga", "start": 2360104, "end": 3146580}, {"filename": "/rodir/cryoffear/gfx/decals/klotter5.tga", "start": 3146580, "end": 3933056}, {"filename": "/rodir/cryoffear/gfx/decals/klotter6.tga", "start": 3933056, "end": 4719532}, {"filename": "/rodir/cryoffear/gfx/decals/klotter7.tga", "start": 4719532, "end": 5506008}, {"filename": "/rodir/cryoffear/gfx/decals/leaves2.tga", "start": 5506008, "end": 5702660}, {"filename": "/rodir/cryoffear/gfx/decals/leaves3.tga", "start": 5702660, "end": 5899312}, {"filename": "/rodir/cryoffear/gfx/env/blackbk.tga", "start": 5899312, "end": 6095938}, {"filename": "/rodir/cryoffear/gfx/env/blackdn.tga", "start": 6095938, "end": 6292564}, {"filename": "/rodir/cryoffear/gfx/env/blackft.tga", "start": 6292564, "end": 6489190}, {"filename": "/rodir/cryoffear/gfx/env/blacklf.tga", "start": 6489190, "end": 6685816}, {"filename": "/rodir/cryoffear/gfx/env/blackrt.tga", "start": 6685816, "end": 6882442}, {"filename": "/rodir/cryoffear/gfx/env/blackup.tga", "start": 6882442, "end": 7079068}, {"filename": "/rodir/cryoffear/maps/c_start2.bsp", "start": 7079068, "end": 25715959}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/+0~white.dds", "start": 25715959, "end": 25716783}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/AAATRIGGER.dds", "start": 25716783, "end": 25717095}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/CLIP.dds", "start": 25717095, "end": 25717407}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/NULL.dds", "start": 25717407, "end": 25717719}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/black.dds", "start": 25717719, "end": 25718543}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_aband7.dds", "start": 25718543, "end": 25762375}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_affaer1.dds", "start": 25762375, "end": 25806207}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_affaer3.dds", "start": 25806207, "end": 25850039}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_affaer4.dds", "start": 25850039, "end": 25893871}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_affaer5.dds", "start": 25893871, "end": 25981399}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_affaer6.dds", "start": 25981399, "end": 26068927}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_asfalfl1.dds", "start": 26068927, "end": 26112759}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_asfalt01.dds", "start": 26112759, "end": 26156591}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_blurmetal.dds", "start": 26156591, "end": 26167655}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_buildingp1.dds", "start": 26167655, "end": 26342559}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_cafewa.dds", "start": 26342559, "end": 26386391}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_concrete2.dds", "start": 26386391, "end": 26430223}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_cretewall5.dds", "start": 26430223, "end": 26483711}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_cretewast.dds", "start": 26483711, "end": 26539215}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_door2.dds", "start": 26539215, "end": 26566679}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_dorrlistg.dds", "start": 26566679, "end": 26568047}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gabyggn1.dds", "start": 26568047, "end": 26655575}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gabyggn1s.dds", "start": 26655575, "end": 26677567}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gabyggn2.dds", "start": 26677567, "end": 26721399}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gabyggn2s.dds", "start": 26721399, "end": 26732463}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gabyggn3.dds", "start": 26732463, "end": 26743527}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gabyggn3s.dds", "start": 26743527, "end": 26746399}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gadoor1.dds", "start": 26746399, "end": 26790231}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gadorr1.dds", "start": 26790231, "end": 26834063}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gadorr2.dds", "start": 26834063, "end": 26856055}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gafloor1.dds", "start": 26856055, "end": 26899887}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gafloor2.dds", "start": 26899887, "end": 26943719}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_galamps1.dds", "start": 26943719, "end": 26946591}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_galist1.dds", "start": 26946591, "end": 26952231}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_galucka1.dds", "start": 26952231, "end": 26963295}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_galucka2.dds", "start": 26963295, "end": 26974359}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gamsta1.dds", "start": 26974359, "end": 27018191}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gamsta1w.dds", "start": 27018191, "end": 27062023}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gamsta2.dds", "start": 27062023, "end": 27105855}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gamsta2w.dds", "start": 27105855, "end": 27149687}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gamsta3.dds", "start": 27149687, "end": 27193519}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gamsta3w.dds", "start": 27193519, "end": 27237351}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gamstawa1.dds", "start": 27237351, "end": 27261423}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gamstawa2.dds", "start": 27261423, "end": 27285495}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gaskulpt.dds", "start": 27285495, "end": 27373023}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gawallfor.dds", "start": 27373023, "end": 27416855}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gawood1.dds", "start": 27416855, "end": 27460687}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_gawood2.dds", "start": 27460687, "end": 27635591}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_grendflr.dds", "start": 27635591, "end": 27679423}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_hamnclock.dds", "start": 27679423, "end": 27695951}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_hogfence1big.dds", "start": 27695951, "end": 27739783}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_hoggolv1.dds", "start": 27739783, "end": 27783615}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_hogmarwa.dds", "start": 27783615, "end": 27799167}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_hogmatta1.dds", "start": 27799167, "end": 27816415}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_leaves.dds", "start": 27816415, "end": 27843895}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_lyktstolle.dds", "start": 27843895, "end": 27844383}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_metalbrunn.dds", "start": 27844383, "end": 27850023}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_metalthing.dds", "start": 27850023, "end": 27882943}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_roofblack.dds", "start": 27882943, "end": 27899495}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_selecta1.dds", "start": 27899495, "end": 27921487}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_selecta3.dds", "start": 27921487, "end": 27943479}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_skylt2.dds", "start": 27943479, "end": 27947927}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_skyltstang.dds", "start": 27947927, "end": 27953567}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_storkyrkan.dds", "start": 27953567, "end": 28041095}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_submove4.dds", "start": 28041095, "end": 28084927}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_trottoka.dds", "start": 28084927, "end": 28087527}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c2_vfl3.dds", "start": 28087527, "end": 28090479}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c3_door1.dds", "start": 28090479, "end": 28107031}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c3_door3.dds", "start": 28107031, "end": 28129023}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_asfalt01.dds", "start": 28129023, "end": 28172855}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_asfaltplva.dds", "start": 28172855, "end": 28176087}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_asfaltside.dds", "start": 28176087, "end": 28184479}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_asplattr.dds", "start": 28184479, "end": 28201583}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_backdoor1.dds", "start": 28201583, "end": 28215079}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_blurmetalbig.dds", "start": 28215079, "end": 28258911}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_bricks5S.dds", "start": 28258911, "end": 28269975}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_build1win1.dds", "start": 28269975, "end": 28302895}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_build5win.dds", "start": 28302895, "end": 28320143}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_building1.dds", "start": 28320143, "end": 28495047}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_building2S.dds", "start": 28495047, "end": 28527967}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_buildwhole2.dds", "start": 28527967, "end": 28702871}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_buildwhole3.dds", "start": 28702871, "end": 28855951}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_ceil1.dds", "start": 28855951, "end": 28869759}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_cretemur1.dds", "start": 28869759, "end": 28886311}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_cretewall4.dds", "start": 28886311, "end": 28930143}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_cretewall5.dds", "start": 28930143, "end": 28983631}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_cretewast.dds", "start": 28983631, "end": 29039135}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_cretewastave1.dds", "start": 29039135, "end": 29094639}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_cretewastave2.dds", "start": 29094639, "end": 29150143}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_cretewastkl2.dds", "start": 29150143, "end": 29205647}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_door1.dds", "start": 29205647, "end": 29227639}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_door2.dds", "start": 29227639, "end": 29255103}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_dorrlistg.dds", "start": 29255103, "end": 29256471}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_drkmetal.dds", "start": 29256471, "end": 29300303}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_drkrstmetal.dds", "start": 29300303, "end": 29344135}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_generic.dds", "start": 29344135, "end": 29387967}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_glasssharp.dds", "start": 29387967, "end": 29431799}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_grass02.dds", "start": 29431799, "end": 29475631}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_hogmur2B.dds", "start": 29475631, "end": 29504463}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_husnummer.dds", "start": 29504463, "end": 29505287}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_lampa4ram.dds", "start": 29505287, "end": 29506975}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_lyktstolle.dds", "start": 29506975, "end": 29507463}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_matta7.dds", "start": 29507463, "end": 29517871}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_metallist.dds", "start": 29517871, "end": 29519415}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_rstblpipe.dds", "start": 29519415, "end": 29520959}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_rstmetal.dds", "start": 29520959, "end": 29564791}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_rstpipe.dds", "start": 29564791, "end": 29575871}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_sewerwall.dds", "start": 29575871, "end": 29603351}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_stair.dds", "start": 29603351, "end": 29607615}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_stairfront.dds", "start": 29607615, "end": 29613255}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_stenmur.dds", "start": 29613255, "end": 29633903}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_stenmur2.dds", "start": 29633903, "end": 29661383}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_stensido1.dds", "start": 29661383, "end": 29683375}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_tbana_F.dds", "start": 29683375, "end": 29727207}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_tbana_S1.dds", "start": 29727207, "end": 29771039}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_tbana_S2.dds", "start": 29771039, "end": 29817655}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_tbana_S3.dds", "start": 29817655, "end": 29861487}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_tbana_T.dds", "start": 29861487, "end": 29883479}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_tbanapost10.dds", "start": 29883479, "end": 29890479}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_tunnelwabig.dds", "start": 29890479, "end": 29945247}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_vitmobel.dds", "start": 29945247, "end": 29951543}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/c_wawood.dds", "start": 29951543, "end": 29995375}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/cn_asplattr.dds", "start": 29995375, "end": 30039207}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/cn_bricks3.dds", "start": 30039207, "end": 30061199}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/cn_cretee1.dds", "start": 30061199, "end": 30105031}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/cn_cretee2.dds", "start": 30105031, "end": 30148863}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/cn_cretekl2.dds", "start": 30148863, "end": 30192695}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/cn_cretewl5.dds", "start": 30192695, "end": 30280223}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/cn_cretewt.dds", "start": 30280223, "end": 30324055}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/cn_cretkl1.dds", "start": 30324055, "end": 30367887}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/cn_stair.dds", "start": 30367887, "end": 30370775}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/cn_stenmur.dds", "start": 30370775, "end": 30414607}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/cn_stupror.dds", "start": 30414607, "end": 30420247}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/po_buildgen.dds", "start": 30420247, "end": 30431311}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/po_mtldrkblue.dds", "start": 30431311, "end": 30442375}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/r_sthlight.dds", "start": 30442375, "end": 30443199}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/r_tsgarage.dds", "start": 30443199, "end": 30454263}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/r_whitethings.dds", "start": 30454263, "end": 30460559}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/{blue.dds", "start": 30460559, "end": 30461055}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/{c2_galampm1.dds", "start": 30461055, "end": 30483055}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/{c2_hogfence1.dds", "start": 30483055, "end": 30509919}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/{c2_lovpomark1.dds", "start": 30509919, "end": 30551087}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/{c_fence.dds", "start": 30551087, "end": 30570383}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/{invisible.dds", "start": 30570383, "end": 30570879}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/{pv_gravrail.dds", "start": 30570879, "end": 30614735}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/{pv_orlflrgrt.dds", "start": 30614735, "end": 30702271}, {"filename": "/rodir/cryoffear/materials/maps/c_start2.bsp/{r_list2.dds", "start": 30702271, "end": 30719599}, {"filename": "/rodir/cryoffear/models/Props/Blandat/lejon1.mdl", "start": 30719599, "end": 30794695}, {"filename": "/rodir/cryoffear/models/Props/Blandat/linne.mdl", "start": 30794695, "end": 31207659}, {"filename": "/rodir/cryoffear/models/Props/Blandat/pumpa.mdl", "start": 31207659, "end": 31506351}, {"filename": "/rodir/cryoffear/models/Props/Blandat/start2streetadd.mdl", "start": 31506351, "end": 31516311}, {"filename": "/rodir/cryoffear/models/Props/Fordon/aud.mdl", "start": 31516311, "end": 31795995}, {"filename": "/rodir/cryoffear/models/Props/Fordon/foretag.mdl", "start": 31795995, "end": 32340023}, {"filename": "/rodir/cryoffear/models/Props/Fordon/foretag_2.mdl", "start": 32340023, "end": 32884051}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/blomma1.mdl", "start": 32884051, "end": 32999247}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/blomma2.mdl", "start": 32999247, "end": 33345815}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/cafe_chair2.mdl", "start": 33345815, "end": 33616643}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/cafe_monitor.mdl", "start": 33616643, "end": 34086751}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/cafe_painting.mdl", "start": 34086751, "end": 34278143}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/cigaretter.mdl", "start": 34278143, "end": 34306507}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/cup.mdl", "start": 34306507, "end": 34404807}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/datorpryl.mdl", "start": 34404807, "end": 34506915}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/glass.mdl", "start": 34506915, "end": 34519063}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/glass_cup.mdl", "start": 34519063, "end": 34526907}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/glass_rose.mdl", "start": 34526907, "end": 34565227}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/kanallampa.mdl", "start": 34565227, "end": 34657039}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/lysrorreal.mdl", "start": 34657039, "end": 34935615}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/pet_bottle.mdl", "start": 34935615, "end": 35194135}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/shrub_pot.mdl", "start": 35194135, "end": 35218503}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/skitpobord2.mdl", "start": 35218503, "end": 35380847}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/skitpobord3.mdl", "start": 35380847, "end": 35549647}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/wine_bottle.mdl", "start": 35549647, "end": 35888735}, {"filename": "/rodir/cryoffear/models/Props/Mobler/2msoffa3.mdl", "start": 35888735, "end": 36385511}, {"filename": "/rodir/cryoffear/models/Props/Mobler/pc_chair.mdl", "start": 36385511, "end": 36675663}, {"filename": "/rodir/cryoffear/models/Props/Mobler/stormyslampaoff.mdl", "start": 36675663, "end": 36782767}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/bag3.mdl", "start": 36782767, "end": 37053647}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/bag4.mdl", "start": 37053647, "end": 37324595}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/cykel2.mdl", "start": 37324595, "end": 37808019}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/cykel3.mdl", "start": 37808019, "end": 38291479}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/gamlastan_light1.mdl", "start": 38291479, "end": 38567191}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/gamlastan_light3.mdl", "start": 38567191, "end": 38834871}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/sandlada.mdl", "start": 38834871, "end": 39079479}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/selbox.mdl", "start": 39079479, "end": 39104627}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/skrap.mdl", "start": 39104627, "end": 39679803}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/soptunna.mdl", "start": 39679803, "end": 40148755}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/stadlyktrund2.mdl", "start": 40148755, "end": 40227287}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/stadlyktrund4.mdl", "start": 40227287, "end": 40309571}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/bigtree1.mdl", "start": 40309571, "end": 40950511}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/buske.mdl", "start": 40950511, "end": 41162611}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/nakettrad4.mdl", "start": 41162611, "end": 41796791}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/stortrad2.mdl", "start": 41796791, "end": 42358419}, {"filename": "/rodir/cryoffear/models/Props/sky_sphere4.mdl", "start": 42358419, "end": 42663643}, {"filename": "/rodir/cryoffear/models/chainsawguy.mdl", "start": 42663643, "end": 43976711}, {"filename": "/rodir/cryoffear/models/cutscene/followme.mdl", "start": 43976711, "end": 44888827}, {"filename": "/rodir/cryoffear/models/items/generic_note.mdl", "start": 44888827, "end": 44902707}, {"filename": "/rodir/cryoffear/sound/ambience/klocka.wav", "start": 44902707, "end": 45345177, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/kyrkklockor.wav", "start": 45345177, "end": 46496421, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/loud_thunder.wav", "start": 46496421, "end": 46627373, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/shower_room_drips.wav", "start": 46627373, "end": 47284599, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/vind1.wav", "start": 47284599, "end": 48636385, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/vind2.wav", "start": 48636385, "end": 49386571, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/vind3.wav", "start": 49386571, "end": 50396341, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/chainsaw_attack.wav", "start": 50396341, "end": 50469901, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/chainsaw_loop.wav", "start": 50469901, "end": 50602367, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/chainsaw_start.wav", "start": 50602367, "end": 51615351, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/chainsawed_player.wav", "start": 51615351, "end": 51727435, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/eye_open.wav", "start": 51727435, "end": 51759423, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_alert10.wav", "start": 51759423, "end": 51925931, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_alert20.wav", "start": 51925931, "end": 52050391, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_alert30.wav", "start": 52050391, "end": 52182531, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_attack1.wav", "start": 52182531, "end": 52230191, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_attack2.wav", "start": 52230191, "end": 52290139, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_idle1.wav", "start": 52290139, "end": 52293009, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_idle2.wav", "start": 52293009, "end": 52295879, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_idle3.wav", "start": 52295879, "end": 52298749, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_idle4.wav", "start": 52298749, "end": 52301619, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_pain1.wav", "start": 52301619, "end": 52361717, "audio": 1}, {"filename": "/rodir/cryoffear/sound/boss/sawer/sawer_pain2.wav", "start": 52361717, "end": 52406747, "audio": 1}, {"filename": "/rodir/cryoffear/sound/buttons/latchlocked1.wav", "start": 52406747, "end": 52432935, "audio": 1}, {"filename": "/rodir/cryoffear/sound/buttons/latchunlocked1.wav", "start": 52432935, "end": 52456639, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step1.wav", "start": 52456639, "end": 52462621, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step2.wav", "start": 52462621, "end": 52469497, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step3.wav", "start": 52469497, "end": 52475433, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step4.wav", "start": 52475433, "end": 52483633, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doormove1.wav", "start": 52483633, "end": 52533979, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doormove2.wav", "start": 52533979, "end": 52552199, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doormove9.wav", "start": 52552199, "end": 52630757, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doorstop2.wav", "start": 52630757, "end": 52736145, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doorstop8.wav", "start": 52736145, "end": 52770033, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/shutter_locked.wav", "start": 52770033, "end": 52792141, "audio": 1}], "remote_package_size": 52792141});

  })();
