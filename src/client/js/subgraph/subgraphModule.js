'use strict';
/* global d3, $ */
// render a core/database/subgraph

module.exports = angular.module('lime.client.subgraph', [])
.factory('lime.client.subgraph.data', function() {
  var instance = {};
  instance.list = [];

  function buildName(subgraph, idx) {
    if(subgraph.data[idx])
      return JSON.stringify(subgraph.data[idx]);
    else
      return subgraph.match[idx].match + '(' + JSON.stringify(subgraph.match[idx].data) + ')';
  }

  function buildNodes(subgraph, diff) {
    var ret = [];
    var idx;
    var type;

    while(ret.length < subgraph.vertexCount) {
      idx = ret.length;

      var name = buildName(subgraph, idx);
      if(diff && diff.data[idx]) {
        name = 'before: ' + name + '\nafter: ' + buildName(diff, idx);
      }

      type = undefined;
      if(subgraph.edges.some(function(e) { return e.dst === idx && e.link === 'context'; })) {
        type = 'context';
      } else if(subgraph.match[idx].data && subgraph.match[idx].data.name) {
        type = 'named';
      }

      ret.push({
        name: name,
        color: typeColor[type] || subgraph.color[idx] || '#7f7f7f',
        opacity: (diff && !diff.data[idx])?0.3:1
      });
    }

    return ret;
  }

  // parse subgraph.stringify
  instance.add = function(subgraph, diff) {
    if(typeof subgraph === 'string')
      subgraph = JSON.parse(subgraph);
    subgraph.color = subgraph.color || {};

    instance.list.push({
      selected: (instance.list.length === 0),
      subgraph: subgraph,
      diff: diff,

      nodes: buildNodes(subgraph, diff),
      links: subgraph.edges.map(function(edge, idx) {
        return {
          source: edge.src,
          target: edge.dst,
          value: 2,
          opacity: (diff && !diff.edges[idx])?0.3:1
        };
      })
    });
  }; // end add

  // remap the vertices/edges after some vertices have been removed
  instance.remap = function(subgraph) {
    // build a map of before->after
    var map = {};
    subgraph.vertices.forEach(function(v, idx) {
      map[v.vertex_id] = idx;
    });

    // remap edges/remove
    subgraph.edges = subgraph.edges.map(function(e) {
      if(e.src in map && e.dst in map) {
        e.src = map[e.src];
        e.dst = map[e.dst];
        return e;
      } else {
        return undefined;
      }
    }).filter(function(e) {
      return e;
    });

    // re-id vertices
    subgraph.vertices.forEach(function(v, idx) {
      v.vertex_id = idx;
    });

    return subgraph;
  }; // end remap

  // find the difference between two graphs
  // annotate sg_a with the differences in sg_b
  // sg_a.v.diff = sg_b.v
  // sg_a.e.diff = sg_b.e
  //
  // assumption: v[] and e[] line up
  instance.diff = function(sg_a, sg_b) {
    var diff = { data: {}, edges: {} };
    var i;

    for(i=0; i<sg_a.vertexCount; i++)
      if(!angular.equals(sg_a.data[i], sg_b.data[i]))
        diff.data[i] = sg_b.data[i];
    for(i=0; i<sg_a.edges.length; i++)
      if(!angular.equals(sg_a.edges[i], sg_b.edges[i]))
        diff.edges[i] = sg_b.edges[i];

    return diff;
  }; // end diff

  return instance;
})
.controller('lime.client.subgraph.example', [
  '$scope',
  function($scope) {
    $scope.myData = require('./exampleData');
  }
])
.directive('renderSubgraph', [
  function() {
    return {
      scope: {
        renderSubgraph: '=',
      },
      link: function($scope, elem) {
        $scope.$on('$destroy', $scope.$watch('renderSubgraph', function(data) {
          if(data) buildGraph(data, elem[0]);
        }));
      }
    };
  }
])
;


var width = 960;
var height = 500;
var typeColor = {
  context: '#ff7f0e',
  named: '#2ca02c'
};

function buildGraph(graph, elem) {
  $(elem).empty();

  var force = d3.layout.force()
      .charge(-120)
      .linkDistance(30)
      .size([width, height]);

  var svg = d3.select(elem).append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'subgraph');

  force
      .nodes(graph.nodes)
      .links(graph.links)
      .start();

  var link = svg.selectAll('.link')
      .data(graph.links)
    .enter().append('line')
      .attr('class', 'link')
      .style('stroke-width', function(d) { return Math.sqrt(d.value); })
      .style('stroke-opacity', function(d) { return d.opacity; });

  var node = svg.selectAll('.node')
      .data(graph.nodes)
    .enter().append('circle')
      .attr('class', 'node')
      .attr('r', 5)
      .style('fill', function(d) { return d.color; })
      .style('fill-opacity', function(d) { return d.opacity; })
      .call(force.drag);

  node.append('title')
      .text(function(d) { return d.name; });

  force.on('tick', function() {
    link.attr('x1', function(d) { return d.source.x; })
        .attr('y1', function(d) { return d.source.y; })
        .attr('x2', function(d) { return d.target.x; })
        .attr('y2', function(d) { return d.target.y; });

    node.attr('cx', function(d) { return d.x; })
        .attr('cy', function(d) { return d.y; });
  });
}
