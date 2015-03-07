'use strict';
// I should just use a bug tracker or something

module.exports = angular.module('lime.client.todo', [])
.factory('lime.client.todo.list', function() {
  return [
    {
      title: 'High Level Planning',
      description: 'We can go to a room, pick up the gold, go to the exit, leave. ' +
      'We can do these actions independently, but we need a single plan to do them all.' +
      'Likewise, we don\'t astar to have to plan the WHOLE thing at once, we want to solve each step independently.',
      tasks: [
        'How do we specify these goals independently; is it a list of goals (do x, then do y)?',
        'How do we figure what these goals should be (dependency graph? ~ this is a harder problem)?',
      ]
    },
    {
      title: 'Unit Tests',
      description: 'Really, this is more like an integration test. But we need something at this higher level. ' +
      'The unit tests in lime test each thing independently. We need to test how they interact with each other, ' +
      'how each of these intended use cases works. ' +
      'Ultimately, I want to use these tests to debug and improve astar, ' +
      'to figure ensure that all our many tools operate as desired, ' +
      'to keep the whole project working.',
      tasks: [
        'use client to generate a room; save this as our example',
        'server: goal room',
      ]
    },
  ];
})
.controller('lime.client.todo.displaylist', [
  '$scope',
  'lime.client.todo.list',
  function($scope, list) {
    $scope.list = list;
  }
])
;
