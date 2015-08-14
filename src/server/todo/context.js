'use strict';
var config = require('lime/src/config');
var ideas = require('lime/src/database/ideas');
var links = require('lime/src/database/links');

function ensureContext(idea) {
  if(!idea.link(links.list.context).some(function(proxy) { return proxy.id === lm_wumpus_todo.id; })) {
    idea.link(links.list.context, lm_wumpus_todo);
  }
}

var lm_wumpus_todo = ideas.context('lm_wumpus_todo');
var lwt_task = ideas.context('lm_wumpus_todo__task');
var lwt_status = ideas.context('lm_wumpus_todo__status');
var lwt_type = ideas.context('lm_wumpus_todo__type');
var lwt_priority = ideas.context('lm_wumpus_todo__priority');
ensureContext(lwt_task);
ensureContext(lwt_status);
ensureContext(lwt_type);
[lm_wumpus_todo, lwt_task, lwt_status, lwt_type].forEach(ideas.save);
config.save();

// marks a dependency between tasks
// task --depends_on--> task
links.create('lm_wumpus_todo__depends_on');
// task --status-> status
links.create('lm_wumpus_todo__status');
// task --status-> type
links.create('lm_wumpus_todo__type');
// task --status-> priority
links.create('lm_wumpus_todo__priority');
// task --child-> task
// special case (root): lwt_task -> task
links.create('lm_wumpus_todo__child');

exports.ideas = {
  lm_wumpus_todo: lm_wumpus_todo,
  lwt_task: lwt_task
};


//
// this MUST be defined last
// we are playing a tricky game with circular dependencies
//
exports.rest = function(router) {
  var enums = require('./rest/enum');

  require('./rest/tasks').rest(router);
  enums.rest(router, 'statuses', lwt_status);
  enums.rest(router, 'types', lwt_type);
  enums.rest(router, 'priorities', lwt_priority);

  return router;
};
