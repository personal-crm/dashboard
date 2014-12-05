angular.module('app')

.provider('ParseUtils', function(){
  'use strict';
  var credentials = {
    applicationId: null,
    restApiKey: null
  };

  this.initialize = function(applicationId, restApiKey) {
    credentials.applicationId = applicationId;
    credentials.restApiKey = restApiKey;
  };

  this.$get = ['$http', '$q', 'CrudRestUtils', function($http, $q, CrudRestUtils){
    var service = {
      createCrud: createCrud,
      createUserCrud: createUserCrud,
      signup: signup,
      login: login,
      passwordRecover: passwordRecover
    };
    var parseUrl = 'https://api.parse.com/1';
    var parseHttpConfig = {
      headers: {
        'X-Parse-Application-Id': credentials.applicationId,
        'X-Parse-REST-API-Key': credentials.restApiKey
      }
    };

    function createCrud(objectUrl, _processBreforeSave, _useCache){
      var endpointUrl = parseUrl+objectUrl;
      var objectKey = 'objectId';
      var _getData = function(result){
        if(result && result.data){
          if(!result.data[objectKey] && result.data.results){
            return result.data.results;
          } else {
            return result.data;
          }
        }
      };

      return CrudRestUtils.createCrud(endpointUrl, objectKey, _getData, _processBreforeSave, _useCache, parseHttpConfig);
    }

    function createUserCrud(sessionToken, _processBreforeSave, _useCache){
      var endpointUrl = parseUrl+'/users';
      var objectKey = 'objectId';
      var _getData = function(result){
        if(result && result.data){
          if(!result.data[objectKey] && result.data.results){
            return result.data.results;
          } else {
            return result.data;
          }
        }
      };
      var parseUserHttpConfig = angular.copy(parseHttpConfig);
      parseUserHttpConfig.headers['X-Parse-Session-Token'] = sessionToken;

      var service = CrudRestUtils.createCrud(endpointUrl, objectKey, _getData, _processBreforeSave, _useCache, parseUserHttpConfig);
      service.savePartial = function(user, dataToSave){
        var toSave = angular.copy(dataToSave);
        toSave[objectKey] = user[objectKey];
        return service.save(toSave);
      };
      return service;
    }

    // user MUST have fields 'username' and 'password'. The first one should be unique, application wise.
    function signup(user){
      if(user && user.username && user.password){
        return $http.post(parseUrl+'/users', user, parseHttpConfig).then(function(result){
          var newUser = angular.copy(user);
          delete newUser.password;
          newUser.objectId = result.data.objectId;
          newUser.sessionToken = result.data.sessionToken;
          return newUser;
        });
      } else {
        return $q.reject({data: {error: 'user MUST have fields username & password !'}});
      }
    }

    function login(username, password){
      return $http.get(parseUrl+'/login?username='+encodeURIComponent(username)+'&password='+encodeURIComponent(password), parseHttpConfig).then(function(result){
        return result.data;
      });
    }

    function passwordRecover(email){
      return $http.post(parseUrl+'/requestPasswordReset', {email: email}, parseHttpConfig).then(function(){
        // return nothing
      });
    }

    return service;
  }];
});
