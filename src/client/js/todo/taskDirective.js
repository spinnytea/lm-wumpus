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

module.exports = angular.module('lime.client.todo.taskDirective', [])
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
    controller: ['$scope', '$http', '$location', '$routeParams',
      Controller]
  };
}]);

function Controller($scope, $http, $location, $routeParams) {
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

  $scope.statuses = [];
  $http.get('/rest/todo/statuses').success(function(data) {
    $scope.statuses = data.list.sort(function(a, b) { return b.order - a.order; });
    if($scope.formData.id === undefined)
      // default to the first status
      $scope.formData.status = $scope.statuses[0].id;
  });
  $scope.types = [];
  $http.get('/rest/todo/types').success(function(data) { $scope.types = data.list.sort(function(a, b) { return b.order - a.order; }); });
  $scope.priorities = [];
  $http.get('/rest/todo/priorities').success(function(data) { $scope.priorities = data.list.sort(function(a, b) { return b.order - a.order; }); });

  $scope.addBlocking = function() { $scope.formData.blocking.push(undefined); };
  $scope.removeBlocking = function(idx) { $scope.formData.blocking.splice(idx, 1); };
  $scope.addBlockedBy = function() { $scope.formData.blockedBy.push(undefined); };
  $scope.removeBlockedBy = function(idx) { $scope.formData.blockedBy.splice(idx, 1); };
}
