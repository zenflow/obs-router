var gulp = require('gulp');
var del = require('del');
var jsdoc = require('gulp-jsdoc');
var package_json = require('./package.json');

gulp.task('docs:clean', function(cb){
	del(['docs'], cb);
});
gulp.task('docs', ['docs:clean'], function(){
	return gulp.src(['lib/**.js', 'README.md'])
		.pipe(jsdoc.parser({}))
		.pipe(jsdoc.generator('docs'));
});
gulp.task('default', ['docs']);