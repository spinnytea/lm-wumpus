'use strict';
module.exports = angular.module('lime.client.todo.next', []);

module.exports.controller('lime.client.todo.next.controller', [
  '$scope',
  '$http',
  'lime.client.todo.enums.statuses',
  function($scope, $http, statusService) {
    statusService.ready.then(function() {
      var currentParams = {};
      currentParams.status = statusService.getNonClosed();
      currentParams.tags = 'current';
      $http.get('/rest/todo/tasks', { params: currentParams }).success(function(data) {
        $scope.current = data.list;
      });

      var progressParams = {};
      progressParams.status = 'e';
      $http.get('/rest/todo/tasks', { params: progressParams }).success(function(data) {
        $scope.progress = data.list;
      });

      var highParams = {};
      highParams.status = statusService.getNonClosed();
      highParams.priority = '38';
      $http.get('/rest/todo/tasks', { params: highParams }).success(function(data) {
        $scope.high = data.list;
      });
    });
  }
]);

module.exports.directive('taskQuick', [
  'lime.client.todo.enums.statuses',
  'lime.client.todo.enums.types',
  'lime.client.todo.enums.priorities',
  function(statusService, typeService, priorityService) {
    return {
      templateUrl: 'todo/next/taskQuick.html',
      scope: { task: '=taskQuick' },
      controller: [ '$scope', Controller ]
    };

    function Controller($scope) {
      statusService.ready.then(function() { $scope.statuses = statusService.map; });
      typeService.ready.then(function() { $scope.types = typeService.map; });
      priorityService.ready.then(function() { $scope.priorities = priorityService.map; });
    }
  }
]);