var gulp = require('gulp');
var del = require('del');
var jsdoc = require('gulp-jsdoc');
var package_json = require('../package.json');
var fs = require('fs');
var path = require('path');
var wrench = require('wrench');
var child_process = require('child_process');
var find = require('lodash.find');
var styles = '<style type="text/css">'+fs.readFileSync(path.join(__dirname, 'src/styles.css'), 'utf8')+'</style>';
var scripts = '<script type="text/javascript">'+fs.readFileSync(path.join(__dirname, 'src/scripts.js'), 'utf8')+'</script>';

var NOTHING_TO_COMMIT_MSG = 'nothing to commit, working directory clean';
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
gulp.task('update', ['build'], function(cb){
	exec('git status', function(error, status_str){
		if (error){return cb(error);}
		var status_lines = status_str.split('\n');
		if (!find(status_lines, function(line){return line==NOTHING_TO_COMMIT_MSG; })){
			return cb(new Error('Working copy must be clean'));
		}
		var match = status_lines[0].match(/^On branch (.*)$/);
		if (!match){
			return cb(new Error('Could not determine current branch'));
		}
		var previous_branch = match[1];
		exec('git checkout gh-pages', function(error){
			if (error){return cb(error);}
			wrench.copyDirRecursive('build/'+package_json.name+'/'+package_json.version+'/', '../', function(error){
				if (error){return cb(error);}
				exec('git add ../ && git commit -m "automatic update"', function(error){
					if (error){return cb(error);}
					exec('git checkout '+previous_branch, cb);
				});
			})
		});
	});
});
gulp.task('default', ['build']);

function exec(cmd, cb){
	console.log('$ '+cmd);
	child_process.exec(cmd, function(error, stdout, stderr){
		console.log(stdout);
		if (error){
			console.error(stderr);
			cb(error);
		} else {
			cb(null, stdout);
		}
	});
}