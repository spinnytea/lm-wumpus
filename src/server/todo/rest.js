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


exports.setup = function(router) {
  // (e.g. http://localhost:3000/rest/todo/tasks/count)
  router.get('/tasks/count', function(req, res) {
    res.json({ count: taskCount() });
  });

  return router;
};

function taskCount() {
  // for now, no arguments
  return lwt_task.link(links.list.type_of.opposite).length;
}
