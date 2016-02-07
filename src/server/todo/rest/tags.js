'use strict';
var _ = require('lodash');
var config = require('lime/src/config');
var ideas = require('lime/src/database/ideas');
var links = require('lime/src/database/links');
var subgraph = require('lime/src/database/subgraph');

// the tag type
// a specific tag is linked to this
// the tag is then linked to the task via lm_wumpus_todo__tag
var lwt_tag = ideas.context('lm_wumpus_todo__tag');

exports.getAsIdeas = getAsIdeas;
exports.rest = function(router) {
  router.get('/tags', function(req, res) {
    res.json({ list: getCounts(req.query) });
  });
};

function getCounts(query) {
  var sg = new subgraph.Subgraph();
  var tag = sg.addVertex(subgraph.matcher.filler);
  var task = sg.addVertex(subgraph.matcher.filler);
  sg.addEdge(tag, links.list.type_of, sg.addVertex(subgraph.matcher.id, lwt_tag));
  sg.addEdge(tag, links.list.lm_wumpus_todo__tag, task);

  // XXX if we need to filter more things, then copy the tasks structure
  if(query.hasOwnProperty('status')) {
    var status = query.status;
    if(!_.isArray(status)) status = [status];

    sg = status.map(function(id) {
      var copy = sg.copy();
      copy.addEdge(task, links.list.lm_wumpus_todo__status, copy.addVertex(subgraph.matcher.id, id));
      return copy;
    });
  } else {
    sg = [sg];
  }

  var str_count = {};
  sg.forEach(function(s) {
    var result = subgraph.search(s);
    result.forEach(function(r) {
      var str = r.getData(tag);
      str_count[str] = (str_count[str] || 0) + 1;
    });
  });
  return _.map(str_count, function(count, str) { return { text: str, count: count }; });
}

// @return [idea.id]
function getAsIdeas(strings, create) {
  var tagsByName = _.keyBy(lwt_tag.link(links.list.type_of.opposite), function(idea) {
    return idea.data();
  });

  return strings.map(function(str) {
    // get
    if(tagsByName[str])
      return tagsByName[str];
    // or create
    if(create) {
      var idea = ideas.create(str);
      idea.link(links.list.type_of, lwt_tag);
      ideas.save(lwt_tag);
      ideas.save(idea);
      config.save();
      tagsByName[str] = idea;
      return idea;
    } else {
      return undefined;
    }
    // clear out the undefined ideas when we don't create them
  }).filter(function(idea) { return idea; })
    .map(function(idea) { return idea.id; });
}
