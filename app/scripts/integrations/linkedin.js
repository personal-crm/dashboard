angular.module('app')

.controller('LinkedinCtrl', function($scope, LinkedinSrv, Config){
  var data = {}, fn = {};
  $scope.data = data;
  $scope.fn = fn;

  data.scopes = ['r_basicprofile', 'r_fullprofile', 'r_emailaddress', 'r_network', 'r_contactinfo', 'w_messages', 'rw_groups', 'rw_nus', 'rw_company_admin'];
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
    LinkedinSrv.loadLibrary(data.api.key, data.api.scope).then(function(){
      return LinkedinSrv.connect();
    }).then(function(){
      LinkedinSrv.getProfile('me', profileFields).then(function(profile){
        data.status.loading = false;
        console.log('profile', profile);
        data.profile = profile;
      });
      LinkedinSrv.getConnections(profileFields).then(function(connections){
        console.log('connections', connections);
        data.connections = connections;
      });
    }, function(err){
      data.status.loading = false;
      console.error(err);
    });
  };
})

.factory('LinkedinSrv', function($q, $timeout, $window){
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

  // /!\ Searches not providing first and last name have results limited to the member's immediate network only (1st or 2nd degree connections)
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
  };

  return service;
});
