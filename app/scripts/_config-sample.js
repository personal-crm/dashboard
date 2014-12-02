var Config = (function(){
  'use strict';
  var cfg = {
    appVersion: '~',
    debug: true, // to toggle features between dev & prod
    verbose: true, // should log in console more infos
    track: false, // should send tracking events to a server
    storage: true, // should save data to browser storage
    storagePrefix: 'app-', // prefix all stoarge entries with this prefix
    emailSupport: '',
    backendUrl: '',
    parse: {
      applicationId: 'YOUR_PARSE_APPLICATION_ID',
      restApiKey: 'YOUR_PARSE_REST_API_KEY'
    }
  };
  return cfg;
})();
