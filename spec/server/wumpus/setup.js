'use strict';
/* global describe, it, beforeEach, afterEach */
var expect = require('chai').expect;

var server = require('../../../src/server/wumpus/index');
var context = require('../../../src/server/wumpus/context');

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

var config = { game: {
  chance: 'deterministic', // stochastic
  grain: 'discrete', // continuous
  observable: 'fully', // partially
  timing: 'static', // dynamic
  agents: 'single', // multi
  player: 'lemon', // person
} };

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
    beforeEach(function() {
      context.setup(socket, config);
    });

    it.skip('actuators');

    it.skip('goal');
  }); // end server
}); // end setup