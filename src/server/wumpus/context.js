'use strict';
var _ = require('lodash');

var actuator = require('lime/src/planning/actuator');
var config = require('lime/src/config');
var discrete = require('lime/src/planning/primitives/discrete');
var ideas = require('lime/src/database/ideas');
var links = require('lime/src/database/links');
var number = require('lime/src/planning/primitives/number');
var scheduler = require('lime/src/planning/scheduler');
var subgraph = require('lime/src/database/subgraph');

var discreteActuators = require('./actuators/discreteActuators');
var wumpusSensors = require('./actuators/wumpusSensors');

var ERROR_RANGE = 0.001;
links.create('wumpus_sense_agent_dir');
links.create('wumpus_sense_agent_loc');
links.create('wumpus_sense_hasPit');
links.create('wumpus_sense_hasGold');
links.create('wumpus_sense_hasExit');
links.create('wumpus_sense_hasWon');
links.create('wumpus_sense_hasAlive');
links.create('wumpus_room_door');
links.create('wumpus_room_loc_x');
links.create('wumpus_room_loc_y');

// create the actions that we can use
['left', 'right', 'up', 'grab', 'exit'].forEach(function(a) {
  actuator.actions['wumpus_known_discrete_'+a] = function() { socket.emit('action', a); };
});

var socket;
var gameConfig;

// the subgraph the represents the context
exports.subgraph = undefined;
// name -> subgraph.vertex_id
exports.keys = {};
// name -> idea
// should be same name as used in keys
// convenience mapping from for subgraph.vertices[keys].idea
exports.idea = function(name) { return exports.subgraph.getIdea(exports.keys[name]); };


exports.setup = function(s, c) {
  console.log('setup');

  if(socket) {
    s.emit('message', 'I can only deal with one thing at a time.');
    return;
  }

  // for now, we only know how to handle the basics
  if(!_.isEqual(c.game, _.merge(_.cloneDeep(c.game), {
    //chance: 'deterministic', // stochastic (this has been relaxed and is part of the core)
    grain: 'discrete', // continuous
    observable: 'fully', // partially
    timing: 'static', // dynamic
    agents: 'single', // multi
    apriori: 'known', // unknown
    player: 'lemon' // person
  }))) {
    s.emit('message', 'I don\'t know how to deal with this.');
    return;
  }

  socket = s;
  gameConfig = c;
  getDiscreteContext();
  exports.idea('room_coord').update({name: 'room_coord', scale: 1/c.room.spacing});
  s.emit('message', 'Connected');
};

exports.cleanup = function() {
  console.log('cleanup');
  gameConfig = undefined;
  socket = undefined;
  exports.subgraph = undefined;
  exports.keys = {};
//  exports.ideas = {};
  config.save();
};


