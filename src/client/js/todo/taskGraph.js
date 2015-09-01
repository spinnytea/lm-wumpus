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
    templateUrl: 'partials/todo/taskGraph.html',
    controller: ['$scope', '$http', 'lime.client.todo.enums.statuses', 'lime.client.todo.enums.types', Controller]
  };
}]);

// XXX I am not happy with this controller code
// - it is stupid ugly
function Controller($scope, $http, statusService, typeService) {
  $scope.typeCounts = {};
  $scope.statusCounts = {};
  typeService.ready.then(function() {
    $scope.types = typeService.list;
    typeService.list.forEach(function(s) { $scope.typeCounts[s.id] = 0; });
  statusService.ready.then(function() {
    $scope.statuses = statusService.list;
    statusService.list.forEach(function(s) { $scope.statusCounts[s.id] = 0; });

    var statuses = statusService.map;

    var params = {};
    if($scope.hideClosed)
      params.status = statusService.getNonClosed();

    $http.get('/rest/todo/tasks', { params: params }).success(function(data) {
      var newGraph = {
        nodes: [],
        links: []
      };

      // tally
      data.list.forEach(function(task) {
        $scope.typeCounts[task.type]++;
        $scope.statusCounts[task.status]++;
      });

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
        if(task.parent && (task.parent in task_idx))
          newGraph.links.push({ source: task_idx[task.id], target: task_idx[task.parent], value: 1 });

        // blocking and blockedBy are inverse, so one will handle the other
        task.blocking.forEach(function(id) {
          if(id in task_idx) newGraph.links.push({ source: task_idx[task.id], target: task_idx[id], value: 3, color: '#337ab7' });
        });

        // related will get registered twice
        // this will draw them closer; I guess this is okay
        task.related.forEach(function(id) {
          if(id in task_idx) newGraph.links.push({ source: task_idx[task.id], target: task_idx[id], value: 3, color: '#2ca02c' });
        });
      });

      $scope.myData = newGraph;


      function getColor(task) {
        if(statuses[task.status].category === '2') return '#7f7f7f';
        if(!task.parent) return '#ff7f0e';
        //if(!task.children.length) return '#337ab7';

        return '#000000';
      }
    });
  }); // end statusService
  }); // end typeService
}
