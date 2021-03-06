'use strict';
// this name is redundant, but helps to distinguish it from the primitive 'discrete' which means something different
// config.game.grain === 'discrete'

var actuator = require('lime/src/planning/actuator');
var discrete = require('lime/src/planning/primitives/discrete');
var ideas = require('lime/src/database/ideas');
var links = require('lime/src/database/links');
var stub = require('lime/src/planning/stub');
var subgraph = require('lime/src/database/subgraph');
// TODO incorporate points
// TODO require the agent to be alive to take action; do not disallow moving into a pit
// TODO optimize the nodes to expand to minimize branching (pay attention to rooms)

// @param directions: the directions unit idea
// @param agent: the agent type idea
// @param cycle_value: -1 or 1
// @param action_str: 'left' or 'right'
// @param actuator_context: a list of contexts to apply to the idea
exports.turn = function(directions, agent, cycle_value, action_str, actuator_context) {
  // the agent is alive
  // the agent has a direction
  var a = new actuator.Action();
  var agentInstance = a.requirements.addVertex(subgraph.matcher.filler);
  var agentHasAlive = a.requirements.addVertex(subgraph.matcher.discrete, {value:true, unit: discrete.definitions.list.boolean});
  var agentDirection = a.requirements.addVertex(subgraph.matcher.similar, {unit: directions.id}, {transitionable:true});
  a.requirements.addEdge(agentInstance, links.list.type_of, a.requirements.addVertex(subgraph.matcher.id, agent), { pref: 6 });
  a.requirements.addEdge(agentInstance, links.list['wumpus_sense_hasAlive'], agentHasAlive, { pref: 5 });
  a.requirements.addEdge(agentInstance, links.list['wumpus_sense_agent_dir'], agentDirection, { pref: 4 });


  // change the agent's direction
  a.transitions.push({ vertex_id: agentDirection, cycle: {value: cycle_value, unit: directions.id}, cost: 2 });


  a.action = 'wumpus_known_discrete_'+action_str;
  a.save();
  actuator_context.forEach(function(ac) {
    ideas.load(a.idea).link(links.list.context, ac);
  });
  ideas.save(a.idea);
};


