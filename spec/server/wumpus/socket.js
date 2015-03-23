'use strict';
/* global beforeEach, before, after */
var server = require('../../../src/server/wumpus/index');
var context = require('../../../src/server/wumpus/context');
var config = require('../../../src/client/js/wumpus/impl/config');

//
// dummy socket for the specs
//

exports.messages = {};
exports.emit = function(room, message) { exports.messages[room] = message; };

// helper method for setting up the integrated environment
exports.setup = function() {
  var init_world_model;
  before(function() {
    init_world_model = require('./test_data');
    context.setup(exports, config);
  });

  after(function() {
    context.cleanup();
  });

  beforeEach(function() {
    context.sense(init_world_model);
    context.subgraph.invalidateCache();
  });
};