'use strict';
var bodyParser = require('body-parser');
var browserify = require('browserify-middleware');
var express = require('express');
var path = require('path');
var serve = require('serve-static');

// set the idea database location for this server
require('lime/src/config').init({
  location: '/Volumes/Learning Machine Source/git/lm-wumpus/todo_database',
  //location: '/Volumes/RAM Disk',
  do_not_clean: true,
});

var app = express();
app.use(bodyParser.json());
app.use('/vendor', serve(path.join(__dirname, '..', '..', 'bower_components')));
app.get('/index.js', browserify(path.join(__dirname, '..', 'client', 'index.js')));
app.use(serve(path.join(__dirname, '..', 'client')));

var server = require('http').Server(app);
var io = require('socket.io')(server);
server.listen(3000);

require('./wumpus/index.js').setup(io.of('/wumpus'));

app.use('/rest/todo', require('./todo/context.js').rest(express.Router()));