var gulp = require('gulp');
var del = require('del');
var jsdoc = require('gulp-jsdoc');
var package_json = require('../package.json');
var fs = require('fs');
var path = require('path');
var ghPagesCommit = require('gh-pages-commit');
var styles = '<style type="text/css">'+fs.readFileSync(path.join(__dirname, 'src/styles.css'), 'utf8')+'</style>';
var scripts = '<script type="text/javascript">'+fs.readFileSync(path.join(__dirname, 'src/scripts.js'), 'utf8')+'</script>';

gulp.task('clean', function(cb){
	del(['build'], cb);
});
gulp.task('build', ['clean'], function(){
	return gulp.src(['../README.md', '../lib/**/**.js'])
		.pipe(jsdoc.parser({
			name: package_json.name,
			version: package_json.version
		}))
		.pipe(jsdoc.generator('build', {
			path: 'ink-docstrap',
			footer: styles+scripts,
			systemName: 'obs-router',
			theme: 'superhero',
			navType: 'vertical',
			inverseNav: true,
			linenums: true,
			collapseSymbols: false
		}));
});
gulp.task('watch', ['build'], function(){
	gulp.watch(['src/styles.css', 'src/scripts.js', '../README.md', '../lib/**/**.js'], ['build'])
});
gulp.task('commit', ['build'], function(cb){
	ghPagesCommit('docs/build/'+package_json.name+'/'+package_json.version+'/', {
		basedir: path.join(__dirname, '..'), verbose: true
	}, cb);
});
gulp.task('default', ['commit']);
