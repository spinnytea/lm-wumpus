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
    controller: ['$scope',
      Controller]
  };
}]);

function Controller($scope) {
  $scope.formData = {
    id: undefined,
    name: '',
    description: '',
  };
}