var getDiscreteContext = function() {
  exports.subgraph = new subgraph.Subgraph();

  // context
  exports.keys.wumpus_world = exports.subgraph.addVertex(subgraph.matcher.id, ideas.context('wumpus_world'));

  // actions
  exports.keys.action_left = exports.subgraph.addVertex(subgraph.matcher.exact, {name:'action:left'});
  exports.keys.action_right = exports.subgraph.addVertex(subgraph.matcher.exact, {name:'action:right'});
  exports.keys.action_up = exports.subgraph.addVertex(subgraph.matcher.exact, {name:'action:up'});
  exports.keys.action_grab = exports.subgraph.addVertex(subgraph.matcher.exact, {name:'action:grab'});
  exports.keys.action_exit = exports.subgraph.addVertex(subgraph.matcher.exact, {name:'action:exit'});
  exports.keys.action_CaeActions = exports.subgraph.addVertex(subgraph.matcher.exact, {name:'action:CaeActions'});
  exports.subgraph.addEdge(exports.keys.action_left, links.list.thought_description, exports.keys.wumpus_world);
  exports.subgraph.addEdge(exports.keys.action_right, links.list.thought_description, exports.keys.wumpus_world);
  exports.subgraph.addEdge(exports.keys.action_up, links.list.thought_description, exports.keys.wumpus_world);
  exports.subgraph.addEdge(exports.keys.action_grab, links.list.thought_description, exports.keys.wumpus_world);
  exports.subgraph.addEdge(exports.keys.action_exit, links.list.thought_description, exports.keys.wumpus_world);
  exports.subgraph.addEdge(exports.keys.action_CaeActions, links.list.thought_description, exports.keys.wumpus_world);
  // sensors
  exports.keys.agent_inside_room = exports.subgraph.addVertex(subgraph.matcher.exact, {name:'sensor:agent_inside_room'});
  exports.subgraph.addEdge(exports.keys.agent_inside_room, links.list.thought_description, exports.keys.wumpus_world);

  // directions
  exports.keys.directions = exports.subgraph.addVertex(subgraph.matcher.similar, discrete.definitions.similar);
  exports.subgraph.addEdge(exports.keys.directions, links.list.context, exports.keys.wumpus_world);
  exports.subgraph.addEdge(
    exports.keys.directions,
    links.list.thought_description,
    exports.subgraph.addVertex(subgraph.matcher.exact, {name:'compass'})
  );

  // agent type
  exports.keys.agent = exports.subgraph.addVertex(subgraph.matcher.exact, {name:'agent'});
  exports.subgraph.addEdge(exports.keys.agent, links.list.context, exports.keys.wumpus_world);
  // room type
  exports.keys.room = exports.subgraph.addVertex(subgraph.matcher.exact, {name:'room'});
  exports.subgraph.addEdge(exports.keys.room, links.list.context, exports.keys.wumpus_world);
  // room coord
  exports.keys.room_coord = exports.subgraph.addVertex(subgraph.matcher.similar, {name:'room_coord'});
  exports.subgraph.addEdge(exports.keys.room_coord, links.list.context, exports.keys.wumpus_world);
  // radius unit
  exports.keys.radius_unit = exports.subgraph.addVertex(subgraph.matcher.similar, {name:'radius_unit'});
  exports.subgraph.addEdge(exports.keys.radius_unit, links.list.context, exports.keys.wumpus_world);

  var results = subgraph.search(exports.subgraph);
  if(results.length === 0) {
    console.log('create discrete context');

    // context
    var wumpus_world = ideas.context('wumpus_world');

    // actions
    var action_left = ideas.create({name:'action:left'});
    var action_right = ideas.create({name:'action:right'});
    var action_up = ideas.create({name:'action:up'});
    var action_grab = ideas.create({name:'action:grab'});
    var action_exit = ideas.create({name:'action:exit'});
    var action_CaeActions = ideas.create({name:'action:CaeActions'});
    action_left.link(links.list.thought_description, wumpus_world);
    action_right.link(links.list.thought_description, wumpus_world);
    action_up.link(links.list.thought_description, wumpus_world);
    action_grab.link(links.list.thought_description, wumpus_world);
    action_exit.link(links.list.thought_description, wumpus_world);
    action_CaeActions.link(links.list.thought_description, wumpus_world);
    // sensors
    var agent_inside_room = ideas.create({name:'sensor:agent_inside_room'});
    agent_inside_room.link(links.list.thought_description, wumpus_world);

    // directions
    var directions = discrete.definitions.create(['east', 'south', 'west', 'north'], 'cycle');
    var compass = ideas.create({name:'compass'});
    directions.link(links.list.context, wumpus_world);
    directions.link(links.list.thought_description, compass);

    // agent type
    var agent = ideas.create({name:'agent'});
    agent.link(links.list.context, wumpus_world);
    // room type
    var room = ideas.create({name:'room'});
    room.link(links.list.context, wumpus_world);
    // room coord
    var room_coord = ideas.create({name:'room_coord'});
    room_coord.link(links.list.context, wumpus_world);
    // radius unit
    var radius_unit = ideas.create({name:'radius_unit'});
    radius_unit.link(links.list.context, wumpus_world);


    // create actuators
    var stub_room = discreteActuators.adjacentRoomStub(directions, agent, room, room_coord, [wumpus_world]);
    discreteActuators.turn(directions, agent, -1, 'left', [stub_room, action_left]);
    discreteActuators.turn(directions, agent, 1, 'right', [stub_room, action_right]);
    discreteActuators.forward(directions, agent, room, room_coord, [stub_room, action_up]);
    discreteActuators.grab(agent, room, [wumpus_world, action_grab]);
    discreteActuators.exit(agent, room, [wumpus_world, action_exit]);
    discreteActuators.deathByPit(agent, room, [wumpus_world, action_CaeActions]);
    // create sensors

    wumpusSensors.agent_inside_room(agent, room_coord, room, radius_unit, [agent_inside_room]);


    // save our the ideas
    [
      wumpus_world, stub_room, action_left, action_right, action_up, action_grab, action_exit, action_CaeActions, ideas.context('blueprint'),
      agent_inside_room, ideas.context('sensor'),
      directions, compass, agent, room, room_coord, radius_unit
    ].forEach(ideas.save);
    // now search again
    results = subgraph.search(exports.subgraph);
  }

  // finish loading
  if(results.length === 1) {
    console.log('loaded discrete context');
  } else {
    console.log('error: found ' + results.length + ' discrete contexts');
    exports.subgraph = results[0];
  }
};


