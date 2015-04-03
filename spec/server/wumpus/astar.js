'use strict';
/* global describe, it */
var expect = require('chai').expect;

var astar = require('lime/src/planning/algorithms/astar');
var blueprint = require('lime/src/planning/primitives/blueprint');
var links = require('lime/src/database/links');
var Path = require('lime/src/planning/primitives/path');
var serialplan = require('lime/src/planning/serialplan');
var subgraph = require('lime/src/database/subgraph');

var context = require('../../../src/server/wumpus/context');

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

function actionNames(path) {
  return path.actions.map(function(a) { return a.action.substr(22); });
}
function stateRooms(path, vertexId) {
  return path.states.map(function(s) { return s.state.vertices[vertexId].data.value; });
}
function summary(frontier) {

  // pull out all the elements in the frontier so we can have a good sorted order
  var list = [];
  while(!frontier.isEmpty()) {
    list.push(frontier.deq());
  }
  list.forEach(function(p) {
    frontier.enq(p);
  });

  return list.map(function(path) {
    return {
      comp: frontier._comparator({cost: 0, distFromGoal: 0, actions: []}, path),
      cost: path.cost,
      dist: path.distFromGoal,
      p: actionNames(path)
    };
  });


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
    expect(actionNames(path)).to.deep.equal(['right', 'up', 'right', 'up']);
  });

  it('small step-through', function() {
    var agentLocation_vertexId = context.keys['agentLocation'];
    var states = createStates(68);
    var frontier = astar.units.frontier();

    var path = new Path.Path([states.start], [], states.goal);
    astar.units.step(path, frontier);

    expect(frontier._elements.length).to.equal(3);
    expect(summary(frontier)).to.deep.equal([
      { comp: 8, cost: 2, dist: 3, p: ['left'] },
      { comp: 8, cost: 2, dist: 3, p: ['right'] },
      { comp: 10, cost: 2, dist: 4, p: ['up'] }
    ]);

    path = frontier.deq();
    astar.units.step(path, frontier);

    expect(actionNames(path)).to.deep.equal(['left']); // unlucky
    expect(stateRooms(path, agentLocation_vertexId)).to.deep.equal([63, 63]);
    expect(frontier._elements.length).to.equal(5);
    expect(summary(frontier)).to.deep.equal([
      { comp: 8, cost: 2, dist: 3, p: ['right'] },
      { comp: 10, cost: 4, dist: 3, p: ['left', 'left'] },
      { comp: 10, cost: 4, dist: 3, p: ['left', 'right'] },
      { comp: 10, cost: 2, dist: 4, p: ['up'] },
      { comp: 12, cost: 4, dist: 4, p: ['left', 'up'] }
    ]);

    path = frontier.deq();
    astar.units.step(path, frontier);

    expect(actionNames(path)).to.deep.equal(['right']);
    expect(stateRooms(path, agentLocation_vertexId)).to.deep.equal([63, 63]);
    expect(frontier._elements.length).to.equal(7);
    expect(summary(frontier)).to.deep.equal([
      { comp: 6, cost: 4, dist: 1, p: ['right', 'up'] },
      { comp: 10, cost: 4, dist: 3, p: ['left', 'right'] },
      { comp: 10, cost: 4, dist: 3, p: ['right', 'right'] },
      { comp: 10, cost: 4, dist: 3, p: ['left', 'left'] },
      { comp: 10, cost: 4, dist: 3, p: ['right', 'left'] },
      { comp: 10, cost: 2, dist: 4, p: ['up'] },
      { comp: 12, cost: 4, dist: 4, p: ['left', 'up'] }
    ]);

    path = frontier.deq();
    astar.units.step(path, frontier);

    expect(actionNames(path)).to.deep.equal(['right', 'up']);
    expect(stateRooms(path, agentLocation_vertexId)).to.deep.equal([63, 63, 67]);
    expect(frontier._elements.length).to.equal(8);
    expect(summary(frontier)).to.deep.equal([
      { comp: 8, cost: 6, dist: 1, p: ['right', 'up', 'left'] },
      { comp: 8, cost: 6, dist: 1, p: ['right', 'up', 'right'] },
      { comp: 10, cost: 4, dist: 3, p: ['right', 'right'] },
      { comp: 10, cost: 4, dist: 3, p: ['right', 'left'] },
      { comp: 10, cost: 4, dist: 3, p: ['left', 'left'] },
      { comp: 10, cost: 4, dist: 3, p: ['left', 'right'] },
      { comp: 10, cost: 2, dist: 4, p: ['up'] },
      { comp: 12, cost: 4, dist: 4, p: ['left', 'up'] }
    ]);

    path = frontier.deq();
    astar.units.step(path, frontier);

    expect(actionNames(path)).to.deep.equal(['right', 'up', 'left']); // unlucky
    expect(stateRooms(path, agentLocation_vertexId)).to.deep.equal([63, 63, 67, 67]);
    expect(frontier._elements.length).to.equal(10);
    expect(summary(frontier)).to.deep.equal([
      { comp: 8, cost: 6, dist: 1, p: ['right', 'up', 'right'] },
      { comp: 10, cost: 8, dist: 1, p: ['right', 'up', 'left', 'left'] },
      { comp: 10, cost: 8, dist: 1, p: ['right', 'up', 'left', 'right'] },
      { comp: 10, cost: 4, dist: 3, p: ['right', 'right'] },
      { comp: 10, cost: 4, dist: 3, p: ['left', 'right'] },
      { comp: 10, cost: 4, dist: 3, p: ['left', 'left'] },
      { comp: 10, cost: 4, dist: 3, p: ['right', 'left'] },
      { comp: 10, cost: 2, dist: 4, p: ['up'] },
      { comp: 12, cost: 8, dist: 2, p: ['right', 'up', 'left', 'up'] },
      { comp: 12, cost: 4, dist: 4, p: ['left', 'up'] }
    ]);

    path = frontier.deq();
    astar.units.step(path, frontier);

    expect(actionNames(path)).to.deep.equal(['right', 'up', 'right']);
    expect(stateRooms(path, agentLocation_vertexId)).to.deep.equal([63, 63, 67, 67]);
    expect(frontier._elements.length).to.equal(12);
    expect(summary(frontier)).to.deep.equal([
      { comp: 8, cost: 8, dist: 0, p: ['right', 'up', 'right', 'up'] },
      { comp: 10, cost: 8, dist: 1, p: ['right', 'up', 'left', 'right'] },
      { comp: 10, cost: 8, dist: 1, p: ['right', 'up', 'left', 'left'] },
      { comp: 10, cost: 8, dist: 1, p: ['right', 'up', 'right', 'left'] },
      { comp: 10, cost: 8, dist: 1, p: ['right', 'up', 'right', 'right'] },
      { comp: 10, cost: 4, dist: 3, p: ['right', 'left'] },
      { comp: 10, cost: 4, dist: 3, p: ['left', 'left'] },
      { comp: 10, cost: 4, dist: 3, p: ['left', 'right'] },
      { comp: 10, cost: 4, dist: 3, p: ['right', 'right'] },
      { comp: 10, cost: 2, dist: 4, p: ['up'] },
      { comp: 12, cost: 8, dist: 2, p: ['right', 'up', 'left', 'up'] },
      { comp: 12, cost: 4, dist: 4, p: ['left', 'up'] }
    ]);

    path = frontier.deq();

    expect(actionNames(path)).to.deep.equal(['right', 'up', 'right', 'up']);
    expect(stateRooms(path, agentLocation_vertexId)).to.deep.equal([63, 63, 67, 67, 68]);
    expect(path.last.matches(states.goal)).to.equal(true);
  });

  it('large step-through', function() {
    var vertexId = context.keys['agentLocation'];
    expect(context.idea('agentLocation').data().value).to.equal(63);
    expect(context.subgraph.vertices[vertexId].data.value).to.equal(63);

    var states = createStates(78);
    var frontier = astar.units.frontier();

    var path = new Path.Path([states.start], [], states.goal);
    astar.units.step(path, frontier);
    expect(actionNames(path)).to.deep.equal([]);
    expect(stateRooms(path, vertexId)).to.deep.equal([63]);
    expect(frontier._elements.length).to.equal(3);

    path = frontier.deq();
    astar.units.step(path, frontier);
    expect(actionNames(path)).to.deep.equal(['left']);
    expect(stateRooms(path, vertexId)).to.deep.equal([63, 63]);
    expect(frontier._elements.length).to.equal(5);

    path = frontier.deq();
    astar.units.step(path, frontier);
    expect(actionNames(path)).to.deep.equal(['left', 'up']);
    expect(stateRooms(path, vertexId)).to.deep.equal([63, 63, 66]);
    expect(frontier._elements.length).to.equal(7);

    path = frontier.deq();
    astar.units.step(path, frontier);
    expect(actionNames(path)).to.deep.equal(['left', 'up', 'up']);
    expect(stateRooms(path, vertexId)).to.deep.equal([63, 63, 66, 78]);
    expect(frontier._elements.length).to.equal(8);

    //
    // okay, no that that's all done
    // create a serial plan to get there and run it
    //

    expect(path.last.matches(states.goal)).to.equal(true);
    expect(context.idea('agentLocation').data().value).to.equal(63);
    expect(context.subgraph.vertices[vertexId].data.value).to.equal(63);

    var sp = new serialplan.Action(path.actions);
    var result = sp.tryTransition(states.start);
    expect(result.length).to.equal(1);
    sp.runBlueprint(states.start, result[0]);

    expect(context.subgraph.vertices[vertexId].data.value).to.equal(78);
    expect(context.idea('agentLocation').data().value).to.equal(78);
    expect(context.idea('agentDirection').data().value).to.equal('north');

    //
    // and now do the same test going somewhere else
    //

    states = createStates(69);
    frontier = astar.units.frontier();

    path = new Path.Path([states.start], [], states.goal);
    astar.units.step(path, frontier);
    expect(actionNames(path)).to.deep.equal([]);
    expect(stateRooms(path, vertexId)).to.deep.equal([78]);
    expect(frontier._elements.length).to.equal(2);

    path = frontier.deq();
    astar.units.step(path, frontier);
    expect(actionNames(path)).to.deep.equal(['left']);
    expect(stateRooms(path, vertexId)).to.deep.equal([78, 78]);
    expect(frontier._elements.length).to.equal(3);

    path = frontier.deq();
    astar.units.step(path, frontier);
    expect(actionNames(path)).to.deep.equal(['right']);
    expect(stateRooms(path, vertexId)).to.deep.equal([78, 78]);
    expect(frontier._elements.length).to.equal(4);

    path = frontier.deq();
    astar.units.step(path, frontier);
    expect(actionNames(path)).to.deep.equal(['left', 'left']); // finally, getting somewhere
    expect(stateRooms(path, vertexId)).to.deep.equal([78, 78, 78]);
    expect(frontier._elements.length).to.equal(6);

    path = frontier.deq();
    astar.units.step(path, frontier);
    expect(actionNames(path)).to.deep.equal(['left', 'left', 'up']);
    expect(stateRooms(path, vertexId)).to.deep.equal([78, 78, 78, 66]);
    expect(frontier._elements.length).to.equal(8);

    path = frontier.deq();
    astar.units.step(path, frontier);
    expect(actionNames(path)).to.deep.equal(['left', 'left', 'up', 'up']);
    expect(stateRooms(path, vertexId)).to.deep.equal([78, 78, 78, 66, 63]);
    expect(frontier._elements.length).to.equal(10);

    path = frontier.deq();
    astar.units.step(path, frontier);
    expect(actionNames(path)).to.deep.equal(['left', 'left', 'up', 'up', 'up']);
    expect(stateRooms(path, vertexId)).to.deep.equal([78, 78, 78, 66, 63, 67]);
    expect(frontier._elements.length).to.equal(11);

    path = frontier.deq();
    astar.units.step(path, frontier);
    expect(actionNames(path)).to.deep.equal(['left', 'left', 'up', 'up', 'up', 'left']);
    expect(stateRooms(path, vertexId)).to.deep.equal([78, 78, 78, 66, 63, 67, 67]);
    expect(frontier._elements.length).to.equal(13);

    path = frontier.deq();
    astar.units.step(path, frontier);
    expect(actionNames(path)).to.deep.equal(['left', 'left', 'up', 'up', 'up', 'left', 'up']);
    expect(stateRooms(path, vertexId)).to.deep.equal([78, 78, 78, 66, 63, 67, 67, 69]);
    expect(frontier._elements.length).to.equal(14);

    // the planning is at the goal
    expect(path.last.matches(states.goal)).to.equal(true);
    expect(context.idea('agentLocation').data().value).to.equal(78);
    expect(context.subgraph.vertices[vertexId].data.value).to.equal(78);
  });
}); // end astar