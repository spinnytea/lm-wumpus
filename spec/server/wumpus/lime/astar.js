'use strict';
/* global describe, it */
var expect = require('chai').expect;

var astar = require('lime/src/planning/algorithms/astar');
var blueprint = require('lime/src/planning/primitives/blueprint');
var Path = require('lime/src/planning/primitives/path');
var serialplan = require('lime/src/planning/serialplan');

var server = require('../../../../src/server/wumpus/index');
var context = require('../../../../src/server/wumpus/context');

var socket = require('../socket');

//
// This is a unit test of astar
// I just need a very large integrated environment to have enough data for it
// It is in fact very integration-y, and the results will change a lot
// But I want some insight into what is actually happening so I can tweak and improve
// Data thrashing isn't something we can prevent
//

// copy pasta from index.setup.goal(room targetRoomId)
function createStates(targetRoomId) {
  var goal = server.setup.createGoal.room(targetRoomId).goal;

  // get a list of all available actions
  var list = blueprint.list([context.idea('wumpus_world')]).map(blueprint.load);

  return {
    start: new blueprint.State(context.subgraph, list),
    goal: new blueprint.State(goal, list)
  };
}

function actionNames(path, state_vertexId) {
  if(path.plans) {
    return path.plans.map(function(a) {
      if(a.constructor.name === 'SerialAction')
        return actionNames(a);
      else
        return a.action.substr(22);
    });
  } else {
    return path.actions.map(function(a, idx) {
      if(a.constructor.name === 'SerialAction')
        return actionNames(a, state_vertexId);
      else if(a.constructor.name === 'StubAction') {
        if(state_vertexId) {
          var roomNum = path.states[idx+1].state.getData(state_vertexId).value;
          return 'stub_' + roomNum;
        }
        return 'stub';
      } else
        return a.action.substr(22);
    });
  }
}
function actionTypes(path) {
  return path.actions.map(function(a) { return a.constructor.name; });
}
function stateRooms(path, vertexId) {
  return path.states.map(function(s) { return s.state.getData(vertexId).value; });
}
function summary(frontier, state_vertexId) {

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
      p: actionNames(path, state_vertexId)
    };
  });


}

