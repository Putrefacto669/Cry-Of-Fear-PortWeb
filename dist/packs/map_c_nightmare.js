
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
      var PACKAGE_NAME = '/root/cof-web/dist/packs/map_c_nightmare.data';
      var REMOTE_PACKAGE_BASE = 'map_c_nightmare.data';
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
Module['FS_createPath']("/rodir/cryoffear/materials/maps", "c_nightmare.bsp", true, true);
Module['FS_createPath']("/rodir/cryoffear", "models", true, true);
Module['FS_createPath']("/rodir/cryoffear/models", "Props", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "Blandat", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "Fordon", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "InomhusD", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "Mobler", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "UtomhusD", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "Vaxter", true, true);
Module['FS_createPath']("/rodir/cryoffear/models", "cutscene", true, true);
Module['FS_createPath']("/rodir/cryoffear/models", "nightmare", true, true);
Module['FS_createPath']("/rodir/cryoffear", "sound", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "ambience", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "cutscene", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound/cutscene", "start", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "player", true, true);
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
          }          Module['removeRunDependency']('datafile_/root/cof-web/dist/packs/map_c_nightmare.data');

      };
      Module['addRunDependency']('datafile_/root/cof-web/dist/packs/map_c_nightmare.data');

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
    loadPackage({"files": [{"filename": "/rodir/cryoffear/gfx/env/blackbk.tga", "start": 0, "end": 196626}, {"filename": "/rodir/cryoffear/gfx/env/blackdn.tga", "start": 196626, "end": 393252}, {"filename": "/rodir/cryoffear/gfx/env/blackft.tga", "start": 393252, "end": 589878}, {"filename": "/rodir/cryoffear/gfx/env/blacklf.tga", "start": 589878, "end": 786504}, {"filename": "/rodir/cryoffear/gfx/env/blackrt.tga", "start": 786504, "end": 983130}, {"filename": "/rodir/cryoffear/gfx/env/blackup.tga", "start": 983130, "end": 1179756}, {"filename": "/rodir/cryoffear/maps/c_nightmare.bsp", "start": 1179756, "end": 11178656}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/+0~white.dds", "start": 11178656, "end": 11179480}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/aaatrigger.dds", "start": 11179480, "end": 11179792}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/black.dds", "start": 11179792, "end": 11180616}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c2_asfaltblo.dds", "start": 11180616, "end": 11224448}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c2_bricks1.dds", "start": 11224448, "end": 11268280}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c2_ceil1.dds", "start": 11268280, "end": 11282088}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c2_nightmares1.dds", "start": 11282088, "end": 11325920}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c2_nightmares2.dds", "start": 11325920, "end": 11369752}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c2_psykwall.dds", "start": 11369752, "end": 11413584}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c2_psykwall2.dds", "start": 11413584, "end": 11457416}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c2_psykwall3.dds", "start": 11457416, "end": 11501248}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c2_sickroomwa1.dds", "start": 11501248, "end": 11556752}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c2_skitfan1.dds", "start": 11556752, "end": 11612256}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c2_skitfan2.dds", "start": 11612256, "end": 11667760}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c2_skitfan3.dds", "start": 11667760, "end": 11723264}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c2_skitfan4.dds", "start": 11723264, "end": 11778768}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c2_walltile1.dds", "start": 11778768, "end": 11822600}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c3a2_light2.dds", "start": 11822600, "end": 11830480}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_apdoor1.dds", "start": 11830480, "end": 11846016}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_asfaltvag2.dds", "start": 11846016, "end": 12020920}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_asfaltvag3.dds", "start": 12020920, "end": 12195824}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_bed1S.dds", "start": 12195824, "end": 12200088}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_bednakedS.dds", "start": 12200088, "end": 12205696}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_bednakedT.dds", "start": 12205696, "end": 12227688}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_bedtackeT.dds", "start": 12227688, "end": 12266080}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_bedwood.dds", "start": 12266080, "end": 12266568}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_blurmetal.dds", "start": 12266568, "end": 12277632}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_books2F.dds", "start": 12277632, "end": 12283240}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_brick4win1S.dds", "start": 12283240, "end": 12303888}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_bricks3.dds", "start": 12303888, "end": 12324528}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_bricks4.dds", "start": 12324528, "end": 12368360}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_brunn1.dds", "start": 12368360, "end": 12373648}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_build1win1S.dds", "start": 12373648, "end": 12381992}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_build3wa.dds", "start": 12381992, "end": 12491392}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_build4wa.dds", "start": 12491392, "end": 12524312}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_build5win.dds", "start": 12524312, "end": 12541560}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_building1.dds", "start": 12541560, "end": 12716464}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_buildwhole2.dds", "start": 12716464, "end": 12891368}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_buildwhole3.dds", "start": 12891368, "end": 13044448}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_buildwhole4.dds", "start": 13044448, "end": 13175672}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_byra1F.dds", "start": 13175672, "end": 13197376}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_byra1S.dds", "start": 13197376, "end": 13211880}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_cdhog_F.dds", "start": 13211880, "end": 13213048}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_cdhog_S.dds", "start": 13213048, "end": 13215248}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_cdhog_T.dds", "start": 13215248, "end": 13216072}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_ceil1.dds", "start": 13216072, "end": 13229880}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_cretewast.dds", "start": 13229880, "end": 13285384}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_dorrlist_S.dds", "start": 13285384, "end": 13287632}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_dorrlist_XS.dds", "start": 13287632, "end": 13288824}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_dorrlistg.dds", "start": 13288824, "end": 13290192}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_drkmetal.dds", "start": 13290192, "end": 13334024}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_elboxfront.dds", "start": 13334024, "end": 13345088}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_eluttag.dds", "start": 13345088, "end": 13345576}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_flaktihus.dds", "start": 13345576, "end": 13346400}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_gardintop.dds", "start": 13346400, "end": 13391008}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_gardintop3.dds", "start": 13391008, "end": 13438976}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_glassblur.dds", "start": 13438976, "end": 13482808}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_glasssharp.dds", "start": 13482808, "end": 13526640}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_hogbla2.dds", "start": 13526640, "end": 13537704}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_klocka1.dds", "start": 13537704, "end": 13540576}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_koksgolv3.dds", "start": 13540576, "end": 13574200}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_lampa4ljus.dds", "start": 13574200, "end": 13575888}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_lampa4ram.dds", "start": 13575888, "end": 13577576}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_lampa_toaF.dds", "start": 13577576, "end": 13579264}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_lodor2.dds", "start": 13579264, "end": 13586264}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_lysrorlampaon.dds", "start": 13586264, "end": 13591216}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_matbordT.dds", "start": 13591216, "end": 13618696}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_matbordleg.dds", "start": 13618696, "end": 13620240}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_matbordwd.dds", "start": 13620240, "end": 13647720}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_matbordwdS.dds", "start": 13647720, "end": 13650672}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_matta2.dds", "start": 13650672, "end": 13683592}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_mblwood2.dds", "start": 13683592, "end": 13690920}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_metallist.dds", "start": 13690920, "end": 13692464}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_nedercrete1.dds", "start": 13692464, "end": 13706328}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_nightmaremes2.dds", "start": 13706328, "end": 13733144}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_nightmaret1.dds", "start": 13733144, "end": 13771760}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_nightmaret2.dds", "start": 13771760, "end": 13805272}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_nightmaret3.dds", "start": 13805272, "end": 13831064}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_nightmarex.dds", "start": 13831064, "end": 13831888}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_poster2.dds", "start": 13831888, "end": 13842832}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_poster5.dds", "start": 13842832, "end": 13847760}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_roof1.dds", "start": 13847760, "end": 13864312}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_rstblpipe.dds", "start": 13864312, "end": 13865856}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_rstpipe.dds", "start": 13865856, "end": 13876936}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_sangborF.dds", "start": 13876936, "end": 13885280}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_sdlyktstolpS.dds", "start": 13885280, "end": 13888168}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_stair.dds", "start": 13888168, "end": 13892432}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_stairfront.dds", "start": 13892432, "end": 13898072}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_stromavbrytar.dds", "start": 13898072, "end": 13898384}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_stupror.dds", "start": 13898384, "end": 13908336}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_tapet1.dds", "start": 13908336, "end": 13937424}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_tapet10.dds", "start": 13937424, "end": 13964240}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_tapet3.dds", "start": 13964240, "end": 13993328}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_tapetsim1.dds", "start": 13993328, "end": 14022416}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_tapetsim2.dds", "start": 14022416, "end": 14051504}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_tapetsim3.dds", "start": 14051504, "end": 14080592}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_tapetsim4.dds", "start": 14080592, "end": 14082280}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_trottoka.dds", "start": 14082280, "end": 14084880}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_tunnelceil.dds", "start": 14084880, "end": 14095944}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_vitmobel.dds", "start": 14095944, "end": 14102240}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_wood3ka.dds", "start": 14102240, "end": 14105016}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/clip.dds", "start": 14105016, "end": 14105328}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/cn_asplattr.dds", "start": 14105328, "end": 14149160}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/cn_bricks3.dds", "start": 14149160, "end": 14171152}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/origin.dds", "start": 14171152, "end": 14171464}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/r_fonster3.dds", "start": 14171464, "end": 14177760}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/r_tapet22_1.dds", "start": 14177760, "end": 14188824}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/{invisible.dds", "start": 14188824, "end": 14189320}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/{r_list2.dds", "start": 14189320, "end": 14206648}, {"filename": "/rodir/cryoffear/models/Props/Blandat/headdy.mdl", "start": 14206648, "end": 14520000}, {"filename": "/rodir/cryoffear/models/Props/Fordon/foretag.mdl", "start": 14520000, "end": 15064028}, {"filename": "/rodir/cryoffear/models/Props/Fordon/polisbil.mdl", "start": 15064028, "end": 15587780}, {"filename": "/rodir/cryoffear/models/Props/Fordon/vari.mdl", "start": 15587780, "end": 16098532}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/blomma1.mdl", "start": 16098532, "end": 16213728}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/kudde1.mdl", "start": 16213728, "end": 16389844}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/pet_bottle.mdl", "start": 16389844, "end": 16648364}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/shoes.mdl", "start": 16648364, "end": 16721916}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/skitpobord2.mdl", "start": 16721916, "end": 16884260}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/skitpobord3.mdl", "start": 16884260, "end": 17053060}, {"filename": "/rodir/cryoffear/models/Props/Mobler/stormyslampaon1.mdl", "start": 17053060, "end": 17089648}, {"filename": "/rodir/cryoffear/models/Props/Mobler/stormyslampaon2.mdl", "start": 17089648, "end": 17160472}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/skrap.mdl", "start": 17160472, "end": 17735648}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/stadlyktrund2.mdl", "start": 17735648, "end": 17814180}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/stadlyktrund4.mdl", "start": 17814180, "end": 17896464}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/stadsmallli.mdl", "start": 17896464, "end": 17976580}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/nakettrad3.mdl", "start": 17976580, "end": 18726300}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/nakettrad4.mdl", "start": 18726300, "end": 19360480}, {"filename": "/rodir/cryoffear/models/cutscene/gubbansikte.mdl", "start": 19360480, "end": 19664044}, {"filename": "/rodir/cryoffear/models/cutscene/simon_talk.mdl", "start": 19664044, "end": 22265984}, {"filename": "/rodir/cryoffear/models/cutscene/simonskratt.mdl", "start": 22265984, "end": 25379476}, {"filename": "/rodir/cryoffear/models/cutscene/woundedfag.mdl", "start": 25379476, "end": 27576876}, {"filename": "/rodir/cryoffear/models/nightmare/1.mdl", "start": 27576876, "end": 28579600}, {"filename": "/rodir/cryoffear/models/nightmare/2.mdl", "start": 28579600, "end": 29562208}, {"filename": "/rodir/cryoffear/models/nightmare/3.mdl", "start": 29562208, "end": 30230856}, {"filename": "/rodir/cryoffear/models/nightmare/4.mdl", "start": 30230856, "end": 31195648}, {"filename": "/rodir/cryoffear/sound/ambience/b_screamclose1.wav", "start": 31195648, "end": 31274138, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/b_screamdistance4.wav", "start": 31274138, "end": 31597530, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/hit1.wav", "start": 31597530, "end": 31692618, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/wind2.wav", "start": 31692618, "end": 31828130, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/carcrash.wav", "start": 31828130, "end": 31933038, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/carstart.WAV", "start": 31933038, "end": 32155732}, {"filename": "/rodir/cryoffear/sound/cutscene/start/cought1.wav", "start": 32155732, "end": 32193834, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/raise1.wav", "start": 32193834, "end": 32214362, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/raise2.wav", "start": 32214362, "end": 32224616, "audio": 1}, {"filename": "/rodir/cryoffear/sound/player/pl_concrete1.wav", "start": 32224616, "end": 32229344, "audio": 1}, {"filename": "/rodir/cryoffear/sound/player/pl_concrete10.wav", "start": 32229344, "end": 32241344, "audio": 1}, {"filename": "/rodir/cryoffear/sound/player/pl_concrete11.wav", "start": 32241344, "end": 32251634, "audio": 1}, {"filename": "/rodir/cryoffear/sound/player/pl_concrete12.wav", "start": 32251634, "end": 32260924, "audio": 1}, {"filename": "/rodir/cryoffear/sound/player/pl_concrete2.wav", "start": 32260924, "end": 32269042, "audio": 1}, {"filename": "/rodir/cryoffear/sound/player/pl_concrete3.wav", "start": 32269042, "end": 32278890, "audio": 1}, {"filename": "/rodir/cryoffear/sound/player/pl_concrete4.wav", "start": 32278890, "end": 32289472, "audio": 1}, {"filename": "/rodir/cryoffear/sound/player/pl_concrete5.wav", "start": 32289472, "end": 32300614, "audio": 1}, {"filename": "/rodir/cryoffear/sound/player/pl_concrete6.wav", "start": 32300614, "end": 32310766, "audio": 1}, {"filename": "/rodir/cryoffear/sound/player/pl_concrete7.wav", "start": 32310766, "end": 32320980, "audio": 1}, {"filename": "/rodir/cryoffear/sound/player/pl_concrete8.wav", "start": 32320980, "end": 32331260, "audio": 1}, {"filename": "/rodir/cryoffear/sound/player/pl_concrete9.wav", "start": 32331260, "end": 32342648, "audio": 1}, {"filename": "/rodir/cryoffear/sound/subtitles/intro/mansub1.wav", "start": 32342648, "end": 32402046, "audio": 1}, {"filename": "/rodir/cryoffear/sound/subtitles/intro/sub1.wav", "start": 32402046, "end": 32458832, "audio": 1}, {"filename": "/rodir/cryoffear/sound/subtitles/intro/sub2.wav", "start": 32458832, "end": 32474920, "audio": 1}], "remote_package_size": 32474920});

  })();
