'use strict';
/* global describe, it, beforeEach, afterEach, before, after */
var expect = require('chai').expect;

var blueprint = require('lime/src/planning/primitives/blueprint');
var links = require('lime/src/database/links');
var astar = require('lime/src/planning/algorithms/astar');
var subgraph = require('lime/src/database/subgraph');

var context = require('../../../src/server/wumpus/context');
var config = require('../../../src/client/js/wumpus/impl/config');
var spacing = config.room.spacing;

var socket = require('./socket');

//
// This is a unit test of astar
// I just need a very large integrated environment to have enough data for it
//

// copy pasta from index.setup.goal(room targetRoomId)
function createStates(targetRoomId) {
  var loc = context.roomLoc[targetRoomId];

  var goal = new subgraph.Subgraph();

  // specify the agent
  var agentInstance = goal.addVertex(subgraph.matcher.filler);
  goal.addEdge(
    goal.addVertex(subgraph.matcher.id, context.idea('instance')),
    links.list.thought_description,
    agentInstance);
  goal.addEdge(agentInstance, links.list.type_of,
    goal.addVertex(subgraph.matcher.id, context.idea('agent')));
  var agentLocation = goal.addVertex(subgraph.matcher.discrete, { value: targetRoomId, unit: context.idea('roomDefinition').id, loc: loc }, {transitionable:true});
  goal.addEdge(agentInstance, links.list.wumpus_sense_agent_loc, agentLocation);

  // specify the target room
  var roomInstance = goal.addVertex(subgraph.matcher.discrete, { value: targetRoomId, unit: context.idea('roomDefinition').id, loc: loc });
  goal.addEdge(roomInstance, links.list.thought_description.opposite,
    goal.addVertex(subgraph.matcher.id, context.idea('roomDefinition')));


  // get a list of all available actions
  var list = blueprint.list([context.idea('wumpus_world')]).map(blueprint.load);

  return {
    start: new blueprint.State(context.subgraph, list),
    goal: new blueprint.State(goal, list)
  };
}

describe('astar', function() {
  socket.setup();

  it('basic', function() {
    // first, let's just make sure we have things setup correctly
    expect(context.idea('agentLocation').data().value).to.equal(63);
    expect(context.idea('agentDirection').data().value).to.equal('east');

    var states = createStates(68);

    var path = astar.search(states.start, states.goal);

    expect(path).to.be.ok;
    expect(path.actions.map(function(a) { return a.action.substr(22); }))
      .to.deep.equal(['right', 'up', 'right', 'up']);
  });
}); // end astar