'use strict';
// I should just use a bug tracker or something

module.exports = angular.module('lime.client.todo', [
  require('./taskDirective').name,
  'ngRoute'
])
.config([
  '$routeProvider',
  function($routeProvider) {
    $routeProvider.when('/todo', {
      templateUrl: 'partials/todo/home.html',
      controller: 'lime.client.todo.home',
    }).when('/todo/list', {
      templateUrl: 'partials/todo/list.html',
      controller: 'lime.client.todo.displaylist',
    }).when('/todo/tasks/create', {
      templateUrl: 'partials/todo/createTask.html',
      controller: 'lime.client.todo.createTask',
    });
  }
])
.factory('lime.client.todo.list', function() {
  var list = [
    {
      title: 'High Level Planning',
      description: 'We can go to a room, pick up the gold, go to the exit, leave. ' +
      'We can do these actions independently, but we need a single plan to do them all. ' +
      'Likewise, we don\'t astar to have to plan the WHOLE thing at once, we want to solve each step independently.',
      tasks: [
        { text: 'How do we specify these goals independently; is it a list of goals (do x, then do y)?', status: 'done' },
        { text: 'How do we figure what these goals should be (dependency graph? ~ this is a harder problem)? (this is for later)', status: 'future' },
        { text: 'do hierarchy planning with basic: rooms then turns', status: 'done' },
      ]
    },
    {
      title: 'Integration Tests',
      description: 'Really, this is more like an integration test. But we need something at this higher level. ' +
      'The unit tests in lime test each thing independently. We need to test how they interact with each other, ' +
      'how each of these intended use cases works. ' +
      'Ultimately, I want to use these tests to debug and improve astar, ' +
      'to figure ensure that all our many tools operate as desired, ' +
      'to keep the whole project working.',
      tasks: [
        { text: 'use client to generate a room; save this as our example', status: 'done' },
        { text: 'astar in-depth test: create/solve room', status: 'done' },
        { text: 'server: actuator tests', status: 'done' },
        { text: 'server: goal room', status: 'done' },
        { text: 'agentLocation -> roomType (use in forward)', status: 'wontfix' },
        { text: 'refactor tests', status: 'inprogress' },
      ]
    },
    {
      title: 'lm-wumpus general stuff',
      description: 'These are just some nice-to-haves with lm-wumpus. ' +
        'None of them are really important now that we have a working prototype, but it wouldn\'t hurt to have them.',
      tasks: [
        { text: 'add a delay for discrete so we can watch it play - where does this go?', status: 'done' },
        { text: 'sense: alive, can only take actions when alive; allow up to enter pit; planning should prune this', status: 'done' },
        { text: 'display the current plan on the UI', status: 'inprogress',
          description: 'Needs to include fail/re-plan, needs to be more dynamic, allow plan to be canceled.' },
        { text: 'make some sprites for the game', status: 'none' },
        { text: 'fix the context direction', status: 'done' },
        { text: 'allow "goto exit" and "goto gold" to work, even if there is "nothing to do"', status: 'done' },
        { text: 'allow "play" to skip sections, then skip that part', status: 'done' },
        { text: 'update subgraphModule to use the new subgraph.stringify format; remove the "wumpusModule.wumpusSocket.context" back-conversion', status: 'done' },
        { text: 'address in code TODOs', status: 'none' },
        { text: 'make wumpus/config a thing, so we can go there directly', status: 'none' },
      ]
    },
    {
      title: 'Experience',
      description: 'You\'ve started thinking about it, start playing with it! Start with something simple like "turn left"',
      tasks: [
        { text: 'save experience', status: 'none', description: 'state -> action -> state' },
        { text: 'carve out a logic cycle', status: 'none', description: 'start with a separate entry point' },
        { text: 'recall experience', status: 'none' },
        { text: 'do science on experience', status: 'none', description: 'what mattered, what didn\'t' },
      ]
    },
    {
      title: 'Chance',
      description: 'Run LM in chance:stochastic mode',
      tasks: [
        { text: 'check expected state against actual state; replan if mismatch', status: 'done' },
      ]
    },
    {
      title: 'Grain',
      description: 'Run LM in grain:continuous mode',
      tasks: [
        { text: 'feature detection: identify rooms by loc', status: 'none' },
      ]
    },
    {
      title: 'Observable',
      description: 'Run LM in observable:partially mode',
      tasks: [
        { text: 'explore until current goal is found', status: 'none' },
        { text: 'how do we teach the agent to avoid pits?', status: 'none' },
        { text: 'how do we teach the agent that the gold glitters', status: 'none' },
        { text: 'navigate to nearest "unexplored room"', status: 'none',
          description: 'this is how the maze game wanders the state space' },
      ]
    },
    {
      title: 'Timing',
      description: 'Run LM in timing:dynamic mode',
      tasks: [
      ]
    },
    {
      title: 'Complications',
      description: 'Work in other types of complications that are environment simplifications',
      tasks: [
        { text: 'Sensor Noise: The values the sensors report aren\'t always perfect.', status: 'none' },
        { text: 'Changing Environment: The environment doesn\'t always stay the same; rooms change/pits move/wumpus moves', status: 'none',
          description: 'after you\'ve finished with a partially observable world' },
      ]
    },
  ];

  list.forEach(function(group) {
    group.tasks.forEach(function(task) {
      switch(task.status) {
        case 'none':
          task.icon = 'fa-circle-o';
          task.title = 'Recorded';
          break;
        case 'inprogress':
          task.icon = 'fa-spinner fa-spin';
          task.title = 'In Progress';
          break;
        case 'wontfix':
          task.icon = 'fa-times';
          task.title = 'Won\'t Fix';
          break;
        case 'future':
          task.icon = 'fa-share';
          task.title = 'Some Day...';
          break;
        case 'done':
          task.icon = 'fa-check';
          task.title = 'Done';
          break;
      }
    });
  });

  return list;
})
.controller('lime.client.todo.displaylist', [
  '$scope',
  'lime.client.todo.list',
  function($scope, list) {
    // there isn't really any interactivity to this view
    $scope.list = list;
  }
])
.controller('lime.client.todo.home', [
  '$scope',
  function($scope) {
    void($scope);
  }
])
.controller('lime.client.todo.createTask', [
  '$scope',
  '$location',
  function($scope, $location) {
    $scope.taskObject = {};

    $scope.goHome = function() {
      $location.path('/todo');
    };
  }
])
;
