'use strict';
module.exports = angular.module('lime.client.todo.next', []);

module.exports.controller('lime.client.todo.next.controller', [
  '$scope',
  '$q',
  '$http',
  'lime.client.todo.enums.statuses',
  function($scope, $q, $http, statusService) {
    $scope.things = 'hi';

    $q.all([
      statusService.ready
    ]).then(function() {
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



    // In Progress
    // http://localhost:3000/rest/todo/tasks?status=e

    // High Priority
    // http://localhost:3000/rest/todo/tasks?priority=38&status=7&status=j&status=e&status=6o&status=g
  }
]);

module.exports.directive('taskQuick', [
  function() {
    return {
      templateUrl: 'todo/next/taskQuick.html',
      scope: { task: '=taskQuick' }
    };
  }
]);