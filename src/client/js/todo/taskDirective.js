'use strict';

module.exports = angular.module('lime.client.todo.taskDirective', [])
.directive('taskDirective', [function() {
  return {
    replace: true,
    require: 'ngModel',
    scope: true,
    templateUrl: 'partials/todo/task.html',
    link: function($scope, elem, attr, ngModelController) {
      void(ngModelController);
      // TODO hook up $render and $setViewValue
    },
    controller: ['$scope',
      Controller]
  };
}]);

function Controller($scope) {
  $scope.formData = {
    name: ''
  };
}
