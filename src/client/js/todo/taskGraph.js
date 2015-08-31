'use strict';
module.exports = angular.module('lime.client.todo.taskGraph', [ require('../subgraph/subgraphModule').name ]);
module.exports.directive('taskGraph', [function() {
  return {
    replace: false,
    scope: true,
    template: '<div render-subgraph="myData"></div>',
    controller: ['$scope', '$http', Controller]
  };
}]);

function Controller($scope, $http) {
  $scope.myData = {
    nodes: [],
    links: []
  };


  $http.get('/rest/todo/tasks?children=').success(function(data) {
    var newGraph = {
      nodes: [],
      links: []
    };

    // the notes is supposed to be a list
    // and the link source/target are position within that list
    // so... we need to save the mapping
    var task_idx = {};

    data.list.forEach(function(task) {
      task_idx[task.id] = newGraph.nodes.length;
      newGraph.nodes.push({ id: task.id, name: task.name, value: 1 });
    });

    $scope.myData = newGraph;
  });
}
