'use strict';

var formData = {};

module.exports = angular.module('lime.client.todo.queries', [
  require('./enums').name,
]);
module.exports.controller('lime.client.todo.queriesController', [
  '$scope',
  '$http',
  'lime.client.todo.enums.statuses',
  'lime.client.todo.enums.types',
  'lime.client.todo.enums.priorities',
  function($scope, $http, statusService, typeService, priorityService) {
    $scope.tasks = [];
    $scope.formData = formData;
    statusService.ready.then(function() { $scope.statuses = statusService.list; });
    typeService.ready.then(function() { $scope.types = typeService.list; });
    priorityService.ready.then(function() { $scope.priorities = priorityService.list; });

    $scope.searching = false;
    $scope.search = function() {
      $scope.searching = true;
      $http.get('/rest/todo/tasks', { params: formData }).success(function(data) {
        $scope.searching = false;
        $scope.tasks.splice(0);
        Array.prototype.push.apply($scope.tasks, data.list.sort(function(a, b) {
          // lexicographical sort on ID; highest first
          if(b.id.length !== a.id.length)
            return b.id.length - a.id.length;
          // IDs must not be equal
          return (b.id > a.id ? 1 : -1);
        }));
      });
    };

    // if there is at least one field with specificity, then perform an initial search
    if(Object.keys(formData).some(function(key) { return formData[key]; })) {
      $scope.search();
    }
  }
]);