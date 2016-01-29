'use strict';
/* global d3 */
var cloud = require('d3-cloud');

module.exports = angular.module('lime.client.tagCloud', []);
module.exports.directive('tagCloud', [function() {
  return {
    scope: { tagCloud: '=' },
    link: function($scope, element) {
      $scope.$on('$destroy', $scope.$watch('tagCloud', function(data) {
        if(data) buildGraph(data, element);
      }));
    }
  };
}]);

function buildGraph(words, element) {
  element.empty();
  var fill = d3.scale.category20();

  var min = words[0].count;
  var max = words[0].count;
  words.forEach(function(w) {
    min = Math.min(min, w.count);
    max = Math.max(max, w.count);
  });
  words.forEach(function(w) {
    w.size = 20 + 30*(w.count-min)/(max-min);
  });

  var layout = cloud()
    .size([960, 300])
    .words(words)
    .padding(5)
    .rotate(function() { return ~~(Math.random() * 2) * 90 - 45; })
    .font('Impact')
    .fontSize(function(d) { return d.size; })
    .on('end', draw);

  layout.start();

  function draw(words) {
    d3.select(element[0]).append('svg')
      .attr('width', layout.size()[0])
      .attr('height', layout.size()[1])
      .append('g')
      .attr('transform', 'translate(' + layout.size()[0] / 2 + ',' + layout.size()[1] / 2 + ')')
      .selectAll('text')
      .data(words)
      .enter().append('text')
      .style('font-size', function(d) { return d.size + 'px'; })
      .style('font-family', 'Impact')
      .style('fill', function(d, i) { return fill(i); })
      .attr('text-anchor', 'middle')
      .attr('transform', function(d) {
        return 'translate(' + [d.x, d.y] + ')rotate(' + d.rotate + ')';
      })
      .text(function(d) { return d.text; });
  }
}