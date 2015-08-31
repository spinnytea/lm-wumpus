'use strict';
module.exports = angular.module('lime.client.todo.taskGraph', [
  require('./enums').name,
  require('../subgraph/subgraphModule').name
]);
module.exports.directive('taskGraph', [function() {
  return {
    replace: false,
    scope: {
      hideClosed: '='
    },
    template: '<div render-subgraph="myData"></div>',
    controller: ['$scope', '$http', 'lime.client.todo.enums.statuses', Controller]
  };
}]);

function Controller($scope, $http, statusService) {
  statusService.ready.then(function() {
    var statuses = statusService.map;
    $http.get('/rest/todo/tasks').success(function(data) {
      var newGraph = {
        nodes: [],
        links: []
      };

      if($scope.hideClosed)
        data.list = data.list.filter(function(task) { return statuses[task.status].category !== '2'; });

      // the notes is supposed to be a list
      // and the link source/target are position within that list
      // so... we need to save the mapping
      var task_idx = {};

      // register all the nodes
      data.list.forEach(function(task) {
        task_idx[task.id] = newGraph.nodes.length;
        newGraph.nodes.push({ id: task.id, name: task.name, color: getColor(task) });
      });

      // add all the links
      data.list.forEach(function(task) {
        if(task.parent) newGraph.links.push({ source: task_idx[task.id], target: task_idx[task.parent], value: 1 });
      });

      $scope.myData = newGraph;


      function getColor(task) {
        if(statuses[task.status].category === '2') return '#7f7f7f';
        if(!task.parent) return '#ff7f0e';
        //if(!task.children.length) return '#337ab7';

        return '#000000';
      }
    });
  });
}
