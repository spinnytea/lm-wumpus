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
    }).when('/todo/list', {
      templateUrl: 'partials/todo/list.html',
      controller: 'lime.client.todo.displaylist',
    }).when('/todo/enums/:name', {
      templateUrl: 'partials/todo/enumList.html',
      controller: 'lime.client.todo.enumList',
    }).when('/todo/tasks/create', {
      templateUrl: 'partials/todo/createTask.html',
      controller: 'lime.client.todo.createTask',
    }).when('/todo/tasks', {
      templateUrl: 'partials/todo/taskListPage.html',
      controller: 'lime.client.todo.taskList',
    }).when('/todo/tasks/:id', {
      templateUrl: 'partials/todo/createTask.html',
      controller: 'lime.client.todo.createTask',
    });
  }
])
.factory('lime.client.todo.list', function() {
  var list = [
    {
      title: 'High Level Planning',
      description: 'We can go to a room, pick up the gold, go to the exit, leave. ' +
      'We can do these actions independently, but we need a single plan to do them all. ' +
      'Likewise, we don\'t astar to have to plan the WHOLE thing at once, we want to solve each step independently.',
      tasks: [
        { text: 'How do we specify these goals independently; is it a list of goals (do x, then do y)?', status: 'done' },
        { text: 'How do we figure what these goals should be (dependency graph? ~ this is a harder problem)? (this is for later)', status: 'future' },
        { text: 'do hierarchy planning with basic: rooms then turns', status: 'done' },
      ]
    },
    {
      title: 'Experience',
      description: 'You\'ve started thinking about it, start playing with it! Start with something simple like "turn left"',
      tasks: [
        { text: 'save experience', status: 'none', description: 'state -> action -> state' },
        { text: 'carve out a logic cycle', status: 'none', description: 'start with a separate entry point' },
        { text: 'recall experience', status: 'none' },
        { text: 'do science on experience', status: 'none', description: 'what mattered, what didn\'t' },
      ]
    },
  ];

  list.forEach(function(group) {
    group.tasks.forEach(function(task) {
      switch(task.status) {
        case 'none':
          task.icon = 'fa-circle-o';
          task.title = 'Recorded';
          break;
        case 'inprogress':
          task.icon = 'fa-spinner fa-spin';
          task.title = 'In Progress';
          break;
        case 'wontfix':
          task.icon = 'fa-times';
          task.title = 'Won\'t Fix';
          break;
        case 'future':
          task.icon = 'fa-share';
          task.title = 'Some Day...';
          break;
        case 'done':
          task.icon = 'fa-check';
          task.title = 'Done';
          break;
      }
    });
  });

  return list;
})
.controller('lime.client.todo.displaylist', [
  '$scope',
  'lime.client.todo.list',
  function($scope, list) {
    // there isn't really any interactivity to this view
    $scope.list = list;
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
        $scope.items = data.list;
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
  function($scope, $http, $location, $routeParams) {
    $scope.nested = { taskObject: {} };
    $scope.createError = false;

    if($routeParams.id)
      $http.get('/rest/todo/tasks/' + $routeParams.id).success(function(data) { $scope.nested.taskObject = data; });

    $scope.create = function() {
      $http.post('/rest/todo/tasks', $scope.nested.taskObject).success($scope.goHome);
    };

    $scope.update = function() {
      $http.put('/rest/todo/tasks/' + $routeParams.id, $scope.nested.taskObject);
    };

    $scope.goHome = function() {
      $location.path('/todo/tasks');
    };
  }
])
;
