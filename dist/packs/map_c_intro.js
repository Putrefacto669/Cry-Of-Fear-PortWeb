
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
      var PACKAGE_NAME = '/root/cof-web/dist/packs/map_c_intro.data';
      var REMOTE_PACKAGE_BASE = 'map_c_intro.data';
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
Module['FS_createPath']("/rodir/cryoffear/materials/maps", "c_intro.bsp", true, true);
Module['FS_createPath']("/rodir/cryoffear", "models", true, true);
Module['FS_createPath']("/rodir/cryoffear/models", "Props", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "Blandat", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "Fordon", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "UtomhusD", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "Vaxter", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "fpsc", true, true);
Module['FS_createPath']("/rodir/cryoffear/models", "cutscene", true, true);
Module['FS_createPath']("/rodir/cryoffear", "sound", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "ambience", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "cutscene", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "subtitles", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound/subtitles", "intro", true, true);

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
          }          Module['removeRunDependency']('datafile_/root/cof-web/dist/packs/map_c_intro.data');

      };
      Module['addRunDependency']('datafile_/root/cof-web/dist/packs/map_c_intro.data');

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
    loadPackage({"files": [{"filename": "/rodir/cryoffear/aurora/cof_leaves.aur", "start": 0, "end": 676}, {"filename": "/rodir/cryoffear/gfx/env/blackbk.tga", "start": 676, "end": 197302}, {"filename": "/rodir/cryoffear/gfx/env/blackdn.tga", "start": 197302, "end": 393928}, {"filename": "/rodir/cryoffear/gfx/env/blackft.tga", "start": 393928, "end": 590554}, {"filename": "/rodir/cryoffear/gfx/env/blacklf.tga", "start": 590554, "end": 787180}, {"filename": "/rodir/cryoffear/gfx/env/blackrt.tga", "start": 787180, "end": 983806}, {"filename": "/rodir/cryoffear/gfx/env/blackup.tga", "start": 983806, "end": 1180432}, {"filename": "/rodir/cryoffear/maps/c_intro.bsp", "start": 1180432, "end": 8492319}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/+0c_rainwindow.dds", "start": 8492319, "end": 8536151}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/+0~white.dds", "start": 8536151, "end": 8536975}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/+1c_rainwindow.dds", "start": 8536975, "end": 8580807}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/+2c_rainwindow.dds", "start": 8580807, "end": 8624639}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/+3c_rainwindow.dds", "start": 8624639, "end": 8668471}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/+4c_rainwindow.dds", "start": 8668471, "end": 8712303}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/+5c_rainwindow.dds", "start": 8712303, "end": 8756135}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/+6c_rainwindow.dds", "start": 8756135, "end": 8799967}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/+7c_rainwindow.dds", "start": 8799967, "end": 8843799}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/NULL.dds", "start": 8843799, "end": 8844111}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/aaatrigger.dds", "start": 8844111, "end": 8844423}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/black.dds", "start": 8844423, "end": 8845247}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_affaer2.dds", "start": 8845247, "end": 8932775}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_affaer5.dds", "start": 8932775, "end": 9020303}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_buildingp1.dds", "start": 9020303, "end": 9195207}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_buildingp2.dds", "start": 9195207, "end": 9370111}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_cretestripe2.dds", "start": 9370111, "end": 9398943}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_gabyggn2s.dds", "start": 9398943, "end": 9410007}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_hogfence1big.dds", "start": 9410007, "end": 9453839}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_introduction.dds", "start": 9453839, "end": 9628743}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_kokmetalO.dds", "start": 9628743, "end": 9649391}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_koktextur.dds", "start": 9649391, "end": 9656391}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_lyktstolle.dds", "start": 9656391, "end": 9656879}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_newrails.dds", "start": 9656879, "end": 9700711}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_roof1.dds", "start": 9700711, "end": 9717263}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_roofblack.dds", "start": 9717263, "end": 9733815}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_sublol2.dds", "start": 9733815, "end": 9777647}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_trottoka.dds", "start": 9777647, "end": 9780247}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_wood2.dds", "start": 9780247, "end": 9808623}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_asfaltvag2.dds", "start": 9808623, "end": 9983527}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_asfaltvag3.dds", "start": 9983527, "end": 10158431}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_basror.dds", "start": 10158431, "end": 10164039}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_blurmetal.dds", "start": 10164039, "end": 10175103}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_buildwhole2.dds", "start": 10175103, "end": 10350007}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_buildwhole3.dds", "start": 10350007, "end": 10503087}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_cretewall5.dds", "start": 10503087, "end": 10556575}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_glasssharp.dds", "start": 10556575, "end": 10600407}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_grass02.dds", "start": 10600407, "end": 10644239}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_hogskylt2.dds", "start": 10644239, "end": 10647471}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_jord2.dds", "start": 10647471, "end": 10691303}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_k1_side2.dds", "start": 10691303, "end": 10707831}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_kokmetalO.dds", "start": 10707831, "end": 10728479}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_lysrorlampaof.dds", "start": 10728479, "end": 10733431}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_lysrorlampaon.dds", "start": 10733431, "end": 10738383}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_metalbrunn.dds", "start": 10738383, "end": 10744023}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_obbsstwa1.dds", "start": 10744023, "end": 10875247}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_rstblpipe.dds", "start": 10875247, "end": 10876791}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_rstmetal.dds", "start": 10876791, "end": 10920623}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_stenmur2.dds", "start": 10920623, "end": 10948103}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tabanawa1.dds", "start": 10948103, "end": 10991935}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbana_F.dds", "start": 10991935, "end": 11035767}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbana_S1.dds", "start": 11035767, "end": 11079599}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbana_S2.dds", "start": 11079599, "end": 11126215}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbana_S3.dds", "start": 11126215, "end": 11170047}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbana_T.dds", "start": 11170047, "end": 11192039}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanadoors.dds", "start": 11192039, "end": 11252279}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanagolv.dds", "start": 11252279, "end": 11263343}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanaguls.dds", "start": 11263343, "end": 11271687}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanakant.dds", "start": 11271687, "end": 11272527}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanaorange.dds", "start": 11272527, "end": 11340975}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanapost1.dds", "start": 11340975, "end": 11343863}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanapost10.dds", "start": 11343863, "end": 11350863}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanapost2.dds", "start": 11350863, "end": 11353751}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanapost3.dds", "start": 11353751, "end": 11356639}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanapost4.dds", "start": 11356639, "end": 11359527}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanapost5.dds", "start": 11359527, "end": 11362415}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanapost6.dds", "start": 11362415, "end": 11365303}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanapost7.dds", "start": 11365303, "end": 11372303}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanapost8.dds", "start": 11372303, "end": 11379303}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanapost9.dds", "start": 11379303, "end": 11386303}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanarals.dds", "start": 11386303, "end": 11430135}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanasits.dds", "start": 11430135, "end": 11435423}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanawa2.dds", "start": 11435423, "end": 11479255}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_vitmobel.dds", "start": 11479255, "end": 11485551}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/clip.dds", "start": 11485551, "end": 11485863}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/cn_asplattr.dds", "start": 11485863, "end": 11529695}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/cn_cretewl5.dds", "start": 11529695, "end": 11617223}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/cn_tbana_S1.dds", "start": 11617223, "end": 11661055}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/cn_tbana_S2.dds", "start": 11661055, "end": 11707671}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/origin.dds", "start": 11707671, "end": 11707983}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/r_lyktstolpe.dds", "start": 11707983, "end": 11708471}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/r_trkredside1.dds", "start": 11708471, "end": 11727775}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/r_whitethings.dds", "start": 11727775, "end": 11734071}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/{c2_treed2.dds", "start": 11734071, "end": 11908999}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/{c_fencebig.dds", "start": 11908999, "end": 11985639}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/{c_kraftelS.dds", "start": 11985639, "end": 12007671}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/{c_treetops.dds", "start": 12007671, "end": 12073383}, {"filename": "/rodir/cryoffear/models/Props/Blandat/byggnader.mdl", "start": 12073383, "end": 13249267}, {"filename": "/rodir/cryoffear/models/Props/Fordon/aud.mdl", "start": 13249267, "end": 13528951}, {"filename": "/rodir/cryoffear/models/Props/Fordon/aud_3.mdl", "start": 13528951, "end": 13808635}, {"filename": "/rodir/cryoffear/models/Props/Fordon/foretag.mdl", "start": 13808635, "end": 14352663}, {"filename": "/rodir/cryoffear/models/Props/Fordon/foretag_2.mdl", "start": 14352663, "end": 14896691}, {"filename": "/rodir/cryoffear/models/Props/Fordon/polisbil.mdl", "start": 14896691, "end": 15420443}, {"filename": "/rodir/cryoffear/models/Props/Fordon/vari_2.mdl", "start": 15420443, "end": 15676271}, {"filename": "/rodir/cryoffear/models/Props/Fordon/vari_3.mdl", "start": 15676271, "end": 15932099}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/cykel2.mdl", "start": 15932099, "end": 16415523}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/cykel3.mdl", "start": 16415523, "end": 16898983}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/sandlada.mdl", "start": 16898983, "end": 17143591}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/skrap.mdl", "start": 17143591, "end": 17718767}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/soptunna.mdl", "start": 17718767, "end": 18187719}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/stadlyktrund3.mdl", "start": 18187719, "end": 18413219}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/stadlyktrund4.mdl", "start": 18413219, "end": 18495503}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/bigtree1.mdl", "start": 18495503, "end": 19136443}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/buske.mdl", "start": 19136443, "end": 19348543}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/granmodel.mdl", "start": 19348543, "end": 20281527}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/granmodel2.mdl", "start": 20281527, "end": 21220511}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/lowpolygran.mdl", "start": 21220511, "end": 21355339}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/nakettrad4.mdl", "start": 21355339, "end": 21989519}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/parktrad2.mdl", "start": 21989519, "end": 22608799}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/stortrad2.mdl", "start": 22608799, "end": 23170427}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/tall.mdl", "start": 23170427, "end": 24090419}, {"filename": "/rodir/cryoffear/models/Props/fpsc/cement_heap.mdl", "start": 24090419, "end": 24159523}, {"filename": "/rodir/cryoffear/models/Props/fpsc/compressor.mdl", "start": 24159523, "end": 24434831}, {"filename": "/rodir/cryoffear/models/Props/fpsc/conduits.mdl", "start": 24434831, "end": 24508051}, {"filename": "/rodir/cryoffear/models/Props/sky_blixt.mdl", "start": 24508051, "end": 25682539}, {"filename": "/rodir/cryoffear/models/Props/sky_sphere.mdl", "start": 25682539, "end": 25988167}, {"filename": "/rodir/cryoffear/models/cutscene/aud_cut.mdl", "start": 25988167, "end": 26268671}, {"filename": "/rodir/cryoffear/models/cutscene/kattscene.mdl", "start": 26268671, "end": 26579259}, {"filename": "/rodir/cryoffear/models/cutscene/player3.mdl", "start": 26579259, "end": 29033055}, {"filename": "/rodir/cryoffear/models/cutscene/vari_cut.mdl", "start": 29033055, "end": 29287863}, {"filename": "/rodir/cryoffear/sound/ambience/bil1.wav", "start": 29287863, "end": 29465529, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/bil2.wav", "start": 29465529, "end": 29792169, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/bilar.wav", "start": 29792169, "end": 31650657, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/coffontappear.wav", "start": 31650657, "end": 31879103, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/loud_thunder.wav", "start": 31879103, "end": 32010055, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/rain_urban.wav", "start": 32010055, "end": 32732301, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/tagljud1.wav", "start": 32732301, "end": 33221405, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/train_by.wav", "start": 33221405, "end": 33787793, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/vind2.wav", "start": 33787793, "end": 34537979, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/wind2.wav", "start": 34537979, "end": 34673491, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/train.wav", "start": 34673491, "end": 35271803, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/train2.wav", "start": 35271803, "end": 38376383, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/tunnelbanaarr.wav", "start": 38376383, "end": 39303285, "audio": 1}, {"filename": "/rodir/cryoffear/sound/subtitles/intro/sub0.wav", "start": 39303285, "end": 40760843, "audio": 1}], "remote_package_size": 40760843});

  })();
