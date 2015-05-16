'use strict';

var _ = require('lodash');

var blueprint = require('lime/src/planning/primitives/blueprint');
var discrete = require('lime/src/planning/primitives/discrete');
var links = require('lime/src/database/links');
var planner = require('lime/src/planning/planner');
var subgraph = require('lime/src/database/subgraph');

// TODO refactor this context based on the config it can handle (see context.setup)
var context = require('./context');

exports.setup = function(io) {
  io.on('connection', function(socket) {
    // Note: only meant for one client
    socket.on('config', function(config) {
      context.setup(socket, config);
    });
    socket.on('disconnect', context.cleanup);

    // super debug
    // this is a round-trip
    // we are sending a command to the server, and sending that command right back
    // --
    // later, lemon will send these command itself
    socket.on('command', function(str) { socket.emit('action', str); socket.emit('message', 'echo'); });
    socket.on('context', function() { socket.emit('context', subgraph.stringify(context.subgraph, true)); });

    // take some action based on a message from the client
    socket.on('actuator', exports.setup.actuator(socket));
    socket.on('goal', exports.setup.goal(socket));
    socket.on('sense', context.sense);
  });
};

exports.setup.actuator = function(socket) {
  return function(str) {
    // find the list of actions for this str
    if(!context.keys['action_'+str]) {
      socket.emit('message', 'actuator:'+str+'> not found');
      return;
    }

    // load the actions
    var list = blueprint.list([context.idea('action_'+str), context.idea('wumpus_world')]).map(blueprint.load);
    // build a state // TODO should this be in context (probably instead of subgraph)
    var bs = new blueprint.State(context.subgraph, list);

    // find the first action that works and do it
    var success = list.some(function(a) {
      var result = a.tryTransition(bs);
      if(result.length > 0) {
        a.runBlueprint(bs, result[0]);
        if(result.length > 1)
          console.log('more than one option?? ('+result.length+')');
        return true;
      }
      return false;
    });

    if(success) {
      socket.emit('message', 'actuator:'+str+'> potassium');
    } else {
      // if none of the actions work, report a message
      socket.emit('message', 'actuator:'+str+'> could not apply');
    }
  };
};

exports.setup.goal = function(socket) {
  return function(str) {

    var goal;
    var createGoal = exports.setup.createGoal;

    if(str.indexOf('room') === 0) {
      goal = createGoal.room(+str.substring(str.indexOf(' ')+1)).goal;
    } else if(str.indexOf('goto gold') === 0) {
      goal = createGoal.goto(links.list.wumpus_sense_hasGold).goal;
    } else if(str.indexOf('goto exit') === 0) {
      goal = createGoal.goto(links.list.wumpus_sense_hasExit).goal;
    } else if(str.indexOf('gold') === 0) {
      goal = createGoal.gold().goal;
    } else if(str.indexOf('win') === 0) {
      goal = createGoal.win().goal;
    } else if(str.indexOf('play') === 0) {
      goal = [
        createGoal.goto(links.list.wumpus_sense_hasGold).goal,
        createGoal.gold().goal,
        createGoal.goto(links.list.wumpus_sense_hasExit).goal,
        createGoal.win().goal
      ];
    } else {
      socket.emit('message', 'goal:'+str+'> not a valid goal');
      return;
    }

    var list = blueprint.list([context.idea('wumpus_world')]).map(blueprint.load);
    var start = new blueprint.State(context.subgraph, list);
    if(_.isArray(goal)) {
      goal = goal.map(function(g) { return new blueprint.State(g, list); });

      if(start.matches(_.last(goal))) {
        socket.emit('message', 'goal:'+str+'> here\'s the plan: do nothing');
        return;
      }
    } else {
      goal = new blueprint.State(goal, list);

      if(start.matches(goal)) {
        socket.emit('message', 'goal:'+str+'> here\'s the plan: do nothing');
        return;
      }
    }

    // TODO save serial plan
    // - let me run it from the UI
    // - make a delay
    var sp = planner.create(start, goal);

    if(sp) {
      var result = sp.tryTransition(start);
      if(result.length > 0) {
        sp.runBlueprint(start, result[0]);
        if(result.length > 1)
          console.log('more than one result?? ('+result.length+')');
        socket.emit('message', 'goal:'+str+'> oxygen potassium');
      } else {
        socket.emit('message', 'goal:'+str+'> could not apply the path ...?');
      }
    } else {
      socket.emit('message', 'goal:'+str+'> could not find a path');
    }
  };
};

