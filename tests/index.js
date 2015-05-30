var test = require('tape');
var _ = require('lodash');
var gatherEvents = require('gather-events');
var ObsRouter = require('../lib');

var dummy_patterns = {
	home: '/',
	a: '/a',
	b: '/b(/:x)',
	c: '/c/:x/c',
	notfound: '*path'
};
var dummy_urls = ['/a', '/b/asf', '/c/c/c', '/c/c/c?f=1', '/c/c/c/c', '/d/d/d', '/?asd=asd'];

test('exposes routes with same keys (in same order) as patterns, as well as said patterns', function(t){
	t.plan(2);
	var router = getDummyRouter();
	t.ok(keysEqual(router.routes, dummy_patterns), "keysEqual(router.routes, dummy_patterns)");
	t.ok(keysEqual(router.routes, router.patterns), "keysEqual(router.routes, dummy_patterns)");
	router.destroy();
});
test('initialises to consistent state', function(t){
	t.plan(1);
	var router = getDummyRouter();
	t.ok(checkRouterState(router, '', 'notfound', {path:''}), "checkRouterState(router, '', 'notfound', {path:''})");
	router.destroy();
});
test('recognises only the first matched route', function(t){
	t.plan(3);
	var router = getDummyRouter();
	router.replaceUrl('/c/c/c');
	t.ok(checkRouterState(router, '/c/c/c', 'c', {x: 'c'}), "checkRouterState(router, '/c/c/c', 'c', {x: 'c'})");
	router.replaceUrl('/');
	t.ok(checkRouterState(router, '/', 'home', {}), "checkRouterState(router, '/', 'home', {})");
	router.replaceUrl('/a');
	t.ok(checkRouterState(router, '/a', 'a', {}), "checkRouterState(router, '/a', 'a', {})");
	router.destroy();
});
test('emits expected events', function(t){
	t.plan(1);
	var router = getDummyRouter();
	var returnEvents = gatherEvents(router, ['url', 'route'].concat(_.keys(dummy_patterns)));
	router.replaceUrl('/a');
	router.pushUrl('/b/cuz');
	router.replaceRoute('b');
	t.deepEqual(returnEvents(), [
		{name: 'url', args: ['/a', '']},
		{name: 'route', args:['a', {}, 'notfound', {path: ''}]},
		{name: 'notfound', args: [null]},
		{name: 'a', args: [{}]},
		{name: 'url', args: ['/b/cuz', '/a']},
		{name: 'route', args:['b', {x: 'cuz'}, 'a', {}]},
		{name: 'a', args: [null]},
		{name: 'b', args: [{x: 'cuz'}]},
		{name: 'url', args: ['/b', '/b/cuz']},
		{name: 'route', args:['b', {x: undefined}, 'b', {x: 'cuz'}]},
		{name: 'b', args: [{x: undefined}]},
	]);
	router.destroy();
});
test('converts urls to routes and back to same urls', function(t){
	t.plan(dummy_urls.length);
	var router = getDummyRouter();
	var params;
	_.forEach(dummy_urls, function (url) {
		t.ok(router.routeToUrl(router.urlToRoute(url, params = {}), params)===url);
	});
	router.destroy();
});
test('throws error if we try to compute url of unreachable route', function(t){
	t.plan(1);
	var router = getDummyRouter();
	t.throws(function(){
		router.routeToUrl('notfound', {path: '/'});
	});
	router.destroy();
});
if (process.browser){
	test('always matches the current browser location', function(t){
		var router = getDummyRouter(true);
		var assertUrl = function(url){
			t.equal(router.url, window.document.location.pathname+window.document.location.search);
			if (url!=undefined){
				t.equal(router.url, url);
			}
		};
		assertUrl();
		_.forEach(dummy_urls, function(url){
			router.pushUrl(url);
			assertUrl(url);
		});
		var i = dummy_urls.length-1;
		var loop = function(){
			assertUrl(dummy_urls[i]);
			if (i-- == 0) {
				t.end();
				router.destroy();
			} else {
				window.history.back(1);
				assertUrl(); //not updated yet but make sure router.url is consistent with document location
				//allow some time for this to register
				setTimeout(loop, 300);
			}
		};
		loop();
	});
}
function getDummyRouter(bindToWindow){
	return new ObsRouter(dummy_patterns, {
		bindToWindow: bindToWindow
	});
}
function checkRouterState(router, url, name, params){
	return (router.url===url) && (router.name===name) && (JSON.stringify(router.params)===JSON.stringify(params))
		&& (router.routes[name]===router.params) && checkNullRoutes(router, name);
}
function checkNullRoutes(router, exclude){
	var null_routes = _.without(_.keys(router.routes), exclude);
	for (var i = 0; i < null_routes.length; i++){
		if (router.routes[null_routes[i]]!==null){
			return false;
		}
	}
	return true;
}
function keysEqual(a, b){
	return JSON.stringify(_.keys(a))===JSON.stringify(_.keys(b));
}