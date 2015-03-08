'use strict';
var gulp = require('gulp');
var gutil = require('gulp-util');
var mocha = require('gulp-mocha');
var jshint = require('gulp-jshint');

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


// TODO modify this section of the gulp file using ~/git/ggj-2015
var fork = require('child_process').fork;

var browserify = require('gulp-browserify');
var browserSync = require('browser-sync');

gulp.task('client-jshint', [], function() {
  return gulp.src(['src/client/js/**/*.js']).pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});
gulp.task('server-jshint', [], function() {
  return gulp.src(['src/server/**/*.js', 'gulpfile.js']).pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});

gulp.task('browserify', ['client-jshint'], function() {
  return gulp.src('src/client/js/index.js')
    .pipe(browserify({
      debug: true
    }))
    .pipe(gulp.dest('src/client'));
});

var browserSyncSync = false;
var serverHandle;
gulp.task('sync', ['browserify'], function() {
  if(serverHandle) {
    if(!browserSyncSync) {
      browserSyncSync = true;
      return browserSync({
        proxy: 'localhost:8888',
        port: '8080',
        online: false,
        injectChanges: false,
        open: false,
        logConnections: true,
      });
    } else {
      return browserSync.reload({stream: false});
    }
  } else {
    gutil.log('Server not started, delaying browser sync.');
  }
});

gulp.task('server', ['server-jshint'], function() {
  if(serverHandle) {
    serverHandle.kill();
  } else {
    serverHandle = fork('src/server');
    serverHandle.on('close', function() {
      serverHandle = fork('src/server');
    });
  }
});

gulp.task('run', [], function() {
  // whenever you change client files, restart the browser
  gulp.watch(['src/client/**/*', '!src/client/index.js'], ['sync']);
  // any time the server starts, restart the browser, restart the browser
  gulp.watch('src/server/.stamp', ['sync']);

  // any time we make changes to the server, restart the server
  gulp.watch('src/server/**/*', ['server']);
//  .on('change', function(event) {
//    gutil.log(gutil.colors.yellow('Server file changed: ' +
//      path.relative(path.join(__dirname, 'use', 'server'), event.path)));
//  });

  // try to start the server the first time
  return gulp.start('server');
});

gulp.task('mocha', ['server-jshint'], function() {
  return gulp.src(['spec/**/*.js'], {read: false})
    .pipe(mocha({reporter: reporter}));
});

gulp.task('test', [], function() {
  gulp.watch(['spec/**/*.js'], ['mocha']);
});
