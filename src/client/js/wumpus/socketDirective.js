'use strict';
// this is the visual representation of a socket connect
// it won't react to EVERYTHING, but it renders the communication that makes sense
var _ = require('lodash');

var config = require('./impl/config');
var socket = require('./socket');

module.exports = angular.module('lime.client.wumpus.socketDirective', [
  require('../subgraph/subgraphModule').name
])
.directive('wumpusSocket', [
  '$location', 'lime.client.subgraph.data',
  function($location, subgraphData) {
    var COMMAND_TYPES = {
      'command': 'command', 'c': 'command',
      'context': 'context',
      'actuator': 'actuator', 'a': 'actuator',
      'goal': 'goal', 'g': 'goal'
    };
    return {
      templateUrl: 'partials/wumpus/socket.html',
      link: function($scope) {
        $scope.$on('$destroy', socket.connect($scope, $location.protocol(), $location.host()));

        // because of the ng-if, the game has already been setup
        if(config.game.player === 'lemon' && config.game.timing === 'static')
          socket.sense();


        socket.on('context', function(sg) {
          sg = JSON.parse(sg);

          // the format of the data has since been improved
          // convert the new format into the old one
          sg.vertices = _.map(sg.match, function(value, key) { return {
            vertex_id: +key,
            matcher: value.matcher,
            matchData: value.data,
            options: value.options,
            idea: sg.idea[key],
            _data: sg.data[key]
          }; });
          delete sg.match;
          delete sg.idea;
          delete sg.data;

          if(sg.vertices.some(function(v, idx) { return v.vertex_id !== idx; }))
            throw new Error('vertex id does not match array index ~ fix edges.src and edges.dst');

          sg.edges.forEach(function(value) {
            value.src = +value.src;
            value.dst = +value.dst;
          });

          subgraphData.add(sg);
        });
        socket.on('context_bak', function(subgraph) {
          subgraph = JSON.parse(subgraph);

          // build a change set
          var removeV = [];
          var addE = [];

          function findEdge(list, src, link, dst) {
            var match;
            list.some(function(e) {
              if(src !== undefined && src !== e.src) return false;
              if(link !== undefined && link !== e.link) return false;
              if(dst !== undefined && dst !== e.dst) return false;
              match = e;
              return true;
            });
            return match;
          }

          // condense all room "a <-> door <-> b" sets into just "a <-> b"
          subgraph.edges.forEach(function(e) {
            var a = subgraph.vertices[e.src];

            // if a is a room
            // if this edge is a door
            if(a._data && a._data.loc && e.link === 'wumpus_room_door') {

              // find the door -> b edge
              var d_b = findEdge(subgraph.edges, e.dst, 'wumpus_room_door');

              if(d_b) {
                // remove e.dst
                removeV.push(e.dst);

                // link e.src -> e2.dst
                // but only if the reverse doesn't exist
                if(!findEdge(addE, d_b.dst, 'wumpus_room_door', e.src))

                // actually, it seems to look better if we add them both
                  addE.push({src: e.src, link: 'wumpus_room_door', dst: d_b.dst });


                // #8c564b
              }
            }
          });

          subgraph.vertices.forEach(function(v) {
            if(v._data) {
              // update rooms
              if(v._data.loc) {
                v._data = 'Room ' + v._data.value;
                v.color = '#8c564b';
              }

              // remove context/named nodes
              if(v._data.name)
                removeV.push(v.vertex_id);
            }
          });

          subgraph.edges.forEach(function(e) {
            // update hasGold/hadPit/hasExit
            // these are noted by edges
            var v = subgraph.vertices[e.dst];
            if(e.link === 'wumpus_sense_hasGold') {
              if(v._data.value)
                v.color = 'gold';
              else
                removeV.push(e.dst);
            }
            if(e.link === 'wumpus_sense_hasPit') {
              if(v._data.value)
                v.color = 'blue';
              else
                removeV.push(e.dst);
            }
            if(e.link === 'wumpus_sense_hasExit') {
              if(v._data.value)
                v.color = 'black';
              else
                removeV.push(e.dst);
            }

            if(e.link === 'context')
              removeV.push(e.dst);
          });

          // apply changes
          subgraph.vertices = subgraph.vertices.filter(function(v) { return removeV.indexOf(v.vertex_id) === -1; });
          Array.prototype.push.apply(subgraph.edges, addE);

          subgraphData.add(subgraphData.remap(subgraph));
        }); // end socket.on context
        socket.emit('context');

        $scope.message = '';
        socket.on('message', function(str) {
          $scope.serverMessage = str;
        });
        $scope.keyup = function($event) {
          if($event.keyCode === 13) { // enter
            var idx = $scope.message.indexOf(' ');
            if(idx === -1) idx = $scope.message.length;
            var type = $scope.message.substring(0, idx);

            // only process this if it starts with a valid command
            if(type in COMMAND_TYPES) {
              socket.emit(COMMAND_TYPES[type], $scope.message.substring(type.length+1));
              $scope.message = '';
            }
          }
        };

        socket.on('plan', function(planNames) {
          $scope.the_plan = planNames.map(function(name) {
            var icon;
            switch(name) {
              case 'up':
                icon = 'fa-long-arrow-right';
                break;
              case 'right':
              case 'left':
                icon = 'fa-rotate-'+name;
                break;
              case 'exit':
                icon = 'fa-thumbs-o-up';
                break;
              case 'grab':
                icon = 'fa-diamond';
                break;
              default:
                icon = 'fa-question';
            }
            return { icon: icon, title: name };
          });
        });
      } // end link
    };
  }
]);