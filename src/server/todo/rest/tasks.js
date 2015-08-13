'use strict';
var config = require('lime/src/config');
var ideas = require('lime/src/database/ideas');
var links = require('lime/src/database/links');
var subgraph = require('lime/src/database/subgraph');

var lwt_task = ideas.context('lm_wumpus_todo__task');

exports.rest = function(router) {
  // (e.g. http://localhost:3000/rest/todo/tasks/count)
  router.get('/tasks/count', function(req, res) {
    res.json({ count: taskCount() });
  });

  // QUERY
  router.get('/tasks', function(req, res) {
    // build the query
    var sg = new subgraph.Subgraph();
    // the task
    var t = sg.addVertex(subgraph.matcher.filler);
    // must by of type task
    sg.addEdge(t, links.list.type_of, sg.addVertex(subgraph.matcher.id, lwt_task));

    // restrict to the children of a particular task
    if(req.query.hasOwnProperty('children')) {
      var parent = ideas.proxy(req.query.children || lwt_task);
      sg.addEdge(sg.addVertex(subgraph.matcher.id, parent), links.list.lm_wumpus_todo__child, t);
    }

    // run the search
    var result = subgraph.search(sg);

    // collect the results we want to send to the UI
    var list = result
      // get the task idea from each of the result graphs
      .map(function(g) { return g.getIdea(t); })
      // get the task data from these ideas
      .map(getTaskData);

    // return the list of task data
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
    var idea = ideas.load(req.params.id);

    if(!idea.link(links.list.type_of).find(function(i) { return i.id === lwt_task.id; }))
      res.status(404).send({ message: 'Not a Task' });
    else
      res.json(getTaskData(idea));
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

function ensureList(idea, link, list) {
  list = list.splice(0);
  var curr = idea.link(link).map(function(proxy) { return proxy.id; });

  // remove: all the ones in curr that are not in list
  curr.forEach(function(c) {
    if(list.indexOf(c) === -1) {
      idea.unlink(link, c);
      ideas.save(c);
    }
  });

  // add: all the oens in list that are not in curr
  list.forEach(function(l) {
    if(curr.indexOf(l) === -1) {
      idea.link(link, l);
      ideas.save(l);
    }
  });
}

function getTaskData(idea) {
  var data = idea.data();
  data.children = idea.link(links.list.lm_wumpus_todo__child).map(function(proxy) { return proxy.id; });
  data.blockedBy = idea.link(links.list.lm_wumpus_todo__depends_on).map(function(proxy) { return proxy.id; });
  data.blocking = idea.link(links.list.lm_wumpus_todo__depends_on.opposite).map(function(proxy) { return proxy.id; });
  return data;
}

function updateTask(idea, data) {
  ensureList(idea, links.list.lm_wumpus_todo__status, data.status?[data.status]:[]);
  ensureList(idea, links.list.lm_wumpus_todo__type, data.type?[data.type]:[]);
  ensureList(idea, links.list.lm_wumpus_todo__child.opposite, [(data.parent || lwt_task)]); // if there is no parent, then default to the task root
  delete data.children;

  ensureList(idea, links.list.lm_wumpus_todo__depends_on, data.blockedBy);
  ensureList(idea, links.list.lm_wumpus_todo__depends_on.opposite, data.blocking);
  delete data.blockedBy;
  delete data.blocking;

  idea.update(data);
  ideas.save(idea);
}