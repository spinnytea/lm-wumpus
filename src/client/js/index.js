'use strict';
angular.module('lime.client', [
  require('./wumpus/wumpusModule').name,
  require('./subgraph/subgraphModule').name,
  require('./todo/todoModule').name,
  'ngRoute',
]).config([
  '$routeProvider',
  function($routeProvider) {
    $routeProvider
    .when('/wumpus', {
      templateUrl: 'partials/wumpus/app.html',
      controller: 'lime.client.wumpus.app',
    })
    .when('/subgraph/example', {
      templateUrl: 'partials/subgraph/example.html',
      controller: 'lime.client.subgraph.example',
    })
    .when('/todo', {
      templateUrl: 'partials/todo/list.html',
      controller: 'lime.client.todo.displaylist',
    })
    ;
  }
]).controller('contentController', [
  '$scope', '$location',
  function($scope, $location) {
    // the layout is a little counter-intuitive
    // however, I intend to upgrade the wrapper eventually
    $scope.showMenu = true;
    $scope.$watch(function() { return $location.path(); }, function(newValue) {
      $scope.showMenu = (newValue === '');
    });

    $scope.override = {
      keyup: angular.noop,
      keydown: angular.noop,
    };
  }
]).directive('strToNum', [
  function() {
    return {
      require: 'ngModel',
      link: function($scope, elem, attrs, ngModelController) {
        ngModelController.$parsers.push(function(value) {
          return +value;
        });
      } // end link
    };
  }
]);