'use strict';
/* global before */
var config = require('lime/src/config');

before(function() {
  config.init({
    //location: '/Volumes/MyPassport/lime database',
    location: '/Volumes/RAM Disk',
    in_memory: true,
  });
});
