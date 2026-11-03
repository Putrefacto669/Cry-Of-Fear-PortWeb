
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
      var PACKAGE_NAME = '/root/cof-audits/extras-20261101/dist-fourth/packs/extras.data';
      var REMOTE_PACKAGE_BASE = 'extras.data';
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
Module['FS_createPath']("/rodir/cryoffear", "models", true, true);
Module['FS_createPath']("/rodir/cryoffear/models", "costumes", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/costumes", "AoM", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/costumes", "Awesome", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/costumes", "Black_Metal", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/costumes", "Camo", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/costumes", "HLC", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/costumes", "Hello_Kitty", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/costumes", "Leatherhoff", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/costumes", "ModDB", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/costumes", "Sick_Simon", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/costumes", "Team_Psykskallar", true, true);
Module['FS_createPath']("/rodir/cryoffear/models/costumes", "Twitcher", true, true);

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
          }          Module['removeRunDependency']('datafile_/root/cof-audits/extras-20261101/dist-fourth/packs/extras.data');

      };
      Module['addRunDependency']('datafile_/root/cof-audits/extras-20261101/dist-fourth/packs/extras.data');

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
    loadPackage({"files": [{"filename": "/rodir/cryoffear/models/costumes/AoM/AoM_Hoodie.TGA", "start": 0, "end": 786476}, {"filename": "/rodir/cryoffear/models/costumes/AoM/AoM_Jeans.tga", "start": 786476, "end": 1572952}, {"filename": "/rodir/cryoffear/models/costumes/Awesome/Awesome_Hoodie.tga", "start": 1572952, "end": 2359428}, {"filename": "/rodir/cryoffear/models/costumes/Awesome/Awesome_Jeans.TGA", "start": 2359428, "end": 3145904}, {"filename": "/rodir/cryoffear/models/costumes/Awesome/Awesome_Sleeve.tga", "start": 3145904, "end": 3932380}, {"filename": "/rodir/cryoffear/models/costumes/Black_Metal/Black_Metal_Face.TGA", "start": 3932380, "end": 4718856}, {"filename": "/rodir/cryoffear/models/costumes/Black_Metal/Black_Metal_Hoodie.TGA", "start": 4718856, "end": 5505332}, {"filename": "/rodir/cryoffear/models/costumes/Black_Metal/Black_Metal_Jeans.TGA", "start": 5505332, "end": 6291808}, {"filename": "/rodir/cryoffear/models/costumes/Camo/Camo_Hoodie.tga", "start": 6291808, "end": 7078284}, {"filename": "/rodir/cryoffear/models/costumes/Camo/Camo_Sleeve.tga", "start": 7078284, "end": 7864760}, {"filename": "/rodir/cryoffear/models/costumes/HLC/HLC_Hoodie.tga", "start": 7864760, "end": 8651236}, {"filename": "/rodir/cryoffear/models/costumes/HLC/HLC_Sleeve.TGA", "start": 8651236, "end": 9437712}, {"filename": "/rodir/cryoffear/models/costumes/Hello_Kitty/Hello_Kitty_Hoodie.tga", "start": 9437712, "end": 10224188}, {"filename": "/rodir/cryoffear/models/costumes/Hello_Kitty/Hello_Kitty_Jeans.tga", "start": 10224188, "end": 11010664}, {"filename": "/rodir/cryoffear/models/costumes/Hello_Kitty/Hello_Kitty_Sleeve.TGA", "start": 11010664, "end": 11797140}, {"filename": "/rodir/cryoffear/models/costumes/Leatherhoff/Leatherhoff_Hoodie.tga", "start": 11797140, "end": 12583616}, {"filename": "/rodir/cryoffear/models/costumes/Leatherhoff/Leatherhoff_Jeans.tga", "start": 12583616, "end": 13370092}, {"filename": "/rodir/cryoffear/models/costumes/Leatherhoff/Leatherhoff_Sleeve.tga", "start": 13370092, "end": 14156568}, {"filename": "/rodir/cryoffear/models/costumes/ModDB/ModDB_Hoodie.tga", "start": 14156568, "end": 14943044}, {"filename": "/rodir/cryoffear/models/costumes/ModDB/ModDB_Sleeve.tga", "start": 14943044, "end": 15729520}, {"filename": "/rodir/cryoffear/models/costumes/Sick_Simon/Sick_Simon_Face.tga", "start": 15729520, "end": 16515996}, {"filename": "/rodir/cryoffear/models/costumes/Sick_Simon/Sick_Simon_Hoodie.TGA", "start": 16515996, "end": 17302472}, {"filename": "/rodir/cryoffear/models/costumes/Sick_Simon/Sick_Simon_Jeans.TGA", "start": 17302472, "end": 18088948}, {"filename": "/rodir/cryoffear/models/costumes/Sick_Simon/Sick_Simon_Sleeve.tga", "start": 18088948, "end": 18875424}, {"filename": "/rodir/cryoffear/models/costumes/Team_Psykskallar/Team_Psykskallar_Hoodie.tga", "start": 18875424, "end": 19661900}, {"filename": "/rodir/cryoffear/models/costumes/Twitcher/Twitcher_Face.TGA", "start": 19661900, "end": 20448376}, {"filename": "/rodir/cryoffear/models/costumes/Twitcher/Twitcher_Hoodie.TGA", "start": 20448376, "end": 21234852}, {"filename": "/rodir/cryoffear/models/costumes/Twitcher/Twitcher_Jeans.TGA", "start": 21234852, "end": 22021328}, {"filename": "/rodir/cryoffear/models/costumes/Twitcher/Twitcher_Sleeve.TGA", "start": 22021328, "end": 22807804}], "remote_package_size": 22807804});

  })();
