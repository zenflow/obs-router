var test = require('tape');
var _ = require('lodash');
var ObsRouter = require('../lib');

var dummy_routes = {
	home: '/',
	a: '/a',
	b: '/b(/:x)',
	c: '/c/:x/c',
	notfound: '*path'
};
var dummy_urls = ['/a?what=2', '/b?no=1', '/b/sf', '/c/c/c?f=', '/c/d/e/f'];

test('exposes routes with same keys (in same order) as input routes', function(t){
	t.plan(1);
	var router = getDummyRouter();
	t.ok(keysEqual(router.routes, dummy_routes), "keysEqual(router.routes, dummy_routes)");
	router.destroy();
})
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
test('only notifies on changed values', function(t){
	t.plan(2);
	var router = getDummyRouter();
	// listeners
	var missing = true;
	var setNotMissing = function(){missing = false;};
	var false_positive = false;
	var setFalsePositive = function(){false_positive = true;};
	// attach listeners
	router.on('notfound', setNotMissing);
	_.forEach(_.without(_.keys(router.routes), 'notfound'), function (route){
		router.on(route, setFalsePositive);
	});
	// make a change within the current route
	router.replaceUrl('/doesnt');
	router.replaceUrl('/doesnt/exist');
	// check
	t.ok(!false_positive);
	t.ok(!missing);
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
if (_.support.dom){
	test('always matches the current browser location', function(t){
		var assertUrl = function(url){
			t.ok(router.url==(document.location.pathname+document.location.search));
			if (url!=undefined){
				t.ok(router.url==url);
			}
		};
		assertUrl();
		var urls = ['/', '/a/sf', '/a', '/b/asf', '/c/c/c', '/c/c/c/c', '/?asd=asd'];
		_.forEach(urls, function(url){
			router.pushUrl(url);
			assertUrl(url);
		});
		var i = urls.length-1;
		var loop = function(){
			assertUrl(urls[i]);
			if (i-- == 0) {
				t.end();
			}
			window.history.go(-1);
			assertUrl(); //not updated yet but make sure router.url is consistent with document location
			//allow 250 ms for this to register
			setTimeout(loop, 250);
		};
		loop();
	});
}
function getDummyRouter(bindToWindow){
	return new ObsRouter({
		routes: dummy_routes,
		bindToWindow: bindToWindow
	});
}
function checkRouterState(router, url, route, params){
	return (router.url===url) && (router.route===route) && (JSON.stringify(router.params)===JSON.stringify(params))
		&& (router.routes[route]===router.params) && checkNullRoutes(router, route);
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