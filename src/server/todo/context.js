'use strict';
var ideas = require('lime/src/database/ideas');
var links = require('lime/src/database/links');

var lm_wumpus_todo = ideas.context('lm_wumpus_todo');
var lwt_task = ideas.context('lm_wumpus_todo__task');
if(!lwt_task.link(links.list.context).some(function(proxy) { return proxy.id === lm_wumpus_todo.id; })) {
  lwt_task.link(links.list.context, lm_wumpus_todo);
  [lwt_task, lm_wumpus_todo].forEach(ideas.save);
}

// marks a dependency between tasks
// task --depends_on--> task
links.create('lm_wumpus_todo__depends_on');

exports.ideas = {
  lm_wumpus_todo: lm_wumpus_todo,
  lwt_task: lwt_task
};


//
// this MUST be defined last
// we are playing a tricky game with circular dependencies
//
exports.rest = function(router) {
  require('./rest/tasks').rest(router);

  return router;
};

