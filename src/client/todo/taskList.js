'use strict';

module.exports = angular.module('lime.client.todo.taskList', [
  require('./enums').name,
]);
module.exports.service('lime.client.todo.taskListService', [
  '$http',
  '$q',
  'lime.client.todo.enums.statuses',
  'lime.client.todo.enums.priorities',
  function($http, $q, statusService, priorityService) {
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


      var priorities = priorityService.map;
      var statuses = statusService.map;

      list.sort(function(a, b) {
        // sort by status category
        if(statuses[b.status].categoryOrder !== statuses[a.status].categoryOrder)
          return statuses[b.status].categoryOrder - statuses[a.status].categoryOrder;

        // sort on priority
        if(b.priority !== a.priority)
          return priorities[b.priority].order - priorities[a.priority].order;

        // lexicographical sort on ID; highest first
        if(b.id.length !== a.id.length)
          return b.id.length - a.id.length;
        // IDs must not be equal
        return (b.id > a.id ? 1 : -1);
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
        .filter(function(id) { return (id in viewData) && viewData[id].expanded; })
        .forEach(function(id) { collapseChildren(tasks, viewData, find(tasks, function(task) { return task.id === id; }), remove); });
      task.children
        .forEach(function(id) { delete viewData[id]; });
    }

    // prereq: !viewData[task.id].expanded
    instance.expand = function(tasks, viewData, task, hideClosed) {
      var deferred = $q.defer();
      viewData[task.id].expanded = true;
      var params = {
        children: task.id,
        status: (hideClosed?statusService.getNonClosed():undefined)
      };
      $http.get('/rest/todo/tasks', { params: params }).success(function(data) {
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
        viewData: '=', // XXX you cannot use viewData if it's possible to have the same task in the list twice
        hideClosed: '='
      },
      templateUrl: 'todo/taskList.html',
      controller: 'lime.client.todo.taskList'
    };
  }
]);
module.exports.controller('lime.client.todo.taskList', [
  '$scope',
  '$q',
  '$http',
  'lime.client.todo.taskListService',
  'lime.client.todo.enums.statuses',
  'lime.client.todo.enums.types',
  'lime.client.todo.enums.priorities',
  function($scope, $q, $http, taskListService, statusService, typeService, priorityService) {
    statusService.ready.then(function() { $scope.statuses = statusService.map; });
    typeService.ready.then(function() { $scope.types = typeService.map; });
    priorityService.ready.then(function() { $scope.priorities = priorityService.map; });

    $scope.expand = function(task) {
      if($scope.viewData[task.id].expanded) {
        taskListService.collapse($scope.tasks, $scope.viewData, task);
      } else {
        taskListService.expand($scope.tasks, $scope.viewData, task, $scope.hideClosed);
      }
    };

    //
    // utils
    //

    $scope.range = function(num) {
      if(num === undefined) return [];
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
          task = find($scope.tasks, function(t) { return t.id === id; });
        }
        return task;
      });

      // once nothing is found, then we will terminate
      // as long as there is a task that we can expand, then expand it
      if(task) {
        // expand it
        // then keep going
        taskListService.expand($scope.tasks, $scope.viewData, task, true)
          .then(function() { expandAll(toExpand); });
      }
    }
  }
]);

// my current browser doesn't support Array.find
function find(array, callback) {
  var found = null;
  array.some(function(item) { if(callback(item)) found = item; return found; });
  return found;
}
