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
    instance.page.tasks = [];
    instance.page.viewData = {};

    // the keys are task ids to update; the values are arbitrary
    instance.stale = {
      updated: {},
      children: {} // this references the parent under which the children are stale
    };

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
    $scope.tasks = taskListService.page.tasks;
    $scope.viewData = taskListService.page.viewData;

    if($scope.tasks.length === 0) {
      $http.get('/rest/todo/tasks?children=').success(function(data) {
        taskListService.initViewData(data.list, $scope.viewData);
        Array.prototype.push.apply($scope.tasks, data.list);
      });
    }

    function getStaleList(obj) {
      // only return the keys the are in the task list (this will probably be all of them
      return Object.keys(obj).filter(function(id) {
        return $scope.tasks.some(function(t) { return t.id === id; });
      });
    }

    getStaleList(taskListService.stale.updated).forEach(function(id) {
      $http.get('/rest/todo/tasks/'+id).success(function(data) {
        // my current browser doesn't support Array.find
        // basically, find the object's position in the task list, and update it
        var idx = null;
        $scope.tasks.some(function(t, i) { if(t.id === id) idx = i; return idx !== null; });
        angular.extend($scope.tasks[idx], data);
      });
    });
    taskListService.stale.updated = {};

    getStaleList(taskListService.stale.children).forEach(function(id) {
      // collect a list of everything that was expanded before we collapse the parent
      var toExpand = [];

      if($scope.viewData[id].expanded) {
        // collect all the expended elements before the collapse
        angular.forEach($scope.viewData, function(data, id) { if(data.expanded) toExpand.push(id); });

        var task = null;
        $scope.tasks.some(function(t) { if(t.id === id) task = t; return task; });
        taskListService.collapse($scope.tasks, $scope.viewData, task);

        // remove all the expanded elements after the collapse
        angular.forEach($scope.viewData, function(data, id) {
          if(data.expanded) {
            var idx = toExpand.indexOf(id);
            if(idx !== -1)
              toExpand.splice(idx, 1);
          }
        });
      }

      $http.get('/rest/todo/tasks/'+id).success(function(data) {
        // my current browser doesn't support Array.find
        // basically, find the object's position in the task list, and update it
        var idx = null;
        $scope.tasks.some(function(t, i) { if(t.id === id) idx = i; return idx !== null; });
        angular.extend($scope.tasks[idx], data);

        expandAll(toExpand);
      });
    });
    taskListService.stale.children = {};

    function expandAll(toExpand) {
      // find something on toExpand that is in the task list
      var task = null;
      toExpand.some(function(id) {
        if((id in $scope.viewData) && !$scope.viewData[id].expanded) {
          // find it in the list
          $scope.tasks.some(function(t) { if(t.id === id) task = t; return task; });
        }
        return task;
      });

      if(task) {
        // expand it
        // then keep going
        taskListService.expand($scope.tasks, $scope.viewData, task)
          .then(function() { expandAll(toExpand); });
      }
    }
  }
]);