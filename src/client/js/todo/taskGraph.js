'use strict';
var _ = require('lodash');

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
    controller: ['$scope', '$location', Controller]
  };
}]);

function Controller($scope, $location) {
  $scope.myData = {
    nodes: [],
    links: []
  };

  function navCallback(node) {
    $scope.$apply(function() {
      $location.path('/todo/tasks/' + node.id);
    });
  }

  $scope.$on('$destroy', $scope.$watch('theList', function(list) {
    if(list) $scope.myData = buildData(list, navCallback);
  }, true));
}


function getColor(task) {
  //if(statuses[task.status].category === '2') return '#7f7f7f';
  if(!task.parent) return '#ff7f0e';
  //if(!task.children.length) return '#337ab7';

  return '#000000';
}

function buildData(list, navCallback) {
  var newGraph = {
    nodes: [],
    links: []
  };

  // the notes is supposed to be a list
  // and the link source/target are position within that list
  // so... we need to save the mapping
  var task_idx = {};
  var heights = taskHeights(list);

  // register all the nodes
  list.forEach(function(task) {
    task_idx[task.id] = newGraph.nodes.length;
    var size = 4 + 2 * Math.sin(Math.PI*heights[task.id]/(heights._max*2));
    newGraph.nodes.push({ id: task.id, name: task.name, color: getColor(task), size: size, click: navCallback });
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

function taskHeights(list) {
  var heights = {};
  var map = _.indexBy(list, 'id');
  function recurse(id) {
    var task = map[id];
    if(!task) {
      heights[id] = 0;
    } else if(task.children && task.children.length) {
      task.children.forEach(recurse);
      heights[id] = task.children.reduce(function(sum, c) { return sum + heights[c]; }, 0);
    } else {
      heights[id] = 1;
    }
  }

  list.forEach(function(task) {
    if(!task.parent) {
      recurse(task.id);
      heights._max = Math.max(heights[task.id], heights._max||0);
    }
  });

  return heights;
}