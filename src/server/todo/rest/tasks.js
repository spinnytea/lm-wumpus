'use strict';
var config = require('lime/src/config');
var ideas = require('lime/src/database/ideas');
var links = require('lime/src/database/links');

var lwt_task = ideas.context('lm_wumpus_todo__task');

exports.rest = function(router) {
  // (e.g. http://localhost:3000/rest/todo/tasks/count)
  router.get('/tasks/count', function(req, res) {
    res.json({ count: taskCount() });
  });

  // QUERY
  router.get('/tasks', function(req, res) {
    // for now, it just returns everything
    var list = lwt_task.link(links.list.type_of.opposite);
    list = list.map(function(idea) { return idea.data(); });

    res.json({ list: list });
  });

  // CREATE task
  router.post('/tasks', function(req, res) {
    var data = req.body;
    var idea = ideas.create();
    data.id = idea.id;
    idea.link(links.list.type_of, lwt_task);
    ideas.save(lwt_task);
    config.save();

    updateTask(idea, data);

    res.json(data);
  });

  // GET task
  router.get('/tasks/:id', function(req, res) {
    res.json(ideas.load(req.params.id).data());
  });

  // UPDATE task
  router.put('/tasks/:id', function(req, res) {
    // assumption: req.body.id === req.params.id
    var data = req.body;
    var idea = ideas.load(data.id);

    updateTask(idea, data);

    res.json(data);
  });
};

function taskCount() {
  // for now, no arguments
  return lwt_task.link(links.list.type_of.opposite).length;
}

function ensureLink(idea, link, to) {
  idea.link(link).forEach(function(existing) {
    idea.unlink(link, existing);
    ideas.save(existing);
  });

  if(to && (to = ideas.proxy(to))) {
    idea.link(link, to);
    ideas.save(to);
  }
}

function updateTask(idea, data) {
  idea.update(data);
  ensureLink(idea, links.list.lm_wumpus_todo__status, data.status);
  ensureLink(idea, links.list.lm_wumpus_todo__type, data.type);
  ensureLink(idea, links.list.lm_wumpus_todo__child, (data.parent || lwt_task)); // if there is no parent, then default to the task root
  ideas.save(idea);
}