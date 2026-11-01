
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
      var PACKAGE_NAME = '/root/cof-audits/flashlight-20261031/dist-view/packs/map_c_nightmare.data';
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
Module['FS_createPath']("/rodir/cryoffear/gfx", "decals", true, true);
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
          }          Module['removeRunDependency']('datafile_/root/cof-audits/flashlight-20261031/dist-view/packs/map_c_nightmare.data');

      };
      Module['addRunDependency']('datafile_/root/cof-audits/flashlight-20261031/dist-view/packs/map_c_nightmare.data');

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
    loadPackage({"files": [{"filename": "/rodir/cryoffear/gfx/decals/leaves2.tga", "start": 0, "end": 196652}, {"filename": "/rodir/cryoffear/gfx/decals/leaves3.tga", "start": 196652, "end": 393304}, {"filename": "/rodir/cryoffear/gfx/env/blackbk.tga", "start": 393304, "end": 589930}, {"filename": "/rodir/cryoffear/gfx/env/blackdn.tga", "start": 589930, "end": 786556}, {"filename": "/rodir/cryoffear/gfx/env/blackft.tga", "start": 786556, "end": 983182}, {"filename": "/rodir/cryoffear/gfx/env/blacklf.tga", "start": 983182, "end": 1179808}, {"filename": "/rodir/cryoffear/gfx/env/blackrt.tga", "start": 1179808, "end": 1376434}, {"filename": "/rodir/cryoffear/gfx/env/blackup.tga", "start": 1376434, "end": 1573060}, {"filename": "/rodir/cryoffear/maps/c_nightmare.bsp", "start": 1573060, "end": 11571960}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/+0~white.dds", "start": 11571960, "end": 11572784}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/aaatrigger.dds", "start": 11572784, "end": 11573096}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/black.dds", "start": 11573096, "end": 11573920}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c2_asfaltblo.dds", "start": 11573920, "end": 11617752}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c2_bricks1.dds", "start": 11617752, "end": 11661584}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c2_ceil1.dds", "start": 11661584, "end": 11675392}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c2_nightmares1.dds", "start": 11675392, "end": 11719224}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c2_nightmares2.dds", "start": 11719224, "end": 11763056}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c2_psykwall.dds", "start": 11763056, "end": 11806888}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c2_psykwall2.dds", "start": 11806888, "end": 11850720}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c2_psykwall3.dds", "start": 11850720, "end": 11894552}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c2_sickroomwa1.dds", "start": 11894552, "end": 11950056}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c2_skitfan1.dds", "start": 11950056, "end": 12005560}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c2_skitfan2.dds", "start": 12005560, "end": 12061064}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c2_skitfan3.dds", "start": 12061064, "end": 12116568}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c2_skitfan4.dds", "start": 12116568, "end": 12172072}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c2_walltile1.dds", "start": 12172072, "end": 12215904}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c3a2_light2.dds", "start": 12215904, "end": 12223784}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_apdoor1.dds", "start": 12223784, "end": 12239320}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_asfaltvag2.dds", "start": 12239320, "end": 12414224}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_asfaltvag3.dds", "start": 12414224, "end": 12589128}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_bed1S.dds", "start": 12589128, "end": 12593392}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_bednakedS.dds", "start": 12593392, "end": 12599000}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_bednakedT.dds", "start": 12599000, "end": 12620992}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_bedtackeT.dds", "start": 12620992, "end": 12659384}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_bedwood.dds", "start": 12659384, "end": 12659872}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_blurmetal.dds", "start": 12659872, "end": 12670936}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_books2F.dds", "start": 12670936, "end": 12676544}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_brick4win1S.dds", "start": 12676544, "end": 12697192}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_bricks3.dds", "start": 12697192, "end": 12717832}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_bricks4.dds", "start": 12717832, "end": 12761664}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_brunn1.dds", "start": 12761664, "end": 12766952}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_build1win1S.dds", "start": 12766952, "end": 12775296}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_build3wa.dds", "start": 12775296, "end": 12884696}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_build4wa.dds", "start": 12884696, "end": 12917616}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_build5win.dds", "start": 12917616, "end": 12934864}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_building1.dds", "start": 12934864, "end": 13109768}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_buildwhole2.dds", "start": 13109768, "end": 13284672}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_buildwhole3.dds", "start": 13284672, "end": 13437752}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_buildwhole4.dds", "start": 13437752, "end": 13568976}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_byra1F.dds", "start": 13568976, "end": 13590680}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_byra1S.dds", "start": 13590680, "end": 13605184}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_cdhog_F.dds", "start": 13605184, "end": 13606352}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_cdhog_S.dds", "start": 13606352, "end": 13608552}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_cdhog_T.dds", "start": 13608552, "end": 13609376}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_ceil1.dds", "start": 13609376, "end": 13623184}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_cretewast.dds", "start": 13623184, "end": 13678688}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_dorrlist_S.dds", "start": 13678688, "end": 13680936}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_dorrlist_XS.dds", "start": 13680936, "end": 13682128}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_dorrlistg.dds", "start": 13682128, "end": 13683496}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_drkmetal.dds", "start": 13683496, "end": 13727328}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_elboxfront.dds", "start": 13727328, "end": 13738392}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_eluttag.dds", "start": 13738392, "end": 13738880}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_flaktihus.dds", "start": 13738880, "end": 13739704}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_gardintop.dds", "start": 13739704, "end": 13784312}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_gardintop3.dds", "start": 13784312, "end": 13832280}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_glassblur.dds", "start": 13832280, "end": 13876112}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_glasssharp.dds", "start": 13876112, "end": 13919944}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_hogbla2.dds", "start": 13919944, "end": 13931008}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_klocka1.dds", "start": 13931008, "end": 13933880}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_koksgolv3.dds", "start": 13933880, "end": 13967504}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_lampa4ljus.dds", "start": 13967504, "end": 13969192}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_lampa4ram.dds", "start": 13969192, "end": 13970880}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_lampa_toaF.dds", "start": 13970880, "end": 13972568}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_lodor2.dds", "start": 13972568, "end": 13979568}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_lysrorlampaon.dds", "start": 13979568, "end": 13984520}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_matbordT.dds", "start": 13984520, "end": 14012000}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_matbordleg.dds", "start": 14012000, "end": 14013544}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_matbordwd.dds", "start": 14013544, "end": 14041024}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_matbordwdS.dds", "start": 14041024, "end": 14043976}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_matta2.dds", "start": 14043976, "end": 14076896}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_mblwood2.dds", "start": 14076896, "end": 14084224}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_metallist.dds", "start": 14084224, "end": 14085768}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_nedercrete1.dds", "start": 14085768, "end": 14099632}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_nightmaremes2.dds", "start": 14099632, "end": 14126448}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_nightmaret1.dds", "start": 14126448, "end": 14165064}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_nightmaret2.dds", "start": 14165064, "end": 14198576}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_nightmaret3.dds", "start": 14198576, "end": 14224368}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_nightmarex.dds", "start": 14224368, "end": 14225192}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_poster2.dds", "start": 14225192, "end": 14236136}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_poster5.dds", "start": 14236136, "end": 14241064}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_roof1.dds", "start": 14241064, "end": 14257616}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_rstblpipe.dds", "start": 14257616, "end": 14259160}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_rstpipe.dds", "start": 14259160, "end": 14270240}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_sangborF.dds", "start": 14270240, "end": 14278584}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_sdlyktstolpS.dds", "start": 14278584, "end": 14281472}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_stair.dds", "start": 14281472, "end": 14285736}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_stairfront.dds", "start": 14285736, "end": 14291376}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_stromavbrytar.dds", "start": 14291376, "end": 14291688}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_stupror.dds", "start": 14291688, "end": 14301640}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_tapet1.dds", "start": 14301640, "end": 14330728}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_tapet10.dds", "start": 14330728, "end": 14357544}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_tapet3.dds", "start": 14357544, "end": 14386632}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_tapetsim1.dds", "start": 14386632, "end": 14415720}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_tapetsim2.dds", "start": 14415720, "end": 14444808}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_tapetsim3.dds", "start": 14444808, "end": 14473896}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_tapetsim4.dds", "start": 14473896, "end": 14475584}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_trottoka.dds", "start": 14475584, "end": 14478184}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_tunnelceil.dds", "start": 14478184, "end": 14489248}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_vitmobel.dds", "start": 14489248, "end": 14495544}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/c_wood3ka.dds", "start": 14495544, "end": 14498320}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/clip.dds", "start": 14498320, "end": 14498632}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/cn_asplattr.dds", "start": 14498632, "end": 14542464}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/cn_bricks3.dds", "start": 14542464, "end": 14564456}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/origin.dds", "start": 14564456, "end": 14564768}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/r_fonster3.dds", "start": 14564768, "end": 14571064}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/r_tapet22_1.dds", "start": 14571064, "end": 14582128}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/{invisible.dds", "start": 14582128, "end": 14582624}, {"filename": "/rodir/cryoffear/materials/maps/c_nightmare.bsp/{r_list2.dds", "start": 14582624, "end": 14599952}, {"filename": "/rodir/cryoffear/models/Props/Blandat/headdy.mdl", "start": 14599952, "end": 14913304}, {"filename": "/rodir/cryoffear/models/Props/Fordon/foretag.mdl", "start": 14913304, "end": 15457332}, {"filename": "/rodir/cryoffear/models/Props/Fordon/polisbil.mdl", "start": 15457332, "end": 15981084}, {"filename": "/rodir/cryoffear/models/Props/Fordon/vari.mdl", "start": 15981084, "end": 16491836}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/blomma1.mdl", "start": 16491836, "end": 16607032}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/kudde1.mdl", "start": 16607032, "end": 16783148}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/pet_bottle.mdl", "start": 16783148, "end": 17041668}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/shoes.mdl", "start": 17041668, "end": 17115220}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/skitpobord2.mdl", "start": 17115220, "end": 17277564}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/skitpobord3.mdl", "start": 17277564, "end": 17446364}, {"filename": "/rodir/cryoffear/models/Props/Mobler/stormyslampaon1.mdl", "start": 17446364, "end": 17482952}, {"filename": "/rodir/cryoffear/models/Props/Mobler/stormyslampaon2.mdl", "start": 17482952, "end": 17553776}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/skrap.mdl", "start": 17553776, "end": 18128952}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/stadlyktrund2.mdl", "start": 18128952, "end": 18207484}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/stadlyktrund4.mdl", "start": 18207484, "end": 18289768}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/stadsmallli.mdl", "start": 18289768, "end": 18369884}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/nakettrad3.mdl", "start": 18369884, "end": 19119604}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/nakettrad4.mdl", "start": 19119604, "end": 19753784}, {"filename": "/rodir/cryoffear/models/cutscene/gubbansikte.mdl", "start": 19753784, "end": 20057348}, {"filename": "/rodir/cryoffear/models/cutscene/simon_talk.mdl", "start": 20057348, "end": 22659288}, {"filename": "/rodir/cryoffear/models/cutscene/simonskratt.mdl", "start": 22659288, "end": 25772780}, {"filename": "/rodir/cryoffear/models/cutscene/woundedfag.mdl", "start": 25772780, "end": 27970180}, {"filename": "/rodir/cryoffear/models/nightmare/1.mdl", "start": 27970180, "end": 28972904}, {"filename": "/rodir/cryoffear/models/nightmare/2.mdl", "start": 28972904, "end": 29955512}, {"filename": "/rodir/cryoffear/models/nightmare/3.mdl", "start": 29955512, "end": 30624160}, {"filename": "/rodir/cryoffear/models/nightmare/4.mdl", "start": 30624160, "end": 31588952}, {"filename": "/rodir/cryoffear/sound/ambience/b_screamclose1.wav", "start": 31588952, "end": 31667442, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/b_screamdistance4.wav", "start": 31667442, "end": 31990834, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/hit1.wav", "start": 31990834, "end": 32085922, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/wind2.wav", "start": 32085922, "end": 32221434, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/carcrash.wav", "start": 32221434, "end": 32326342, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/carstart.WAV", "start": 32326342, "end": 32549036}, {"filename": "/rodir/cryoffear/sound/cutscene/start/cought1.wav", "start": 32549036, "end": 32587138, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/raise1.wav", "start": 32587138, "end": 32607666, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/raise2.wav", "start": 32607666, "end": 32617920, "audio": 1}, {"filename": "/rodir/cryoffear/sound/player/pl_concrete1.wav", "start": 32617920, "end": 32622648, "audio": 1}, {"filename": "/rodir/cryoffear/sound/player/pl_concrete10.wav", "start": 32622648, "end": 32634648, "audio": 1}, {"filename": "/rodir/cryoffear/sound/player/pl_concrete11.wav", "start": 32634648, "end": 32644938, "audio": 1}, {"filename": "/rodir/cryoffear/sound/player/pl_concrete12.wav", "start": 32644938, "end": 32654228, "audio": 1}, {"filename": "/rodir/cryoffear/sound/player/pl_concrete2.wav", "start": 32654228, "end": 32662346, "audio": 1}, {"filename": "/rodir/cryoffear/sound/player/pl_concrete3.wav", "start": 32662346, "end": 32672194, "audio": 1}, {"filename": "/rodir/cryoffear/sound/player/pl_concrete4.wav", "start": 32672194, "end": 32682776, "audio": 1}, {"filename": "/rodir/cryoffear/sound/player/pl_concrete5.wav", "start": 32682776, "end": 32693918, "audio": 1}, {"filename": "/rodir/cryoffear/sound/player/pl_concrete6.wav", "start": 32693918, "end": 32704070, "audio": 1}, {"filename": "/rodir/cryoffear/sound/player/pl_concrete7.wav", "start": 32704070, "end": 32714284, "audio": 1}, {"filename": "/rodir/cryoffear/sound/player/pl_concrete8.wav", "start": 32714284, "end": 32724564, "audio": 1}, {"filename": "/rodir/cryoffear/sound/player/pl_concrete9.wav", "start": 32724564, "end": 32735952, "audio": 1}, {"filename": "/rodir/cryoffear/sound/subtitles/intro/mansub1.wav", "start": 32735952, "end": 32795350, "audio": 1}, {"filename": "/rodir/cryoffear/sound/subtitles/intro/sub1.wav", "start": 32795350, "end": 32852136, "audio": 1}, {"filename": "/rodir/cryoffear/sound/subtitles/intro/sub2.wav", "start": 32852136, "end": 32868224, "audio": 1}], "remote_package_size": 32868224});

  })();
