angular.module('app')

.factory('TaskSrv', function(ParseUtils){
  'use strict';
  return ParseUtils.createCrud('/classes/Task', null, true);
})

.controller('TasksCtrl', function($scope, CrudRestUtils, TaskSrv){
  'use strict';
  var defaultSort = {order: 'done', desc: true};
  var defaultFormElt = {done: false};
  $scope.crud = CrudRestUtils.createCrudCtrl(TaskSrv, defaultSort, defaultFormElt);
  $scope.cache = TaskSrv.cache;
})

.directive('task', function(Utils){
  'use strict';
  return {
    restrict: 'E',
    templateUrl: 'views/tasks/partials/details.html',
    scope: {
      elt: '='
    },
    link: function(scope, element, attr){
      scope.trustHtml = Utils.trustHtml;
    }
  };
})

.directive('taskForm', function(){
  'use strict';
  return {
    restrict: 'E',
    templateUrl: 'views/tasks/partials/form.html',
    scope: {
      elt: '='
    }
  };
});
