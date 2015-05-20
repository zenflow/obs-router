var gulp = require('gulp');
var del = require('del');
var jsdoc = require('gulp-jsdoc');
gulp.task('docs:clean', function(cb){
	del(['docs'], cb);
});
gulp.task('docs', ['docs:clean'], function(){
	return gulp.src(['lib/**.js', 'README.md'])
		.pipe(jsdoc('docs'));
});
gulp.task('default', ['docs']);