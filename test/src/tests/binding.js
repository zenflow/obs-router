var _ = require('lodash');
var assert = require("chai").assert;
var ObsRouter = require('../../../lib');
describe('browser window state binding', function(){
	//var router;
	before(function(){
		router = new ObsRouter({
			routes: {
				home: '/',
				a: '/a',
				b: '/b(/:x)',
				c: '/c/:x/c',
				notfound: '*path'
			}
			//,bindToWindow: true //this is true by default anyways
		});
	});
	it('url should always match the current browser location', function(cb){
		var assertUrl = function(url){
			assert.strictEqual(url, router.url);
			assert.strictEqual(url, document.location.pathname+document.location.search);
		};
		assertUrl(router.url);
		var urls = ['/', '/a/sf', '/a', '/b/asf', '/c/c/c', '/c/c/c/c', '/?asd=asd'];
		_.forEach(urls, function(url){
			router.pushUrl(url);
			assertUrl(url);
		});
		var i = urls.length-1;
		var loop = function(){
			assertUrl(urls[i]);
			if (i-- == 0) {
				return cb()
			}
			window.history.go(-1);
			assertUrl(router.url); //not updated yet but make sure router.url is consistent with document location
			//allow 250 ms for this to register
			setTimeout(loop, 250);
		};
		loop();
	})
});