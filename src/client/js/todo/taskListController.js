'use strict';

module.exports = angular.module('lime.client.todo.taskList', []);
module.exports.service('lime.client.todo.taskListService', [
  function() {
    var instance = {};

    // store data for the task list page
    instance.page = {};
    instance.page.tasks = [];
    instance.page.viewData = {};

    instance.initViewData = function(list, viewData, parent) {
      var level = 0;
      if(parent)
        level = viewData[parent.id].level + 1;

      list.forEach(function(task) {
        viewData[task.id] = {
          expanded: false,
          level: level
        };
      });

      list.sort(function(a, b) {
        if(a.name && b.name)
          return a.name.toUpperCase() > b.name.toUpperCase();
        else
          return a.name > b.name;
      });
    };

    return instance;
  }
]);
module.exports.directive('taskList', [
  function() {
    return {
      scope: {
        tasks: '=',
        viewData: '='
      },
      templateUrl: 'partials/todo/taskList.html',
      controller: 'lime.client.todo.taskList'
    };
  }
]);
module.exports.controller('lime.client.todo.taskList', [
  '$scope',
  '$http',
  'lime.client.todo.taskListService',
  function($scope, $http, taskListService) {
    $http.get('/rest/todo/statuses').success(function(data) { $scope.statuses = data.list.reduce(function(ret, obj) { ret[obj.id] = obj; return ret; }, {}); });
    $http.get('/rest/todo/types').success(function(data) { $scope.types = data.list.reduce(function(ret, obj) { ret[obj.id] = obj; return ret; }, {}); });

    $scope.expand = function(task) {
      if($scope.viewData[task.id].expanded) {
        $scope.viewData[task.id].expanded = false;
        var remove = [];
        collapse(task, remove);
        var remaining = $scope.tasks.filter(function(task) { return remove.indexOf(task.id) === -1; });
        $scope.tasks.splice(0);
        Array.prototype.push.apply($scope.tasks, remaining);
      } else {
        $scope.viewData[task.id].expanded = true;
        $http.get('/rest/todo/tasks?children='+task.id).success(function(data) {
          taskListService.initViewData(data.list, $scope.viewData, task);
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
      task.children
        .forEach(function(id) { delete $scope.viewData[id]; });
    }

    //
    // utils
    //

    $scope.range = function(num) {
      return new Array(num);
    };
    function findById(id) {
      var found = null;
      $scope.tasks.some(function(task) {
        if(task.id === id)
          found = task;
        return found;
      });
      return found;
    }
  }
]);