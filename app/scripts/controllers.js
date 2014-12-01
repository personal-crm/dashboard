angular.module('app')

.controller('LoginCtrl', function ($scope, $state, AuthSrv){
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
    AuthSrv.login(data.credentials).then(function(user){
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
    AuthSrv.passwordRecover(data.credentials).then(function(){
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
    AuthSrv.signup(data.credentials).then(function(user){
      data.status.loading = false;
      $state.go('user.home');
    }, function(error){
      data.credentials.password = '';
      data.status.loading = false;
      data.status.error = error.message;
    });
  };
})


.controller('MainCtrl', function($scope, $state, AuthSrv){
  'use strict';
  $scope.logout = function(){
    AuthSrv.logout().then(function(){
      $state.go('anon.login');
    });
  };
});
