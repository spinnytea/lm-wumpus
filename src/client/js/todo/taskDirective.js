'use strict';

var EMPTY_TASK = {
  id: undefined,
  name: '',
  parent: undefined,
  type: undefined,
  status: undefined,
  description: '',
  blocking: [],
  blockedBy: [],
};

module.exports = angular.module('lime.client.todo.taskDirective', [ require('./enums').name ])
.directive('taskDirective', [function() {
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
    controller: ['$scope', '$location', '$routeParams',
      'lime.client.todo.enums.statuses', 'lime.client.todo.enums.types', 'lime.client.todo.enums.priorities',
      Controller]
  };
}]);

function Controller($scope, $location, $routeParams, statusService, typeService, priorityService) {
  $scope.formData = angular.copy(EMPTY_TASK);

  if($routeParams.parent) {
    setTimeout(function() {
      $scope.$apply(function() {
        $scope.formData.parent = $routeParams.parent;
      });
    });
    $scope.$on('$destroy', function() {
      $location.search('');
    });
  }

  statusService.ready.then(function() {
    $scope.statuses = statusService.list;
    // default to the first status
    if($scope.formData.id === undefined)
      $scope.formData.status = $scope.statuses[0].id;
  });
  typeService.ready.then(function() { $scope.types = typeService.list; });
  priorityService.ready.then(function() { $scope.priorities = priorityService.list; });

  $scope.addBlocking = function() { $scope.formData.blocking.push(undefined); };
  $scope.removeBlocking = function(idx) { $scope.formData.blocking.splice(idx, 1); };
  $scope.addBlockedBy = function() { $scope.formData.blockedBy.push(undefined); };
  $scope.removeBlockedBy = function(idx) { $scope.formData.blockedBy.splice(idx, 1); };
}
