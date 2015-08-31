'use strict';
// I should just use a bug tracker or something

module.exports = angular.module('lime.client.todo', [
  require('./enums').name,
  require('./queries').name,
  require('./taskDirective').name,
  require('./taskList').name,
  require('./taskGraph').name,
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
    }).when('/todo/queries', {
      templateUrl: 'partials/todo/queries.html',
      controller: 'lime.client.todo.queriesController',
    });
  }
])
.directive('pageHeading', [function() {
  return {
    scope: { active: '@' },
    templateUrl: 'partials/todo/pageHeading.html'
  };
}])
.controller('lime.client.todo.home', [
  '$scope',
  '$http',
    'lime.client.todo.enums.statuses',
    'lime.client.todo.enums.types',
  function($scope, $http, statusService, typeService) {
    statusService.ready.then(function() {
      $scope.statuses = statusService.list;
      statusService.counts().then(function(counts) { $scope.statusCounts = counts; });
    });
    typeService.ready.then(function() {
      $scope.types = typeService.list;
      typeService.counts().then(function(counts) { $scope.typeCounts = counts; });
    });
  }
])
.controller('lime.client.todo.enumList', [
  '$scope',
  '$http',
  '$location',
  '$routeParams',
  '$injector',
  function($scope, $http, $location, $routeParams, $injector) {
    var service = $injector.get('lime.client.todo.enums.' + $routeParams.name);
    var root = '/rest/todo/' + $routeParams.name;
    $scope.label = $routeParams.name;
    $scope.categories = service.categories;

    $scope.goHome = function() {
      $location.path('/todo');
    };

    $scope.items = [];
    service.ready.then(function() { $scope.items = service.list; });

    $scope.formData = {};

    $scope.edit = function(item) {
      $scope.formData = angular.copy(item);
    };
    $scope.isEdit = function() { return $scope.formData.id !== undefined; };
    $scope.cancelEdit = function() { $scope.formData = {}; };
    $scope.save = function() {
      $http.put(root + '/' + $scope.formData.id, $scope.formData).success(function() {
        $scope.formData = {};
        service.update().then(function() { $scope.items = service.list; });
      });
    };

    $scope.create = function() {
      $http.post(root, $scope.formData).success(function() {
        $scope.formData = {};
        service.update().then(function() { $scope.items = service.list; });
      });
    };
  }
])
.directive('taskId', [
  'lime.client.todo.enums.statuses',
  'lime.client.todo.enums.types',
  function(statusService, typeService) {
    return {
      restrict: 'A',
      require: 'ngModel',
      replace: true,
      scope: { readonly: '=' },
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
      template: '<div class="form-inline"><input class="form-control" ng-model="formData.id" ng-readonly="readonly" />&nbsp;<i ng-class="formData.icon"></i>&nbsp;<a href="#/todo/tasks/{{formData.id}}" ng-bind="formData.name" ng-class="formData.class"></a></div>',
      controller: ['$scope', '$http', function($scope, $http) {
        $scope.formData = {
          id: undefined,
          icon: '',
          class: '',
          name: 'None'
        };

        statusService.ready.then(function() { typeService.ready.then(function() {
          var statuses = statusService.map;
          var types = typeService.map;

          $scope.$on('$destroy', $scope.$watch('formData.id', function(id) {
            if(id) {
              $http.get('/rest/todo/tasks/'+id)
                .success(function(data) {
                  $scope.formData.icon = types[data.type].icon;
                  $scope.formData.class = statuses[data.status].categoryClass;
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
        }); });
      }]
    };
  }
])
;