// @param agent: the agent type idea
// @param room: the room type idea
// @param actuator_context: a list of contexts to apply to the idea
exports.forward = function(directions, agent, room, room_coord, actuator_context) {
  var a = new actuator.Action();

  // the agent is alive
  // the agent is in a room and facing a particular direction
  var agentInstance = a.requirements.addVertex(subgraph.matcher.filler);
  var agentHasAlive = a.requirements.addVertex(subgraph.matcher.discrete, {value:true, unit: discrete.definitions.list.boolean});
  var agentDirection = a.requirements.addVertex(subgraph.matcher.similar, {unit: directions.id});
  // we don't have the roomDefinition at this point
  // besides, we want it to work with any room (not just this game)
  var agentLocation = a.requirements.addVertex(subgraph.matcher.filler, undefined, {transitionable:true});
  var agentLocX = a.requirements.addVertex(subgraph.matcher.similar, {unit:room_coord.id}, {transitionable:true});
  var agentLocY = a.requirements.addVertex(subgraph.matcher.similar, {unit:room_coord.id}, {transitionable:true});
  a.requirements.addEdge(agentInstance, links.list.type_of, a.requirements.addVertex(subgraph.matcher.id, agent), { pref: 6 });
  a.requirements.addEdge(agentInstance, links.list['wumpus_sense_hasAlive'], agentHasAlive, { pref: 5 });
  a.requirements.addEdge(agentInstance, links.list['wumpus_sense_agent_dir'], agentDirection, { pref: 4 });
  a.requirements.addEdge(agentInstance, links.list['wumpus_sense_agent_loc'], agentLocation, { pref: 4 });
  a.requirements.addEdge(agentLocation, links.list['wumpus_room_loc_x'], agentLocX, { pref: 4 });
  a.requirements.addEdge(agentLocation, links.list['wumpus_room_loc_y'], agentLocY, { pref: 4 });

  // there must be a door/room in that direction
  var currentRoom = a.requirements.addVertex(subgraph.matcher.discrete, agentLocation, {matchRef:true});
  var roomDirection = a.requirements.addVertex(subgraph.matcher.discrete, agentDirection, {matchRef:true});
  var targetRoom = a.requirements.addVertex(subgraph.matcher.filler);
  var roomType = a.requirements.addVertex(subgraph.matcher.id, room);
  var targetRoomLocX = a.requirements.addVertex(subgraph.matcher.similar, {unit:room_coord.id});
  var targetRoomLocY = a.requirements.addVertex(subgraph.matcher.similar, {unit:room_coord.id});
  a.requirements.addEdge(currentRoom, links.list.wumpus_room_door, roomDirection, { pref: 3 });
  a.requirements.addEdge(roomDirection, links.list.wumpus_room_door, targetRoom, { pref: 2 });
  a.requirements.addEdge(currentRoom, links.list.type_of, roomType, { pref: 3 });
  a.requirements.addEdge(targetRoom, links.list.type_of, roomType, { pref: 3 });
  a.requirements.addEdge(targetRoom, links.list.wumpus_room_loc_x, targetRoomLocX, { pref: 1 });
  a.requirements.addEdge(targetRoom, links.list.wumpus_room_loc_y, targetRoomLocY, { pref: 1 });


  // move through the door
  a.transitions.push({ vertex_id: agentLocation, replace_id: targetRoom });
  a.transitions.push({ vertex_id: agentLocX, replace_id: targetRoomLocX, cost: 0 });
  a.transitions.push({ vertex_id: agentLocY, replace_id: targetRoomLocY, cost: 0 });


  a.action = 'wumpus_known_discrete_up';
  a.save();
  actuator_context.forEach(function(ac) {
    ideas.load(a.idea).link(links.list.context, ac);
  });
  ideas.save(a.idea);
};


// @param agent: the agent type idea
// @param room: the room type idea
// @param actuator_context: a list of contexts to apply to the idea
exports.grab = function(agent, room, actuator_context) {
  var a = new actuator.Action();

  // the agent is alive
  // the agent is in a room
  // the agent does not have gold
  var agentInstance = a.requirements.addVertex(subgraph.matcher.filler);
  var agentHasAlive = a.requirements.addVertex(subgraph.matcher.discrete, {value:true, unit: discrete.definitions.list.boolean});
  var agentLocation = a.requirements.addVertex(subgraph.matcher.filler);
  var agentHasGold = a.requirements.addVertex(subgraph.matcher.discrete, {value:false, unit: discrete.definitions.list.boolean}, {transitionable:true});
  a.requirements.addEdge(agentInstance, links.list.type_of, a.requirements.addVertex(subgraph.matcher.id, agent), { pref: 6 });
  a.requirements.addEdge(agentInstance, links.list['wumpus_sense_hasAlive'], agentHasAlive, { pref: 5 });
  a.requirements.addEdge(agentInstance, links.list['wumpus_sense_agent_loc'], agentLocation, { pref: 4 });
  a.requirements.addEdge(agentInstance, links.list['wumpus_sense_hasGold'], agentHasGold, { pref: 5 });

  // that room has gold
  var currentRoom = a.requirements.addVertex(subgraph.matcher.discrete, agentLocation, {matchRef:true});
  var roomType = a.requirements.addVertex(subgraph.matcher.id, room);
  var roomHasGold = a.requirements.addVertex(subgraph.matcher.discrete, {value:true, unit: discrete.definitions.list.boolean}, {transitionable:true});
  a.requirements.addEdge(currentRoom, links.list.type_of, roomType, { pref: 3 });
  a.requirements.addEdge(currentRoom, links.list.wumpus_sense_hasGold, roomHasGold, { pref: 3 });


  // pick up gold
  a.transitions.push({ vertex_id: agentHasGold, replace: {value:true, unit: discrete.definitions.list.boolean} });
  a.transitions.push({ vertex_id: roomHasGold, replace: {value:false, unit: discrete.definitions.list.boolean} });


  a.action = 'wumpus_known_discrete_grab';
  a.save();
  actuator_context.forEach(function(ac) {
    ideas.load(a.idea).link(links.list.context, ac);
  });
  ideas.save(a.idea);
};


