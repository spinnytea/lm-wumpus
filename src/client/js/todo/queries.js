'use strict';

module.exports = angular.module('lime.client.todo.queries', []);
module.exports.controller('lime.client.todo.queriesController', [
  '$scope',
  '$http',
  function($scope, $http) {
    $scope.tasks = [];
    $scope.formData = {};

    $http.get('/rest/todo/statuses').success(function(data) { $scope.statuses = data.list; });

    $scope.searching = false;
    $scope.search = function() {
      $scope.searching = true;
      $http.get('/rest/todo/tasks', { params: $scope.formData }).success(function(data) {
        $scope.searching = false;
        $scope.tasks.splice(0);
        Array.prototype.push.apply($scope.tasks, data.list);
      });
    };

  }
]);