'use strict';
var bodyParser = require('body-parser');
var express = require('express');
var path = require('path');
var serve = require('serve-static');
var touch = require('touch');

// set the idea database location for this server
require('lime/src/config').init({
  location: '/Volumes/Learning Machine Source/git/lm-wumpus/todo_database',
  //location: '/Volumes/RAM Disk',
});

var app = express();
app.use(bodyParser.json());
app.use('/vendor', serve(path.join(__dirname, '..', '..', 'bower_components')));
app.use(serve(path.join(__dirname, '..', 'client')));
app.listen(8888, function() {
  touch.sync(path.join(__dirname, '.stamp'));
});

var server = require('http').Server(app);
var io = require('socket.io')(server);
server.listen(3000);

require('./wumpus/index.js').setup(io.of('/wumpus'));

app.use('/rest/todo', require('./todo/context.js').rest(express.Router()));