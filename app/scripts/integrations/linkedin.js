angular.module('app')

.factory('LinkedinSrv', function($http, ParseUtils){
  'use strict';
  var service = ParseUtils.createCrud('/classes/Linkedin');
  service.search = function(backendUrl, firstName, lastName){
    return $http.get(backendUrl+'/api/v1/scrapers/linkedin/profiles/search?firstName='+encodeURIComponent(firstName)+'&lastName='+encodeURIComponent(lastName)).then(function(result){
      if(result && result.data && result.data.data && result.data.data.results){
        return result.data.data.results;
      }
    });
  };
  service.fetch = function(backendUrl, profileUrl){
    return $http.get(backendUrl+'/api/v1/scrapers/linkedin/profile?url='+encodeURI(profileUrl)).then(function(result){
      if(result && result.data && result.data.data){
        return result.data.data;
      }
    });
  };
  service.scrape = function(backendUrl, startUrl, _ignoreUrls){
    var ignoreUrls = _ignoreUrls || [];
    console.log('ignoreUrls', ignoreUrls);
    return $http.post(backendUrl+'/api/v1/scrapers/linkedin/profiles/related?startUrl='+encodeURI(startUrl)+'&max=20', {ignore: ignoreUrls}).then(function(result){
      if(result && result.data && result.data.data && result.data.data.scraped){
        return result.data.data.scraped;
      }
    });
  };
  service.getWithId   = function(id)  { return service.findOne({id: id});   };
  service.getWithUrl  = function(url) { return service.findOne({url: url}); };
  return service;
})

.controller('LinkedinScraperCtrl', function($scope, UserSrv, LinkedinSrv, ContactSrv){
  var data = {}, fn = {};
  $scope.data = data;
  $scope.fn = fn;

  data.scraper = {
    startUrl: '',
    scraping: false,
    results: []
  };

  UserSrv.getCurrent().then(function(user){
    data.user = user;
  });
  data.contacts = [];
  ContactSrv.getAll().then(function(contacts){
    data.contacts = contacts;
  });

  fn.scrape = function(startUrl){
    data.scraper.startUrl = startUrl;
    data.scraper.scraping = true;
    delete data.scraper.error;
    var ignoreUrls = [];
    for(var i in data.contacts){
      if(data.contacts[i].social && data.contacts[i].social.linkedin && data.contacts[i].social.linkedin.url){
        ignoreUrls.push(data.contacts[i].social.linkedin.url);
        if(data.contacts[i].social.linkedin.urls){
          for(var j in data.contacts[i].social.linkedin.urls){
            ignoreUrls.push(data.contacts[i].social.linkedin.urls[j]);
          }
        }
      }
    }
    for(var k in data.scraper.results){
      if(data.scraper.results[k].url){
        ignoreUrls.push(data.scraper.results[k].url);
      }
    }
    ignoreUrls = _.uniq(ignoreUrls);
    LinkedinSrv.scrape(data.user.secrets.linkedinScraperUrl.value, startUrl, ignoreUrls).then(function(results){
      for(var i in results){
        if(!_.find(data.scraper.results, {id: results[i].id})){
          data.scraper.results.push(results[i]);
        }
      }
      data.scraper.scraping = false;
    }, function(err){
      console.log('err', err);
      data.scraper.error = 'error in scraping :(';
      data.scraper.scraping = false;
    });
  };
  fn.addToTargets = function(profile){
    profile._meta = {loading: true};

    delete profile._meta;
  };
})

