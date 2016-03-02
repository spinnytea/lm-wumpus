'use strict';
/* global describe, it, beforeEach, before */
var expect = require('chai').expect;
var _ = require('lodash');

var links = require('lime/src/database/links');
var number = require('lime/src/planning/primitives/number');
var scheduler = require('lime/src/planning/scheduler');
var sensor = require('lime/src/sensor/sensor');
var subgraph = require('lime/src/database/subgraph');

var server = require('../../../../src/server/wumpus/index');
var context = require('../../../../src/server/wumpus/context');
var config = require('../../../../src/client/wumpus/impl/config');

var socket = require('../socket');
var spacing = config.room.spacing;

function getRoomProperty(number, link) {
  var sg = new subgraph.Subgraph();

  var currentRoom = sg.addVertex(subgraph.matcher.discrete, {
    value: number,
    unit: context.idea('agentLocation').data().unit
  });
  var targetProperty = sg.addVertex(subgraph.matcher.filler);
  sg.addEdge(currentRoom, links.list.type_of,
    sg.addVertex(subgraph.matcher.id, context.idea('room')), { pref: 2 });
  sg.addEdge(currentRoom, links.list['wumpus_sense_has' + link], targetProperty, { pref: 1 });

  var result = subgraph.search(sg);
  expect(result).to.deep.equal([sg]);

  return sg.getData(targetProperty);
}

// this will keep rolling the scheduler until the goal reports success
// - alt desc: finish when lm gets to the goal
function checkUntilSuccess() {
  scheduler.check().then(function() {
    if(socket.messages.message.indexOf('potassium') !== -1) return;
    if(socket.messages.message.indexOf('failed') !== -1) return;
    // set timeout will keep us from infinite looping should something go wrong
    // if this happens, mocha will timeout (test too long)
    setTimeout(checkUntilSuccess, 0);
  });
}

function agentState() {
  return ['agentLocation', 'agentDirection', 'agentHasGold', 'agentHasWon', 'agentHasAlive']
    .map(function(str) { return context.idea(str).data().value; });
}

