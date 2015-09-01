'use strict';
module.exports = angular.module('lime.client.todo.taskGraph', [
  require('./enums').name,
  require('../subgraph/subgraphModule').name
]);
module.exports.directive('taskGraph', [function() {
  return {
    replace: false,
    scope: {
      theList: '=taskGraph'
    },
    template: '<div render-subgraph="myData"></div>',
    controller: ['$scope', Controller]
  };
}]);

function Controller($scope) {
  $scope.myData = {
    nodes: [],
    links: []
  };

  $scope.$on('$destroy', $scope.$watch('theList', function(list) {
    if(list) $scope.myData = buildData(list);
  }, true));
}


function getColor(task) {
  //if(statuses[task.status].category === '2') return '#7f7f7f';
  if(!task.parent) return '#ff7f0e';
  //if(!task.children.length) return '#337ab7';

  return '#000000';
}

function buildData(list) {
  var newGraph = {
    nodes: [],
    links: []
  };

  // the notes is supposed to be a list
  // and the link source/target are position within that list
  // so... we need to save the mapping
  var task_idx = {};

  // register all the nodes
  list.forEach(function(task) {
    task_idx[task.id] = newGraph.nodes.length;
    newGraph.nodes.push({ id: task.id, name: task.name, color: getColor(task) });
  });

  // add all the links
  list.forEach(function(task) {
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

  return newGraph;
}