'use strict';
/* global describe, it, beforeEach, afterEach, before, after */
var expect = require('chai').expect;

var discrete = require('lime/src/planning/primitives/discrete');
var links = require('lime/src/database/links');
var subgraph = require('lime/src/database/subgraph');
var tools = require('lime/spec/testingTools');

var server = require('../../../src/server/wumpus/index');
var context = require('../../../src/server/wumpus/context');
var config = require('../../../src/client/js/wumpus/impl/config');

var socket = require('./socket');

function getRoomProperty(number, link) {
  var sg = new subgraph.Subgraph();

  var currentRoom = sg.addVertex(subgraph.matcher.discrete, {
    value: number,
    unit: context.idea('agentLocation').data().unit,
    loc: context.roomLoc[number]
  });
  var targetProperty = sg.addVertex(subgraph.matcher.filler);
  sg.addEdge(currentRoom, links.list.type_of,
    sg.addVertex(subgraph.matcher.id, context.idea('room')), 2);
  sg.addEdge(currentRoom, links.list['wumpus_sense_has' + link], targetProperty, 1);

  var result = subgraph.search(sg);
  expect(result).to.deep.equal([sg]);

  return sg.vertices[targetProperty].data;
}

describe('setup', function() {
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

    context.cleanup();
  });
  it.skip('I don\'t know how to handle this. with game params');

  it('discrete.definitions.difference.wumpus_room', function() {
    context.setup(socket, config);
    var spacing = config.room.spacing;

    expect(discrete.definitions.difference.wumpus_room).to.be.a('function');
    var roomDefinition = discrete.definitions.create([1, 2], 'wumpus_room');
    var d1 = discrete.cast({value: 1, unit: roomDefinition.id, loc: { x: 0, y: 0 }});
    var d2 = discrete.cast({value: 1, unit: roomDefinition.id, loc: { x: 0, y: 0 }});

    expect(discrete.difference(d1, d2)).to.equal(0);

    // technically, they are the same room; so the loc must be wrong
    d2.loc.x = spacing;
    expect(discrete.difference(d1, d2)).to.equal(0);

    // make d2 a different room
    d2.value = 2;

    // same y, different x
    d2.loc.x = spacing;
    expect(discrete.difference(d1, d2)).to.equal(1);
    d2.loc.x = spacing*5;
    expect(discrete.difference(d1, d2)).to.equal(5);

    // same x, different y
    d2.loc.x = 0;
    d2.loc.y = spacing;
    expect(discrete.difference(d1, d2)).to.equal(1);
    d2.loc.y = spacing*5;
    expect(discrete.difference(d1, d2)).to.equal(5);

    // different both
    d2.loc.x = spacing;
    d2.loc.y = spacing;
    expect(discrete.difference(d1, d2)).to.equal(3);
    d2.loc.x = spacing*5;
    d2.loc.y = spacing*5;
    expect(discrete.difference(d1, d2)).to.equal(11);

    tools.ideas.clean(roomDefinition);
    context.cleanup();
  });

  describe('server', function() {
    socket.setup();

    beforeEach(function() {
      // test room config
      expect(getRoomProperty(63, 'Exit').value).to.equal(true);
      expect(getRoomProperty(68, 'Gold').value).to.equal(true);
      expect(context.idea('agentDirection').data().value).to.equal('east');
      expect(context.idea('agentLocation').data().value).to.equal(63);
      expect(context.idea('agentHasGold').data().value).to.equal(false);
    });

    describe('helper functions', function() {
      it('agentDirection', function() {
        expect(context.idea('agentDirection').data().value).to.equal('east');
        expect(context.idea('agentDirection').data().value).to.not.equal('west');
      });

      it('agentLocation', function() {
        expect(context.idea('agentLocation').data().value).to.equal(63);
        expect(context.idea('agentLocation').data().value).to.not.equal(65);
      });

      it('agentHasGold', function() {
        expect(context.idea('agentHasGold').data().value).to.equal(false);
        expect(context.idea('agentHasGold').data().value).to.not.equal(true);
      });

      it('getRoomProperty', function() {
        expect(getRoomProperty(63, 'Gold').value).to.equal(false);
        expect(getRoomProperty(63, 'Pit').value).to.equal(false);
        expect(getRoomProperty(68, 'Gold').value).to.equal(true);
        expect(getRoomProperty(76, 'Pit').value).to.equal(true);
      });
    }); // end helper functions

    describe('actuators', function() {
      var actuatorCallback;
      beforeEach(function() {
        actuatorCallback = server.setup.actuator(socket);
      });

      it('left', function() {
        expect(context.idea('agentDirection').data().value).to.equal('east');
        expect(context.idea('agentLocation').data().value).to.equal(63);
        actuatorCallback('left');
        expect(socket.messages.message).to.equal('actuator:left> potassium');
        expect(context.idea('agentDirection').data().value).to.equal('north');
        expect(context.idea('agentLocation').data().value).to.equal(63);
        actuatorCallback('left');
        expect(socket.messages.message).to.equal('actuator:left> potassium');
        expect(context.idea('agentDirection').data().value).to.equal('west');
        expect(context.idea('agentLocation').data().value).to.equal(63);
        actuatorCallback('left');
        expect(socket.messages.message).to.equal('actuator:left> potassium');
        expect(context.idea('agentDirection').data().value).to.equal('south');
        expect(context.idea('agentLocation').data().value).to.equal(63);
        actuatorCallback('left');
        expect(socket.messages.message).to.equal('actuator:left> potassium');
        expect(context.idea('agentDirection').data().value).to.equal('east');
        expect(context.idea('agentLocation').data().value).to.equal(63);
      });

      it('right', function() {
        expect(context.idea('agentDirection').data().value).to.equal('east');
        expect(context.idea('agentLocation').data().value).to.equal(63);
        actuatorCallback('right');
        expect(socket.messages.message).to.equal('actuator:right> potassium');
        expect(context.idea('agentDirection').data().value).to.equal('south');
        expect(context.idea('agentLocation').data().value).to.equal(63);
        actuatorCallback('right');
        expect(socket.messages.message).to.equal('actuator:right> potassium');
        expect(context.idea('agentDirection').data().value).to.equal('west');
        expect(context.idea('agentLocation').data().value).to.equal(63);
        actuatorCallback('right');
        expect(socket.messages.message).to.equal('actuator:right> potassium');
        expect(context.idea('agentDirection').data().value).to.equal('north');
        expect(context.idea('agentLocation').data().value).to.equal(63);
        actuatorCallback('right');
        expect(socket.messages.message).to.equal('actuator:right> potassium');
        expect(context.idea('agentDirection').data().value).to.equal('east');
        expect(context.idea('agentLocation').data().value).to.equal(63);
      });

      describe('up', function() {
        it('basic', function() {
          expect(context.idea('agentLocation').data().value).to.equal(63);
          expect(context.idea('agentDirection').data().value).to.equal('east');
          actuatorCallback('up');
          expect(socket.messages.message).to.equal('actuator:up> potassium');
          expect(context.idea('agentLocation').data().value).to.equal(65);
          expect(context.idea('agentDirection').data().value).to.equal('east');
        });

        it('cannot go into a pit', function() {
          expect(context.idea('agentLocation').data().value).to.equal(63);
          actuatorCallback('left');
          actuatorCallback('up');
          actuatorCallback('left');
          expect(socket.messages.message).to.equal('actuator:left> potassium');
          expect(context.idea('agentDirection').data().value).to.equal('west');
          expect(context.idea('agentLocation').data().value).to.equal(66);
          actuatorCallback('up');
          expect(socket.messages.message).to.equal('actuator:up> could not apply');
          expect(context.idea('agentDirection').data().value).to.equal('west');
          expect(context.idea('agentLocation').data().value).to.equal(66);
        });
      }); // end up

      describe('grab', function() {
        it('without gold', function() {
          expect(context.idea('agentHasGold').data().value).to.equal(false);
          expect(context.idea('agentLocation').data().value).to.equal(63);
          expect(getRoomProperty(63, 'Gold').value).to.equal(false);
          actuatorCallback('grab');
          expect(socket.messages.message).to.equal('actuator:grab> could not apply');
          expect(context.idea('agentHasGold').data().value).to.equal(false);
          expect(context.idea('agentLocation').data().value).to.equal(63);
        });
      }); // end gold

      describe('exit', function() {
        it('cannot exit without the gold', function() {
          expect(context.idea('agentLocation').data().value).to.equal(63);
          expect(getRoomProperty(63, 'Exit').value).to.equal(true);
          actuatorCallback('exit');
          expect(socket.messages.message).to.equal('actuator:exit> could not apply');
          expect(context.idea('agentHasGold').data().value).to.equal(false);
          expect(context.idea('agentLocation').data().value).to.equal(63);
        });

        it('cannot exit on non exit', function() {
          expect(context.idea('agentHasGold').data().value).to.equal(false);
          expect(context.idea('agentDirection').data().value).to.equal('east');
          expect(context.idea('agentLocation').data().value).to.equal(63);
          actuatorCallback('right');
          actuatorCallback('up');
          actuatorCallback('right');
          actuatorCallback('up');
          actuatorCallback('grab');
          expect(context.idea('agentHasGold').data().value).to.equal(true);
          expect(context.idea('agentDirection').data().value).to.equal('west');
          expect(context.idea('agentLocation').data().value).to.equal(68);
          actuatorCallback('exit');
          expect(socket.messages.message).to.equal('actuator:exit> could not apply');
        });
      }); // end exit

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

    describe('goal', function() {
      var goalCallback;
      beforeEach(function() {
        goalCallback = server.setup.goal(socket);
      });

      describe('room', function() {
        it('65', function() {
          expect(context.idea('agentLocation').data().value).to.equal(63);
          expect(context.idea('agentDirection').data().value).to.equal('east');
          goalCallback('room 65');
          expect(socket.messages.message).to.equal('goal:room 65> oxygen potassium');
          expect(context.idea('agentLocation').data().value).to.equal(65);
          expect(context.idea('agentDirection').data().value).to.equal('east');
        });

        it('73', function() {
          expect(context.idea('agentLocation').data().value).to.equal(63);
          expect(context.idea('agentDirection').data().value).to.equal('east');
          goalCallback('room 73');
          expect(socket.messages.message).to.equal('goal:room 73> oxygen potassium');
          expect(context.idea('agentLocation').data().value).to.equal(73);
          expect(context.idea('agentDirection').data().value).to.equal('east');
        });

        it('69', function() {
          expect(context.idea('agentLocation').data().value).to.equal(63);
          expect(context.idea('agentDirection').data().value).to.equal('east');
          goalCallback('room 69');
          expect(socket.messages.message).to.equal('goal:room 69> oxygen potassium');
          expect(context.idea('agentLocation').data().value).to.equal(69);
          // up-right-up is shorter than right-up-left-up, so we SHOULD be facing south
          expect(context.idea('agentDirection').data().value).to.equal('south');
        });

        it('78', function() {
          expect(context.idea('agentLocation').data().value).to.equal(63);
          expect(context.idea('agentDirection').data().value).to.equal('east');
          goalCallback('room 78');
          expect(socket.messages.message).to.equal('goal:room 78> oxygen potassium');
          expect(context.idea('agentLocation').data().value).to.equal(78);
          expect(context.idea('agentDirection').data().value).to.equal('north');
        });

        it('68-78', function() {
          expect(context.idea('agentLocation').data().value).to.equal(63);
          expect(context.idea('agentDirection').data().value).to.equal('east');
          goalCallback('room 68');
          expect(socket.messages.message).to.equal('goal:room 68> oxygen potassium');
          expect(context.idea('agentLocation').data().value).to.equal(68);
          expect(context.idea('agentDirection').data().value).to.equal('west');
          goalCallback('room 78');
          expect(socket.messages.message).to.equal('goal:room 78> oxygen potassium');
          expect(context.idea('agentLocation').data().value).to.equal(78);
          expect(context.idea('agentDirection').data().value).to.equal('north');
        });
      }); // end room
    }); // end goal
  }); // end server
}); // end setup