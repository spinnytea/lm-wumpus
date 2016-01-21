'use strict';
var _ = require('lodash');
var ideas = require('lime/src/database/ideas');
var links = require('lime/src/database/links');

// the tag type
// a specific tag is linked to this
// the tag is then linked to the task via lm_wumpus_todo__tag
var lwt_tag = ideas.context('lm_wumpus_todo__tag');

exports.getAsIdeas = getAsIdeas;
exports.rest = function(router) {
  router.get('/tags', function(req, res) {
    res.json({ list: getTags() });
  });
};

// get all tags
function getTags() {
  return lwt_tag.link(links.list.type_of.opposite)
    .map(function(idea) { return idea.data(); });
}

function getAsIdeas(strings) {
  var tagsByName = _.indexBy(lwt_tag.link(links.list.type_of.opposite), function(idea) {
    return idea.data();
  });

  return strings.map(function(str) {
    // get
    if(tagsByName[str])
      return tagsByName[str];
    // or create
    var idea = ideas.create(str);
    idea.link(links.list.type_of, lwt_tag);
    tagsByName[str] = idea;
    return idea;
  });
}
