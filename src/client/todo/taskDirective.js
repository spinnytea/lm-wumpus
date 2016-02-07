'use strict';

var EMPTY_TASK = {
  id: undefined,
  name: '',
  parent: undefined,
  type: undefined,
  status: undefined,
  description: '',
  resolution: '',
  tags: [],
  blocking: [],
  blockedBy: [],
  related: [],
};

module.exports = angular.module('lime.client.todo.taskDirective', [ require('./enums').name ]);
module.exports.directive('taskDirective', [function() {
  return {
    replace: true,
    require: 'ngModel',
    scope: true,
    templateUrl: 'todo/task.html',
    link: function($scope, elem, attr, ngModelController) {
      $scope.$on('$destroy', $scope.$watch('formData', function(data) {
        ngModelController.$setViewValue(angular.copy(data));
      }, true));
      ngModelController.$render = function() {
        if(angular.equals({}, ngModelController.$modelValue)) {
          $scope.formData = angular.copy(EMPTY_TASK);
        } else {
          $scope.formData = angular.copy(ngModelController.$modelValue);
        }
      };
    },
    controller: ['$scope',
      'lime.client.todo.enums.statuses', 'lime.client.todo.enums.types', 'lime.client.todo.enums.priorities',
      Controller]
  };
}]);

function Controller($scope, statusService, typeService, priorityService) {
  statusService.ready.then(function() { $scope.statuses = statusService.list; });
  typeService.ready.then(function() { $scope.types = typeService.list; });
  priorityService.ready.then(function() { $scope.priorities = priorityService.list; });

  $scope.isResolve = function() {
    if(!statusService.map)
      return true;
    if(!statusService.map[$scope.formData.status])
      return false;

    return statusService.map[$scope.formData.status].category === '2';
  };

  $scope.addBlocking = function() { $scope.formData.blocking.push(undefined); };
  $scope.removeBlocking = function(idx) { $scope.formData.blocking.splice(idx, 1); };
  $scope.addBlockedBy = function() { $scope.formData.blockedBy.push(undefined); };
  $scope.removeBlockedBy = function(idx) { $scope.formData.blockedBy.splice(idx, 1); };
  $scope.addRelated = function() { $scope.formData.related.push(undefined); };
  $scope.removeRelated = function(idx) { $scope.formData.related.splice(idx, 1); };

  $scope.addExternal = function() {
    if(!$scope.formData.external) $scope.formData.external = [];
    $scope.formData.external.push('');
  };
  $scope.removeExternal = function(idx) {
    $scope.formData.external.splice(idx, 1);
    if(!$scope.formData.external.length) delete $scope.formData.external;
  };
}

module.exports.controller('lime.client.todo.createTask', [
  '$scope',
  '$http',
  '$location',
  '$routeParams',
  'lime.client.todo.enums.types',
  'lime.client.todo.enums.statuses',
  'lime.client.todo.enums.priorities',
  function($scope, $http, $location, $routeParams, typeService, statusService, priorityService) {
    $scope.nested = { taskObject: angular.copy(EMPTY_TASK) };
    $scope.createError = false;

    if($routeParams.parent) {
      $scope.nested.taskObject.parent = $routeParams.parent;
      $scope.$on('$destroy', function() {
        $location.search('');
      });
    }

    if($routeParams.id) {
      $http.get('/rest/todo/tasks/' + $routeParams.id).success(function(data) {
        $scope.nested.taskObject = data;
      });
    } else {
      typeService.ready.then(function() {
      statusService.ready.then(function() {
      priorityService.ready.then(function() {
        // force the model to update on the UI
        $scope.nested.taskObject = angular.copy($scope.nested.taskObject);
        // default to the first type
        $scope.nested.taskObject.type = typeService.list[0].id;
        // default to the first status
        $scope.nested.taskObject.status = statusService.list[0].id;
        // default to the middle priority
        $scope.nested.taskObject.priority = priorityService.list[Math.floor(priorityService.list.length/2)].id;
      });
      });
      });
    }

    $scope.create = function() {
      $http.post('/rest/todo/tasks', $scope.nested.taskObject).success(function(data) {
        $scope.nested.taskObject = data;
      });
    };

    $scope.update = function() {
      $http.put('/rest/todo/tasks/' + $routeParams.id, $scope.nested.taskObject);
    };
  }
]);