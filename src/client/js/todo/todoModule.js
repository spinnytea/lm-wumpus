'use strict';
// I should just use a bug tracker or something

module.exports = angular.module('lime.client.todo', [])
.factory('lime.client.todo.list', function() {
  var list = [
    {
      title: 'High Level Planning',
      description: 'We can go to a room, pick up the gold, go to the exit, leave. ' +
      'We can do these actions independently, but we need a single plan to do them all. ' +
      'Likewise, we don\'t astar to have to plan the WHOLE thing at once, we want to solve each step independently.',
      tasks: [
        { text: 'How do we specify these goals independently; is it a list of goals (do x, then do y)?', status: 'done' },
        { text: 'How do we figure what these goals should be (dependency graph? ~ this is a harder problem)? (this is for later)', status: 'wontfix' },
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
        { text: 'refactor tests', status: 'none' },
      ]
    },
    {
      title: 'lm-wumpus general stuff',
      description: 'These are just some nice-to-haves with lm-wumpus. ' +
        'None of them are really important now that we have a working prototype, but it wouldn\'t hurt to have them.',
      tasks: [
        { text: 'add a delay for discrete so we can watch it play - where does this go?', status: 'none' },
        { text: 'sense: alive, can only take actions when alive; allow up to enter pit; planning should prune this', status: 'none' },
        { text: 'display the current plan on the UI', status: 'none' },
        { text: 'make some sprites for the game', status: 'none' },
        { text: 'fix the context direction', status: 'none' },
        { text: 'allow "goto exit" and "goto gold" to work, even if there is "nothing to do"', status: 'none' },
        { text: 'allow "play" to skip sections, then skip that part', status: 'none' },
        { text: 'update subgraphModule to use the new subgraph.stringify format; remove the "wumpusModule.wumpusSocket.context" back-conversion', status: 'none' },
        { text: 'address in code TODOs', status: 'none' },
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
      title: 'Timing',
      description: 'Run LM in timing:dynamic mode',
      tasks: [
      ]
    },
    {
      title: 'Observable',
      description: 'Run LM in observable:partially mode',
      tasks: [
        { text: 'explore until current goal is found', status: 'none' },
        { text: 'how do we tell the agent to avoid pits?', status: 'none' },
      ]
    },
    {
      title: 'Chance',
      description: 'Run LM in chance:stochastic mode',
      tasks: [
        { text: 'check expected state against actual state; replan if mismatch', status: 'none' },
      ]
    },
  ];

  list.forEach(function(group) {
    group.tasks.forEach(function(task) {
      switch(task.status) {
        case 'none':
          task.icon = 'fa-circle-o';
          break;
        case 'inprogress':
          task.icon = 'fa-spinner fa-spin';
          break;
        case 'wontfix':
          task.icon = 'fa-times';
          break;
        case 'done':
          task.icon = 'fa-check';
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
;