exports.sense = function(state) {
  if(!socket) return;
  if(!exports.keys.instance) {
    var instance = ideas.create();
    instance.link(links.list.type_of, exports.idea('wumpus_world'));
    exports.keys.instance = exports.subgraph.addVertex(subgraph.matcher.id, instance);
    exports.subgraph.addEdge(exports.keys.instance, links.list.type_of, exports.keys.wumpus_world);


    //
    // rooms
    //
    // create a discrete definition with these rooms (room id as the value)
    var roomDefinition = discrete.definitions.create(state.rooms.map(function(r) { return r.id; }));
    roomDefinition.link(links.list.context, instance);
    roomDefinition.link(links.list.thought_description, ideas.create({name:'room def'}));
    exports.keys.roomDefinition = exports.subgraph.addVertex(subgraph.matcher.similar, discrete.definitions.similar);
    exports.subgraph.addEdge(exports.keys.roomDefinition, links.list.context, exports.keys.instance);
    exports.subgraph.addEdge(
      exports.keys.roomDefinition,
      links.list.thought_description,
      exports.subgraph.addVertex(subgraph.matcher.exact, {name:'room def'})
    );


    var roomInstances = [];
    var roomKeys = [];
    state.rooms.forEach(function(room) {

      var roomInstance = ideas.create(discrete.cast({value: room.id, unit: roomDefinition.id}));
      roomDefinition.link(links.list.thought_description, roomInstance);
      roomInstance.link(links.list.type_of, exports.idea('room'));
      roomInstance.link(links.list['wumpus_room_loc_x'], ideas.create(number.cast({value: number.value(room.x), unit: exports.idea('room_coord').id})));
      roomInstance.link(links.list['wumpus_room_loc_y'], ideas.create(number.cast({value: number.value(room.y), unit: exports.idea('room_coord').id})));
      roomInstance.link(links.list.property, ideas.create(number.cast({value: number.value(gameConfig.room.radius), unit: exports.idea('radius_unit').id})));
      var roomHasPit = ideas.create(discrete.cast({value:room.hasPit, unit: discrete.definitions.list.boolean}));
      var roomHasGold = ideas.create(discrete.cast({value:room.hasGold, unit: discrete.definitions.list.boolean}));
      var roomHasExit = ideas.create(discrete.cast({value:room.hasExit, unit: discrete.definitions.list.boolean}));
      roomInstance.link(links.list['wumpus_sense_hasPit'], roomHasPit);
      roomInstance.link(links.list['wumpus_sense_hasGold'], roomHasGold);
      roomInstance.link(links.list['wumpus_sense_hasExit'], roomHasExit);

      var keys_rI = exports.subgraph.addVertex(subgraph.matcher.id, roomInstance);
      exports.subgraph.addEdge(exports.keys.roomDefinition, links.list.thought_description, keys_rI);
      exports.subgraph.addEdge(keys_rI, links.list.type_of, exports.keys.room);
      exports.subgraph.addEdge(keys_rI, links.list['wumpus_room_loc_x'],
        exports.subgraph.addVertex(subgraph.matcher.number, number.cast({value: number.value(room.x), unit: exports.idea('room_coord').id})), -1);
      exports.subgraph.addEdge(keys_rI, links.list['wumpus_room_loc_y'],
        exports.subgraph.addVertex(subgraph.matcher.number, number.cast({value: number.value(room.y), unit: exports.idea('room_coord').id})), -1);
      exports.subgraph.addEdge(keys_rI, links.list.property,
        exports.subgraph.addVertex(subgraph.matcher.number, number.cast({value: number.value(gameConfig.room.radius), unit: exports.idea('radius_unit').id})), -1);
      exports.subgraph.addEdge(keys_rI, links.list['wumpus_sense_hasPit'],
        exports.subgraph.addVertex(subgraph.matcher.id, roomHasPit));
      exports.subgraph.addEdge(keys_rI, links.list['wumpus_sense_hasGold'],
        exports.subgraph.addVertex(subgraph.matcher.id, roomHasGold, {transitionable:true}));
      exports.subgraph.addEdge(keys_rI, links.list['wumpus_sense_hasExit'],
        exports.subgraph.addVertex(subgraph.matcher.id, roomHasExit));

      // link rooms together (check existing rooms)
      // this is similar to for(j=0; j<length) for(i=j+1; j<length)
      for(var i=0; i<roomInstances.length; i++) {
        var r2 = state.rooms[i];
        var south, north;
        var east, west;
        if(Math.abs(room.x-r2.x) < ERROR_RANGE) {
          // check north / south
          if(Math.abs(room.y-r2.y - gameConfig.room.spacing) < ERROR_RANGE) {
            // room > r2
            // room is south of r2
            // if the agent is in r2 and goes south, then the agent is in room
            south = ideas.create(discrete.cast({value: 'south', unit: exports.idea('directions').id }));
            north = ideas.create(discrete.cast({value: 'north', unit: exports.idea('directions').id }));
            roomInstances[i].link(links.list['wumpus_room_door'], south);
            south.link(links.list['wumpus_room_door'], roomInstance);
            roomInstance.link(links.list['wumpus_room_door'], north);
            north.link(links.list['wumpus_room_door'], roomInstances[i]);

            south = exports.subgraph.addVertex(subgraph.matcher.id, south);
            north = exports.subgraph.addVertex(subgraph.matcher.id, north);
            exports.subgraph.addEdge(roomKeys[i], links.list['wumpus_room_door'], south);
            exports.subgraph.addEdge(south, links.list['wumpus_room_door'], keys_rI);
            exports.subgraph.addEdge(keys_rI, links.list['wumpus_room_door'], north);
            exports.subgraph.addEdge(north, links.list['wumpus_room_door'], roomKeys[i]);
          }
          if(Math.abs(r2.y-room.y - gameConfig.room.spacing) < ERROR_RANGE) {
            // r2 > room
            // r2 is south of room
            // if the agent is in room and goes south, then the agent is in r2
            north = ideas.create(discrete.cast({value: 'north', unit: exports.idea('directions').id }));
            south = ideas.create(discrete.cast({value: 'south', unit: exports.idea('directions').id }));
            roomInstances[i].link(links.list['wumpus_room_door'], north);
            north.link(links.list['wumpus_room_door'], roomInstance);
            roomInstance.link(links.list['wumpus_room_door'], south);
            south.link(links.list['wumpus_room_door'], roomInstances[i]);

            north = exports.subgraph.addVertex(subgraph.matcher.id, north);
            south = exports.subgraph.addVertex(subgraph.matcher.id, south);
            exports.subgraph.addEdge(roomKeys[i], links.list['wumpus_room_door'], north);
            exports.subgraph.addEdge(north, links.list['wumpus_room_door'], keys_rI);
            exports.subgraph.addEdge(keys_rI, links.list['wumpus_room_door'], south);
            exports.subgraph.addEdge(south, links.list['wumpus_room_door'], roomKeys[i]);
          }
        } else if(Math.abs(room.y-r2.y) < ERROR_RANGE) {
          // check east/west
          if(Math.abs(room.x-r2.x - gameConfig.room.spacing) < ERROR_RANGE) {
            // room > r2
            // room is east of r2
            // if the agent is in r2 and goes east, then the agent is in room
            east = ideas.create(discrete.cast({value: 'east', unit: exports.idea('directions').id }));
            west = ideas.create(discrete.cast({value: 'west', unit: exports.idea('directions').id }));
            roomInstances[i].link(links.list['wumpus_room_door'], east);
            east.link(links.list['wumpus_room_door'], roomInstance);
            roomInstance.link(links.list['wumpus_room_door'], west);
            west.link(links.list['wumpus_room_door'], roomInstances[i]);

            east = exports.subgraph.addVertex(subgraph.matcher.id, east);
            west = exports.subgraph.addVertex(subgraph.matcher.id, west);
            exports.subgraph.addEdge(roomKeys[i], links.list['wumpus_room_door'], east);
            exports.subgraph.addEdge(east, links.list['wumpus_room_door'], keys_rI);
            exports.subgraph.addEdge(keys_rI, links.list['wumpus_room_door'], west);
            exports.subgraph.addEdge(west, links.list['wumpus_room_door'], roomKeys[i]);
          }
          if(Math.abs(r2.x-room.x - gameConfig.room.spacing) < ERROR_RANGE) {
            // r2 > room
            // r2 is east of room
            // if the agent is in room and goes east, then the agent is in r2
            west = ideas.create(discrete.cast({value: 'west', unit: exports.idea('directions').id }));
            east = ideas.create(discrete.cast({value: 'east', unit: exports.idea('directions').id }));
            roomInstances[i].link(links.list['wumpus_room_door'], west);
            west.link(links.list['wumpus_room_door'], roomInstance);
            roomInstance.link(links.list['wumpus_room_door'], east);
            east.link(links.list['wumpus_room_door'], roomInstances[i]);

            west = exports.subgraph.addVertex(subgraph.matcher.id, west);
            east = exports.subgraph.addVertex(subgraph.matcher.id, east);
            exports.subgraph.addEdge(roomKeys[i], links.list['wumpus_room_door'], west);
            exports.subgraph.addEdge(west, links.list['wumpus_room_door'], keys_rI);
            exports.subgraph.addEdge(keys_rI, links.list['wumpus_room_door'], east);
            exports.subgraph.addEdge(east, links.list['wumpus_room_door'], roomKeys[i]);
          }
        }
      }

      roomInstances.push(roomInstance);
      roomKeys.push(keys_rI);
    }); // end rooms.forEach


    //
    // agent
    //
    var agentInstance = ideas.create();
    var agentDirection = ideas.create();
    var agentLocation = ideas.create();
    var agentLocX = ideas.create();
    var agentLocY = ideas.create();
    var agentHasGold = ideas.create();
    var agentHasWon = ideas.create();
    var agentHasAlive = ideas.create();
    instance.link(links.list.thought_description, agentInstance);
    agentInstance.link(links.list.type_of, exports.idea('agent'));
    agentInstance.link(links.list['wumpus_sense_agent_dir'], agentDirection);
    agentInstance.link(links.list['wumpus_sense_agent_loc'], agentLocation);
    agentLocation.link(links.list['wumpus_room_loc_x'], agentLocX);
    agentLocation.link(links.list['wumpus_room_loc_y'], agentLocY);
    agentInstance.link(links.list['wumpus_sense_hasGold'], agentHasGold);
    agentInstance.link(links.list['wumpus_sense_hasWon'], agentHasWon);
    agentInstance.link(links.list['wumpus_sense_hasAlive'], agentHasAlive);

    exports.keys.agentInstance = exports.subgraph.addVertex(subgraph.matcher.filler);
    exports.keys.agentDirection = exports.subgraph.addVertex(subgraph.matcher.id, agentDirection, {transitionable:true});
    exports.keys.agentLocation = exports.subgraph.addVertex(subgraph.matcher.id, agentLocation, {transitionable:true});
    exports.keys.agentLocX = exports.subgraph.addVertex(subgraph.matcher.id, agentLocX, {transitionable:true});
    exports.keys.agentLocY = exports.subgraph.addVertex(subgraph.matcher.id, agentLocY, {transitionable:true});
    exports.keys.agentHasGold = exports.subgraph.addVertex(subgraph.matcher.id, agentHasGold, {transitionable:true});
    exports.keys.agentHasWon = exports.subgraph.addVertex(subgraph.matcher.id, agentHasWon, {transitionable:true});
    exports.keys.agentHasAlive = exports.subgraph.addVertex(subgraph.matcher.id, agentHasAlive, {transitionable:true});
    exports.subgraph.addEdge(exports.keys.instance, links.list.thought_description, exports.keys.agentInstance);
    exports.subgraph.addEdge(exports.keys.agentInstance, links.list.type_of, exports.keys.agent);
    exports.subgraph.addEdge(exports.keys.agentInstance, links.list['wumpus_sense_agent_dir'], exports.keys.agentDirection);
    exports.subgraph.addEdge(exports.keys.agentInstance, links.list['wumpus_sense_agent_loc'], exports.keys.agentLocation);
    exports.subgraph.addEdge(exports.keys.agentLocation, links.list['wumpus_room_loc_x'], exports.keys.agentLocX);
    exports.subgraph.addEdge(exports.keys.agentLocation, links.list['wumpus_room_loc_y'], exports.keys.agentLocY);
    exports.subgraph.addEdge(exports.keys.agentInstance, links.list['wumpus_sense_hasGold'], exports.keys.agentHasGold);
    exports.subgraph.addEdge(exports.keys.agentInstance, links.list['wumpus_sense_hasWon'], exports.keys.agentHasWon);
    exports.subgraph.addEdge(exports.keys.agentInstance, links.list['wumpus_sense_hasAlive'], exports.keys.agentHasAlive);


    config.save();
    subgraph.search(exports.subgraph);
  //  console.log('discrete concrete: ' + exports.subgraph.concrete);
  } // end if context.keys.instance (init word from context)

  senseRooms(state.rooms);
  senseAgent(state.agent);

  scheduler.check();
};

