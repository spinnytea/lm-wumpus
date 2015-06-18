'use strict';
/* global describe, it, beforeEach, before */
// TODO instead of opting into/out of benchmarking, we should make another gulp task
describe.only = function() {};

var expect = require('chai').expect;

var server = require('../../../../src/server/wumpus/index');
var context = require('../../../../src/server/wumpus/context');

var socket = require('../socket');

var TEST_BLOCK_ITERATIONS = 3;
var TEST_UNIT_ITERATIONS = 100;

// okay, this isn't REALLY a benchmark
// but it's intended for me to test the actuators
// I wanna see how long some things take in repetition, since 13ms or 5ms isn't much to go off
// and the usual tests are more about making sure it's function, and complete, here I can focus on one task multiple times

describe.only('benchmark', function () {
  socket.setup(require('./test_data_large'));

  beforeEach(function() {
    // test room config
    expect(context.idea('agentDirection').data().value).to.equal('east');
    expect(context.idea('agentLocation').data().value).to.equal(1306);
  });

  describe('actuators', function() {
    var actuatorCallback;
    before(function() {
      actuatorCallback = server.setup.actuator(socket);
    });

    for(var b=0; b<TEST_BLOCK_ITERATIONS; b++) {
      it('left (' + b + ')', function() {
        var i;
        for(i=0; i<TEST_UNIT_ITERATIONS; i++) {
          actuatorCallback('left');
          expect(socket.messages.message).to.equal('actuator:left> potassium');
        }
      });

      it('right (' + b + ')', function() {
        var i;
        for(i=0; i<TEST_UNIT_ITERATIONS; i++) {
          actuatorCallback('right');
          expect(socket.messages.message).to.equal('actuator:right> potassium');
        }
      });
    }
  }); // end actuators
}); // end benchmark