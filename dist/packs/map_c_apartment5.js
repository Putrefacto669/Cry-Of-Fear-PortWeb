
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
      var PACKAGE_NAME = '/root/cof-audits/flashlight-20261031/dist-view/packs/map_c_apartment5.data';
      var REMOTE_PACKAGE_BASE = 'map_c_apartment5.data';
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
Module['FS_createPath']("/rodir/cryoffear/materials/maps", "c_apartment5.bsp", true, true);
Module['FS_createPath']("/rodir/cryoffear", "models", true, true);
Module['FS_createPath']("/rodir/cryoffear/models", "Props", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "Fordon", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "InomhusD", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "Mobler", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "UtomhusD", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "Vaxter", true, true);
Module['FS_createPath']("/rodir/cryoffear/models", "cutscene", true, true);
Module['FS_createPath']("/rodir/cryoffear/models", "debris", true, true);
Module['FS_createPath']("/rodir/cryoffear/models", "items", true, true);
Module['FS_createPath']("/rodir/cryoffear", "sound", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "ambience", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "buttons", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "common", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "cutscene", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound/cutscene", "badscene", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound/cutscene", "start", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "doors", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "faster", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "subtitles", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound/subtitles", "apartment5", true, true);

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
          }          Module['removeRunDependency']('datafile_/root/cof-audits/flashlight-20261031/dist-view/packs/map_c_apartment5.data');

      };
      Module['addRunDependency']('datafile_/root/cof-audits/flashlight-20261031/dist-view/packs/map_c_apartment5.data');

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
    loadPackage({"files": [{"filename": "/rodir/cryoffear/gfx/env/blackbk.tga", "start": 0, "end": 196626}, {"filename": "/rodir/cryoffear/gfx/env/blackdn.tga", "start": 196626, "end": 393252}, {"filename": "/rodir/cryoffear/gfx/env/blackft.tga", "start": 393252, "end": 589878}, {"filename": "/rodir/cryoffear/gfx/env/blacklf.tga", "start": 589878, "end": 786504}, {"filename": "/rodir/cryoffear/gfx/env/blackrt.tga", "start": 786504, "end": 983130}, {"filename": "/rodir/cryoffear/gfx/env/blackup.tga", "start": 983130, "end": 1179756}, {"filename": "/rodir/cryoffear/maps/c_apartment5.bsp", "start": 1179756, "end": 9567712}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/+0~white.dds", "start": 9567712, "end": 9568536}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/NULL.dds", "start": 9568536, "end": 9568848}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/aaatrigger.dds", "start": 9568848, "end": 9569160}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/black.dds", "start": 9569160, "end": 9569984}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_apdoor1.dds", "start": 9569984, "end": 9585520}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_apindoor1.dds", "start": 9585520, "end": 9607512}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_asfalt01.dds", "start": 9607512, "end": 9651344}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_asfaltside.dds", "start": 9651344, "end": 9659736}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_backdoor1.dds", "start": 9659736, "end": 9673232}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_balkongbig.dds", "start": 9673232, "end": 9684296}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_balkongbigS.dds", "start": 9684296, "end": 9685840}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_balkongmain.dds", "start": 9685840, "end": 9698288}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_bathsc1.dds", "start": 9698288, "end": 9742120}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_bathsc2.dds", "start": 9742120, "end": 9785952}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_bathsc3.dds", "start": 9785952, "end": 9819576}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_bed1S.dds", "start": 9819576, "end": 9823840}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_bed1T.dds", "start": 9823840, "end": 9836288}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_bedwood.dds", "start": 9836288, "end": 9836776}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_blurmetal.dds", "start": 9836776, "end": 9847840}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_books1F.dds", "start": 9847840, "end": 9853448}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_books2F.dds", "start": 9853448, "end": 9859056}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_books3F.dds", "start": 9859056, "end": 9864664}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_books4F.dds", "start": 9864664, "end": 9870272}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_books5F.dds", "start": 9870272, "end": 9875880}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_bricks1.dds", "start": 9875880, "end": 9919712}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_bricks3.dds", "start": 9919712, "end": 9940352}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_byra1F.dds", "start": 9940352, "end": 9962056}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_byra1S.dds", "start": 9962056, "end": 9976560}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_ceil1.dds", "start": 9976560, "end": 9990368}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_cretewall5.dds", "start": 9990368, "end": 10043856}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_cretewast.dds", "start": 10043856, "end": 10099360}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_cretewastav1.dds", "start": 10099360, "end": 10154864}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_cretewastave.dds", "start": 10154864, "end": 10210368}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_cretewastkl2.dds", "start": 10210368, "end": 10265872}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_diskhornT.dds", "start": 10265872, "end": 10271160}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_diskhornT2.dds", "start": 10271160, "end": 10291808}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_dorrlist_XS.dds", "start": 10291808, "end": 10293000}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_dorrlistg.dds", "start": 10293000, "end": 10294368}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_eluttag.dds", "start": 10294368, "end": 10294856}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_flaktihus.dds", "start": 10294856, "end": 10295680}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_fonster3.dds", "start": 10295680, "end": 10301976}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_gardintop.dds", "start": 10301976, "end": 10346584}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_golv1.dds", "start": 10346584, "end": 10385200}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_golv4.dds", "start": 10385200, "end": 10423816}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_hogdbldoor1.dds", "start": 10423816, "end": 10456736}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_hogdbldoor2.dds", "start": 10456736, "end": 10502344}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_hogmur1S.dds", "start": 10502344, "end": 10510688}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_hogutwall1.dds", "start": 10510688, "end": 10554520}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_klocka1.dds", "start": 10554520, "end": 10557392}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_koklist.dds", "start": 10557392, "end": 10558936}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_kokluckaU_F.dds", "start": 10558936, "end": 10563176}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_kokluckaU_S.dds", "start": 10563176, "end": 10567416}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_koklucka_F.dds", "start": 10567416, "end": 10571656}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_koksgolv3.dds", "start": 10571656, "end": 10605280}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_koksgolv4.dds", "start": 10605280, "end": 10638904}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_koktextur.dds", "start": 10638904, "end": 10645904}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_koktexturS.dds", "start": 10645904, "end": 10647448}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_kryddor.dds", "start": 10647448, "end": 10654448}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_kylF2.dds", "start": 10654448, "end": 10668312}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_kylS.dds", "start": 10668312, "end": 10682176}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_leaves.dds", "start": 10682176, "end": 10709656}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_matbordT.dds", "start": 10709656, "end": 10737136}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_matbordleg.dds", "start": 10737136, "end": 10738680}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_matbordwd.dds", "start": 10738680, "end": 10766160}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_matbordwdS.dds", "start": 10766160, "end": 10769112}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_matta10.dds", "start": 10769112, "end": 10779520}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_mblwood2.dds", "start": 10779520, "end": 10786848}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_poster1.dds", "start": 10786848, "end": 10795192}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_poster3.dds", "start": 10795192, "end": 10801344}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_roof1.dds", "start": 10801344, "end": 10817896}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_sangborF.dds", "start": 10817896, "end": 10826240}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_spisF.dds", "start": 10826240, "end": 10837304}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_spisT.dds", "start": 10837304, "end": 10848368}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_stromavbryta.dds", "start": 10848368, "end": 10848680}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_tavla2.dds", "start": 10848680, "end": 10850880}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_tavla3.dds", "start": 10850880, "end": 10854448}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_toadetails.dds", "start": 10854448, "end": 10860600}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_toakakel1.dds", "start": 10860600, "end": 10904432}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_toarulleF.dds", "start": 10904432, "end": 10905256}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_toarulleS.dds", "start": 10905256, "end": 10906080}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_toidoor.dds", "start": 10906080, "end": 10922632}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_tunnelceil.dds", "start": 10922632, "end": 10933696}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_tunnelwabig.dds", "start": 10933696, "end": 10988464}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_vitmobel.dds", "start": 10988464, "end": 10994760}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_wall11.dds", "start": 10994760, "end": 11021576}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_wall12.dds", "start": 11021576, "end": 11043968}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_wall13.dds", "start": 11043968, "end": 11070784}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_wall14.dds", "start": 11070784, "end": 11099872}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_wall8.dds", "start": 11099872, "end": 11126688}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_wood2.dds", "start": 11126688, "end": 11155064}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_wood2ka.dds", "start": 11155064, "end": 11157840}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_wood3.dds", "start": 11157840, "end": 11186216}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c2_wood3ka.dds", "start": 11186216, "end": 11188992}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c3a2_light2.dds", "start": 11188992, "end": 11196872}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_asplattr.dds", "start": 11196872, "end": 11213976}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_brickwa1.dds", "start": 11213976, "end": 11241456}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_building1.dds", "start": 11241456, "end": 11416360}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_buildwhole3.dds", "start": 11416360, "end": 11569440}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_buildwhole4.dds", "start": 11569440, "end": 11700664}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_cdhog_F.dds", "start": 11700664, "end": 11701832}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_cdhog_S.dds", "start": 11701832, "end": 11704032}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_cdhog_T.dds", "start": 11704032, "end": 11704856}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_dorrlist_S.dds", "start": 11704856, "end": 11707104}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_drkmetal.dds", "start": 11707104, "end": 11750936}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_elboxfront.dds", "start": 11750936, "end": 11762000}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_generic.dds", "start": 11762000, "end": 11805832}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_golv2.dds", "start": 11805832, "end": 11844448}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_hogdoor1.dds", "start": 11844448, "end": 11866440}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_hogfence1big.dds", "start": 11866440, "end": 11910272}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_hogglas1.dds", "start": 11910272, "end": 11921336}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_hogmarwa.dds", "start": 11921336, "end": 11936888}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_hogmur1B.dds", "start": 11936888, "end": 11969808}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_hogvagg1.dds", "start": 11969808, "end": 12025312}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_hogvagg2.dds", "start": 12025312, "end": 12099224}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_kokmetalO.dds", "start": 12099224, "end": 12119872}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_koksgolv.dds", "start": 12119872, "end": 12153496}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_koksgolv2.dds", "start": 12153496, "end": 12187120}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_kylF.dds", "start": 12187120, "end": 12200984}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_lampa2ljus.dds", "start": 12200984, "end": 12202672}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_lampa2ram.dds", "start": 12202672, "end": 12204360}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_lampa_toaF.dds", "start": 12204360, "end": 12206048}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_lodor2.dds", "start": 12206048, "end": 12213048}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_metalbrunn.dds", "start": 12213048, "end": 12218688}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_nedercrete1.dds", "start": 12218688, "end": 12232552}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_obsstfl.dds", "start": 12232552, "end": 12276384}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_rstblpipe.dds", "start": 12276384, "end": 12277928}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_stair.dds", "start": 12277928, "end": 12282192}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_stairfront.dds", "start": 12282192, "end": 12287832}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_stupror.dds", "start": 12287832, "end": 12297784}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_tapet1.dds", "start": 12297784, "end": 12326872}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_tapet2.dds", "start": 12326872, "end": 12355960}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_tapet3.dds", "start": 12355960, "end": 12385048}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_toaror.dds", "start": 12385048, "end": 12386592}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_treeground1.dds", "start": 12386592, "end": 12389464}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/c_wawood.dds", "start": 12389464, "end": 12433296}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/clip.dds", "start": 12433296, "end": 12433608}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/generic_110c.dds", "start": 12433608, "end": 12434432}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/po_buildgen.dds", "start": 12434432, "end": 12445496}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/po_mtlltnrst.dds", "start": 12445496, "end": 12456560}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/r_bed_top3.dds", "start": 12456560, "end": 12462168}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/r_lyktstolpe.dds", "start": 12462168, "end": 12462656}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/r_tapet22_1.dds", "start": 12462656, "end": 12473720}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/r_tv.dds", "start": 12473720, "end": 12476592}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/r_tv2.dds", "start": 12476592, "end": 12479464}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/r_vitsmuts.dds", "start": 12479464, "end": 12485616}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/white.dds", "start": 12485616, "end": 12486440}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/{c2_lovpomark1.dds", "start": 12486440, "end": 12527608}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/{c_fence.dds", "start": 12527608, "end": 12546904}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/{invisible.dds", "start": 12546904, "end": 12547400}, {"filename": "/rodir/cryoffear/materials/maps/c_apartment5.bsp/{r_list2.dds", "start": 12547400, "end": 12564728}, {"filename": "/rodir/cryoffear/models/Props/Fordon/foretag.mdl", "start": 12564728, "end": 13108756}, {"filename": "/rodir/cryoffear/models/Props/Fordon/polisbil.mdl", "start": 13108756, "end": 13632508}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/blomma1.mdl", "start": 13632508, "end": 13747704}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/blomma2.mdl", "start": 13747704, "end": 14094272}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/bordslampa.mdl", "start": 14094272, "end": 14170400}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/cup.mdl", "start": 14170400, "end": 14268700}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/dvd_player.mdl", "start": 14268700, "end": 14338540}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/glass.mdl", "start": 14338540, "end": 14350688}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/glass_drink.mdl", "start": 14350688, "end": 14418656}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/pet_bottle.mdl", "start": 14418656, "end": 14677176}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/saucepan.mdl", "start": 14677176, "end": 15014256}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/shoes.mdl", "start": 15014256, "end": 15087808}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/skitpobord1.mdl", "start": 15087808, "end": 15252344}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/skitpobord2.mdl", "start": 15252344, "end": 15414688}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/skitpobord3.mdl", "start": 15414688, "end": 15583488}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/wine_bottle.mdl", "start": 15583488, "end": 15922576}, {"filename": "/rodir/cryoffear/models/Props/Mobler/2msoffa.mdl", "start": 15922576, "end": 16419352}, {"filename": "/rodir/cryoffear/models/Props/Mobler/handdukho.mdl", "start": 16419352, "end": 16567936}, {"filename": "/rodir/cryoffear/models/Props/Mobler/handfat.mdl", "start": 16567936, "end": 16955408}, {"filename": "/rodir/cryoffear/models/Props/Mobler/shelf_thing.mdl", "start": 16955408, "end": 17224176}, {"filename": "/rodir/cryoffear/models/Props/Mobler/stormyslampaoff.mdl", "start": 17224176, "end": 17331280}, {"filename": "/rodir/cryoffear/models/Props/Mobler/toalett.mdl", "start": 17331280, "end": 17608436}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/bicycle_prop.mdl", "start": 17608436, "end": 18431828}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/hattlykta.mdl", "start": 18431828, "end": 18509764}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/sandlada.mdl", "start": 18509764, "end": 18754372}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/selbox.mdl", "start": 18754372, "end": 18779520}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/skrap.mdl", "start": 18779520, "end": 19354696}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/stadlyktrund2.mdl", "start": 19354696, "end": 19433228}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/nakettrad3.mdl", "start": 19433228, "end": 20182948}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/nakettrad4.mdl", "start": 20182948, "end": 20817128}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/stortrad2.mdl", "start": 20817128, "end": 21378756}, {"filename": "/rodir/cryoffear/models/cutscene/badkarscene.mdl", "start": 21378756, "end": 23188988}, {"filename": "/rodir/cryoffear/models/cutscene/badkarscene3.mdl", "start": 23188988, "end": 23256692}, {"filename": "/rodir/cryoffear/models/cutscene/badkarscenesim.mdl", "start": 23256692, "end": 24842940}, {"filename": "/rodir/cryoffear/models/cutscene/player3.mdl", "start": 24842940, "end": 27296736}, {"filename": "/rodir/cryoffear/models/debris/door3.mdl", "start": 27296736, "end": 27375292}, {"filename": "/rodir/cryoffear/models/faster.mdl", "start": 27375292, "end": 28062412}, {"filename": "/rodir/cryoffear/models/items/nyckel3.mdl", "start": 28062412, "end": 28246020}, {"filename": "/rodir/cryoffear/models/items/rope1.mdl", "start": 28246020, "end": 28266920}, {"filename": "/rodir/cryoffear/models/items/rope2.mdl", "start": 28266920, "end": 28295308}, {"filename": "/rodir/cryoffear/sound/ambience/wind2.wav", "start": 28295308, "end": 28430820, "audio": 1}, {"filename": "/rodir/cryoffear/sound/buttons/latchlocked1.wav", "start": 28430820, "end": 28457008, "audio": 1}, {"filename": "/rodir/cryoffear/sound/buttons/ropepick.wav", "start": 28457008, "end": 28490442, "audio": 1}, {"filename": "/rodir/cryoffear/sound/buttons/ropeplace.wav", "start": 28490442, "end": 28532750, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step1.wav", "start": 28532750, "end": 28538732, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step2.wav", "start": 28538732, "end": 28545608, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step3.wav", "start": 28545608, "end": 28551544, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step4.wav", "start": 28551544, "end": 28559744, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/badscene/impacthehe.wav", "start": 28559744, "end": 28635550, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/badscene/waterkey.wav", "start": 28635550, "end": 28660022, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/pickmobile.wav", "start": 28660022, "end": 28676914, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doormove1.wav", "start": 28676914, "end": 28727260, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/ropeclimb.wav", "start": 28727260, "end": 28840830, "audio": 1}, {"filename": "/rodir/cryoffear/sound/faster/faster_alert1.wav", "start": 28840830, "end": 28920420, "audio": 1}, {"filename": "/rodir/cryoffear/sound/faster/faster_alert2.wav", "start": 28920420, "end": 29038930, "audio": 1}, {"filename": "/rodir/cryoffear/sound/faster/faster_attack.wav", "start": 29038930, "end": 29060240, "audio": 1}, {"filename": "/rodir/cryoffear/sound/faster/faster_death.wav", "start": 29060240, "end": 29161520, "audio": 1}, {"filename": "/rodir/cryoffear/sound/faster/faster_headhit1.wav", "start": 29161520, "end": 29189680, "audio": 1}, {"filename": "/rodir/cryoffear/sound/faster/faster_headhit2.wav", "start": 29189680, "end": 29219420, "audio": 1}, {"filename": "/rodir/cryoffear/sound/faster/faster_headhit3.wav", "start": 29219420, "end": 29245404, "audio": 1}, {"filename": "/rodir/cryoffear/sound/faster/faster_headhit4.wav", "start": 29245404, "end": 29274636, "audio": 1}, {"filename": "/rodir/cryoffear/sound/faster/faster_hit1.wav", "start": 29274636, "end": 29298580, "audio": 1}, {"filename": "/rodir/cryoffear/sound/faster/faster_hit2.wav", "start": 29298580, "end": 29320080, "audio": 1}, {"filename": "/rodir/cryoffear/sound/faster/faster_hit3.wav", "start": 29320080, "end": 29344210, "audio": 1}, {"filename": "/rodir/cryoffear/sound/faster/faster_hit4.wav", "start": 29344210, "end": 29365522, "audio": 1}, {"filename": "/rodir/cryoffear/sound/faster/faster_metalfall.wav", "start": 29365522, "end": 29403624, "audio": 1}, {"filename": "/rodir/cryoffear/sound/faster/faster_miss.wav", "start": 29403624, "end": 29413954, "audio": 1}, {"filename": "/rodir/cryoffear/sound/faster/faster_pain.wav", "start": 29413954, "end": 29455524, "audio": 1}, {"filename": "/rodir/cryoffear/sound/faster/faster_special.wav", "start": 29455524, "end": 29583022, "audio": 1}, {"filename": "/rodir/cryoffear/sound/faster/faster_step.wav", "start": 29583022, "end": 29593676, "audio": 1}, {"filename": "/rodir/cryoffear/sound/faster/faster_suicide.wav", "start": 29593676, "end": 29631778, "audio": 1}, {"filename": "/rodir/cryoffear/sound/subtitles/apartment5/sub1.wav", "start": 29631778, "end": 29666380, "audio": 1}, {"filename": "/rodir/cryoffear/sound/subtitles/apartment5/sub2.wav", "start": 29666380, "end": 29740158, "audio": 1}, {"filename": "/rodir/cryoffear/sound/subtitles/apartment5/sub3.wav", "start": 29740158, "end": 29862286, "audio": 1}], "remote_package_size": 29862286});

  })();
