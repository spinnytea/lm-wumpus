'use strict';
/* global describe, it, beforeEach, afterEach, before */
var expect = require('chai').expect;

var server = require('../../../src/server/wumpus/index');
var context = require('../../../src/server/wumpus/context');
var config = require('../../../src/client/js/wumpus/impl/config');

// TODO basics of testing wumpus
// start the server in a second terminal
// create a socket
//
// OOORRRR use the server directly, like, with function calls
//
// exercise the various commands we can call
// ensure we get the results we expect
// basically, pretend to be a client

// TODO in depth test
// create a room
// solve the room

// TODO remove need for config.js in lm-wumpus

var socket = {};
socket.messages = {};
socket.emit = function(room, message) { socket.messages[room] = message; };

describe('setup', function() {
  afterEach(function() {
    context.cleanup();
  });

  it('context', function() {
    // invalid config
    context.setup(socket, { game: {} });
    expect(socket.messages.message).to.equal('I don\'t know how to handle this.');
    // valid config
    context.setup(socket, config);
    expect(socket.messages.message).to.equal('Connected');
    // can't connect two
    context.setup(socket, config);
    expect(socket.messages.message).to.equal('I can only handle one thing at a time.');

    // reconnect
    context.cleanup();
    context.setup(socket, config);
    expect(socket.messages.message).to.equal('Connected');
  });

  describe('server', function() {
    var init_world_model;
    var actuatorCallback;
    before(function() {
      init_world_model = require('./test_data');
    });

    beforeEach(function() {
      context.setup(socket, config);
      context.sense(init_world_model);
      actuatorCallback = server.setup.actuator(socket);
    });

    describe('actuators', function() {
      it('basic', function() {
        expect(socket.messages.message).to.equal('Connected');
        expect(context.idea('agentDirection').data().value).to.equal('east');
        actuatorCallback('right');
        expect(socket.messages.message).to.equal('actuator:right> potassium');
        expect(context.idea('agentDirection').data().value).to.equal('south');
        actuatorCallback('right');
        expect(socket.messages.message).to.equal('actuator:right> potassium');
        expect(context.idea('agentDirection').data().value).to.equal('west');
        actuatorCallback('left');
        expect(socket.messages.message).to.equal('actuator:left> potassium');
        expect(context.idea('agentDirection').data().value).to.equal('south');
      });

      it('grab without gold', function() {
        expect(context.idea('agentHasGold').data().value).to.equal(false);
        expect(context.idea('agentLocation').data().value).to.equal(63);
        // TODO verify that this room does not have gold
        actuatorCallback('grab');
        expect(socket.messages.message).to.equal('actuator:grab> could not apply');
        expect(context.idea('agentHasGold').data().value).to.equal(false);
      });

      it('cannot exit without the gold', function() {
        expect(context.idea('agentLocation').data().value).to.equal(63);
        // TODO verify that this room has an exit
        actuatorCallback('exit');
        expect(socket.messages.message).to.equal('actuator:exit> could not apply');
      });

      it.skip('cannot exit on non exit', function() {
        // TODO make sure the player has gold
      });

      it('go for goal', function () {
        // go to the room with the gold
        // grab the gold
        // go to the room with the exit
        // exit

        expect(context.idea('agentHasGold').data().value).to.equal(false);
        expect(context.idea('agentDirection').data().value).to.equal('east');
        expect(context.idea('agentLocation').data().value).to.equal(63);
        actuatorCallback('right');
        actuatorCallback('up');
        expect(socket.messages.message).to.equal('actuator:up> potassium');
        expect(context.idea('agentDirection').data().value).to.equal('south');
        expect(context.idea('agentLocation').data().value).to.equal(67);
        actuatorCallback('right');
        actuatorCallback('up');
        expect(socket.messages.message).to.equal('actuator:up> potassium');
        expect(context.idea('agentDirection').data().value).to.equal('west');
        expect(context.idea('agentLocation').data().value).to.equal(68);
        actuatorCallback('grab');
        expect(socket.messages.message).to.equal('actuator:grab> potassium');
        expect(context.idea('agentHasGold').data().value).to.equal(true);
        actuatorCallback('right');
        actuatorCallback('right');
        expect(context.idea('agentDirection').data().value).to.equal('east');
        expect(context.idea('agentLocation').data().value).to.equal(68);
        actuatorCallback('up');
        actuatorCallback('left');
        actuatorCallback('up');
        expect(socket.messages.message).to.equal('actuator:up> potassium');
        expect(context.idea('agentDirection').data().value).to.equal('north');
        expect(context.idea('agentLocation').data().value).to.equal(63);
        actuatorCallback('exit');
        expect(socket.messages.message).to.equal('actuator:exit> potassium');
      });
    }); // end actuators

    it.skip('goal');
  }); // end server
}); // end setup