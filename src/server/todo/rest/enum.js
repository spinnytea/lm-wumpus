'use strict';
var config = require('lime/src/config');
var ideas = require('lime/src/database/ideas');
var links = require('lime/src/database/links');

exports.rest = function(router, path, context) {
  var root = '/'+path;
  var specific = root + '/:id';

  // QUERY
  router.get(root, function(req, res) {
    var list = context.link(links.list.type_of.opposite);
    list = list.map(function(idea) { return idea.data(); });

    res.json({ list: list });
  });

  // CREATE
  router.post(root, function(req, res) {
    var data = req.body;
    var idea = ideas.create();
    data.id = idea.id;
    idea.update(data);
    idea.link(links.list.type_of, context);
    ideas.save(idea);
    ideas.save(context);
    config.save();

    res.json(data);
  });

  // UPDATE
  router.put(specific, function(req, res) {
    // assumption: req.body.id === req.params.id
    var data = req.body;
    var idea = ideas.load(data.id);
    idea.update(data);
    ideas.save(idea);
    config.save();

    res.json(data);
  });
};
