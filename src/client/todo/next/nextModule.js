'use strict';
module.exports = angular.module('lime.client.todo.next', []);

module.exports.controller('lime.client.todo.next.controller', [
  '$scope',
  '$http',
  'lime.client.todo.enums.statuses',
  'lime.client.todo.enums.types',
  function($scope, $http, statusService, typeService) {
    typeService.ready.then(function() {
    statusService.ready.then(function() {
      var currentParams = {};
      currentParams.status = statusService.getNonClosed();
      currentParams.tags = 'current';
      $http.get('/rest/todo/tasks', { params: currentParams }).success(function(data) {
        $scope.current = sort(data.list);
      });

      var progressParams = {};
      progressParams.status = 'e';
      $http.get('/rest/todo/tasks', { params: progressParams }).success(function(data) {
        $scope.progress = sort(data.list);
      });

      var highParams = {};
      highParams.status = statusService.getNonClosed();
      highParams.priority = '38';
      $http.get('/rest/todo/tasks', { params: highParams }).success(function(data) {
        $scope.high = sort(data.list);
      });

      function sort(list) {
        return list.sort(function(a, b) {
          return typeService.map[b.type].order - typeService.map[a.type].order;
        });
      }
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