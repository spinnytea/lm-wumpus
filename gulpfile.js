'use strict';
var gulp = require('gulp');
var istanbul = require('gulp-istanbul');
var jshint = require('gulp-jshint');
var lazypipe = require('lazypipe');
var mocha = require('gulp-mocha');
var nodemon = require('gulp-nodemon');
var path = require('path');

// define which report we will use for the test
// 'nyan' is the best, so that is the default
// 'list' is definitely has it's merits
// 'json' and 'json-stream' are pretty neat
// XXX what about HTMLCov
var reporter = 'nyan';
process.argv.forEach(function(val, idx, array) {
  if(val === '-r' && array[idx+1])
    reporter = array[idx+1];
});

// print out all the tests that have been skipped
if(reporter === 'skipped') {
  reporter = 'list';

  // hacks!
  // inline gulp
  // mocha report: list uses '-' to bullet skipped tests
  // we are going to grep the output to only include those tests
  var write_back = process.stdout.write;
  process.stdout.write = function() {
    if(arguments[0].indexOf('-') === 7)
      write_back.apply(process.stdout, arguments);
  };
}


var jshintTasks = lazypipe()
  .pipe(jshint)
  .pipe(jshint.reporter, 'jshint-stylish')
  .pipe(jshint.reporter, 'fail');

gulp.task('spec-jshint', [], function() {
  return gulp.src(['spec/**/*.js'])
    .pipe(jshintTasks());
});
gulp.task('client-jshint', [], function() {
  return gulp.src(['src/client/js/**/*.js'])
    .pipe(jshintTasks());
});
gulp.task('server-jshint', [], function() {
  return gulp.src(['src/server/**/*.js', 'gulpfile.js'])
    .pipe(jshintTasks());
});
gulp.task('jshint', ['server-jshint', 'client-jshint', 'spec-jshint']);


gulp.task('run', ['jshint'], function () {
  nodemon({
    script: path.join(__dirname, 'src', 'server', 'index.js'),
    ext: 'js html',
    ignore: ['src/client/'],
    tasks: ['jshint']
  });
});


gulp.task('mocha', ['server-jshint', 'spec-jshint'], function() {
  return gulp.src(['spec/**/*.js'], {read: false})
    .pipe(mocha({reporter: reporter, timeout: 8000}));
});

gulp.task('test', [], function() {
  gulp.watch(['spec/**/*.js', 'src/server/**/*.js', 'node_modules/lime/**/*.js'], ['mocha']);
  gulp.start('mocha');
});

gulp.task('coverage', [], function (cb) {
  gulp.src(['../lime/src/**/*.js'])
    .pipe(istanbul({ includeUntested: true }))
    .pipe(istanbul.hookRequire()) // Force `require` to return covered files
    .on('finish', function () {
      return gulp.src(['spec/**/*.js'], { read: false })
        .pipe(mocha({ reporter: 'list', timeout: 16000 }))
        .pipe(istanbul.writeReports({ reporters: ['html'] }))
        .on('end', cb);
    });
});
