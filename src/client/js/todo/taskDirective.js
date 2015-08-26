'use strict';

var EMPTY_TASK = {
  id: undefined,
  name: '',
  parent: undefined,
  type: undefined,
  status: undefined,
  description: '',
  resolution: '',
  blocking: [],
  blockedBy: [],
};

module.exports = angular.module('lime.client.todo.taskDirective', [ require('./enums').name ]);
module.exports.directive('taskDirective', [function() {
  return {
    replace: true,
    require: 'ngModel',
    scope: true,
    templateUrl: 'partials/todo/task.html',
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
}

module.exports.controller('lime.client.todo.createTask', [
  '$scope',
  '$http',
  '$location',
  '$routeParams',
  'lime.client.todo.enums.statuses',
  function($scope, $http, $location, $routeParams, statusService) {
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
      statusService.ready.then(function() {
        // default to the first status
        $scope.nested.taskObject = angular.copy($scope.nested.taskObject);
        $scope.nested.taskObject.status = statusService.list[0].id;
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