exports.setup.createGoal = {
  agent: function() {
    var ctx = {};
    var goal = ctx.goal = new subgraph.Subgraph();

    ctx.agentInstance = goal.addVertex(subgraph.matcher.filler);
    goal.addEdge(
      goal.addVertex(subgraph.matcher.id, context.idea('instance')),
      links.list.thought_description,
      ctx.agentInstance);
    goal.addEdge(ctx.agentInstance, links.list.type_of,
      goal.addVertex(subgraph.matcher.id, context.idea('agent')));
    ctx.roomDefinition = goal.addVertex(subgraph.matcher.id, context.idea('roomDefinition'));

    return ctx;
  },

  // the agent needs to be in the location we provide
  room: function(roomId) {
    var ctx = exports.setup.createGoal.agent();
    var goal = ctx.goal;

    // room location
    ctx.roomInstance = goal.addVertex(subgraph.matcher.discrete, { value: roomId, unit: context.idea('roomDefinition').id });
    goal.addEdge(ctx.roomDefinition, links.list.thought_description, ctx.roomInstance);
    ctx.roomLocX = goal.addVertex(subgraph.matcher.similar, {unit: context.idea('room_coord').id});
    ctx.roomLocY = goal.addVertex(subgraph.matcher.similar, {unit: context.idea('room_coord').id});
    goal.addEdge(ctx.roomInstance, links.list.wumpus_room_loc_x, ctx.roomLocX);
    goal.addEdge(ctx.roomInstance, links.list.wumpus_room_loc_y, ctx.roomLocY);

    // the agent is at that room location
    ctx.agentLocation = goal.addVertex(subgraph.matcher.discrete, ctx.roomInstance, {transitionable:true,matchRef:true});
    goal.addEdge(ctx.agentInstance, links.list.wumpus_sense_agent_loc, ctx.agentLocation);
    ctx.agentLocX = goal.addVertex(subgraph.matcher.number, ctx.roomLocX, {transitionable:true,matchRef:true});
    ctx.agentLocY = goal.addVertex(subgraph.matcher.number, ctx.roomLocY, {transitionable:true,matchRef:true});
    goal.addEdge(ctx.agentLocation, links.list.wumpus_room_loc_x, ctx.agentLocX);
    goal.addEdge(ctx.agentLocation, links.list.wumpus_room_loc_y, ctx.agentLocY);

    return ctx;
  },

  goto: function(propLink) {
    var ctx = exports.setup.createGoal.agent();
    var goal = ctx.goal;

    // room with the gold
    ctx.roomInstance = goal.addVertex(subgraph.matcher.similar, { unit: context.idea('roomDefinition').id });
    goal.addEdge(ctx.roomDefinition, links.list.thought_description, ctx.roomInstance);
    ctx.roomHasProp = goal.addVertex(subgraph.matcher.discrete, discrete.cast({value:true, unit: discrete.definitions.list.boolean}), {transitionable:false});
    goal.addEdge(ctx.roomInstance, propLink, ctx.roomHasProp);

    // the agent is at that room
    ctx.agentLocation = goal.addVertex(subgraph.matcher.discrete, ctx.roomInstance, {transitionable:true,matchRef:true});
    goal.addEdge(ctx.agentInstance, links.list.wumpus_sense_agent_loc, ctx.agentLocation);

    return ctx;
  },

  // the agent needs to have the gold
  gold: function() {
    var ctx = exports.setup.createGoal.agent();
    var goal = ctx.goal;

    // the agent has the gold
    ctx.agentHasGold = goal.addVertex(subgraph.matcher.discrete, {value:true, unit: discrete.definitions.list.boolean}, {transitionable:true});
    goal.addEdge(ctx.agentInstance, links.list.wumpus_sense_hasGold, ctx.agentHasGold);

    return ctx;
  },

  // the agent needs to exit
  win: function() {
    var ctx = exports.setup.createGoal.agent();
    var goal = ctx.goal;

    ctx.agentHasWon = goal.addVertex(subgraph.matcher.discrete, {value:true, unit: discrete.definitions.list.boolean}, {transitionable:true});
    goal.addEdge(ctx.agentInstance, links.list.wumpus_sense_hasWon, ctx.agentHasWon);

    return ctx;
  }
};