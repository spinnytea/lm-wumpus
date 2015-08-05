'use strict';
var links = require('lime/src/database/links');
var context = require('../context');

exports.rest = function(router) {
  // (e.g. http://localhost:3000/rest/todo/tasks/count)
  router.get('/tasks/count', function(req, res) {
    res.json({ count: taskCount() });
  });
};

function taskCount() {
  // for now, no arguments
  return context.ideas.lwt_task.link(links.list.type_of.opposite).length;
}