// @param agent: the agent type idea
// @param room: the room type idea
// @param actuator_context: a list of contexts to apply to the idea
exports.exit = function(agent, room, actuator_context) {
  var a = new actuator.Action();

  // the agent is alive
  // the agent is in a room
  // the agent has gold
  var agentInstance = a.requirements.addVertex(subgraph.matcher.filler);
  var agentHasAlive = a.requirements.addVertex(subgraph.matcher.discrete, {value:true, unit: discrete.definitions.list.boolean});
  var agentLocation = a.requirements.addVertex(subgraph.matcher.filler);
  var agentHasGold = a.requirements.addVertex(subgraph.matcher.discrete, {value:true, unit: discrete.definitions.list.boolean}, {transitionable:true});
  var agentHasWon = a.requirements.addVertex(subgraph.matcher.discrete, {value:false, unit: discrete.definitions.list.boolean}, {transitionable:true});
  a.requirements.addEdge(agentInstance, links.list.type_of, a.requirements.addVertex(subgraph.matcher.id, agent), { pref: 6 });
  a.requirements.addEdge(agentInstance, links.list['wumpus_sense_hasAlive'], agentHasAlive, { pref: 5 });
  a.requirements.addEdge(agentInstance, links.list['wumpus_sense_agent_loc'], agentLocation, { pref: 4 });
  a.requirements.addEdge(agentInstance, links.list['wumpus_sense_hasGold'], agentHasGold, { pref: 5 });
  a.requirements.addEdge(agentInstance, links.list['wumpus_sense_hasWon'], agentHasWon, { pref: 5 });

  // that room has an exit
  var currentRoom = a.requirements.addVertex(subgraph.matcher.discrete, agentLocation, {matchRef:true});
  var roomType = a.requirements.addVertex(subgraph.matcher.id, room);
  var roomHasExit = a.requirements.addVertex(subgraph.matcher.discrete, {value:true, unit: discrete.definitions.list.boolean});
  a.requirements.addEdge(currentRoom, links.list.type_of, roomType, { pref: 3 });
  a.requirements.addEdge(currentRoom, links.list.wumpus_sense_hasExit, roomHasExit, { pref: 3 });


  // the agent has won
  a.transitions.push({ vertex_id: agentHasWon, replace: {value:true, unit: discrete.definitions.list.boolean} });


  a.action = 'wumpus_known_discrete_exit';
  a.save();
  actuator_context.forEach(function(ac) {
    ideas.load(a.idea).link(links.list.context, ac);
  });
  ideas.save(a.idea);
};