.factory('LinkedinApiSrv', function($q, $timeout, $window){
  'use strict';
  var libLoaded, onLoaded;
  var service = {
    loadLibrary: loadLibrary,
    connect: connect,
    getProfile: getProfile,
    getConnections: getConnections,
    getPeopleSearch: getPeopleSearch,
  };

  function loadLibrary(apiKey, scope){
    libLoaded = $q.defer();
    onLoaded = libLoaded.promise;
    var libTimeout = $timeout(function(){
      _linkedinLibLoadedFail('reason');
    }, 3000);

    $window.IN = null;
    $.getScript('//platform.linkedin.com/in.js?async=true').done(function(){
      $timeout.cancel(libTimeout);
      if($window.IN){
        $window.IN.init({
          onLoad: 'linkedinLibLoaded',
          api_key: apiKey,
          credentials_cookie: true,
          scope: scope.join(' ')
        });
      } else {
        _linkedinLibLoadedFail('not initialized');
      }
    }).fail(function(){
      _linkedinLibLoadedFail('network');
    });

    return onLoaded;
  }

  function connect(){
    return _libLoaded(function(){
      var defer = $q.defer();
      if($window.IN.User.isAuthorized()){
        defer.resolve();
      } else {
        $window.IN.User.authorize(function(){
          defer.resolve();
        });
      }
      return defer.promise;
    });
  }

  function getProfile(id, fields){
    return _libLoaded(function(){
      var defer = $q.defer();
      $window.IN.API.Profile(id).fields(fields).result(function(data){
        var user = data && Array.isArray(data.values) ? data.values[0] : null;
        if(user){
          defer.resolve(user);
        } else {
          defer.reject();
        }
      }).error(function(err){
        defer.reject(err);
      });
      return defer.promise;
    });
  }

  function getConnections(fields){
    return _libLoaded(function(){
      var defer = $q.defer();
      $window.IN.API.Connections('me').fields(fields).result(function(data){
        defer.resolve(data);
      }).error(function(err){
        defer.reject(err);
      });
      return defer.promise;
    });
  }

  /*
   * /!\
   * You must have Linkedin approval to perform people searches : https://developer.linkedin.com/documents/people-search-api
   * Moreover: Searches not providing first and last name have results limited to the member's immediate network only (1st or 2nd degree connections)
   */
  function getPeopleSearch(fields, searchParams){
    return _libLoaded(function(){
      var defer = $q.defer();
      $window.IN.API.PeopleSearch().fields(fields).params(searchParams).result(function(data){
        defer.resolve(data);
      }).error(function(err){
        defer.reject(err);
      });
      return defer.promise;
    });
  }

  // test if library is loaded
  function _libLoaded(fn){
    var defer = $q.defer();
    if($window.IN){
      defer.resolve(fn());
    } else {
      onLoaded.then(function(){
        if($window.IN){ defer.resolve(fn()); }
        else { defer.reject(); }
      }, function(){
        defer.reject();
      });
    }
    return defer.promise;
  }

  // called by linkedin when library is initialized
  $window.linkedinLibLoaded     = function(){ libLoaded.resolve(); };
  function _linkedinLibLoadedFail(reason){
    console.error('Fail to load linkedin lib ('+reason+') !!!');
    libLoaded.reject();
  }

  return service;
})

.controller('LinkedinApiCtrl', function($scope, LinkedinApiSrv, Config){
  'use strict';
  var data = {}, fn = {};
  $scope.data = data;
  $scope.fn = fn;

  data.scopes = ['r_basicprofile', 'r_fullprofile', 'r_emailaddress', 'r_network', 'r_contactinfo', 'w_messages', 'rw_groups', 'rw_nus', 'rw_company_admin'];
  // TODO: get apiKey from user !
  data.api = {
    key: Config.linkedin ? Config.linkedin.apiKey : '',
    scope: ['r_fullprofile', 'r_emailaddress', 'r_network']
  };
  data.status = {
    loading: false
  };

  // see https://developer.linkedin.com/documents/profile-fields
  var profileFields = [
    // basic profile
    'id',
    'picture-url',
    'first-name',
    'last-name',
    'headline',
    'location',
    'industry',
    'summary',
    'specialties',
    'positions',
    'num-connections',
    'relation-to-viewer',
    // with permission r_emailaddress
    'email-address',
    // with permission r_fullprofile
    'last-modified-timestamp',
    'associations',
    'interests',
    'publications',
    'skills',
    'certifications',
    'educations',
    'courses',
    'recommendations-received',
    'following',
    'date-of-birth',
    // with permission r_network
    'connections'
  ];

  fn.loadAndConnectToLinkedin = function(){
    data.status.loading = true;
    LinkedinApiSrv.loadLibrary(data.api.key, data.api.scope).then(function(){
      return LinkedinApiSrv.connect();
    }).then(function(){
      LinkedinApiSrv.getProfile('me', profileFields).then(function(profile){
        data.status.loading = false;
        console.log('profile', profile);
        data.profile = profile;
      });
      LinkedinApiSrv.getConnections(profileFields).then(function(connections){
        console.log('connections', connections);
        data.connections = connections;
      });
    }, function(err){
      data.status.loading = false;
      console.error(err);
    });
  };
})

.directive('linkedinSearchResult', function(){
  'use strict';
  return {
    restrict: 'E',
    templateUrl: 'views/linkedin/partials/search-result.html',
    transclude: true,
    scope: {
      elt: '='
    }
  };
});
