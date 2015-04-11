'use strict';
/* global beforeEach, before, after */
var context = require('../../../src/server/wumpus/context');
var config = require('../../../src/client/js/wumpus/impl/config');

//
// dummy socket.io impl for the specs
// contains the methods that we use
//

exports.messages = {};
exports.emit = function(room, message) { exports.messages[room] = message; };

// helper method for setting up the integrated environment
exports.setup = function(init_world_model) {
  if(!init_world_model)
    throw new Error('must provide data to test against');

  before(function() {
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