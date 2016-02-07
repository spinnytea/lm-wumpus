'use strict';

var formData = emptyFormData();
function emptyFormData() {
  return { hideClosed: true };
}

module.exports = angular.module('lime.client.todo.queries', [
  require('./enums').name,
  'ngRoute'
]);
module.exports.controller('lime.client.todo.queriesController', [
  '$scope',
  '$http',
  '$routeParams',
  'lime.client.todo.enums.statuses',
  'lime.client.todo.enums.types',
  'lime.client.todo.enums.priorities',
  function($scope, $http, $routeParams, statusService, typeService, priorityService) {
    $scope.tasks = [];
    $scope.formData = formData;
    var statuses;
    var priorities;
    statusService.ready.then(function() { $scope.statuses = statusService.list; statuses = statusService.map; });
    typeService.ready.then(function() { $scope.types = typeService.list; });
    priorityService.ready.then(function() { $scope.priorities = priorityService.list; priorities = priorityService.map; });

    $scope.searching = false;
    $scope.search = function() {
      $scope.searching = true;

      var params = angular.copy(formData);
      delete params.hideClosed;

      // since status is a form element
      // we need to ignore the hideClosed if status is set
      if(formData.hideClosed && !formData.status)
        params.status = statusService.getNonClosed();

      $http.get('/rest/todo/tasks', { params: params }).success(function(data) {
        $scope.searching = false;

        $scope.tasks.splice(0);
        Array.prototype.push.apply($scope.tasks, data.list.sort(function(a, b) {
          // sort by status category
          if(statuses[b.status].categoryOrder !== statuses[a.status].categoryOrder)
            return statuses[b.status].categoryOrder - statuses[a.status].categoryOrder;

          // sort on priority
          if(b.priority !== a.priority)
            return priorities[b.priority].order - priorities[a.priority].order;

          // lexicographical sort on ID; highest first
          if(b.id.length !== a.id.length)
            return b.id.length - a.id.length;
          // IDs must not be equal
          return (b.id > a.id ? 1 : -1);
        }));
      });
    };

    if($routeParams.tags) {
      $scope.formData = formData = emptyFormData();
      formData.tags = $routeParams.tags;
      if(angular.isString(formData.tags))
        formData.tags = [formData.tags];
    }

    // if there is at least one field with specificity (other than hideClosed), then perform an initial search
    if(Object.keys(formData).some(function(key) { return (key !== 'hideClosed' && key !== 'tags' && formData[key]); }) || (formData && formData.tags && formData.tags.length)) {
      statusService.ready.then(function() {
        $scope.search();
      });
    }
  }
]);