'use strict';

module.exports = angular.module('lime.client.todo.taskBreakdown', [
  require('./enums').name
]);
module.exports.directive('taskBreakdown', [function() {
  return {
    replace: false,
    scope: {
      theList: '=taskBreakdown'
    },
    templateUrl: 'partials/todo/taskBreakdown.html',
    controller: ['$scope', '$q', 'lime.client.todo.enums.statuses', 'lime.client.todo.enums.types', Controller]
  };
}]);

function Controller($scope, $q, statusService, typeService) {
  $q.all([typeService.list, statusService.list]).then(function() {
    $scope.types = typeService.list;
    $scope.statuses = statusService.list;

    $scope.$on('$destroy', $scope.$watch('theList', function(list) {
      if(list) {
        $scope.typeCounts = typeService.list.reduce(function(counts, e) { counts[e.id] = 0; return counts; }, {});
        $scope.statusCounts = statusService.list.reduce(function(counts, e) { counts[e.id] = 0; return counts; }, {});

        list.forEach(function(task) {
          $scope.typeCounts[task.type]++;
          $scope.statusCounts[task.status]++;
        });
      }
    }));
  });
}