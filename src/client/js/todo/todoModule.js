'use strict';
// I should just use a bug tracker or something

module.exports = angular.module('lime.client.todo', [
  require('./taskDirective').name,
  require('./taskListController').name,
  'ngRoute'
])
.config([
  '$routeProvider',
  function($routeProvider) {
    $routeProvider.when('/todo', {
      templateUrl: 'partials/todo/home.html',
      controller: 'lime.client.todo.home',
    }).when('/todo/enums/:name', {
      templateUrl: 'partials/todo/enumList.html',
      controller: 'lime.client.todo.enumList',
    }).when('/todo/tasks/create', {
      templateUrl: 'partials/todo/createTask.html',
      controller: 'lime.client.todo.createTask',
    }).when('/todo/tasks', {
      templateUrl: 'partials/todo/taskListPage.html',
      controller: 'lime.client.todo.taskListPage',
    }).when('/todo/tasks/:id', {
      templateUrl: 'partials/todo/createTask.html',
      controller: 'lime.client.todo.createTask',
    });
  }
])
.controller('lime.client.todo.home', [
  '$scope',
  '$http',
  function($scope, $http) {
    $scope.taskCount = 'unknown';

    //
    // init
    //
    $http.get('/rest/todo/tasks/count').success(function(data) {
      $scope.taskCount = data.count;
    });
  }
])
.controller('lime.client.todo.enumList', [
  '$scope',
  '$http',
  '$location',
  '$routeParams',
  function($scope, $http, $location, $routeParams) {
    var root = '/rest/todo/' + $routeParams.name;
    $scope.label = $routeParams.name;

    $scope.goHome = function() {
      $location.path('/todo');
    };

    $scope.items = [];
    function getItems() {
      $http.get(root).success(function(data) {
        $scope.items = data.list.sort(function(a, b) { return b.order > a.order; });
      });
    }
    getItems();

    $scope.formData = {};

    $scope.edit = function(item) {
      $scope.formData = angular.copy(item);
    };
    $scope.isEdit = function() { return $scope.formData.id !== undefined; };
    $scope.cancelEdit = function() { $scope.formData = {}; };
    $scope.save = function() {
      $http.put(root + '/' + $scope.formData.id, $scope.formData).success(function() {
        $scope.formData = {};
        getItems();
      });
    };

    $scope.create = function() {
      $http.post(root, $scope.formData).success(function() {
        $scope.formData = {};
        getItems();
      });
    };
  }
])
.controller('lime.client.todo.createTask', [
  '$scope',
  '$http',
  '$location',
  '$routeParams',
  'lime.client.todo.taskListService',
  function($scope, $http, $location, $routeParams, taskListService) {
    $scope.nested = { taskObject: {} };
    $scope.createError = false;
    var originalParent;

    if($routeParams.id)
      $http.get('/rest/todo/tasks/' + $routeParams.id).success(function(data) {
        $scope.nested.taskObject = data;
        originalParent = data.parent;
      });

    $scope.create = function() {
      if($scope.nested.taskObject.parent)
        taskListService.stale.children[$scope.nested.taskObject.parent] = true;
      $http.post('/rest/todo/tasks', $scope.nested.taskObject).success($scope.goHome);
    };

    $scope.update = function() {
      taskListService.stale.updated[$routeParams.id] = true;
      if(originalParent !== $scope.nested.taskObject.parent) {
        if(originalParent)
          taskListService.stale.children[originalParent] = true;
        if($scope.nested.taskObject.parent)
          taskListService.stale.children[$scope.nested.taskObject.parent] = true;
      }
      $http.put('/rest/todo/tasks/' + $routeParams.id, $scope.nested.taskObject);
    };

    $scope.goHome = function() {
      $location.path('/todo/tasks');
    };
  }
])
.directive('taskId', [
  function() {
    return {
      restrict: 'A',
      require: 'ngModel',
      replace: true,
      scope: {},
      link: function($scope, elem, attr, ngModelController) {
        elem.find('input').attr('id', attr.id);
        elem.removeAttr('id');

        $scope.$on('$destroy', $scope.$watch('formData.id', function(id) {
          ngModelController.$setViewValue(id);
        }));
        ngModelController.$render = function() {
          $scope.formData.id = ngModelController.$modelValue;
          $scope.formData.icon = '';
          $scope.formData.name = '';
        };
      },
      template: '<div class="form-inline"><input class="form-control" ng-model="formData.id" />&nbsp;<i ng-class="formData.icon"></i>&nbsp;<a href="#/todo/tasks/{{formData.id}}" ng-bind="formData.name"></a></div>',
      controller: ['$scope', '$http', function($scope, $http) {
        $scope.formData = {
          id: undefined,
          icon: '',
          name: 'None'
        };

        var types = {};
        $http.get('/rest/todo/types').success(function(data) {
          types = data.list.reduce(function(ret, obj) { ret[obj.id] = obj; return ret; }, {});
        });

        $scope.$on('$destroy', $scope.$watch('formData.id', function(id) {
          if(id) {
            $http.get('/rest/todo/tasks/'+id)
              .success(function(data) {
                $scope.formData.icon = types[data.type].icon;
                $scope.formData.name = data.name;
              })
              .error(function(data) {
                $scope.formData.icon = '';
                $scope.formData.name = (data.message || 'Error');
              });
          } else {
            $scope.formData.name = 'None';
          }
        }));
      }]
    };
  }
])
.controller('lime.client.todo.taskListPage', [
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
  }
])
;
