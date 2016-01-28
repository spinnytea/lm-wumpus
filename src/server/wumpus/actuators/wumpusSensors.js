'use strict';
// TODO come up with some better names 'agent_inside_room' is the same name EVERYWHERE (omg), but each ref is a different impl
// TODO this isn't an actuator, why is a sensor in the actuators?

var hardcodedsensor = require('lime/src/sensor/hardcodedsensor');
var ideas = require('lime/src/database/ideas');
var links = require('lime/src/database/links');
var subgraph = require('lime/src/database/subgraph');


// TODO what about the agentLocation variable
// - with this link, the contents are now duplicate info; we don't need matchRef on the location
// - actually, the agentLocation as a matchRef doesn't work once the agent can be in more than one room
// - is this an indication that we can do away with matchRef stuff altogether?
// agentInstance --inside-> room
links.create('agent_inside_room');


exports.agent_inside_room = function(agent, room_coord, room, radius_unit, sensor_context) {
  var hs = new hardcodedsensor.Sensor();
  hs.sensor = 'agent_inside_room';
  var h_agent = hs.requirements.addVertex(subgraph.matcher.id, agent);
  var h_a_inst = hs.requirements.addVertex(subgraph.matcher.filler);
  var h_a_loc = hs.requirements.addVertex(subgraph.matcher.filler);
  var h_a_x = hs.requirements.addVertex(subgraph.matcher.similar, { unit: room_coord.id });
  var h_a_y = hs.requirements.addVertex(subgraph.matcher.similar, { unit: room_coord.id });
  var h_room_type = hs.requirements.addVertex(subgraph.matcher.id, room);
  var h_room = hs.requirements.addVertex(subgraph.matcher.filler);
  var h_r_x = hs.requirements.addVertex(subgraph.matcher.similar, { unit: room_coord.id });
  var h_r_y = hs.requirements.addVertex(subgraph.matcher.similar, { unit: room_coord.id });
  var h_r_r = hs.requirements.addVertex(subgraph.matcher.similar, { unit: radius_unit.id });

  hs.requirements.addEdge(h_a_inst, links.list.type_of, h_agent);
  hs.requirements.addEdge(h_a_inst, links.list['wumpus_sense_agent_loc'], h_a_loc);
  hs.requirements.addEdge(h_a_loc, links.list['wumpus_room_loc_x'], h_a_x);
  hs.requirements.addEdge(h_a_loc, links.list['wumpus_room_loc_y'], h_a_y);
  hs.requirements.addEdge(h_room, links.list.type_of, h_room_type);
  hs.requirements.addEdge(h_room, links.list['wumpus_room_loc_x'], h_r_x);
  hs.requirements.addEdge(h_room, links.list['wumpus_room_loc_y'], h_r_y);
  hs.requirements.addEdge(h_room, links.list.property, h_r_r);

  hs.groupfn = 'byOuterIdea';
  hs.groupConfig = h_a_inst;

  // for simplicity, these values are hardcoded in the agent_inside_room
  if(h_a_inst !== '1') throw new Error('subgraph vertex_ids have changed. Update the sensor.');
  if(h_a_x !== '3') throw new Error('subgraph vertex_ids have changed. Update the sensor.');
  if(h_a_y !== '4') throw new Error('subgraph vertex_ids have changed. Update the sensor.');
  if(h_room !== '6') throw new Error('subgraph vertex_ids have changed. Update the sensor.');
  if(h_r_x !== '7') throw new Error('subgraph vertex_ids have changed. Update the sensor.');
  if(h_r_y !== '8') throw new Error('subgraph vertex_ids have changed. Update the sensor.');
  if(h_r_r !== '9') throw new Error('subgraph vertex_ids have changed. Update the sensor.');

  hs.save();
  sensor_context.forEach(function(sc) {
    ideas.load(hs.idea).link(links.list.context, sc);
  });
  ideas.save(hs.idea);
  return hs.idea;
};

hardcodedsensor.sensors.agent_inside_room = function(state, glueGroup) {
  var agent_inst = '1';
  var agent_x = '3';
  var agent_y = '4';
  var room = '6';
  var room_x = '7';
  var room_y = '8';
  var room_r = '9';

  var rooms = glueGroup.filter(function(glue) {
    return agent_inside_room(
      state.getData(glue[agent_x]).value,
      state.getData(glue[agent_y]).value,
      state.getData(glue[room_x]).value,
      state.getData(glue[room_y]).value,
      state.getData(glue[room_r]).value
    );
  }).map(function(glue) {
    return state.getIdea(glue[room]);
  });

  return {
    ensureLinks: links.list.agent_inside_room,
    from: state.getIdea(glueGroup[0][agent_inst]),
    to: rooms
  };
};

exports.units = {};
exports.units.agent_inside_room = agent_inside_room;

// all parameters are numbers
// returns true or false
function agent_inside_room(agent_x, agent_y, room_x, room_y, room_r) {
  // if number.difference(room-agent, 0) === 0, then cross
  // --
  // if x,y cross, same place
  // if x cross, do radius on y
  // if y cross, do radius on x
  // if neither, number.difference((-inf, 0), Math.dist(min(abs(x,y)), 0)-max(r)) === 0
  //  - or do we switch min and max? above is the 'best chance' match, swapping will give 'worst chance' match
  //  - or do we keep mins/maxs, and check both independently? (either would be a success)
  //
  // oooororrrr
  // insteeeaaaaddddd
  // just do a dist fn on the l and r
  // if either pass, then return true

  var dx = agent_x.l - room_x.l;
  var dy = agent_y.l - room_y.l;
  var dr = room_r.l;
  if(dr*dr > dx*dx + dy*dy)
    return true;

  dx = agent_x.r - room_x.r;
  dy = agent_y.r - room_y.r;
  dr = room_r.r;
  if(dr*dr > dx*dx + dy*dy)
    return true;

  return false;
}
