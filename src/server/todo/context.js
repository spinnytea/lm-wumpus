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
ensureContext(lwt_task);
ensureContext(lwt_status);
[lm_wumpus_todo, lwt_task, lwt_status].forEach(ideas.save);
config.save();

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

  router.get('/statuses', function(req, res) {
    var list = lwt_status.link(links.list.type_of.opposite);
    list = list.map(function(idea) { return idea.data(); });
    res.json({ list: list });
  });
  router.post('/statuses', function(req, res) {
    var data = req.body;
    var idea = ideas.create();
    data.id = idea.id;
    idea.update(data);
    idea.link(links.list.type_of, lwt_status);
    ideas.save(idea);
    ideas.save(lwt_status);
    config.save();

    res.json(data);
  });
  router.put('/statuses/:id', function(req, res) {
    // assumption: req.body.id === req.params.id
    var data = req.body;
    var idea = ideas.load(data.id);
    idea.update(data);
    ideas.save(idea);
    config.save();

    res.json(data);
  });

  return router;
};
