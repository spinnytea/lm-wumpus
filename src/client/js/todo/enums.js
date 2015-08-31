'use strict';

module.exports = angular.module('lime.client.todo.enums', []);
module.exports.service('lime.client.todo.enums.statuses', createService('/rest/todo/statuses', {
  0: { display: 'Start', class: '', order: 2 },
  1: { display: 'Being Addressed', class: 'text-primary', order: 3 },
  2: { display: 'Closed', class: 'closed text-muted', order: 1 },
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
          if(categories) {
            data.list.forEach(function(obj) {
              Object.defineProperty(obj, 'categoryClass', { value: categories[obj.category].class, enumerable: false });
              Object.defineProperty(obj, 'categoryOrder', { value: categories[obj.category].order, enumerable: false });
            });
          }

          instance.list = data.list.sort(function(a, b) { return b.order - a.order; });
          instance.map = data.list.reduce(function(ret, obj) { ret[obj.id] = obj; return ret; }, {});
          deferred.resolve();
        });
        return (instance.ready = deferred.promise);
      };

      instance.counts = function() {
        var deferred = $q.defer();
        $http.get(path + '/count').success(function(data) { deferred.resolve(data); });
        return deferred.promise;
      };

      // initialize data
      instance.update();

      return instance;
    }
  ];
}
