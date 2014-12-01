angular.module('app')

.factory('ContactSrv', function(ParseUtils){
  'use strict';
  return ParseUtils.createCrud('/classes/Contact', null, true);
})

.controller('ContactsCtrl', function($scope, CrudRestUtils, ContactSrv, AccountSrv){
  'use strict';
  var defaultSort = {};
  var defaultFormElt = {};
  $scope.crud = CrudRestUtils.createCrudCtrl(ContactSrv, defaultSort, defaultFormElt);
  $scope.cache = ContactSrv.cache;

  var data = {};
  $scope.data = data;
  AccountSrv.getAll().then(function(accounts){
    data.accounts = accounts;
  });
})

.directive('contact', function(){
  'use strict';
  return {
    restrict: 'E',
    templateUrl: 'views/contacts/partials/details.html',
    scope: {
      elt: '='
    }
  };
})

.directive('contactForm', function(AccountSrv){
  'use strict';
  return {
    restrict: 'E',
    templateUrl: 'views/contacts/partials/form.html',
    scope: {
      elt: '='
    },
    link: function(scope, element, attr){
      var data = {};
      scope.data = data;
      AccountSrv.getAll().then(function(accounts){
        data.accounts = accounts;
      });
    }
  };
});
