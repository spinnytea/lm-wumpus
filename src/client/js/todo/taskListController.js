'use strict';

module.exports = angular.module('lime.client.todo.taskList', []);
module.exports.controller('lime.client.todo.taskList', [
  '$scope',
  '$http',
  function($scope, $http) {
    if(!$scope.nestedId) {
      $scope.nestedId = '';
      $http.get('/rest/todo/statuses').success(function(data) { $scope.statuses = data.list.reduce(function(ret, obj) { ret[obj.id] = obj; return ret; }, {}); });
      $http.get('/rest/todo/types').success(function(data) { $scope.types = data.list.reduce(function(ret, obj) { ret[obj.id] = obj; return ret; }, {}); });
    }

    $scope.tasks = [];
    $http.get('/rest/todo/tasks?children='+$scope.nestedId).success(function(data) { $scope.tasks = data.list; });

    $scope.expanded = {};
  }
]);