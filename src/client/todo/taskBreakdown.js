'use strict';
// the set of badges for the different enums

module.exports = angular.module('lime.client.todo.taskBreakdown', [
  require('./enums').name
]);
module.exports.directive('taskBreakdown', [function() {
  return {
    replace: false,
    scope: {
      theList: '=taskBreakdown'
    },
    templateUrl: 'todo/taskBreakdown.html',
    controller: ['$scope', '$q', 'lime.client.todo.enums.statuses', 'lime.client.todo.enums.types', 'lime.client.todo.enums.priorities', Controller]
  };
}]);

function Controller($scope, $q, statusService, typeService, priorityService) {
  $q.all([typeService.ready, statusService.ready, priorityService.ready]).then(function() {
    $scope.types = typeService.list;
    $scope.statuses = statusService.list;
    $scope.priorities = priorityService.list;

    $scope.$on('$destroy', $scope.$watch('theList', function(list) {
      if(list) {
        $scope.typeCounts = typeService.list.reduce(function(counts, e) { counts[e.id] = 0; return counts; }, {});
        $scope.statusCounts = statusService.list.reduce(function(counts, e) { counts[e.id] = 0; return counts; }, {});
        $scope.priorityCounts = priorityService.list.reduce(function(counts, e) { counts[e.id] = 0; return counts; }, {});

        list.forEach(function(task) {
          $scope.typeCounts[task.type]++;
          $scope.statusCounts[task.status]++;
          $scope.priorityCounts[task.priority]++;
        });
      }
    }, true)); // XXX can we get rid of the deep watch in taskBreakdown?
  });
}