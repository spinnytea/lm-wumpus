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

// @param directions: the directions unit idea
// @param agent: the agent type idea
// @param cycle_value: -1 or 1
// @param action_str: 'left' or 'right'
// @param actuator_context: a list of contexts to apply to the idea
exports.turn = function(directions, agent, cycle_value, action_str, actuator_context) {
  // the agent has a direction
  // (literally, that's the only requirement)
  var a = new actuator.Action();
  var agentInstance = a.requirements.addVertex(subgraph.matcher.filler);
  var agentDirection = a.requirements.addVertex(subgraph.matcher.similar, {unit: directions.id}, {transitionable:true});
  a.requirements.addEdge(
    agentInstance,
    links.list.type_of,
    a.requirements.addVertex(subgraph.matcher.id, agent)
  );
  a.requirements.addEdge(agentInstance, links.list.wumpus_sense_agent_dir, agentDirection);


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

  // the agent is in a room and facing a particular direction
  var agentInstance = a.requirements.addVertex(subgraph.matcher.filler);
  var agentDirection = a.requirements.addVertex(subgraph.matcher.similar, {unit: directions.id});
  // we don't have the roomDefinition at this point
  // besides, we want it to work with any room (not just this game)
  var agentLocation = a.requirements.addVertex(subgraph.matcher.filler, undefined, {transitionable:true});
  var agentLocX = a.requirements.addVertex(subgraph.matcher.similar, {unit:room_coord.id}, {transitionable:true});
  var agentLocY = a.requirements.addVertex(subgraph.matcher.similar, {unit:room_coord.id}, {transitionable:true});
  a.requirements.addEdge(
    agentInstance,
    links.list.type_of,
    a.requirements.addVertex(subgraph.matcher.id, agent)
  );
  a.requirements.addEdge(agentInstance, links.list.wumpus_sense_agent_dir, agentDirection);
  a.requirements.addEdge(agentInstance, links.list.wumpus_sense_agent_loc, agentLocation);
  a.requirements.addEdge(agentLocation, links.list.wumpus_room_loc_x, agentLocX);
  a.requirements.addEdge(agentLocation, links.list.wumpus_room_loc_y, agentLocY);


  // there must be a door/room in that direction
  var currentRoom = a.requirements.addVertex(subgraph.matcher.discrete, agentLocation, {matchRef:true});
  var roomDirection = a.requirements.addVertex(subgraph.matcher.discrete, agentDirection, {matchRef:true});
  var targetRoom = a.requirements.addVertex(subgraph.matcher.filler);
  a.requirements.addEdge(currentRoom, links.list.wumpus_room_door, roomDirection);
  a.requirements.addEdge(roomDirection, links.list.wumpus_room_door, targetRoom, -1);
  var roomType = a.requirements.addVertex(subgraph.matcher.id, room);
  a.requirements.addEdge(currentRoom, links.list.type_of, roomType);
  // consider this link at a lower priority (find the target room last)
  a.requirements.addEdge(targetRoom, links.list.type_of, roomType, -1);
  // targetRoom must not have a pit
  var roomHasPit = a.requirements.addVertex(subgraph.matcher.discrete, {value:false, unit: discrete.definitions.list.boolean});
  a.requirements.addEdge(targetRoom, links.list.wumpus_sense_hasPit, roomHasPit, -2);
  var roomLocX = a.requirements.addVertex(subgraph.matcher.similar, {unit:room_coord.id});
  var roomLocY = a.requirements.addVertex(subgraph.matcher.similar, {unit:room_coord.id});
  a.requirements.addEdge(targetRoom, links.list.wumpus_room_loc_x, roomLocX);
  a.requirements.addEdge(targetRoom, links.list.wumpus_room_loc_y, roomLocY);


  // move through the door
  a.transitions.push({ vertex_id: agentLocation, replace_id: targetRoom });
  a.transitions.push({ vertex_id: agentLocX, replace_id: roomLocX, cost: 0 });
  a.transitions.push({ vertex_id: agentLocY, replace_id: roomLocY, cost: 0 });


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

  // the agent is in a room
  // the agent does not have gold
  var agentInstance = a.requirements.addVertex(subgraph.matcher.filler);
  var agentLocation = a.requirements.addVertex(subgraph.matcher.filler);
  var agentHasGold = a.requirements.addVertex(subgraph.matcher.discrete, {value:false, unit: discrete.definitions.list.boolean}, {transitionable:true});
  a.requirements.addEdge(
    agentInstance,
    links.list.type_of,
    a.requirements.addVertex(subgraph.matcher.id, agent),
    5
  );
  a.requirements.addEdge(agentInstance, links.list.wumpus_sense_agent_loc, agentLocation, 4);
  a.requirements.addEdge(agentInstance, links.list.wumpus_sense_hasGold, agentHasGold, 4);

  // that room has gold
  var currentRoom = a.requirements.addVertex(subgraph.matcher.discrete, agentLocation, {matchRef:true});
  var roomType = a.requirements.addVertex(subgraph.matcher.id, room);
  var roomHasGold = a.requirements.addVertex(subgraph.matcher.discrete, {value:true, unit: discrete.definitions.list.boolean}, {transitionable:true});
  a.requirements.addEdge(currentRoom, links.list.type_of, roomType, 2);
  a.requirements.addEdge(currentRoom, links.list.wumpus_sense_hasGold, roomHasGold, 1);


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

  // the agent is in a room
  // the agent has gold
  var agentInstance = a.requirements.addVertex(subgraph.matcher.filler);
  var agentLocation = a.requirements.addVertex(subgraph.matcher.filler);
  var agentHasGold = a.requirements.addVertex(subgraph.matcher.discrete, {value:true, unit: discrete.definitions.list.boolean}, {transitionable:true});
  var agentHasWon = a.requirements.addVertex(subgraph.matcher.discrete, {value:false, unit: discrete.definitions.list.boolean}, {transitionable:true});
  a.requirements.addEdge(
    agentInstance,
    links.list.type_of,
    a.requirements.addVertex(subgraph.matcher.id, agent),
    5
  );
  a.requirements.addEdge(agentInstance, links.list.wumpus_sense_agent_loc, agentLocation, 4);
  a.requirements.addEdge(agentInstance, links.list.wumpus_sense_hasGold, agentHasGold, 4);
  a.requirements.addEdge(agentInstance, links.list.wumpus_sense_hasWon, agentHasWon, 4);

  // that room has an exit
  var currentRoom = a.requirements.addVertex(subgraph.matcher.discrete, agentLocation, {matchRef:true});
  var roomType = a.requirements.addVertex(subgraph.matcher.id, room);
  var roomHasExit = a.requirements.addVertex(subgraph.matcher.discrete, {value:true, unit: discrete.definitions.list.boolean});
  a.requirements.addEdge(currentRoom, links.list.type_of, roomType, 2);
  a.requirements.addEdge(currentRoom, links.list.wumpus_sense_hasExit, roomHasExit, 1);


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
  var a = new stub.Action();

  // the agent is in a room
  var agentInstance = a.requirements.addVertex(subgraph.matcher.filler);
  var agentLocation = a.requirements.addVertex(subgraph.matcher.filler, undefined, {transitionable:true});
  var agentLocX = a.requirements.addVertex(subgraph.matcher.similar, {unit:room_coord.id}, {transitionable:true});
  var agentLocY = a.requirements.addVertex(subgraph.matcher.similar, {unit:room_coord.id}, {transitionable:true});
  a.requirements.addEdge(
    agentInstance,
    links.list.type_of,
    a.requirements.addVertex(subgraph.matcher.id, agent)
  );
  a.requirements.addEdge(agentInstance, links.list.wumpus_sense_agent_loc, agentLocation);
  a.requirements.addEdge(agentLocation, links.list.wumpus_room_loc_x, agentLocX);
  a.requirements.addEdge(agentLocation, links.list.wumpus_room_loc_y, agentLocY);


  // there is an adjacent room
  var currentRoom = a.requirements.addVertex(subgraph.matcher.discrete, agentLocation, {matchRef:true});
  var roomDirection = a.requirements.addVertex(subgraph.matcher.similar, {unit: directions.id});
  var targetRoom = a.requirements.addVertex(subgraph.matcher.filler);
  a.requirements.addEdge(currentRoom, links.list.wumpus_room_door, roomDirection);
  a.requirements.addEdge(roomDirection, links.list.wumpus_room_door, targetRoom, -1);
  var roomType = a.requirements.addVertex(subgraph.matcher.id, room);
  a.requirements.addEdge(currentRoom, links.list.type_of, roomType);
  a.requirements.addEdge(targetRoom, links.list.type_of, roomType, -1);
  var roomLocX = a.requirements.addVertex(subgraph.matcher.similar, {unit:room_coord.id});
  var roomLocY = a.requirements.addVertex(subgraph.matcher.similar, {unit:room_coord.id});
  a.requirements.addEdge(targetRoom, links.list.wumpus_room_loc_x, roomLocX);
  a.requirements.addEdge(targetRoom, links.list.wumpus_room_loc_y, roomLocY);


  // move through the door
  a.transitions.push({ vertex_id: agentLocation, replace_id: targetRoom, cost: 0 });
  a.transitions.push({ vertex_id: agentLocX, replace_id: roomLocX, cost: 0 });
  a.transitions.push({ vertex_id: agentLocY, replace_id: roomLocY, cost: 0 });


  a.save();
  actuator_context.forEach(function(ac) {
    ideas.load(a.idea).link(links.list.context, ac);
  });
  ideas.save(a.idea);
};
