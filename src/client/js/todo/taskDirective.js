'use strict';

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
        $scope.formData = angular.copy(ngModelController.$modelValue);
      };
    },
    controller: ['$scope', '$http',
      Controller]
  };
}]);

function Controller($scope, $http) {
  $scope.formData = {
    id: undefined,
    name: '',
    parent: undefined,
    type: undefined,
    status: undefined,
    description: '',
  };

  $scope.statuses = [];
  $http.get('/rest/todo/statuses').success(function(data) {
    $scope.statuses = data.list;
  });
  $scope.types = [];
  $http.get('/rest/todo/types').success(function(data) {
    $scope.types = data.list;
  });

  $scope.$on('$destroy', $scope.$watch('formData.parent', function(parent) {
    if(parent) {
      $http.get('/rest/todo/tasks/'+parent)
        .success(function(data) { $scope.taskParent = data.name; })
        .error(function(data) { $scope.taskParent = (data.message || 'Error'); });
    } else {
      $scope.taskParent = 'None';
    }
  }));
}