describe('setup', function() {
  it('context', function() {
    var CHRONA = 'I don\'t know how to deal with this.';

    // invalid config
    context.setup(socket, { game: {} });
    expect(socket.messages.message).to.equal(CHRONA);

    // unsupported config
    var c = _.cloneDeep(config);
    //c.game.chance = 'stochastic'; // oh! but it can!
    c.game.apriori = 'unknown';
      context.setup(socket, c);
    expect(socket.messages.message).to.equal(CHRONA);
    c = _.cloneDeep(config);
    c.game.grain = 'continuous';
    context.setup(socket, c);
    expect(socket.messages.message).to.equal(CHRONA);

    // valid config
    context.setup(socket, config);
    expect(socket.messages.message).to.equal('Connected');

    // can't connect two
    context.setup(socket, config);
    expect(socket.messages.message).to.equal('I can only deal with one thing at a time.');

    // reconnect
    context.cleanup();
    context.setup(socket, config);
    expect(socket.messages.message).to.equal('Connected');


    // check the context to make sure it's valid
    expect(sensor.list(context.idea('agent_inside_room')).length).to.equal(1);


    context.cleanup();
  });
  it.skip('I don\'t know how to handle this. with game params');

  describe('server', function() {
    socket.setup(require('./test_data'));

    beforeEach(function() {
      // test room config
      expect(getRoomProperty(63, 'Exit').value).to.equal(true);
      expect(getRoomProperty(68, 'Gold').value).to.equal(true);
      expect(agentState()).to.deep.equal([63, 'east', false, false, true]);
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

      it('agentHasWon', function() {
        expect(context.idea('agentHasWon').data().value).to.equal(false);
        expect(context.idea('agentHasWon').data().value).to.not.equal(true);
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
      before(function() {
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
          expect(context.idea('agentLocX').data().value).to.deep.equal(number.value(0));
          expect(context.idea('agentLocY').data().value).to.deep.equal(number.value(0));
          expect(context.idea('agentDirection').data().value).to.equal('east');
          actuatorCallback('up');
          expect(socket.messages.message).to.equal('actuator:up> potassium');
          expect(context.idea('agentLocation').data().value).to.equal(65);
          expect(context.idea('agentLocX').data().value).to.deep.equal(number.value(spacing));
          expect(context.idea('agentLocY').data().value).to.deep.equal(number.value(0));
          expect(context.idea('agentDirection').data().value).to.equal('east');
        });

        it('going to a pit results in no available actions', function(done) {
          expect(context.idea('agentLocation').data().value).to.equal(63);
          actuatorCallback('left');
          actuatorCallback('up');
          actuatorCallback('left');
          expect(socket.messages.message).to.equal('actuator:left> potassium');
          expect(context.idea('agentDirection').data().value).to.equal('west');
          expect(context.idea('agentLocation').data().value).to.equal(66);
          expect(context.idea('agentHasAlive').data().value).to.equal(true);
          actuatorCallback('up');
          expect(socket.messages.message).to.equal('actuator:up> potassium');
          expect(context.idea('agentDirection').data().value).to.equal('west');
          expect(context.idea('agentLocation').data().value).to.equal(76);
          expect(getRoomProperty(76, 'Pit').value).to.equal(true);

          // so here's the trick
          // once we reach the goal, we stop; there is no thinking ahead
          // so the agent seems alive
          expect(context.idea('agentHasAlive').data().value).to.equal(true);
          // but our next steps... they will kill us

          var goalCallback = server.setup.goal(socket);
          goalCallback('room 66').then(function() {}, function() {
            expect(socket.messages.message).to.equal('goal:room 66> could not find a path');

            goalCallback('goto gold').then(function() {}, function() {
              expect(socket.messages.message).to.equal('goal:goto gold> could not find a path');

              done();
            });
          });
          // we can ask for anything here, because it will fail immediately
          // the first thing we will evaluate is that we died, and then no actions are available
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
          expect(context.idea('agentHasWon').data().value).to.equal(false);
          expect(context.idea('agentLocation').data().value).to.equal(63);
          expect(getRoomProperty(63, 'Exit').value).to.equal(true);
          actuatorCallback('exit');
          expect(socket.messages.message).to.equal('actuator:exit> could not apply');
          expect(context.idea('agentHasGold').data().value).to.equal(false);
          expect(context.idea('agentLocation').data().value).to.equal(63);
          expect(context.idea('agentHasWon').data().value).to.equal(false);
        });

        it('cannot exit on non exit', function() {
          expect(context.idea('agentHasWon').data().value).to.equal(false);
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
          expect(context.idea('agentHasWon').data().value).to.equal(false);
        });
      }); // end exit

      it('go for goal', function () {
        // go to the room with the gold
        // grab the gold
        // go to the room with the exit
        // exit

        expect(context.idea('agentHasWon').data().value).to.equal(false);
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
        expect(context.idea('agentHasWon').data().value).to.equal(true);
      });
    }); // end actuators

    describe('sensors', function() {
      it('agent_inside_room', function() {
        // hs is the list of ideas that are of sensors of type agent_inside_room
        var hs = sensor.list(context.idea('agent_inside_room'));
        expect(hs.length).to.equal(1);
        // load the actual sensor
        hs = sensor.load(hs[0]);
        expect(hs.sensor).to.equal('agent_inside_room');
        expect(hs.groupfn).to.equal('byOuterIdea');

        // first, let's make sure the requirements are valid
        // 10 rooms, all with a radius of 48
        var result = subgraph.match(context.subgraph, hs.requirements);
        expect(result.length).to.equal(10);
        expect(result.map(function(vM) { return context.subgraph.getData(vM['9']).value.l; }))
          .to.deep.equal([48,48,48,48,48,48,48,48,48,48]);


        // the sensor should run whenever the state updates (so for the tests, once on startup)
        expect(context.idea('agentInstance').link(links.list['agent_inside_room']).length).to.equal(1);
        var in_rooms = context.idea('agentInstance').link(links.list['agent_inside_room']);
        expect(in_rooms.length).to.equal(1);
        expect(in_rooms[0].data().value).to.equal(63);


        // move the agent, and the values should change
        // room 63 (86.4, 0)
        var loc = context.idea('agentLocX').data();
        loc.value = number.value(86.4);
        context.idea('agentLocX').update(loc);
        context.subgraph.deleteData(context.keys.agentLocX);
        hs.sense(context.subgraph);

        // agent is inside one room
        in_rooms = context.idea('agentInstance').link(links.list['agent_inside_room']);
        expect(in_rooms.length).to.equal(1);
        expect(in_rooms[0].data().value).to.equal(65);

        // move the agent into two rooms
        loc.value = number.value(43.2);
        context.idea('agentLocX').update(loc);
        context.subgraph.deleteData(context.keys.agentLocX);
        hs.sense(context.subgraph);

        // agent is inside two rooms
        in_rooms = context.idea('agentInstance').link(links.list['agent_inside_room']);
        expect(in_rooms.length).to.equal(2);
        expect(in_rooms.map(function(r) { return r.data().value; }).sort()).to.deep.equal([63, 65]);

        // move the agent away from everything
        loc.value = number.value(9001);
        context.idea('agentLocX').update(loc);
        context.subgraph.deleteData(context.keys.agentLocX);
        hs.sense(context.subgraph);

        // agent is not in a room
        in_rooms = context.idea('agentInstance').link(links.list['agent_inside_room']);
        expect(in_rooms.length).to.equal(0);
      });
    }); // end sensors

    describe.skip('goal', function() {
      var goalCallback;
      before(function() {
        goalCallback = server.setup.goal(socket);
      });

      describe('room', function() {
        it('63', function(done) {
          expect(context.idea('agentLocation').data().value).to.equal(63);
          expect(context.idea('agentDirection').data().value).to.equal('east');

          goalCallback('room 63').then(function() {
            expect(socket.messages.message).to.equal('goal:room 63> here\'s the plan: do nothing');
            expect(context.idea('agentLocation').data().value).to.equal(63);
            expect(context.idea('agentDirection').data().value).to.equal('east');
            done();
          }).catch(done);
        });

        it('65', function(done) {
          expect(context.idea('agentLocation').data().value).to.equal(63);
          expect(context.idea('agentDirection').data().value).to.equal('east');

          goalCallback('room 65').then(function() {
            expect(socket.messages.message).to.equal('goal:room 65> oxygen potassium');
            expect(context.idea('agentLocation').data().value).to.equal(65);
            expect(context.idea('agentDirection').data().value).to.equal('east');
          }).finally(done).catch(done);

          checkUntilSuccess();
        });

        it('73', function(done) {
          expect(context.idea('agentLocation').data().value).to.equal(63);
          expect(context.idea('agentDirection').data().value).to.equal('east');

          goalCallback('room 73').then(function() {
            expect(socket.messages.message).to.equal('goal:room 73> oxygen potassium');
            expect(context.idea('agentLocation').data().value).to.equal(73);
            expect(context.idea('agentDirection').data().value).to.equal('east');
          }).finally(done).catch(done);

          checkUntilSuccess();
        });

        it('69', function(done) {
          expect(context.idea('agentLocation').data().value).to.equal(63);
          expect(context.idea('agentDirection').data().value).to.equal('east');

          goalCallback('room 69').then(function() {
            expect(socket.messages.message).to.equal('goal:room 69> oxygen potassium');
            expect(context.idea('agentLocation').data().value).to.equal(69);
            // up-right-up is shorter than right-up-left-up, so we SHOULD be facing south
            // but as soon as we start mucking with stubs, this may not be the case
            expect(context.idea('agentDirection').data().value).to.equal('south');
          }).finally(done).catch(done);

          checkUntilSuccess();
        });

        it('78', function(done) {
          expect(context.idea('agentLocation').data().value).to.equal(63);
          expect(context.idea('agentDirection').data().value).to.equal('east');

          goalCallback('room 78').then(function() {
            expect(socket.messages.message).to.equal('goal:room 78> oxygen potassium');
            expect(context.idea('agentLocation').data().value).to.equal(78);
            expect(context.idea('agentDirection').data().value).to.equal('north');
          }).finally(done).catch(done);

          checkUntilSuccess();
        });

        it.skip('68-78', function(done) {
          expect(context.idea('agentLocation').data().value).to.equal(63);
          expect(context.idea('agentDirection').data().value).to.equal('east');

          goalCallback('room 68').then(function() {
            expect(socket.messages.message).to.equal('goal:room 68> oxygen potassium');
            expect(context.idea('agentLocation').data().value).to.equal(68);
            expect(context.idea('agentDirection').data().value).to.equal('west');

            var ret = goalCallback('room 78').then(function() {
              expect(socket.messages.message).to.equal('goal:room 78> oxygen potassium');
              expect(context.idea('agentLocation').data().value).to.equal(78);
              expect(context.idea('agentDirection').data().value).to.equal('north');
            });

            checkUntilSuccess();

            return ret;
          }).finally(done).catch(done);

          checkUntilSuccess();
        });
      }); // end room

      describe('goto', function() {
        it('gold', function(done) {
          expect(context.idea('agentLocation').data().value).to.equal(63);
          expect(context.idea('agentDirection').data().value).to.equal('east');
          expect(context.idea('agentHasGold').data().value).to.equal(false);

          goalCallback('goto gold').then(function() {
            expect(socket.messages.message).to.equal('goal:goto gold> oxygen potassium');
            expect(context.idea('agentLocation').data().value).to.equal(68);
            expect(context.idea('agentDirection').data().value).to.equal('west');
            expect(context.idea('agentHasGold').data().value).to.equal(false);
          }).finally(done).catch(done);

          checkUntilSuccess();
        });

        it('exit', function(done) {
          expect(context.idea('agentLocation').data().value).to.equal(63);
          expect(context.idea('agentDirection').data().value).to.equal('east');
          expect(context.idea('agentHasGold').data().value).to.equal(false);

          goalCallback('room 78').then(function() {
            expect(socket.messages.message).to.equal('goal:room 78> oxygen potassium');
            expect(context.idea('agentLocation').data().value).to.equal(78);
            expect(context.idea('agentDirection').data().value).to.equal('north');

            var ret = goalCallback('goto exit').then(function() {
              expect(socket.messages.message).to.equal('goal:goto exit> oxygen potassium');
              expect(context.idea('agentLocation').data().value).to.equal(63);
              expect(context.idea('agentDirection').data().value).to.equal('south');
              expect(context.idea('agentHasGold').data().value).to.equal(false);
            });

            checkUntilSuccess();

            return ret;
          }).finally(done).catch(done);

          checkUntilSuccess();
        });
      }); // end goto

      describe('gold', function() {
        it('in the room', function(done) {
          expect(context.idea('agentLocation').data().value).to.equal(63);
          expect(context.idea('agentDirection').data().value).to.equal('east');
          expect(context.idea('agentHasGold').data().value).to.equal(false);
          expect(getRoomProperty(68, 'Gold').value).to.equal(true);

          goalCallback('room 68').then(function() {
            expect(context.idea('agentLocation').data().value).to.equal(68);

            var ret = goalCallback('gold').then(function() {
              expect(socket.messages.message).to.equal('goal:gold> oxygen potassium');
              expect(context.idea('agentHasGold').data().value).to.equal(true);
              expect(getRoomProperty(68, 'Gold').value).to.equal(false);
            });

            checkUntilSuccess();

            return ret;
          }).finally(done).catch(done);

          checkUntilSuccess();
        });

        it('near the room', function(done) {
          expect(context.idea('agentLocation').data().value).to.equal(63);
          expect(context.idea('agentDirection').data().value).to.equal('east');
          expect(context.idea('agentHasGold').data().value).to.equal(false);
          expect(getRoomProperty(68, 'Gold').value).to.equal(true);

          goalCallback('room 67').then(function() {
            expect(context.idea('agentLocation').data().value).to.equal(67);

            // pick up the gold
            var ret = goalCallback('gold').then(function() {
              expect(socket.messages.message).to.equal('goal:gold> oxygen potassium');
              expect(context.idea('agentHasGold').data().value).to.equal(true);
              expect(getRoomProperty(68, 'Gold').value).to.equal(false);
            });

            checkUntilSuccess();

            return ret;
          }).finally(done).catch(done);

          checkUntilSuccess();
        });

        it.skip('gold step-through');
      }); // end gold

      it('win', function(done) {
        expect(context.idea('agentLocation').data().value).to.equal(63);
        expect(context.idea('agentDirection').data().value).to.equal('east');
        expect(context.idea('agentHasGold').data().value).to.equal(false);
        expect(context.idea('agentHasWon').data().value).to.equal(false);

        //goalCallback('room 68');
        //expect(socket.messages.message).to.equal('goal:room 68> oxygen potassium');
        //goalCallback('gold');
        //expect(socket.messages.message).to.equal('goal:gold> oxygen potassium');
        //goalCallback('room 63');
        //expect(socket.messages.message).to.equal('goal:room 63> oxygen potassium');

        // just create the gold for this test
        var data = context.idea('agentHasGold').data();
        data.value = true;
        context.idea('agentHasGold').update(data);

        expect(context.idea('agentLocation').data().value).to.equal(63);
        expect(context.idea('agentHasGold').data().value).to.equal(true);

        // exit
        goalCallback('win').then(function() {
          expect(socket.messages.message).to.equal('goal:win> oxygen potassium');
          expect(context.idea('agentHasWon').data().value).to.equal(true);
        }).finally(done).catch(done);

        checkUntilSuccess();
      });

      it.skip('play', function(done) {
        expect(context.idea('agentLocation').data().value).to.equal(63);
        expect(context.idea('agentDirection').data().value).to.equal('east');
        expect(context.idea('agentHasGold').data().value).to.equal(false);
        expect(context.idea('agentHasWon').data().value).to.equal(false);

        goalCallback('play').then(function() {
          expect(context.idea('agentLocation').data().value).to.equal(63);
          expect(context.idea('agentDirection').data().value).to.equal('north');
          expect(context.idea('agentHasGold').data().value).to.equal(true);
          expect(context.idea('agentHasWon').data().value).to.equal(true);
        }).finally(done).catch(done);

        checkUntilSuccess();
      });

      it.skip('goto gold & play', function(done) {
        // this was a bugfix test
        //
        // we can generate a plan, but it can't apply it
        goalCallback('goto gold').then(function() {
          expect(context.idea('agentLocation').data().value).to.equal(68);
          expect(context.idea('agentHasGold').data().value).to.equal(false);
          expect(context.idea('agentHasWon').data().value).to.equal(false);

          var ret = goalCallback('play').then(function() {
            expect(context.idea('agentLocation').data().value).to.equal(63);
            expect(context.idea('agentHasGold').data().value).to.equal(true);
            expect(context.idea('agentHasWon').data().value).to.equal(true);
          });

          checkUntilSuccess();

          return ret;
        }).finally(done).catch(done);

        checkUntilSuccess();
      });
    }); // end goal
  }); // end server
}); // end setup