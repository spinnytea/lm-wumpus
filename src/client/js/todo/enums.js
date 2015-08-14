'use strict';

module.exports = angular.module('lime.client.todo.enums', []);
module.exports.service('lime.client.todo.enums.statuses', createService('/rest/todo/statuses'));
module.exports.service('lime.client.todo.enums.types', createService('/rest/todo/types'));
module.exports.service('lime.client.todo.enums.priorities', createService('/rest/todo/priorities'));

function createService(path) {
  return [
    '$q',
    '$http',
    function($q, $http) {
      var instance = {};

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
