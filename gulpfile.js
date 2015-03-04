var browserify_node_modules = ['lodash', 'events', 'route-parser', 'querystring', 'html5-history', 'chai'];
var gulp = require('gulp');
var del = require('del');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var sourcemaps = require('gulp-sourcemaps');
var express = require('express');

var cleaned = false;
gulp.task('clean', function (done) {
	if (cleaned){
		done();
	} else {
		cleaned = true;
		del(['test/dist'], done);
	}
});

gulp.task('assets', ['clean'], function () {
	return gulp.src('./test/src/assets/**')
		.pipe(gulp.dest('./test/dist'))
});

gulp.task('scripts:node_modules', ['clean'], function () {
	var b = browserify({debug: true});
	browserify_node_modules.forEach(function(module_name){
		b.require(module_name);
	});
	return b.bundle()
		.pipe(source('node_modules.js'))
		.pipe(buffer())
		.pipe(sourcemaps.init({loadMaps: true}))
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest('./test/dist'))
});

gulp.task('scripts:tests', ['clean'], function () {
	var b = browserify({debug: true})
		.external(browserify_node_modules)
		.add('./test/src/tests');
	return b.bundle()
		.pipe(source('tests.js'))
		.pipe(buffer())
		.pipe(sourcemaps.init({loadMaps: true}))
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest('./test/dist'));
});

gulp.task('scripts', ['scripts:node_modules', 'scripts:tests']);

gulp.task('build', ['assets', 'scripts']);

gulp.task('serve', ['build'], function(){
	console.log('Build Complete');
	var server = express();
	server.use(express.static(__dirname + '/test/dist'));
	server.listen(3000);
	console.log( 'Serving on localhost:3000...' );
	gulp.watch( './test/src/assets/**', [ 'assets' ] );
	gulp.watch( ['./lib/**', './test/src/tests/**'], [ 'scripts:tests' ] );
	console.log( 'Watching...' );
});

gulp.task('default', [ 'build' ], function () {
	console.log('Build Complete');
});