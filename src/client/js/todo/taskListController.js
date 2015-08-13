'use strict';

module.exports = angular.module('lime.client.todo.taskList', []);
module.exports.service('lime.client.todo.taskListService', [
  '$http',
  '$q',
  function($http, $q) {
    // TODO pull some of the functions off the service and make them private to this file
    var instance = {};

    // store data for the task list page
    instance.page = {};
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

    // prereq: viewData[task.id].expanded
    instance.collapse = function(tasks, viewData, task) {
      viewData[task.id].expanded = false;
      var remove = [];
      collapseChildren(tasks, viewData, task, remove);
      var remaining = tasks.filter(function(task) { return remove.indexOf(task.id) === -1; });
      tasks.splice(0);
      Array.prototype.push.apply(tasks, remaining);
    };
    function collapseChildren(tasks, viewData, task, remove) {
      Array.prototype.push.apply(remove, task.children);
      task.children
        .filter(function(id) { return viewData[id].expanded; })
        .forEach(function(id) { collapseChildren(tasks, viewData, findById(tasks, id), remove); });
      task.children
        .forEach(function(id) { delete viewData[id]; });
    }
    function findById(tasks, id) {
      // my current browser doesn't support Array.find
      var found = null;
      tasks.some(function(task) { if(task.id === id) found = task; return found; });
      return found;
    }

    // prereq: !viewData[task.id].expanded
    instance.expand = function(tasks, viewData, task) {
      var deferred = $q.defer();
      viewData[task.id].expanded = true;
      $http.get('/rest/todo/tasks?children='+task.id).success(function(data) {
        instance.initViewData(data.list, viewData, task);
        data.list.unshift(tasks.indexOf(task)+1, 0);
        tasks.splice.apply(tasks, data.list);
        deferred.resolve();
      }).error(deferred.reject);
      return deferred.promise;
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
        taskListService.collapse($scope.tasks, $scope.viewData, task);
      } else {
        taskListService.expand($scope.tasks, $scope.viewData, task);
      }
    };

    //
    // utils
    //

    $scope.range = function(num) {
      return new Array(num);
    };
  }
]);
module.exports.controller('lime.client.todo.taskListPage', [
  '$scope',
  '$http',
  'lime.client.todo.taskListService',
  function($scope, $http, taskListService) {

    // load the old view data
    var toExpand = [];
    angular.forEach(taskListService.page.viewData, function(data, id) { if(data.expanded) toExpand.push(id); });
    $scope.viewData = taskListService.page.viewData = {};

    // query the tasks
    $scope.tasks = [];
    $http.get('/rest/todo/tasks?children=').success(function(data) {
      taskListService.initViewData(data.list, $scope.viewData);
      Array.prototype.push.apply($scope.tasks, data.list);

      // expand everything that was expanded previously
      expandAll(toExpand);
    });

    function expandAll(toExpand) {
      // find for a 'toExpand' that is in the task list and unexpanded
      // this will find top level things, and work it's way down
      var task = null;
      toExpand.some(function(id) {
        if((id in $scope.viewData) && !$scope.viewData[id].expanded) {
          // find it in the list (the browser I'm using doesn't support Array.find)
          $scope.tasks.some(function(t) { if(t.id === id) task = t; return task; });
        }
        return task;
      });

      // once nothing is found, then we will terminate
      // as long as there is a task that we can expand, then expand it
      if(task) {
        // expand it
        // then keep going
        taskListService.expand($scope.tasks, $scope.viewData, task)
          .then(function() { expandAll(toExpand); });
      }
    }
  }
]);