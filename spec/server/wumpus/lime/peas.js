'use strict';
/* global describe, it */
var expect = require('chai').expect;
var Promise = require('bluebird');

var scheduler = require('lime/src/planning/scheduler');

var server = require('../../../../src/server/wumpus/index');
var context = require('../../../../src/server/wumpus/context');

var socket = require('../socket');

function agentState() {
  return ['agentLocation', 'agentDirection', 'agentHasGold', 'agentHasWon', 'agentHasAlive']
    .map(function(str) { return context.idea(str).data().value; });
}

// This is a basic showcase / integration test of each of the variables
// (well, if I can make them simple enough for a test; that's yet to be seen)
describe('peas', function() {
  socket.setup(require('../simplest/test_data'));
  var goalCallback = server.setup.goal(socket);

  it.skip('push the boundaries', function() {
    // grain: 'discrete', // discrete, continuous
    // noise: 0, // TODO
    // observable: 'fully', // fully, partially
    // timing: 'static', // static, dynamic
    // apriori: 'known', // known, unknown
    // agents: 'single', // single, multi
    // player: 'lemon' // lemon, person
  });

  it.skip('stochastic', function(done) {
    expect(agentState()).to.deep.equal([63, 'east', false, false, true]);

    goalCallback('goto gold').then(function() {
      expect(socket.messages.message).to.equal('goal:goto gold> oxygen potassium');
    }).finally(done).catch(done);

    expect(agentState()).to.deep.equal([63, 'south', false, false, true]);
    scheduler.check().then(function() {
      expect(agentState()).to.deep.equal([67, 'south', false, false, true]);
      return scheduler.check().then(Promise.resolve);
    }).then(function() {
      expect(agentState()).to.deep.equal([67, 'west', false, false, true]);
      return scheduler.check();
    }).then(function() {
      expect(agentState()).to.deep.equal([68, 'west', false, false, true]);

      // let's pretend that the UP doesn't work here
      //
      // the action has occurred, the state has been updated, but the scheduler hasn't been notified
      // so if we change the actual state
      var data = context.idea('agentLocation').data();
      data.value = 67;
      context.idea('agentLocation').update(data);
      data = context.idea('agentDirection').data();
      data.value = 'east';
      context.idea('agentDirection').update(data);
      context.subgraph.deleteData(context.keys.agentLocation);
      context.subgraph.deleteData(context.keys.agentDirection);
      expect(agentState()).to.deep.equal([67, 'east', false, false, true]);
      // then my schedule will fail and I need to replan

      return scheduler.check();
    }).then(function() {
      expect(agentState()).to.deep.equal([67, 'north', false, false, true]);
      return scheduler.check();
    }).then(function() {
      expect(agentState()).to.deep.equal([67, 'west', false, false, true]);
      return scheduler.check();
    }).then(function() {
      expect(agentState()).to.deep.equal([68, 'west', false, false, true]);
      return scheduler.check();
    }).catch(done);
  });
});