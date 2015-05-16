var _ = require('lodash');
var assert = require("chai").assert;
var ObsRouter = require('../../../lib');
describe('core observable functionality', function(){
	//var router;
	before(function(){
		router = new ObsRouter({
			routes: {
				home: '/',
				a: '/a',
				b: '/b(/:x)',
				c: '/c/:x/c',
				notfound: '*path'
			},
			bindToWindow: false
		});
	});
	it('should initialize to a consistent state ', function(){
		assert.strictEqual(router.url, '');
		assert.strictEqual(router.route, 'notfound');
		assert.strictEqual(JSON.stringify(router.params), '{"path":""}');
		_(router._routes).keys().without('notfound').forEach(function(route){
			assert.strictEqual(router.routes[route], null);
		});
	});
	it('should only output the first matched route', function () {
		router.replaceUrl('/does');
		router.replaceUrl('/does/not');
		router.replaceUrl('/does/not/exist');
		_(router._routes).keys().without('notfound').forEach(function(route){
			assert.strictEqual(router.routes[route], null);
		});
		assert.strictEqual(JSON.stringify(router.routes.notfound), '{"path":"/does/not/exist"}');
	});
	it('should only notify on changed values', function(){
		// set observers
		var false_positive = false;
		var setFalsePositive = function(){false_positive = true;};
		_(router._routes).keys().without('notfound').forEach(function (route){
			router.on(route, setFalsePositive);
		});
		var missing = true;
		var setNotMissing = function(){missing = false;};
		router.on('notfound', setNotMissing);
		// make a change within the current route
		router.replaceUrl('/also');
		router.replaceUrl('/also/doesnt');
		router.replaceUrl('/also/doesnt/exist');
		// check
		assert.ok(!false_positive);
		assert.ok(!missing);
		// cleanup
		_(router._routes).keys().without('notfound').forEach(function (route){
			router.removeListener(route, setFalsePositive);
		});
		router.removeListener('notfound', setNotMissing);
	});
	it('should properly convert urls to and from routes', function(){
		_.forEach(['/a?what=2', '/b?no=1', '/b/sf', '/c/c/c?f=', '/c/d/e/f'], function (url) {
			var params = {};
			var route = router.getRouteFromUrl(url, params);
			assert.strictEqual(router.getUrlFromRoute(route, params), url);
		})
	})
});