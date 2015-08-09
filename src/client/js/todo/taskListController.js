'use strict';

module.exports = angular.module('lime.client.todo.tasksList', []);
module.exports.controller('lime.client.todo.tasksList', [
  '$scope',
  '$http',
  '$location',
  function($scope, $http, $location) {
    $http.get('/rest/todo/tasks?children=').success(function(data) { $scope.tasks = data.list; });
    $http.get('/rest/todo/statuses').success(function(data) { $scope.statuses = data.list.reduce(function(ret, obj) { ret[obj.id] = obj; return ret; }, {}); });
    $http.get('/rest/todo/types').success(function(data) { $scope.types = data.list.reduce(function(ret, obj) { ret[obj.id] = obj; return ret; }, {}); });

    $scope.goHome = function() {
      $location.path('/todo');
    };
  }
]);