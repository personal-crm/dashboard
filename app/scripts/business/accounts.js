angular.module('app')

.factory('AccountSrv', function(ParseUtils){
  'use strict';
  return ParseUtils.createCrud('/classes/Account', null, true);
})

.controller('AccountsCtrl', function($scope, CrudRestUtils, AccountSrv){
  'use strict';
  var defaultSort = {};
  var defaultFormElt = {};
  $scope.crud = CrudRestUtils.createCrudCtrl(AccountSrv, defaultSort, defaultFormElt);
  $scope.cache = AccountSrv.cache;
})

.directive('account', function(){
  'use strict';
  return {
    restrict: 'E',
    templateUrl: 'views/accounts/partials/details.html',
    scope: {
      elt: '='
    }
  };
})

.directive('accountName', function(AccountSrv){
  'use strict';
  function setName(scope){
    AccountSrv.get(scope.id).then(function(elt){
      if(elt){ scope.name = elt.name; }
      else { scope.name = scope.id; }
    }, function(){
      scope.name = scope.id;
    });
  }
  
  return {
    restrict: 'E',
    template: '<span class="relation">{{name}}</span>',
    scope: {
      id: '='
    },
    link: function(scope, element, attr){
      setName(scope);
      scope.$watch('id', function(val, old){
        if(val !== old){ setName(scope); }
      });
    }
  };
})

.directive('accountForm', function(){
  'use strict';
  return {
    restrict: 'E',
    templateUrl: 'views/accounts/partials/form.html',
    scope: {
      elt: '='
    }
  };
});
