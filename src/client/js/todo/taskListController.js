'use strict';

module.exports = angular.module('lime.client.todo.taskList', []);
module.exports.controller('lime.client.todo.taskList', [
  '$scope',
  '$http',
  function($scope, $http) {
    $scope.tasks = [];
    $http.get('/rest/todo/tasks?children=').success(function(data) { initViewData(data.list); $scope.tasks = data.list; });
    $http.get('/rest/todo/statuses').success(function(data) { $scope.statuses = data.list.reduce(function(ret, obj) { ret[obj.id] = obj; return ret; }, {}); });
    $http.get('/rest/todo/types').success(function(data) { $scope.types = data.list.reduce(function(ret, obj) { ret[obj.id] = obj; return ret; }, {}); });

    $scope.viewData = {};
    function initViewData(list, parent) {
      var level = 0;
      if(parent)
        level = $scope.viewData[parent.id].level + 1;

      list.forEach(function(task) {
        $scope.viewData[task.id] = {
          expanded: false,
          level: level
        };
      });

      list.sort(function(a, b) {
        return a.name.toUpperCase() > b.name.toUpperCase();
      });
    }

    $scope.expand = function(task) {
      if($scope.viewData[task.id].expanded) {
        $scope.viewData[task.id].expanded = false;

        var remove = [];
        collapse(task, remove);

        $scope.tasks = $scope.tasks.filter(function(task) { return remove.indexOf(task.id) === -1; });
      } else {
        $scope.viewData[task.id].expanded = true;
        $http.get('/rest/todo/tasks?children='+task.id).success(function(data) {
          initViewData(data.list, task);
          data.list.unshift($scope.tasks.indexOf(task)+1, 0);
          $scope.tasks.splice.apply($scope.tasks, data.list);
        });
      }
    };

    function collapse(task, remove) {
      Array.prototype.push.apply(remove, task.children);
      task.children
        .filter(function(id) { return $scope.viewData[id].expanded; })
        .forEach(function(id) { collapse(findById(id), remove); });
    }

    //
    // utils
    //

    $scope.range = function(num) {
      return new Array(num);
    };
    function findById(id) {
      var found;
      $scope.tasks.some(function(task) {
        if(task.id === id)
          found = task;
        return found;
      });
      return found;
    }
  }
]);