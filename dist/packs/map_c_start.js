
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
      var PACKAGE_NAME = '/root/cof-audits/audit-D3Kl5uly/dist/packs/map_c_start.data';
      var REMOTE_PACKAGE_BASE = 'map_c_start.data';
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
Module['FS_createPath']("/rodir/cryoffear/materials/maps", "c_start.bsp", true, true);
Module['FS_createPath']("/rodir/cryoffear", "models", true, true);
Module['FS_createPath']("/rodir/cryoffear/models", "Props", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "Blandat", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "InomhusD", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "UtomhusD", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "Vaxter", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/Props", "fpsc", true, true);
Module['FS_createPath']("/rodir/cryoffear/models", "cutscene", true, true);
Module['FS_createPath']("/rodir/cryoffear/models", "items", true, true);
Module['FS_createPath']("/rodir/cryoffear/models", "weapons", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/weapons", "axe", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/weapons", "booklaser", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/weapons", "famas", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/weapons", "mp5", true, true);
Module['FS_createPath']("/rodir/cryoffear", "sound", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "ambience", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "aompa", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "buttons", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "common", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "cutscene", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound/cutscene", "start", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "doors", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "items", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "player", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound/player", "footsteps", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "slower", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "subtitles", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound/subtitles", "start", true, true);

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
          }          Module['removeRunDependency']('datafile_/root/cof-audits/audit-D3Kl5uly/dist/packs/map_c_start.data');

      };
      Module['addRunDependency']('datafile_/root/cof-audits/audit-D3Kl5uly/dist/packs/map_c_start.data');

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
    loadPackage({"files": [{"filename": "/rodir/cryoffear/aurora/cof_leaves.aur", "start": 0, "end": 676}, {"filename": "/rodir/cryoffear/aurora/cof_steam.aur", "start": 676, "end": 1252}, {"filename": "/rodir/cryoffear/aurora/cof_steam2.aur", "start": 1252, "end": 1904}, {"filename": "/rodir/cryoffear/gfx/env/blackbk.tga", "start": 1904, "end": 198530}, {"filename": "/rodir/cryoffear/gfx/env/blackdn.tga", "start": 198530, "end": 395156}, {"filename": "/rodir/cryoffear/gfx/env/blackft.tga", "start": 395156, "end": 591782}, {"filename": "/rodir/cryoffear/gfx/env/blacklf.tga", "start": 591782, "end": 788408}, {"filename": "/rodir/cryoffear/gfx/env/blackrt.tga", "start": 788408, "end": 985034}, {"filename": "/rodir/cryoffear/gfx/env/blackup.tga", "start": 985034, "end": 1181660}, {"filename": "/rodir/cryoffear/maps/c_start.bsp", "start": 1181660, "end": 14275204}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/+0~fifts_lght01.dds", "start": 14275204, "end": 14278772}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/+0~white.dds", "start": 14278772, "end": 14279596}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/+a~fifts_lght01.dds", "start": 14279596, "end": 14283164}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/aaatrigger.dds", "start": 14283164, "end": 14283476}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/black.dds", "start": 14283476, "end": 14284300}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_aband11.dds", "start": 14284300, "end": 14328132}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_asfalt01.dds", "start": 14328132, "end": 14371964}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_asfaltside.dds", "start": 14371964, "end": 14380356}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_backdoor1.dds", "start": 14380356, "end": 14393852}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_balkongbig.dds", "start": 14393852, "end": 14404916}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_balkongbigS.dds", "start": 14404916, "end": 14406460}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_balkongmain.dds", "start": 14406460, "end": 14418908}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_basfloor1.dds", "start": 14418908, "end": 14462740}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_blurmetal.dds", "start": 14462740, "end": 14473804}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_bmfl_gt1.dds", "start": 14473804, "end": 14517636}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_bussh_4.dds", "start": 14517636, "end": 14534164}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_cretewall5.dds", "start": 14534164, "end": 14587652}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_cretewast.dds", "start": 14587652, "end": 14643156}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_cretewastave.dds", "start": 14643156, "end": 14698660}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_cretewastkl1.dds", "start": 14698660, "end": 14754164}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_cretewastkl2.dds", "start": 14754164, "end": 14809668}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_fonster3.dds", "start": 14809668, "end": 14815964}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_helpme1.dds", "start": 14815964, "end": 14859796}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_hogdbldoor1.dds", "start": 14859796, "end": 14892716}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_hogfence1big.dds", "start": 14892716, "end": 14936548}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_hogmur2B.dds", "start": 14936548, "end": 14965380}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_hogutwall1.dds", "start": 14965380, "end": 15009212}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_leaves.dds", "start": 15009212, "end": 15036692}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_matbordT.dds", "start": 15036692, "end": 15064172}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_matbordleg.dds", "start": 15064172, "end": 15065716}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_matbordwdS.dds", "start": 15065716, "end": 15068668}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_roof1.dds", "start": 15068668, "end": 15085220}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_roofblack.dds", "start": 15085220, "end": 15101772}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_screamfitta.dds", "start": 15101772, "end": 15145604}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_submove5.dds", "start": 15145604, "end": 15156684}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_tunnelceil.dds", "start": 15156684, "end": 15167748}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_tunnelwabig.dds", "start": 15167748, "end": 15222516}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_venteil.dds", "start": 15222516, "end": 15225388}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_vitmobel.dds", "start": 15225388, "end": 15231684}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_wood2ka.dds", "start": 15231684, "end": 15234460}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c3a2_light2.dds", "start": 15234460, "end": 15242340}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_asfaltside.dds", "start": 15242340, "end": 15250732}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_asfaltvag1.dds", "start": 15250732, "end": 15294564}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_asplattr.dds", "start": 15294564, "end": 15311668}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_blmetalli.dds", "start": 15311668, "end": 15355500}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_blood1.dds", "start": 15355500, "end": 15399332}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_blood2.dds", "start": 15399332, "end": 15443164}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_blurmetal.dds", "start": 15443164, "end": 15454228}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_brickwa1.dds", "start": 15454228, "end": 15481708}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_brunn1.dds", "start": 15481708, "end": 15486996}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_building1.dds", "start": 15486996, "end": 15661900}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_ceil1.dds", "start": 15661900, "end": 15675708}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_concrete1.dds", "start": 15675708, "end": 15719540}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_cretewall4.dds", "start": 15719540, "end": 15763372}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_diskhornT2.dds", "start": 15763372, "end": 15784020}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_door1.dds", "start": 15784020, "end": 15806012}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_door2.dds", "start": 15806012, "end": 15833476}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_door7.dds", "start": 15833476, "end": 15855468}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_dorrlistg.dds", "start": 15855468, "end": 15856836}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_drkmetal.dds", "start": 15856836, "end": 15900668}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_drkrstmetal.dds", "start": 15900668, "end": 15944500}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_elboxfront.dds", "start": 15944500, "end": 15955564}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_elboxside1.dds", "start": 15955564, "end": 15961172}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_elboxside2.dds", "start": 15961172, "end": 15966780}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_elboxtop.dds", "start": 15966780, "end": 15972388}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_generic.dds", "start": 15972388, "end": 16016220}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_grendflr.dds", "start": 16016220, "end": 16060052}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_hogglas1.dds", "start": 16060052, "end": 16071116}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_hogmarwa.dds", "start": 16071116, "end": 16086668}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_hogmur1B.dds", "start": 16086668, "end": 16119588}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_hogmur1S.dds", "start": 16119588, "end": 16127932}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_hogtrappaF1.dds", "start": 16127932, "end": 16131516}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_hogvagg1.dds", "start": 16131516, "end": 16187020}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_kokmetalO.dds", "start": 16187020, "end": 16207668}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_koksgolv2.dds", "start": 16207668, "end": 16241292}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_lampa2ljus.dds", "start": 16241292, "end": 16242980}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_lampa_toaF.dds", "start": 16242980, "end": 16244668}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_lampa_toaS.dds", "start": 16244668, "end": 16246356}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_lyktstolle.dds", "start": 16246356, "end": 16246844}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_matbordwd.dds", "start": 16246844, "end": 16274324}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_matbordwdS.dds", "start": 16274324, "end": 16277276}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_metalbrunn.dds", "start": 16277276, "end": 16282916}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_metallist.dds", "start": 16282916, "end": 16284460}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_nedercrete1.dds", "start": 16284460, "end": 16298324}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_rstmetal.dds", "start": 16298324, "end": 16342156}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_rstpipe.dds", "start": 16342156, "end": 16353236}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_stair.dds", "start": 16353236, "end": 16357500}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_stairfront.dds", "start": 16357500, "end": 16363140}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_stupror.dds", "start": 16363140, "end": 16373092}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_tapet1.dds", "start": 16373092, "end": 16402180}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_tapet3.dds", "start": 16402180, "end": 16431268}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_wawood.dds", "start": 16431268, "end": 16475100}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_wood3.dds", "start": 16475100, "end": 16503476}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/clip.dds", "start": 16503476, "end": 16503788}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_asplattr.dds", "start": 16503788, "end": 16547620}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_bricks3.dds", "start": 16547620, "end": 16569612}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_brickwa1.dds", "start": 16569612, "end": 16613444}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_brunn1.dds", "start": 16613444, "end": 16624508}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_cretee1.dds", "start": 16624508, "end": 16668340}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_cretee2.dds", "start": 16668340, "end": 16712172}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_cretekl2.dds", "start": 16712172, "end": 16756004}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_cretewl5.dds", "start": 16756004, "end": 16843532}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_cretewt.dds", "start": 16843532, "end": 16887364}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_cretkl1.dds", "start": 16887364, "end": 16931196}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_nrcrete1.dds", "start": 16931196, "end": 16953188}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_stair.dds", "start": 16953188, "end": 16956076}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_stenmur.dds", "start": 16956076, "end": 16999908}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_stupror.dds", "start": 16999908, "end": 17005548}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_tlflb.dds", "start": 17005548, "end": 17049380}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_tlwabig.dds", "start": 17049380, "end": 17093212}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/null.dds", "start": 17093212, "end": 17093524}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/origin.dds", "start": 17093524, "end": 17093836}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/po_buildgen.dds", "start": 17093836, "end": 17104900}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/po_mtldrkblue.dds", "start": 17104900, "end": 17115964}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/po_mtlltnrst.dds", "start": 17115964, "end": 17127028}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/r_brickhaha.dds", "start": 17127028, "end": 17138092}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/r_exit1.dds", "start": 17138092, "end": 17140964}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/r_exit2.dds", "start": 17140964, "end": 17143836}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/r_finwood.dds", "start": 17143836, "end": 17152180}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/r_fortavla1.dds", "start": 17152180, "end": 17196012}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/r_gardedoorwood.dds", "start": 17196012, "end": 17214628}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/r_lyktstolpe.dds", "start": 17214628, "end": 17215116}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/r_sthlight.dds", "start": 17215116, "end": 17215940}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/r_tsgarage.dds", "start": 17215940, "end": 17227004}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/subway_lights.dds", "start": 17227004, "end": 17227844}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/{c2_hogfence1.dds", "start": 17227844, "end": 17254708}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/{c_fence.dds", "start": 17254708, "end": 17274004}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/{c_fenceba1.dds", "start": 17274004, "end": 17296004}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/{c_fenceba2.dds", "start": 17296004, "end": 17318004}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/{c_fencebig.dds", "start": 17318004, "end": 17394644}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/{invisible.dds", "start": 17394644, "end": 17395140}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/{r_list2.dds", "start": 17395140, "end": 17412468}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/~spotgreen.dds", "start": 17412468, "end": 17412780}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/~spotred.dds", "start": 17412780, "end": 17413092}, {"filename": "/rodir/cryoffear/models/Props/Blandat/crows.mdl", "start": 17413092, "end": 17495928}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/baslampa.mdl", "start": 17495928, "end": 17581008}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/lysrorreal.mdl", "start": 17581008, "end": 17859584}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/pet_bottle.mdl", "start": 17859584, "end": 18118104}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/skitpobord2.mdl", "start": 18118104, "end": 18280448}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/wine_bottle.mdl", "start": 18280448, "end": 18619536}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/bag3.mdl", "start": 18619536, "end": 18890416}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/bag4.mdl", "start": 18890416, "end": 19161364}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/padlock_lo.mdl", "start": 19161364, "end": 19187520}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/sandlada.mdl", "start": 19187520, "end": 19432128}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/selbox.mdl", "start": 19432128, "end": 19457276}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/skrap.mdl", "start": 19457276, "end": 20032452}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/soptunna.mdl", "start": 20032452, "end": 20501404}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/tunnellampaon1.mdl", "start": 20501404, "end": 20526376}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/tunnellampaon2.mdl", "start": 20526376, "end": 20532120}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/bigtree1.mdl", "start": 20532120, "end": 21173060}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/bigtree2.mdl", "start": 21173060, "end": 21813824}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/buske.mdl", "start": 21813824, "end": 22025924}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/nakettrad3.mdl", "start": 22025924, "end": 22775644}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/nakettrad4.mdl", "start": 22775644, "end": 23409824}, {"filename": "/rodir/cryoffear/models/Props/fpsc/dirty_bucket.mdl", "start": 23409824, "end": 23432176}, {"filename": "/rodir/cryoffear/models/Props/sky_sphere4.mdl", "start": 23432176, "end": 23737400}, {"filename": "/rodir/cryoffear/models/cutscene/blacker.mdl", "start": 23737400, "end": 24039064}, {"filename": "/rodir/cryoffear/models/cutscene/both.mdl", "start": 24039064, "end": 26150448}, {"filename": "/rodir/cryoffear/models/cutscene/hammer_floor.mdl", "start": 26150448, "end": 26742476}, {"filename": "/rodir/cryoffear/models/cutscene/mobileprop.mdl", "start": 26742476, "end": 28663808}, {"filename": "/rodir/cryoffear/models/cutscene/player3.mdl", "start": 28663808, "end": 31117604}, {"filename": "/rodir/cryoffear/models/cutscene/simon_clothes.mdl", "start": 31117604, "end": 32459224}, {"filename": "/rodir/cryoffear/models/cutscene/simon_clothesm.mdl", "start": 32459224, "end": 33801156}, {"filename": "/rodir/cryoffear/models/cutscene/simon_talk.mdl", "start": 33801156, "end": 36403096}, {"filename": "/rodir/cryoffear/models/cutscene/slower_arm_door.mdl", "start": 36403096, "end": 36724400}, {"filename": "/rodir/cryoffear/models/cutscene/slowerdead.mdl", "start": 36724400, "end": 37912432}, {"filename": "/rodir/cryoffear/models/items/cassette_tape.mdl", "start": 37912432, "end": 37959012}, {"filename": "/rodir/cryoffear/models/items/package.mdl", "start": 37959012, "end": 38224720}, {"filename": "/rodir/cryoffear/models/items/padlock.mdl", "start": 38224720, "end": 38523220}, {"filename": "/rodir/cryoffear/models/ladder_climb.mdl", "start": 38523220, "end": 39537680}, {"filename": "/rodir/cryoffear/models/null.mdl", "start": 39537680, "end": 39539548}, {"filename": "/rodir/cryoffear/models/slower.mdl", "start": 39539548, "end": 43107912}, {"filename": "/rodir/cryoffear/models/weapons/axe/w_axe.mdl", "start": 43107912, "end": 43383516}, {"filename": "/rodir/cryoffear/models/weapons/booklaser/w_booklaser.mdl", "start": 43383516, "end": 43652940}, {"filename": "/rodir/cryoffear/models/weapons/famas/w_famas.mdl", "start": 43652940, "end": 44259096}, {"filename": "/rodir/cryoffear/models/weapons/mp5/w_mp5.mdl", "start": 44259096, "end": 45602452}, {"filename": "/rodir/cryoffear/sound/ambience/city_ambientscape1.wav", "start": 45602452, "end": 48056564, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/crow2.wav", "start": 48056564, "end": 48117404, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/fan_loop1.wav", "start": 48117404, "end": 48406052, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/flickering_light.wav", "start": 48406052, "end": 48591752, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/hit1.wav", "start": 48591752, "end": 48686840, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/new_chapter.wav", "start": 48686840, "end": 48981674, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/sewerdrips.wav", "start": 48981674, "end": 50031662, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/tunnelnoise.wav", "start": 50031662, "end": 52819824, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/wind2.wav", "start": 52819824, "end": 52955336, "audio": 1}, {"filename": "/rodir/cryoffear/sound/aompa/scream22.wav", "start": 52955336, "end": 52982418, "audio": 1}, {"filename": "/rodir/cryoffear/sound/buttons/button5.wav", "start": 52982418, "end": 53004384, "audio": 1}, {"filename": "/rodir/cryoffear/sound/buttons/package_pick.wav", "start": 53004384, "end": 53029534, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step1.wav", "start": 53029534, "end": 53035516, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step2.wav", "start": 53035516, "end": 53042392, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step3.wav", "start": 53042392, "end": 53048328, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step4.wav", "start": 53048328, "end": 53056528, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/door_creak.wav", "start": 53056528, "end": 53089930, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/hammer_pickup.wav", "start": 53089930, "end": 53107098, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/simon_walk_past.wav", "start": 53107098, "end": 53267510, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/slower_breathe.wav", "start": 53267510, "end": 53601202, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/slower_walk.wav", "start": 53601202, "end": 53760248, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/cought1.wav", "start": 53760248, "end": 53798350, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/doorclose.wav", "start": 53798350, "end": 53843862, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/lockeddoor.wav", "start": 53843862, "end": 53899050, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/pickmobile.wav", "start": 53899050, "end": 53915942, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/punch1.wav", "start": 53915942, "end": 53925276, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/raise1.wav", "start": 53925276, "end": 53945804, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/raise2.wav", "start": 53945804, "end": 53956058, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/sms_signal1.wav", "start": 53956058, "end": 53973332, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/step1.wav", "start": 53973332, "end": 53980494, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/step2.wav", "start": 53980494, "end": 53988184, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doormove1.wav", "start": 53988184, "end": 54038530, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doormove5.wav", "start": 54038530, "end": 54236452, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doormove6.wav", "start": 54236452, "end": 54303134, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doorstop5.wav", "start": 54303134, "end": 54387874, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doorstop6.wav", "start": 54387874, "end": 54439916, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/shutter_locked.wav", "start": 54439916, "end": 54462024, "audio": 1}, {"filename": "/rodir/cryoffear/sound/items/padl_turn.wav", "start": 54462024, "end": 54486436, "audio": 1}, {"filename": "/rodir/cryoffear/sound/items/padl_unlock.wav", "start": 54486436, "end": 54560230, "audio": 1}, {"filename": "/rodir/cryoffear/sound/player/footsteps/concrete1.wav", "start": 54560230, "end": 54576812, "audio": 1}, {"filename": "/rodir/cryoffear/sound/player/footsteps/concrete2.wav", "start": 54576812, "end": 54604288, "audio": 1}, {"filename": "/rodir/cryoffear/sound/player/footsteps/concrete3.wav", "start": 54604288, "end": 54635468, "audio": 1}, {"filename": "/rodir/cryoffear/sound/player/footsteps/concrete4.wav", "start": 54635468, "end": 54646132, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/hammer_miss1.wav", "start": 54646132, "end": 54650426, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/hammer_miss2.wav", "start": 54650426, "end": 54655156, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/hammer_strike1.wav", "start": 54655156, "end": 54670246, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/hammer_strike2.wav", "start": 54670246, "end": 54685336, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/hammer_strike3.wav", "start": 54685336, "end": 54700426, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/hammer_strike_wall1.wav", "start": 54700426, "end": 54709744, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/hammer_strike_wall2.wav", "start": 54709744, "end": 54727632, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/hammer_strike_wall3.wav", "start": 54727632, "end": 54736124, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/head_gore.wav", "start": 54736124, "end": 54930598, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/k_crawl1.wav", "start": 54930598, "end": 54949436, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/k_crawl2.wav", "start": 54949436, "end": 54980828, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/k_crawl3.wav", "start": 54980828, "end": 55011792, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/k_crawl4.wav", "start": 55011792, "end": 55040586, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/k_crawl5.wav", "start": 55040586, "end": 55068966, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/k_crawl6.wav", "start": 55068966, "end": 55100436, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/k_crawl7.wav", "start": 55100436, "end": 55128666, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/scream1.wav", "start": 55128666, "end": 55158244, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/slower_alert10.wav", "start": 55158244, "end": 55192600, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/slower_alert20.wav", "start": 55192600, "end": 55248748, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/slower_alert30.wav", "start": 55248748, "end": 55298464, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/slower_attack1.wav", "start": 55298464, "end": 55336152, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/slower_attack2.wav", "start": 55336152, "end": 55364096, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/slower_pain1.wav", "start": 55364096, "end": 55382040, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/slower_pain2.wav", "start": 55382040, "end": 55422014, "audio": 1}, {"filename": "/rodir/cryoffear/sound/subtitles/paining.wav", "start": 55422014, "end": 55592752, "audio": 1}, {"filename": "/rodir/cryoffear/sound/subtitles/start/sub1.wav", "start": 55592752, "end": 55638254, "audio": 1}, {"filename": "/rodir/cryoffear/sound/subtitles/start/sub2.wav", "start": 55638254, "end": 55853536, "audio": 1}, {"filename": "/rodir/cryoffear/sound/subtitles/start/sub4.wav", "start": 55853536, "end": 55959498, "audio": 1}, {"filename": "/rodir/cryoffear/sound/subtitles/start/sub5.wav", "start": 55959498, "end": 55977438, "audio": 1}, {"filename": "/rodir/cryoffear/sound/subtitles/start/sub6.wav", "start": 55977438, "end": 56016180, "audio": 1}, {"filename": "/rodir/cryoffear/sound/subtitles/sub1.wav", "start": 56016180, "end": 56113006, "audio": 1}, {"filename": "/rodir/cryoffear/sound/subtitles/sub2.wav", "start": 56113006, "end": 56207528, "audio": 1}, {"filename": "/rodir/cryoffear/sound/subtitles/sub3.wav", "start": 56207528, "end": 56242130, "audio": 1}], "remote_package_size": 56242130});

  })();
