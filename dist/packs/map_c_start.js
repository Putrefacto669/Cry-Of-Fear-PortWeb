
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
      var PACKAGE_NAME = '/root/cof-audits/extras-20261101/dist-fourth/packs/map_c_start.data';
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
Module['FS_createPath']("/rodir/cryoffear/gfx", "decals", true, true);
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
Module['FS_createPath']("/rodir/cryoffear", "mp3", true, true);
Module['FS_createPath']("/rodir/cryoffear/mp3", "commentary", true, true);
Module['FS_createPath']("/rodir/cryoffear/mp3/commentary", "Andreas", true, true);
Module['FS_createPath']("/rodir/cryoffear/mp3/commentary", "James", true, true);
Module['FS_createPath']("/rodir/cryoffear", "sound", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "ambience", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "aompa", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "buttons", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "common", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "cutscene", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound/cutscene", "start", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "doors", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "items", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "slower", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "subtitles", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound/subtitles", "start", true, true);
Module['FS_createPath']("/rodir/cryoffear/sound", "weapons", true, true);

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
          }          Module['removeRunDependency']('datafile_/root/cof-audits/extras-20261101/dist-fourth/packs/map_c_start.data');

      };
      Module['addRunDependency']('datafile_/root/cof-audits/extras-20261101/dist-fourth/packs/map_c_start.data');

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
    loadPackage({"files": [{"filename": "/rodir/cryoffear/aurora/cof_leaves.aur", "start": 0, "end": 676}, {"filename": "/rodir/cryoffear/aurora/cof_steam.aur", "start": 676, "end": 1252}, {"filename": "/rodir/cryoffear/aurora/cof_steam2.aur", "start": 1252, "end": 1904}, {"filename": "/rodir/cryoffear/gfx/decals/klotter2.tga", "start": 1904, "end": 788380}, {"filename": "/rodir/cryoffear/gfx/decals/klotter3.tga", "start": 788380, "end": 1574856}, {"filename": "/rodir/cryoffear/gfx/decals/klotter4.tga", "start": 1574856, "end": 2361332}, {"filename": "/rodir/cryoffear/gfx/decals/klotter5.tga", "start": 2361332, "end": 3147808}, {"filename": "/rodir/cryoffear/gfx/decals/klotter6.tga", "start": 3147808, "end": 3934284}, {"filename": "/rodir/cryoffear/gfx/decals/klotter7.tga", "start": 3934284, "end": 4720760}, {"filename": "/rodir/cryoffear/gfx/decals/klotter8.tga", "start": 4720760, "end": 5507236}, {"filename": "/rodir/cryoffear/gfx/decals/klotter9.tga", "start": 5507236, "end": 6293712}, {"filename": "/rodir/cryoffear/gfx/decals/leaves1.tga", "start": 6293712, "end": 6342908}, {"filename": "/rodir/cryoffear/gfx/decals/leaves2.tga", "start": 6342908, "end": 6539560}, {"filename": "/rodir/cryoffear/gfx/decals/leaves3.tga", "start": 6539560, "end": 6736212}, {"filename": "/rodir/cryoffear/gfx/decals/trail2.tga", "start": 6736212, "end": 7522688}, {"filename": "/rodir/cryoffear/gfx/env/blackbk.tga", "start": 7522688, "end": 7719314}, {"filename": "/rodir/cryoffear/gfx/env/blackdn.tga", "start": 7719314, "end": 7915940}, {"filename": "/rodir/cryoffear/gfx/env/blackft.tga", "start": 7915940, "end": 8112566}, {"filename": "/rodir/cryoffear/gfx/env/blacklf.tga", "start": 8112566, "end": 8309192}, {"filename": "/rodir/cryoffear/gfx/env/blackrt.tga", "start": 8309192, "end": 8505818}, {"filename": "/rodir/cryoffear/gfx/env/blackup.tga", "start": 8505818, "end": 8702444}, {"filename": "/rodir/cryoffear/maps/c_start.bsp", "start": 8702444, "end": 21795988}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/+0~fifts_lght01.dds", "start": 21795988, "end": 21799556}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/+0~white.dds", "start": 21799556, "end": 21800380}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/+a~fifts_lght01.dds", "start": 21800380, "end": 21803948}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/aaatrigger.dds", "start": 21803948, "end": 21804260}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/black.dds", "start": 21804260, "end": 21805084}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_aband11.dds", "start": 21805084, "end": 21848916}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_asfalt01.dds", "start": 21848916, "end": 21892748}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_asfaltside.dds", "start": 21892748, "end": 21901140}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_backdoor1.dds", "start": 21901140, "end": 21914636}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_balkongbig.dds", "start": 21914636, "end": 21925700}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_balkongbigS.dds", "start": 21925700, "end": 21927244}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_balkongmain.dds", "start": 21927244, "end": 21939692}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_basfloor1.dds", "start": 21939692, "end": 21983524}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_blurmetal.dds", "start": 21983524, "end": 21994588}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_bmfl_gt1.dds", "start": 21994588, "end": 22038420}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_bussh_4.dds", "start": 22038420, "end": 22054948}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_cretewall5.dds", "start": 22054948, "end": 22108436}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_cretewast.dds", "start": 22108436, "end": 22163940}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_cretewastave.dds", "start": 22163940, "end": 22219444}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_cretewastkl1.dds", "start": 22219444, "end": 22274948}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_cretewastkl2.dds", "start": 22274948, "end": 22330452}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_fonster3.dds", "start": 22330452, "end": 22336748}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_helpme1.dds", "start": 22336748, "end": 22380580}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_hogdbldoor1.dds", "start": 22380580, "end": 22413500}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_hogfence1big.dds", "start": 22413500, "end": 22457332}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_hogmur2B.dds", "start": 22457332, "end": 22486164}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_hogutwall1.dds", "start": 22486164, "end": 22529996}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_leaves.dds", "start": 22529996, "end": 22557476}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_matbordT.dds", "start": 22557476, "end": 22584956}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_matbordleg.dds", "start": 22584956, "end": 22586500}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_matbordwdS.dds", "start": 22586500, "end": 22589452}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_roof1.dds", "start": 22589452, "end": 22606004}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_roofblack.dds", "start": 22606004, "end": 22622556}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_screamfitta.dds", "start": 22622556, "end": 22666388}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_submove5.dds", "start": 22666388, "end": 22677468}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_tunnelceil.dds", "start": 22677468, "end": 22688532}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_tunnelwabig.dds", "start": 22688532, "end": 22743300}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_venteil.dds", "start": 22743300, "end": 22746172}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_vitmobel.dds", "start": 22746172, "end": 22752468}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c2_wood2ka.dds", "start": 22752468, "end": 22755244}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c3a2_light2.dds", "start": 22755244, "end": 22763124}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_asfaltside.dds", "start": 22763124, "end": 22771516}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_asfaltvag1.dds", "start": 22771516, "end": 22815348}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_asplattr.dds", "start": 22815348, "end": 22832452}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_blmetalli.dds", "start": 22832452, "end": 22876284}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_blood1.dds", "start": 22876284, "end": 22920116}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_blood2.dds", "start": 22920116, "end": 22963948}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_blurmetal.dds", "start": 22963948, "end": 22975012}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_brickwa1.dds", "start": 22975012, "end": 23002492}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_brunn1.dds", "start": 23002492, "end": 23007780}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_building1.dds", "start": 23007780, "end": 23182684}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_ceil1.dds", "start": 23182684, "end": 23196492}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_concrete1.dds", "start": 23196492, "end": 23240324}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_cretewall4.dds", "start": 23240324, "end": 23284156}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_diskhornT2.dds", "start": 23284156, "end": 23304804}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_door1.dds", "start": 23304804, "end": 23326796}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_door2.dds", "start": 23326796, "end": 23354260}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_door7.dds", "start": 23354260, "end": 23376252}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_dorrlistg.dds", "start": 23376252, "end": 23377620}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_drkmetal.dds", "start": 23377620, "end": 23421452}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_drkrstmetal.dds", "start": 23421452, "end": 23465284}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_elboxfront.dds", "start": 23465284, "end": 23476348}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_elboxside1.dds", "start": 23476348, "end": 23481956}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_elboxside2.dds", "start": 23481956, "end": 23487564}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_elboxtop.dds", "start": 23487564, "end": 23493172}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_generic.dds", "start": 23493172, "end": 23537004}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_grendflr.dds", "start": 23537004, "end": 23580836}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_hogglas1.dds", "start": 23580836, "end": 23591900}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_hogmarwa.dds", "start": 23591900, "end": 23607452}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_hogmur1B.dds", "start": 23607452, "end": 23640372}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_hogmur1S.dds", "start": 23640372, "end": 23648716}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_hogtrappaF1.dds", "start": 23648716, "end": 23652300}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_hogvagg1.dds", "start": 23652300, "end": 23707804}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_kokmetalO.dds", "start": 23707804, "end": 23728452}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_koksgolv2.dds", "start": 23728452, "end": 23762076}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_lampa2ljus.dds", "start": 23762076, "end": 23763764}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_lampa_toaF.dds", "start": 23763764, "end": 23765452}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_lampa_toaS.dds", "start": 23765452, "end": 23767140}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_lyktstolle.dds", "start": 23767140, "end": 23767628}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_matbordwd.dds", "start": 23767628, "end": 23795108}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_matbordwdS.dds", "start": 23795108, "end": 23798060}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_metalbrunn.dds", "start": 23798060, "end": 23803700}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_metallist.dds", "start": 23803700, "end": 23805244}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_nedercrete1.dds", "start": 23805244, "end": 23819108}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_rstmetal.dds", "start": 23819108, "end": 23862940}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_rstpipe.dds", "start": 23862940, "end": 23874020}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_stair.dds", "start": 23874020, "end": 23878284}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_stairfront.dds", "start": 23878284, "end": 23883924}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_stupror.dds", "start": 23883924, "end": 23893876}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_tapet1.dds", "start": 23893876, "end": 23922964}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_tapet3.dds", "start": 23922964, "end": 23952052}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_wawood.dds", "start": 23952052, "end": 23995884}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/c_wood3.dds", "start": 23995884, "end": 24024260}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/clip.dds", "start": 24024260, "end": 24024572}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_asplattr.dds", "start": 24024572, "end": 24068404}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_bricks3.dds", "start": 24068404, "end": 24090396}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_brickwa1.dds", "start": 24090396, "end": 24134228}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_brunn1.dds", "start": 24134228, "end": 24145292}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_cretee1.dds", "start": 24145292, "end": 24189124}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_cretee2.dds", "start": 24189124, "end": 24232956}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_cretekl2.dds", "start": 24232956, "end": 24276788}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_cretewl5.dds", "start": 24276788, "end": 24364316}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_cretewt.dds", "start": 24364316, "end": 24408148}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_cretkl1.dds", "start": 24408148, "end": 24451980}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_nrcrete1.dds", "start": 24451980, "end": 24473972}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_stair.dds", "start": 24473972, "end": 24476860}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_stenmur.dds", "start": 24476860, "end": 24520692}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_stupror.dds", "start": 24520692, "end": 24526332}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_tlflb.dds", "start": 24526332, "end": 24570164}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/cn_tlwabig.dds", "start": 24570164, "end": 24613996}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/null.dds", "start": 24613996, "end": 24614308}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/origin.dds", "start": 24614308, "end": 24614620}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/po_buildgen.dds", "start": 24614620, "end": 24625684}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/po_mtldrkblue.dds", "start": 24625684, "end": 24636748}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/po_mtlltnrst.dds", "start": 24636748, "end": 24647812}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/r_brickhaha.dds", "start": 24647812, "end": 24658876}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/r_exit1.dds", "start": 24658876, "end": 24661748}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/r_exit2.dds", "start": 24661748, "end": 24664620}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/r_finwood.dds", "start": 24664620, "end": 24672964}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/r_fortavla1.dds", "start": 24672964, "end": 24716796}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/r_gardedoorwood.dds", "start": 24716796, "end": 24735412}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/r_lyktstolpe.dds", "start": 24735412, "end": 24735900}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/r_sthlight.dds", "start": 24735900, "end": 24736724}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/r_tsgarage.dds", "start": 24736724, "end": 24747788}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/subway_lights.dds", "start": 24747788, "end": 24748628}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/{c2_hogfence1.dds", "start": 24748628, "end": 24775492}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/{c_fence.dds", "start": 24775492, "end": 24794788}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/{c_fenceba1.dds", "start": 24794788, "end": 24816788}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/{c_fenceba2.dds", "start": 24816788, "end": 24838788}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/{c_fencebig.dds", "start": 24838788, "end": 24915428}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/{invisible.dds", "start": 24915428, "end": 24915924}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/{r_list2.dds", "start": 24915924, "end": 24933252}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/~spotgreen.dds", "start": 24933252, "end": 24933564}, {"filename": "/rodir/cryoffear/materials/maps/c_start.bsp/~spotred.dds", "start": 24933564, "end": 24933876}, {"filename": "/rodir/cryoffear/models/Props/Blandat/crows.mdl", "start": 24933876, "end": 25016712}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/baslampa.mdl", "start": 25016712, "end": 25101792}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/lysrorreal.mdl", "start": 25101792, "end": 25380368}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/pet_bottle.mdl", "start": 25380368, "end": 25638888}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/skitpobord2.mdl", "start": 25638888, "end": 25801232}, {"filename": "/rodir/cryoffear/models/Props/InomhusD/wine_bottle.mdl", "start": 25801232, "end": 26140320}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/bag3.mdl", "start": 26140320, "end": 26411200}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/bag4.mdl", "start": 26411200, "end": 26682148}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/padlock_lo.mdl", "start": 26682148, "end": 26708304}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/sandlada.mdl", "start": 26708304, "end": 26952912}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/selbox.mdl", "start": 26952912, "end": 26978060}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/skrap.mdl", "start": 26978060, "end": 27553236}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/soptunna.mdl", "start": 27553236, "end": 28022188}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/tunnellampaon1.mdl", "start": 28022188, "end": 28047160}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/tunnellampaon2.mdl", "start": 28047160, "end": 28052904}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/bigtree1.mdl", "start": 28052904, "end": 28693844}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/bigtree2.mdl", "start": 28693844, "end": 29334608}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/buske.mdl", "start": 29334608, "end": 29546708}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/nakettrad3.mdl", "start": 29546708, "end": 30296428}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/nakettrad4.mdl", "start": 30296428, "end": 30930608}, {"filename": "/rodir/cryoffear/models/Props/fpsc/dirty_bucket.mdl", "start": 30930608, "end": 30952960}, {"filename": "/rodir/cryoffear/models/Props/sky_sphere4.mdl", "start": 30952960, "end": 31258184}, {"filename": "/rodir/cryoffear/models/cutscene/blacker.mdl", "start": 31258184, "end": 31559848}, {"filename": "/rodir/cryoffear/models/cutscene/both.mdl", "start": 31559848, "end": 33671232}, {"filename": "/rodir/cryoffear/models/cutscene/hammer_floor.mdl", "start": 33671232, "end": 34263260}, {"filename": "/rodir/cryoffear/models/cutscene/mobileprop.mdl", "start": 34263260, "end": 36184592}, {"filename": "/rodir/cryoffear/models/cutscene/player3.mdl", "start": 36184592, "end": 38638388}, {"filename": "/rodir/cryoffear/models/cutscene/simon_clothes.mdl", "start": 38638388, "end": 39980008}, {"filename": "/rodir/cryoffear/models/cutscene/simon_clothesm.mdl", "start": 39980008, "end": 41321940}, {"filename": "/rodir/cryoffear/models/cutscene/simon_talk.mdl", "start": 41321940, "end": 43923880}, {"filename": "/rodir/cryoffear/models/cutscene/slower_arm_door.mdl", "start": 43923880, "end": 44245184}, {"filename": "/rodir/cryoffear/models/cutscene/slowerdead.mdl", "start": 44245184, "end": 45433216}, {"filename": "/rodir/cryoffear/models/developer_commentary.mdl", "start": 45433216, "end": 45600772}, {"filename": "/rodir/cryoffear/models/items/cassette_tape.mdl", "start": 45600772, "end": 45647352}, {"filename": "/rodir/cryoffear/models/items/package.mdl", "start": 45647352, "end": 45913060}, {"filename": "/rodir/cryoffear/models/items/padlock.mdl", "start": 45913060, "end": 46211560}, {"filename": "/rodir/cryoffear/models/items/w_nightvision.mdl", "start": 46211560, "end": 46494996}, {"filename": "/rodir/cryoffear/models/ladder_climb.mdl", "start": 46494996, "end": 47509456}, {"filename": "/rodir/cryoffear/models/null.mdl", "start": 47509456, "end": 47511324}, {"filename": "/rodir/cryoffear/models/slower.mdl", "start": 47511324, "end": 51079688}, {"filename": "/rodir/cryoffear/models/weapons/axe/w_axe.mdl", "start": 51079688, "end": 51355292}, {"filename": "/rodir/cryoffear/models/weapons/booklaser/w_booklaser.mdl", "start": 51355292, "end": 51624716}, {"filename": "/rodir/cryoffear/models/weapons/famas/w_famas.mdl", "start": 51624716, "end": 52230872}, {"filename": "/rodir/cryoffear/models/weapons/mp5/w_mp5.mdl", "start": 52230872, "end": 53574228}, {"filename": "/rodir/cryoffear/mp3/commentary/Andreas/start_1.wav", "start": 53574228, "end": 55948888, "audio": 1}, {"filename": "/rodir/cryoffear/mp3/commentary/James/start_2.wav", "start": 55948888, "end": 59101370, "audio": 1}, {"filename": "/rodir/cryoffear/mp3/commentary/James/start_3.wav", "start": 59101370, "end": 63277956, "audio": 1}, {"filename": "/rodir/cryoffear/mp3/commentary/James/start_j1.wav", "start": 63277956, "end": 64756774, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/city_ambientscape1.wav", "start": 64756774, "end": 67210886, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/crow2.wav", "start": 67210886, "end": 67271726, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/fan_loop1.wav", "start": 67271726, "end": 67560374, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/flickering_light.wav", "start": 67560374, "end": 67746074, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/hit1.wav", "start": 67746074, "end": 67841162, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/new_chapter.wav", "start": 67841162, "end": 68135996, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/sewerdrips.wav", "start": 68135996, "end": 69185984, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/tunnelnoise.wav", "start": 69185984, "end": 71974146, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/wind2.wav", "start": 71974146, "end": 72109658, "audio": 1}, {"filename": "/rodir/cryoffear/sound/aompa/scream22.wav", "start": 72109658, "end": 72136740, "audio": 1}, {"filename": "/rodir/cryoffear/sound/buttons/button5.wav", "start": 72136740, "end": 72158706, "audio": 1}, {"filename": "/rodir/cryoffear/sound/buttons/package_pick.wav", "start": 72158706, "end": 72183856, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step1.wav", "start": 72183856, "end": 72189838, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step2.wav", "start": 72189838, "end": 72196714, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step3.wav", "start": 72196714, "end": 72202650, "audio": 1}, {"filename": "/rodir/cryoffear/sound/common/npc_step4.wav", "start": 72202650, "end": 72210850, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/door_creak.wav", "start": 72210850, "end": 72244252, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/hammer_pickup.wav", "start": 72244252, "end": 72261420, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/simon_walk_past.wav", "start": 72261420, "end": 72421832, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/slower_breathe.wav", "start": 72421832, "end": 72755524, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/slower_walk.wav", "start": 72755524, "end": 72914570, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/cought1.wav", "start": 72914570, "end": 72952672, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/doorclose.wav", "start": 72952672, "end": 72998184, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/lockeddoor.wav", "start": 72998184, "end": 73053372, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/pickmobile.wav", "start": 73053372, "end": 73070264, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/punch1.wav", "start": 73070264, "end": 73079598, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/raise1.wav", "start": 73079598, "end": 73100126, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/raise2.wav", "start": 73100126, "end": 73110380, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/sms_signal1.wav", "start": 73110380, "end": 73127654, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/step1.wav", "start": 73127654, "end": 73134816, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/start/step2.wav", "start": 73134816, "end": 73142506, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doormove1.wav", "start": 73142506, "end": 73192852, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doormove5.wav", "start": 73192852, "end": 73390774, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doormove6.wav", "start": 73390774, "end": 73457456, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doorstop5.wav", "start": 73457456, "end": 73542196, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/doorstop6.wav", "start": 73542196, "end": 73594238, "audio": 1}, {"filename": "/rodir/cryoffear/sound/doors/shutter_locked.wav", "start": 73594238, "end": 73616346, "audio": 1}, {"filename": "/rodir/cryoffear/sound/items/padl_turn.wav", "start": 73616346, "end": 73640758, "audio": 1}, {"filename": "/rodir/cryoffear/sound/items/padl_unlock.wav", "start": 73640758, "end": 73714552, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/hammer_miss1.wav", "start": 73714552, "end": 73718846, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/hammer_miss2.wav", "start": 73718846, "end": 73723576, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/hammer_strike1.wav", "start": 73723576, "end": 73738666, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/hammer_strike2.wav", "start": 73738666, "end": 73753756, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/hammer_strike3.wav", "start": 73753756, "end": 73768846, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/hammer_strike_wall1.wav", "start": 73768846, "end": 73778164, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/hammer_strike_wall2.wav", "start": 73778164, "end": 73796052, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/hammer_strike_wall3.wav", "start": 73796052, "end": 73804544, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/head_gore.wav", "start": 73804544, "end": 73999018, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/k_crawl1.wav", "start": 73999018, "end": 74017856, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/k_crawl2.wav", "start": 74017856, "end": 74049248, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/k_crawl3.wav", "start": 74049248, "end": 74080212, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/k_crawl4.wav", "start": 74080212, "end": 74109006, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/k_crawl5.wav", "start": 74109006, "end": 74137386, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/k_crawl6.wav", "start": 74137386, "end": 74168856, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/k_crawl7.wav", "start": 74168856, "end": 74197086, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/scream1.wav", "start": 74197086, "end": 74226664, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/slower_alert10.wav", "start": 74226664, "end": 74261020, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/slower_alert20.wav", "start": 74261020, "end": 74317168, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/slower_alert30.wav", "start": 74317168, "end": 74366884, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/slower_attack1.wav", "start": 74366884, "end": 74404572, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/slower_attack2.wav", "start": 74404572, "end": 74432516, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/slower_pain1.wav", "start": 74432516, "end": 74450460, "audio": 1}, {"filename": "/rodir/cryoffear/sound/slower/slower_pain2.wav", "start": 74450460, "end": 74490434, "audio": 1}, {"filename": "/rodir/cryoffear/sound/subtitles/paining.wav", "start": 74490434, "end": 74661172, "audio": 1}, {"filename": "/rodir/cryoffear/sound/subtitles/start/sub1.wav", "start": 74661172, "end": 74706674, "audio": 1}, {"filename": "/rodir/cryoffear/sound/subtitles/start/sub2.wav", "start": 74706674, "end": 74921956, "audio": 1}, {"filename": "/rodir/cryoffear/sound/subtitles/start/sub4.wav", "start": 74921956, "end": 75027918, "audio": 1}, {"filename": "/rodir/cryoffear/sound/subtitles/start/sub5.wav", "start": 75027918, "end": 75045858, "audio": 1}, {"filename": "/rodir/cryoffear/sound/subtitles/start/sub6.wav", "start": 75045858, "end": 75084600, "audio": 1}, {"filename": "/rodir/cryoffear/sound/subtitles/sub1.wav", "start": 75084600, "end": 75181426, "audio": 1}, {"filename": "/rodir/cryoffear/sound/subtitles/sub2.wav", "start": 75181426, "end": 75275948, "audio": 1}, {"filename": "/rodir/cryoffear/sound/subtitles/sub3.wav", "start": 75275948, "end": 75310550, "audio": 1}, {"filename": "/rodir/cryoffear/sound/weapons/item_get.wav", "start": 75310550, "end": 75332660, "audio": 1}], "remote_package_size": 75332660});

  })();
