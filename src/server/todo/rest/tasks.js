'use strict';
var _ = require('lodash');
var config = require('lime/src/config');
var ideas = require('lime/src/database/ideas');
var links = require('lime/src/database/links');
var subgraph = require('lime/src/database/subgraph');

var tags = require('./tags');

var lwt_task = ideas.context('lm_wumpus_todo__task');

exports.rest = function(router) {
  // (e.g. http://localhost:3000/rest/todo/tasks/count)
  router.get('/tasks/count', function(req, res) {
    res.json({ count: taskCount() });
  });

  // QUERY
  router.get('/tasks', function(req, res) {
    // build the query set

    var sgs = new subgraph.Subgraph();
    // the task
    var t = sgs.addVertex(subgraph.matcher.filler);
    // must by of type task
    sgs.addEdge(t, links.list.type_of, sgs.addVertex(subgraph.matcher.id, lwt_task));

    // convert the base into an array
    // all other params must add to the list
    sgs = [sgs];

    function addRequirement(link, idea) {
      if(!_.isArray(idea)) {
        // if there is only one value (the raw value)
        // then we can loop through the subgraphs and modify them directly
        sgs.forEach(function(sg) {
          sg.addEdge(t, link, sg.addVertex(subgraph.matcher.id, idea));
        });
      } else {
        // if there is a list of values, then we'll OR them together
        // for each sg, create a list of sg (one for each search value)
        // then reduce the ~matrix into one array
        sgs = sgs.map(function(sg) {
          return idea.map(function(id) {
            var copy = sg.copy();
            copy.addEdge(t, link, copy.addVertex(subgraph.matcher.id, id));
            return copy;
          });
        }).reduce(function(ret, list) { Array.prototype.push.apply(ret, list); return ret; }, []);
      }
    }

    // restrict to the children of a particular task
    if(req.query.hasOwnProperty('children')) {
      if(!_.isArray(req.query.children)) {
        // if no child is provided (empty/null/undefined query param),
        // then return root thoughts (these are children of the task idea)
        var parent = ideas.proxy(req.query.children || lwt_task);
        sgs.forEach(function (sg) {
          sg.addEdge(sg.addVertex(subgraph.matcher.id, parent), links.list.lm_wumpus_todo__child, t);
        });
      }
    }

    // restrict to children of a particular task, but do a recursive search
    if(req.query.hasOwnProperty('parent') && req.query.parent) {
      if(!_.isArray(req.query.parent)) {
        var some_parent = ideas.proxy(req.query.parent);
        sgs.forEach(function (sg) {
          sg.addEdge(sg.addVertex(subgraph.matcher.id, some_parent), links.list.lm_wumpus_todo__child, t, undefined, true);
        });
      }
    }

    // restrict to tasks with a certain status
    if(req.query.hasOwnProperty('status')) {
      addRequirement(links.list.lm_wumpus_todo__status, req.query.status);
    }

    // restrict to tasks with a certain type
    if(req.query.hasOwnProperty('type')) {
      addRequirement(links.list.lm_wumpus_todo__type, req.query.type);
    }

    // restrict to tasks with a certain priority
    if(req.query.hasOwnProperty('priority')) {
      addRequirement(links.list.lm_wumpus_todo__priority, req.query.priority);
    }

    // restrict to tasks with a certain set of tags
    if(req.query.hasOwnProperty('tags') && req.query.tags) {
      var tagList = req.query.tags;
      // a single tag will come across as a string
      if(_.isString(tagList))
        tagList = [tagList];
      tagList = tags.getAsIdeas(tagList, false);
      tagList.forEach(function(id) {
        addRequirement(links.list.lm_wumpus_todo__tag.opposite, id);
      });
    }

    // run the searches, reduce the results to a set, strip out the values
    // TODO lodash chain start/end
    var list = _.values(sgs
      .map(function(sg) { return subgraph.search(sg); })
      .reduce(function(set, next) { next.forEach(function(g) { set[g.getIdea(t).id] = g.getIdea(t); }); return set; }, {}));

    // return the list of task data
    res.json({ list: list.map(getTaskData) });
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

    res.json(getTaskData(idea));
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
  data.id = idea.id;

  data.status = idea.link(links.list.lm_wumpus_todo__status).map(function(proxy) { return proxy.id; });
  if(data.status.length === 1) data.status = data.status[0]; else data.status = undefined;
  data.type = idea.link(links.list.lm_wumpus_todo__type).map(function(proxy) { return proxy.id; });
  if(data.type.length === 1) data.type = data.type[0]; else data.type = undefined;
  data.priority = idea.link(links.list.lm_wumpus_todo__priority).map(function(proxy) { return proxy.id; });
  if(data.priority.length === 1) data.priority = data.priority[0]; else data.priority = undefined;

  data.parent = idea.link(links.list.lm_wumpus_todo__child.opposite).map(function(proxy) { return proxy.id; });
  if(data.parent.length === 1 && data.parent[0] !== lwt_task.id) data.parent = data.parent[0]; else data.parent = undefined;
  data.children = idea.link(links.list.lm_wumpus_todo__child).map(function(proxy) { return proxy.id; });

  data.blockedBy = idea.link(links.list.lm_wumpus_todo__depends_on).map(function(proxy) { return proxy.id; });
  data.blocking = idea.link(links.list.lm_wumpus_todo__depends_on.opposite).map(function(proxy) { return proxy.id; });
  data.related = idea.link(links.list.lm_wumpus_todo__related).map(function(proxy) { return proxy.id; });

  data.tags = idea.link(links.list.lm_wumpus_todo__tag.opposite).map(function(proxy) { return proxy.data(); });
  return data;
}

function updateTask(idea, data) {
  delete data.id;

  ensureList(idea, links.list.lm_wumpus_todo__status, data.status?[data.status]:[]);
  ensureList(idea, links.list.lm_wumpus_todo__type, data.type?[data.type]:[]);
  ensureList(idea, links.list.lm_wumpus_todo__priority, data.priority?[data.priority]:[]);
  delete data.status;
  delete data.type;
  delete data.priority;

  ensureList(idea, links.list.lm_wumpus_todo__child.opposite, [(data.parent || lwt_task)]); // if there is no parent, then default to the task root
  delete data.parent;
  delete data.children; // we only care about making sure the parent is hooked up; the child list will handle itself by extension

  ensureList(idea, links.list.lm_wumpus_todo__depends_on, data.blockedBy||[]);
  ensureList(idea, links.list.lm_wumpus_todo__depends_on.opposite, data.blocking||[]);
  ensureList(idea, links.list.lm_wumpus_todo__related, data.related||[]);
  delete data.blockedBy;
  delete data.blocking;
  delete data.related;

  ensureList(idea, links.list.lm_wumpus_todo__tag.opposite, tags.getAsIdeas(data.tags||[], true));
  delete data.tags;

  idea.update(data);
  ideas.save(idea);
}