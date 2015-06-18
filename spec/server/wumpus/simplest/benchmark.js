'use strict';
/* global describe, it, beforeEach, before */
// TODO instead of opting into/out of benchmarking, we should make another gulp task
describe.only = function() {};

var expect = require('chai').expect;

var server = require('../../../../src/server/wumpus/index');
var context = require('../../../../src/server/wumpus/context');

var socket = require('../socket');

var ITERATION_COUNT = 100;

// okay, this isn't REALLY a benchmark
// but it's intended for me to test the actuators
// I wanna see how long some things take in repetition, since 13ms or 5ms isn't much to go off
// and the usual tests are more about making sure it's function, and complete, here I can focus on one task multiple times

describe.only('benchmark', function () {
  socket.setup(require('./test_data'));

  beforeEach(function() {
    // test room config
    expect(context.idea('agentDirection').data().value).to.equal('east');
    expect(context.idea('agentLocation').data().value).to.equal(63);
    expect(context.idea('agentHasGold').data().value).to.equal(false);
  });

  describe('actuators', function() {
    var actuatorCallback;
    before(function() {
      actuatorCallback = server.setup.actuator(socket);
    });

    it('left', function() {
      var i;
      for(i=0; i<ITERATION_COUNT; i++) {
        actuatorCallback('left');
        expect(socket.messages.message).to.equal('actuator:left> potassium');
      }
    });

    it('right', function() {
      var i;
      for(i=0; i<ITERATION_COUNT; i++) {
        actuatorCallback('right');
        expect(socket.messages.message).to.equal('actuator:right> potassium');
      }
    });
  }); // end actuators
}); // end benchmark