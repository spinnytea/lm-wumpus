'use strict';
module.exports = angular.module('lime.client.todo.taskGraph', [
  require('./enums').name,
  require('./taskBreakdown').name,
  require('../subgraph/subgraphModule').name
]);
module.exports.directive('taskGraph', [function() {
  return {
    replace: false,
    scope: {
      hideClosed: '='
    },
    templateUrl: 'partials/todo/taskGraph.html',
    controller: ['$scope', '$http', 'lime.client.todo.enums.statuses', Controller]
  };
}]);

// XXX I am not happy with this controller code
// - it is stupid ugly
function Controller($scope, $http, statusService) {
  statusService.ready.then(function() {
    var params = {};
    if($scope.hideClosed)
      params.status = statusService.getNonClosed();

    // TODO should the list be queried by the graph? shouldn't this list be provided to it?
    $http.get('/rest/todo/tasks', { params: params }).success(function(data) {
      $scope.taskList = data.list;

      // TODO get the newGraph stuff out of the controller
      var newGraph = {
        nodes: [],
        links: []
      };

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
    }); // end $http get
  }); // end status.ready
}

function getColor(task) {
  //if(statuses[task.status].category === '2') return '#7f7f7f';
  if(!task.parent) return '#ff7f0e';
  //if(!task.children.length) return '#337ab7';

  return '#000000';
}