describe('astar', function() {
  socket.setup(require('../simplest/test_data'));

  describe('basic', function() {
    it.skip('path', function() {
      // first, let's just make sure we have things setup correctly
      expect(context.idea('agentLocation').data().value).to.equal(63);
      expect(context.idea('agentDirection').data().value).to.equal('east');

      var states = createStates(68);

      var path = astar.search(states.start, states.goal);
      expect(path).to.not.equal(undefined);
      expect(actionTypes(path)).to.deep.equal(['SerialAction', 'SerialAction']);
      expect(stateRooms(path, context.keys['agentLocation'])).to.deep.equal([63, 67, 68]);
      expect(actionNames(path)).to.deep.equal([['right', 'up'], ['right', 'up']]);
    });

    it('distance', function() {
      expect(context.idea('agentLocation').data().value).to.equal(63);

      var states = createStates(63);
      expect(states.start.distance(states.goal)).to.equal(0);
      states = createStates(65);
      expect(states.start.distance(states.goal)).to.equal(2);
      states = createStates(67);
      expect(states.start.distance(states.goal)).to.equal(2);
      states = createStates(78);
      expect(states.start.distance(states.goal)).to.equal(3);
      states = createStates(69);
      expect(states.start.distance(states.goal)).to.equal(3);
      states = createStates(87);
      expect(states.start.distance(states.goal)).to.equal(4);
    });
  });

  it.skip('small step-through', function() {
    var agentLocation_vertexId = context.keys['agentLocation'];
    var states = createStates(68);
    var frontier = astar.units.frontier();

    var path = new Path.Path([states.start], [], [], states.goal);
    astar.units.step(path, frontier);

    expect(actionNames(path)).to.deep.equal([]);
    expect(stateRooms(path, agentLocation_vertexId)).to.deep.equal([63]);
    expect(frontier._elements.length).to.equal(3);
    expect(summary(frontier, agentLocation_vertexId)).to.deep.equal([
      { comp: 26, cost: 6, dist: 2, p: [['right', 'up']] },
      { comp: 43, cost: 3, dist: 4, p: ['up'] },
      { comp: 46, cost: 6, dist: 4, p: [['left', 'up']] }
    ]);

    path = frontier.deq();
    astar.units.step(path, frontier);

    expect(actionNames(path)).to.deep.equal([['right', 'up']]);
    expect(stateRooms(path, agentLocation_vertexId)).to.deep.equal([63, 67]);
    expect(frontier._elements.length).to.equal(5);
    expect(summary(frontier, agentLocation_vertexId)).to.deep.equal([
      { comp: 12, cost: 12, dist: 0, p: [['right', 'up'], ['right', 'up']] },
      { comp: 42, cost: 12, dist: 3, p: [['right', 'up'], ['left', 'up']] },
      { comp: 43, cost: 3, dist: 4, p: ['up'] },
      { comp: 45, cost: 15, dist: 3, p: [['right', 'up'], ['left', 'left', 'up']] },
      { comp: 46, cost: 6, dist: 4, p: [['left', 'up']] }
    ]);

    path = frontier.deq();

    expect(actionNames(path)).to.deep.equal([['right', 'up'], ['right', 'up']]);
    expect(stateRooms(path, agentLocation_vertexId)).to.deep.equal([63, 67, 68]);
    expect(path.last.matches(states.goal)).to.equal(true);
  });

  it.skip('large step-through', function() {
    var vertexId = context.keys['agentLocation'];
    expect(context.idea('agentLocation').data().value).to.equal(63);
    expect(context.subgraph.getData(vertexId).value).to.equal(63);

    var states = createStates(78);
    var frontier = astar.units.frontier();

    var path = new Path.Path([states.start], [], [], states.goal);
    astar.units.step(path, frontier);
    expect(actionNames(path)).to.deep.equal([]);
    expect(stateRooms(path, vertexId)).to.deep.equal([63]);
    expect(frontier._elements.length).to.equal(6);

    path = frontier.deq();
    astar.units.step(path, frontier);
    expect(actionNames(path)).to.deep.equal([['left', 'up']]);
    expect(stateRooms(path, vertexId)).to.deep.equal([63, 66]);
    expect(frontier._elements.length).to.equal(10);

    path = frontier.deq();
    astar.units.step(path, frontier);
    expect(actionNames(path)).to.deep.equal([['left', 'up'], 'up']);
    expect(stateRooms(path, vertexId)).to.deep.equal([63, 66, 78]);
    expect(frontier._elements.length).to.equal(12);

    //
    // okay, no that that's all done
    // create a serial plan to get there and run it
    //

    expect(path.last.matches(states.goal)).to.equal(true);
    expect(context.idea('agentLocation').data().value).to.equal(63);
    expect(context.subgraph.getData(vertexId).value).to.equal(63);

    var sp = new serialplan.Action(path.actions);
    var result = sp.tryTransition(states.start);
    expect(result.length).to.equal(1);
    sp.runBlueprint(states.start, result[0]);

    expect(context.subgraph.getData(vertexId).value).to.equal(78);
    expect(context.idea('agentLocation').data().value).to.equal(78);
    expect(context.idea('agentDirection').data().value).to.equal('north');

    //
    // and now do the same test going somewhere else
    //

    states = createStates(69);
    frontier = astar.units.frontier();

    path = new Path.Path([states.start], [], [], states.goal);
    astar.units.step(path, frontier);
    expect(actionNames(path)).to.deep.equal([]);
    expect(stateRooms(path, vertexId)).to.deep.equal([78]);
    expect(frontier._elements.length).to.equal(3);

    path = frontier.deq();
    astar.units.step(path, frontier);
    expect(actionNames(path)).to.deep.equal([['left', 'left', 'up']]);
    expect(stateRooms(path, vertexId)).to.deep.equal([78, 66]);
    expect(frontier._elements.length).to.equal(7);

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

    // oh shit
    path = frontier.deq();
    expect(actionNames(path)).to.deep.equal(['right', 'right']);
    path = frontier.deq();
    expect(actionNames(path)).to.deep.equal(['right', 'left']);
    path = frontier.deq();
    expect(actionNames(path)).to.deep.equal(['left', 'right']);
    // that actually went better than it could have ..... .. . .. . .. ..
    // what if we have a more open field...

    path = frontier.deq();
    astar.units.step(path, frontier);
    expect(actionNames(path)).to.deep.equal(['left', 'left', 'up', 'up', 'up', 'left']);
    expect(stateRooms(path, vertexId)).to.deep.equal([78, 78, 78, 66, 63, 67, 67]);
    expect(frontier._elements.length).to.equal(10);

    path = frontier.deq();
    astar.units.step(path, frontier);
    expect(actionNames(path)).to.deep.equal(['left', 'left', 'up', 'up', 'up', 'left', 'up']);
    expect(stateRooms(path, vertexId)).to.deep.equal([78, 78, 78, 66, 63, 67, 67, 69]);
    expect(frontier._elements.length).to.equal(11);

    // the planning is at the goal
    expect(path.last.matches(states.goal)).to.equal(true);
    expect(context.idea('agentLocation').data().value).to.equal(78);
    expect(context.subgraph.getData(vertexId).value).to.equal(78);
  });
}); // end astar