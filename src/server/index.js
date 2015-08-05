'use strict';
var bodyParser = require('body-parser');
var express = require('express');
var path = require('path');
var touch = require('touch');

var app = express();
app.use(bodyParser.json());
app.use('/vendor', express.static(path.join(__dirname, '..', '..', 'vendor')));
app.use(express.static(path.join(__dirname, '..', 'client')));
app.listen(8888, function() {
  touch.sync(path.join(__dirname, '.stamp'));
});

var server = require('http').Server(app);
var io = require('socket.io')(server);
server.listen(3000);

require('./wumpus/index.js').setup(io.of('/wumpus'));

app.use('/rest/todo', require('./todo/context.js').rest(express.Router()));