'use strict';

module.exports = angular.module('lime.client.todo.enums', []);
module.exports.service('lime.client.todo.enums.statuses', createService('/rest/todo/statuses', {
  0: { display: 'Start', class: 'identified' },
  1: { display: 'Being Addressed', class: 'open' },
  2: { display: 'Finished', class: 'closed' },
}));
module.exports.service('lime.client.todo.enums.types', createService('/rest/todo/types'));
module.exports.service('lime.client.todo.enums.priorities', createService('/rest/todo/priorities'));

function createService(path, categories) {
  return [
    '$q',
    '$http',
    function($q, $http) {
      var instance = {};

      instance.categories = categories;

      instance.update = function() {
        var deferred = $q.defer();
        $http.get(path).success(function(data) {
          instance.list = data.list.sort(function(a, b) { return b.order - a.order; });
          instance.map = data.list.reduce(function(ret, obj) { ret[obj.id] = obj; return ret; }, {});
          deferred.resolve();
        });
        return (instance.ready = deferred.promise);
      };

      // initialize data
      instance.update();

      return instance;
    }
  ];
}
