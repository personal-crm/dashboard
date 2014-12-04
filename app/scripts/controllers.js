angular.module('app')

.controller('LoginCtrl', function ($scope, $state, UserSrv){
  'use strict';
  var data = {}, fn = {};
  $scope.data = data;
  $scope.fn = fn;

  data.credentials = {
    email: '',
    password: ''
  };
  data.status = {
    form: 'login',
    loading: false,
    error: '',
    success: ''
  };


  fn.login = function(){
    data.status.loading = true;
    data.status.error = '';
    UserSrv.login(data.credentials).then(function(user){
      data.status.loading = false;
      $state.go('user.home');
    }, function(error){
      data.credentials.password = '';
      data.status.loading = false;
      data.status.error = error.message;
    });
  };
  fn.recover = function(){
    data.status.loading = true;
    data.status.error = '';
    UserSrv.passwordRecover(data.credentials).then(function(){
      data.status.loading = false;
      data.status.success = 'Check your inbox for password recovery !';
    }, function(error){
      data.status.loading = false;
      data.status.error = error.message;
    });
  };
  fn.signup = function(){
    data.status.loading = true;
    data.status.error = '';
    UserSrv.signup(data.credentials).then(function(user){
      data.status.loading = false;
      $state.go('user.home');
    }, function(error){
      data.credentials.password = '';
      data.status.loading = false;
      data.status.error = error.message;
    });
  };
})


.controller('MainCtrl', function($scope, $state, UserSrv){
  'use strict';
  $scope.logout = function(){
    UserSrv.logout().then(function(){
      $state.go('anon.login');
    });
  };
})

.controller('ProfileCtrl', function($scope, UserSrv, Utils, $http){
  'use strict';
  var data = {}, fn = {};
  $scope.data = data;
  $scope.fn = fn;

  UserSrv.getCurrent().then(function(user){
    data.user = user;
    data.secrets = angular.copy(user.secrets);
    $scope.$watch('data.secrets.linkedinScraperUrl.value', function(val, old){
      if(val !== old){
        if(val){
          delete data.secrets.linkedinScraperUrl.error;
          delete data.secrets.linkedinScraperUrl.checked;
        } else if(data.secrets){
          delete data.secrets.linkedinScraperUrl;
        }
      }
    });
  });

  fn.check = function(secret){
    if(secret === 'linkedinScraperUrl'){
      delete data.secrets[secret].error;
      delete data.secrets[secret].checked;
      data.secrets[secret].loading = true;
      if(Utils.endsWith(data.secrets[secret].value, '/')){ data.secrets[secret].value = data.secrets[secret].value.slice(0, -1); }
      var url = data.secrets[secret].value;
      $http.get(url+'/api/v1/ping').then(function(){
        delete data.secrets[secret].loading;
        data.secrets[secret].checked = true;
      }, function(err){
        delete data.secrets[secret].loading;
        data.secrets[secret].checked = false;
        data.secrets[secret].error = 'Check your scraper url, it responds with: "'+err.statusText+'"';
      });
    } else {
      console.log('unknown secret <'+secret+'> !');
    }
  };

  fn.saveSecrets = function(){
    data.savingUser = true;
    if(!data.user.secrets){ data.user.secrets = {}; }
    angular.copy(data.secrets, data.user.secrets);
    UserSrv.saveUser(data.user).then(function(){
      data.savingUser = false;
    });
  };
});