// @param agent: the agent type idea
// @param room: the room type idea
// @param actuator_context: a list of contexts to apply to the idea
exports.adjacentRoomStub = function(directions, agent, room, room_coord, actuator_context) {
  var a = new stub.Action('immediate');

  // the agent is alive
  // the agent is in a room
  var agentInstance = a.requirements.addVertex(subgraph.matcher.filler);
  var agentHasAlive = a.requirements.addVertex(subgraph.matcher.discrete, {value:true, unit: discrete.definitions.list.boolean});
  var agentLocation = a.requirements.addVertex(subgraph.matcher.filler, undefined, {transitionable:true});
  var agentLocX = a.requirements.addVertex(subgraph.matcher.similar, {unit:room_coord.id}, {transitionable:true});
  var agentLocY = a.requirements.addVertex(subgraph.matcher.similar, {unit:room_coord.id}, {transitionable:true});
  a.requirements.addEdge(agentInstance, links.list.type_of, a.requirements.addVertex(subgraph.matcher.id, agent), { pref: 6 });
  a.requirements.addEdge(agentInstance, links.list['wumpus_sense_hasAlive'], agentHasAlive, { pref: 5 });
  a.requirements.addEdge(agentInstance, links.list['wumpus_sense_agent_loc'], agentLocation, { pref: 4 });
  a.requirements.addEdge(agentLocation, links.list['wumpus_room_loc_x'], agentLocX, { pref: 4 });
  a.requirements.addEdge(agentLocation, links.list['wumpus_room_loc_y'], agentLocY, { pref: 4 });

  // there is an adjacent room
  var currentRoom = a.requirements.addVertex(subgraph.matcher.discrete, agentLocation, {matchRef:true});
  var roomDirection = a.requirements.addVertex(subgraph.matcher.similar, {unit: directions.id});
  var targetRoom = a.requirements.addVertex(subgraph.matcher.filler);
  var roomType = a.requirements.addVertex(subgraph.matcher.id, room);
  var targetRoomLocX = a.requirements.addVertex(subgraph.matcher.similar, {unit:room_coord.id});
  var targetRoomLocY = a.requirements.addVertex(subgraph.matcher.similar, {unit:room_coord.id});
  a.requirements.addEdge(currentRoom, links.list.wumpus_room_door, roomDirection, { pref: 3 });
  a.requirements.addEdge(roomDirection, links.list.wumpus_room_door, targetRoom, { pref: 2 });
  a.requirements.addEdge(currentRoom, links.list.type_of, roomType, { pref: 3 });
  a.requirements.addEdge(targetRoom, links.list.type_of, roomType, { pref: 1 });
  a.requirements.addEdge(targetRoom, links.list.wumpus_room_loc_x, targetRoomLocX, { pref: 1 });
  a.requirements.addEdge(targetRoom, links.list.wumpus_room_loc_y, targetRoomLocY, { pref: 1 });


  // move through the door
  a.transitions.push({ vertex_id: agentLocation, replace_id: targetRoom, cost: 0 });
  a.transitions.push({ vertex_id: agentLocX, replace_id: targetRoomLocX, cost: 0 });
  a.transitions.push({ vertex_id: agentLocY, replace_id: targetRoomLocY, cost: 0 });


  a.save();
  actuator_context.forEach(function(ac) {
    ideas.load(a.idea).link(links.list.context, ac);
  });
  ideas.save(a.idea);

  return a.idea;
};

exports.deathByPit = function(agent, room, actuator_context) {
  var a = new actuator.Action();
  a.causeAndEffect = true;

  // the agent is alive
  // the agent is in a room
  var agentInstance = a.requirements.addVertex(subgraph.matcher.filler);
  var agentHasAlive = a.requirements.addVertex(subgraph.matcher.discrete, {value:true, unit: discrete.definitions.list.boolean}, {transitionable:true});
  var agentLocation = a.requirements.addVertex(subgraph.matcher.filler);
  a.requirements.addEdge(agentInstance, links.list.type_of, a.requirements.addVertex(subgraph.matcher.id, agent), { pref: 6 });
  a.requirements.addEdge(agentInstance, links.list['wumpus_sense_hasAlive'], agentHasAlive, { pref: 5 });
  a.requirements.addEdge(agentInstance, links.list['wumpus_sense_agent_loc'], agentLocation, { pref: 4 });

  // that room has a pit
  var currentRoom = a.requirements.addVertex(subgraph.matcher.discrete, agentLocation, {matchRef:true});
  var roomType = a.requirements.addVertex(subgraph.matcher.id, room);
  var roomHasPit = a.requirements.addVertex(subgraph.matcher.discrete, {value:true, unit: discrete.definitions.list.boolean});
  a.requirements.addEdge(currentRoom, links.list.type_of, roomType, { pref: 3 });
  a.requirements.addEdge(currentRoom, links.list.wumpus_sense_hasPit, roomHasPit, { pref: 6 });


  // the agent has died
  a.transitions.push({ vertex_id: agentHasAlive, replace: {value:false, unit: discrete.definitions.list.boolean} });


  a.save();
  actuator_context.forEach(function(ac) {
    ideas.load(a.idea).link(links.list.context, ac);
  });
  ideas.save(a.idea);

  return a.idea;
};
