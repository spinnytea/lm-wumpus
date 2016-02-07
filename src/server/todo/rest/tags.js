'use strict';
var _ = require('lodash');
var config = require('lime/src/config');
var ideas = require('lime/src/database/ideas');
var links = require('lime/src/database/links');

// the tag type
// a specific tag is linked to this
// the tag is then linked to the task via lm_wumpus_todo__tag
var lwt_tag = ideas.context('lm_wumpus_todo__tag');

exports.getAsIdeas = getAsIdeas;
exports.rest = function(router) {
  router.get('/tags', function(req, res) {
    var list = lwt_tag.link(links.list.type_of.opposite).map(function(idea) {
      return {
        text: idea.data(),
        count: idea.link(links.list.lm_wumpus_todo__tag).length
      };
    });
    res.json({ list: list });
  });
};

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
