'use strict';
/* global describe, it */
var expect = require('chai').expect;

var number = require('lime/src/planning/primitives/number');

var wumpusSensors = require('../../../../src/server/wumpus/actuators/wumpusSensors');

describe('wumpusSensors', function() {
  describe('units', function() {
    it('agent_inside_room', function() {
      expect(wumpusSensors.units.agent_inside_room).to.be.a('Function');

      expect(wumpusSensors.units.agent_inside_room(
        number.value(0), number.value(0),
        number.value(0), number.value(0), number.value(1)
      )).to.equal(true);

      expect(wumpusSensors.units.agent_inside_room(
        number.value(1), number.value(1),
        number.value(0), number.value(0), number.value(1)
      )).to.equal(false);

      expect(wumpusSensors.units.agent_inside_room(
        number.value(1), number.value(1),
        number.value(0), number.value(0), number.value(2)
      )).to.equal(true);

      expect(wumpusSensors.units.agent_inside_room(
        number.value(1), number.value(1),
        number.value(2), number.value(0), number.value(2)
      )).to.equal(true);

      expect(wumpusSensors.units.agent_inside_room(
        number.value(1), number.value(1),
        number.value(4), number.value(0), number.value(2)
      )).to.equal(false);
    });
  }); // end units
}); // end wumpusSensors