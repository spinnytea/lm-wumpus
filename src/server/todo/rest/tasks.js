'use strict';
var ideas = require('lime/src/database/ideas');
var links = require('lime/src/database/links');

var lwt_task = ideas.context('lm_wumpus_todo__task');

exports.rest = function(router) {
  // (e.g. http://localhost:3000/rest/todo/tasks/count)
  router.get('/tasks/count', function(req, res) {
    res.json({ count: taskCount() });
  });
};

function taskCount() {
  // for now, no arguments
  return lwt_task.link(links.list.type_of.opposite).length;
}