function senseRooms(rooms) {
  // find the existing room and senses
  // update the properties of the room
  rooms.forEach(function(room) {
    var sg = new subgraph.Subgraph();

    // the values we want to update
    var roomHasGold = sg.addVertex(subgraph.matcher.similar, {unit: discrete.definitions.list.boolean});

    // configure the rest of the subgraph
    var currentRoom = sg.addVertex(subgraph.matcher.discrete,
      discrete.cast({value: room.id, unit: exports.idea('roomDefinition').id}));
    sg.addEdge(currentRoom, links.list.type_of, sg.addVertex(subgraph.matcher.id, exports.idea('room').id));
    sg.addEdge(currentRoom, links.list['wumpus_sense_hasGold'], roomHasGold);
    // find
    subgraph.search(sg);
    if(!sg.concrete) throw new Error('Cannot find room');

    // update the values
    // TODO log when the sensed value differs from the internal value
    sg.getIdea(roomHasGold).update(discrete.cast({value: room.hasGold, unit: discrete.definitions.list.boolean}));
  });
}

function senseAgent(agent) {
  // TODO log when the sensed value differs from the internal value

  // update agent direction
  // note: the -= needs to be second since we are comparing against zero
  var dir;
  while(agent.r < 0) agent.r += Math.PI*2;
  while(agent.r > Math.PI*2) agent.r -= Math.PI*2;
  if(Math.abs(agent.r-0) < ERROR_RANGE)
    dir = 'east';
  if(Math.abs(agent.r-Math.PI/2) < ERROR_RANGE)
    dir = 'south';
  if(Math.abs(agent.r-Math.PI) < ERROR_RANGE)
    dir = 'west';
  if(Math.abs(agent.r-Math.PI*3/2) < ERROR_RANGE)
    dir = 'north';
  exports.idea('agentDirection').update(discrete.cast({value: dir, unit: exports.idea('directions').id}));

  // update agent location
  exports.idea('agentLocation').update(discrete.cast({value: agent.inRoomIds[0], unit: exports.idea('roomDefinition').id}));
  exports.idea('agentLocX').update(number.cast({value: number.value(agent.x), unit: exports.idea('room_coord').id}));
  exports.idea('agentLocY').update(number.cast({value: number.value(agent.y), unit: exports.idea('room_coord').id}));

  // update agent bool props
  exports.idea('agentHasGold').update(discrete.cast({value: agent.hasGold, unit: discrete.definitions.list.boolean}));
  exports.idea('agentHasWon').update(discrete.cast({value: agent.win, unit: discrete.definitions.list.boolean}));
  exports.idea('agentHasAlive').update(discrete.cast({value: agent.alive, unit: discrete.definitions.list.boolean}));

  exports.subgraph.deleteData(
    exports.keys.agentDirection,
    exports.keys.agentLocation,
    exports.keys.agentLocX,
    exports.keys.agentLocY,
    exports.keys.agentHasGold,
    exports.keys.agentHasWon,
    exports.keys.agentHasAlive
  );
}