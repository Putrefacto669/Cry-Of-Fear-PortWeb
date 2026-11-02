
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
      var PACKAGE_NAME = '/root/cof-audits/phone-hud-20261101/dist-controls/packs/map_c_intro.data';
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
Module['FS_createPath']("/rodir/cryoffear/gfx", "decals", true, true);
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
          }          Module['removeRunDependency']('datafile_/root/cof-audits/phone-hud-20261101/dist-controls/packs/map_c_intro.data');

      };
      Module['addRunDependency']('datafile_/root/cof-audits/phone-hud-20261101/dist-controls/packs/map_c_intro.data');

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
    loadPackage({"files": [{"filename": "/rodir/cryoffear/aurora/cof_leaves.aur", "start": 0, "end": 676}, {"filename": "/rodir/cryoffear/gfx/decals/klotter2.tga", "start": 676, "end": 787152}, {"filename": "/rodir/cryoffear/gfx/decals/leaves2.tga", "start": 787152, "end": 983804}, {"filename": "/rodir/cryoffear/gfx/decals/leaves3.tga", "start": 983804, "end": 1180456}, {"filename": "/rodir/cryoffear/gfx/env/blackbk.tga", "start": 1180456, "end": 1377082}, {"filename": "/rodir/cryoffear/gfx/env/blackdn.tga", "start": 1377082, "end": 1573708}, {"filename": "/rodir/cryoffear/gfx/env/blackft.tga", "start": 1573708, "end": 1770334}, {"filename": "/rodir/cryoffear/gfx/env/blacklf.tga", "start": 1770334, "end": 1966960}, {"filename": "/rodir/cryoffear/gfx/env/blackrt.tga", "start": 1966960, "end": 2163586}, {"filename": "/rodir/cryoffear/gfx/env/blackup.tga", "start": 2163586, "end": 2360212}, {"filename": "/rodir/cryoffear/maps/c_intro.bsp", "start": 2360212, "end": 9672099}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/+0c_rainwindow.dds", "start": 9672099, "end": 9715931}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/+0~white.dds", "start": 9715931, "end": 9716755}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/+1c_rainwindow.dds", "start": 9716755, "end": 9760587}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/+2c_rainwindow.dds", "start": 9760587, "end": 9804419}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/+3c_rainwindow.dds", "start": 9804419, "end": 9848251}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/+4c_rainwindow.dds", "start": 9848251, "end": 9892083}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/+5c_rainwindow.dds", "start": 9892083, "end": 9935915}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/+6c_rainwindow.dds", "start": 9935915, "end": 9979747}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/+7c_rainwindow.dds", "start": 9979747, "end": 10023579}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/NULL.dds", "start": 10023579, "end": 10023891}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/aaatrigger.dds", "start": 10023891, "end": 10024203}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/black.dds", "start": 10024203, "end": 10025027}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_affaer2.dds", "start": 10025027, "end": 10112555}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_affaer5.dds", "start": 10112555, "end": 10200083}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_buildingp1.dds", "start": 10200083, "end": 10374987}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_buildingp2.dds", "start": 10374987, "end": 10549891}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_cretestripe2.dds", "start": 10549891, "end": 10578723}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_gabyggn2s.dds", "start": 10578723, "end": 10589787}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_hogfence1big.dds", "start": 10589787, "end": 10633619}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_introduction.dds", "start": 10633619, "end": 10808523}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_kokmetalO.dds", "start": 10808523, "end": 10829171}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_koktextur.dds", "start": 10829171, "end": 10836171}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_lyktstolle.dds", "start": 10836171, "end": 10836659}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_newrails.dds", "start": 10836659, "end": 10880491}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_roof1.dds", "start": 10880491, "end": 10897043}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_roofblack.dds", "start": 10897043, "end": 10913595}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_sublol2.dds", "start": 10913595, "end": 10957427}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_trottoka.dds", "start": 10957427, "end": 10960027}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c2_wood2.dds", "start": 10960027, "end": 10988403}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_asfaltvag2.dds", "start": 10988403, "end": 11163307}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_asfaltvag3.dds", "start": 11163307, "end": 11338211}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_basror.dds", "start": 11338211, "end": 11343819}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_blurmetal.dds", "start": 11343819, "end": 11354883}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_buildwhole2.dds", "start": 11354883, "end": 11529787}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_buildwhole3.dds", "start": 11529787, "end": 11682867}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_cretewall5.dds", "start": 11682867, "end": 11736355}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_glasssharp.dds", "start": 11736355, "end": 11780187}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_grass02.dds", "start": 11780187, "end": 11824019}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_hogskylt2.dds", "start": 11824019, "end": 11827251}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_jord2.dds", "start": 11827251, "end": 11871083}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_k1_side2.dds", "start": 11871083, "end": 11887611}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_kokmetalO.dds", "start": 11887611, "end": 11908259}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_lysrorlampaof.dds", "start": 11908259, "end": 11913211}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_lysrorlampaon.dds", "start": 11913211, "end": 11918163}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_metalbrunn.dds", "start": 11918163, "end": 11923803}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_obbsstwa1.dds", "start": 11923803, "end": 12055027}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_rstblpipe.dds", "start": 12055027, "end": 12056571}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_rstmetal.dds", "start": 12056571, "end": 12100403}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_stenmur2.dds", "start": 12100403, "end": 12127883}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tabanawa1.dds", "start": 12127883, "end": 12171715}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbana_F.dds", "start": 12171715, "end": 12215547}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbana_S1.dds", "start": 12215547, "end": 12259379}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbana_S2.dds", "start": 12259379, "end": 12305995}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbana_S3.dds", "start": 12305995, "end": 12349827}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbana_T.dds", "start": 12349827, "end": 12371819}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanadoors.dds", "start": 12371819, "end": 12432059}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanagolv.dds", "start": 12432059, "end": 12443123}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanaguls.dds", "start": 12443123, "end": 12451467}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanakant.dds", "start": 12451467, "end": 12452307}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanaorange.dds", "start": 12452307, "end": 12520755}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanapost1.dds", "start": 12520755, "end": 12523643}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanapost10.dds", "start": 12523643, "end": 12530643}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanapost2.dds", "start": 12530643, "end": 12533531}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanapost3.dds", "start": 12533531, "end": 12536419}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanapost4.dds", "start": 12536419, "end": 12539307}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanapost5.dds", "start": 12539307, "end": 12542195}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanapost6.dds", "start": 12542195, "end": 12545083}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanapost7.dds", "start": 12545083, "end": 12552083}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanapost8.dds", "start": 12552083, "end": 12559083}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanapost9.dds", "start": 12559083, "end": 12566083}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanarals.dds", "start": 12566083, "end": 12609915}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanasits.dds", "start": 12609915, "end": 12615203}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_tbanawa2.dds", "start": 12615203, "end": 12659035}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/c_vitmobel.dds", "start": 12659035, "end": 12665331}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/clip.dds", "start": 12665331, "end": 12665643}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/cn_asplattr.dds", "start": 12665643, "end": 12709475}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/cn_cretewl5.dds", "start": 12709475, "end": 12797003}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/cn_tbana_S1.dds", "start": 12797003, "end": 12840835}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/cn_tbana_S2.dds", "start": 12840835, "end": 12887451}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/origin.dds", "start": 12887451, "end": 12887763}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/r_lyktstolpe.dds", "start": 12887763, "end": 12888251}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/r_trkredside1.dds", "start": 12888251, "end": 12907555}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/r_whitethings.dds", "start": 12907555, "end": 12913851}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/{c2_treed2.dds", "start": 12913851, "end": 13088779}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/{c_fencebig.dds", "start": 13088779, "end": 13165419}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/{c_kraftelS.dds", "start": 13165419, "end": 13187451}, {"filename": "/rodir/cryoffear/materials/maps/c_intro.bsp/{c_treetops.dds", "start": 13187451, "end": 13253163}, {"filename": "/rodir/cryoffear/models/Props/Blandat/byggnader.mdl", "start": 13253163, "end": 14429047}, {"filename": "/rodir/cryoffear/models/Props/Fordon/aud.mdl", "start": 14429047, "end": 14708731}, {"filename": "/rodir/cryoffear/models/Props/Fordon/aud_3.mdl", "start": 14708731, "end": 14988415}, {"filename": "/rodir/cryoffear/models/Props/Fordon/foretag.mdl", "start": 14988415, "end": 15532443}, {"filename": "/rodir/cryoffear/models/Props/Fordon/foretag_2.mdl", "start": 15532443, "end": 16076471}, {"filename": "/rodir/cryoffear/models/Props/Fordon/polisbil.mdl", "start": 16076471, "end": 16600223}, {"filename": "/rodir/cryoffear/models/Props/Fordon/vari_2.mdl", "start": 16600223, "end": 16856051}, {"filename": "/rodir/cryoffear/models/Props/Fordon/vari_3.mdl", "start": 16856051, "end": 17111879}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/cykel2.mdl", "start": 17111879, "end": 17595303}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/cykel3.mdl", "start": 17595303, "end": 18078763}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/sandlada.mdl", "start": 18078763, "end": 18323371}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/skrap.mdl", "start": 18323371, "end": 18898547}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/soptunna.mdl", "start": 18898547, "end": 19367499}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/stadlyktrund3.mdl", "start": 19367499, "end": 19592999}, {"filename": "/rodir/cryoffear/models/Props/UtomhusD/stadlyktrund4.mdl", "start": 19592999, "end": 19675283}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/bigtree1.mdl", "start": 19675283, "end": 20316223}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/buske.mdl", "start": 20316223, "end": 20528323}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/granmodel.mdl", "start": 20528323, "end": 21461307}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/granmodel2.mdl", "start": 21461307, "end": 22400291}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/lowpolygran.mdl", "start": 22400291, "end": 22535119}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/nakettrad4.mdl", "start": 22535119, "end": 23169299}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/parktrad2.mdl", "start": 23169299, "end": 23788579}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/stortrad2.mdl", "start": 23788579, "end": 24350207}, {"filename": "/rodir/cryoffear/models/Props/Vaxter/tall.mdl", "start": 24350207, "end": 25270199}, {"filename": "/rodir/cryoffear/models/Props/fpsc/cement_heap.mdl", "start": 25270199, "end": 25339303}, {"filename": "/rodir/cryoffear/models/Props/fpsc/compressor.mdl", "start": 25339303, "end": 25614611}, {"filename": "/rodir/cryoffear/models/Props/fpsc/conduits.mdl", "start": 25614611, "end": 25687831}, {"filename": "/rodir/cryoffear/models/Props/sky_blixt.mdl", "start": 25687831, "end": 26862319}, {"filename": "/rodir/cryoffear/models/Props/sky_sphere.mdl", "start": 26862319, "end": 27167947}, {"filename": "/rodir/cryoffear/models/cutscene/aud_cut.mdl", "start": 27167947, "end": 27448451}, {"filename": "/rodir/cryoffear/models/cutscene/kattscene.mdl", "start": 27448451, "end": 27759039}, {"filename": "/rodir/cryoffear/models/cutscene/player3.mdl", "start": 27759039, "end": 30212835}, {"filename": "/rodir/cryoffear/models/cutscene/vari_cut.mdl", "start": 30212835, "end": 30467643}, {"filename": "/rodir/cryoffear/sound/ambience/bil1.wav", "start": 30467643, "end": 30645309, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/bil2.wav", "start": 30645309, "end": 30971949, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/bilar.wav", "start": 30971949, "end": 32830437, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/coffontappear.wav", "start": 32830437, "end": 33058883, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/loud_thunder.wav", "start": 33058883, "end": 33189835, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/rain_urban.wav", "start": 33189835, "end": 33912081, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/tagljud1.wav", "start": 33912081, "end": 34401185, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/train_by.wav", "start": 34401185, "end": 34967573, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/vind2.wav", "start": 34967573, "end": 35717759, "audio": 1}, {"filename": "/rodir/cryoffear/sound/ambience/wind2.wav", "start": 35717759, "end": 35853271, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/train.wav", "start": 35853271, "end": 36451583, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/train2.wav", "start": 36451583, "end": 39556163, "audio": 1}, {"filename": "/rodir/cryoffear/sound/cutscene/tunnelbanaarr.wav", "start": 39556163, "end": 40483065, "audio": 1}, {"filename": "/rodir/cryoffear/sound/subtitles/intro/sub0.wav", "start": 40483065, "end": 41940623, "audio": 1}], "remote_package_size": 41940623});

  })();
