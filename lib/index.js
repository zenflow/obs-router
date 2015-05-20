var querystring = require('querystring');
var RouteParser = require('route-parser');
var EventEmitter = require('events').EventEmitter;
var cancellableNextTick = require('cancellable-next-tick');
var support = require('lodash.support');
var forEach = require('lodash.foreach');
var keys = require('lodash.keys');
var create = require('lodash.create');
var assign = require('lodash.assign');
var without = require('lodash.without');
var find = require('lodash.find');

if (support.dom){
	var History = require('html5-history');
	var routers = [];
	History.Adapter.bind(window, 'statechange', function(){
		forEach(routers, function(router){
			router._update(window.document.location.pathname + window.document.location.search, true);
		});
	});
}

var route_parser_cache = {};
var getRouteParser = function(pattern){
	if (pattern in route_parser_cache){
		return route_parser_cache[pattern];
	}
	try {
		return route_parser_cache[pattern] = new RouteParser(pattern);
	} catch (error){
		throw new Error('Could not parse url pattern "' + pattern + '": ' + error.message);
	}
};

/** 
 * Mutable observable abstraction of url as route with parameters
 * @example
 var router = new ObsRouter({
    home: '/',
    blog: '/blog(/tag/:tag)(/:slug)',
    contact: '/contact'
}, {
    initialEmit: true,
    bindToWindow: false,
    url: '/?foo=bar'
});
 console.log(router.url, router.name, router.params, router.routes);
 // -> '/?foo=bar' 'home' {foo: 'bar'} {home: {foo: 'bar'}, blog: null, contact: null}
 * @class ObsRouter
 * @augments EventEmitter
 * @param {Object} patterns Object containing pathname patterns keyed by route names.
 * @param {Object} [options] Options
 * @param {Boolean} [options.initialEmit=false] If true, events will be emitted after nextTick, unless emitted earlier due to changes, ensuring that events are emitted at least once.
 * @param {Boolean} [options.bindToWindow=true] Bind to document location if running in browser
 * @param {string} [options.url=""] Initial url. If binding to document loctation then this is ignored.
 */
var ObsRouter = function(patterns, options) {
	var self = this;
	if (!(typeof patterns=='object')){throw new Error('ObsRouter constructor expects patterns object as first argument')}
	options = options || {};
	EventEmitter.call(self);
	if (support.dom){
		//bind to window by default
		self._bindToWindow = 'bindToWindow' in options ? options.bindToWindow : true;
		if (self._bindToWindow){
			// add to module-scoped list of routers
			routers.push(self);
			// override any url input with window location
			options.url = window.document.location.pathname + window.document.location.search;
		}
	}
	// initialise state
	self.patterns = patterns;
	self.name = null;
	self.params = {};
	self.routes = {};
	forEach(keys(self.patterns), function(route){
		self.routes[route] = null;
	});
	// normalise state
	self._update(options.url || '', false);
	// implement initialEmit option
	if (options.initialEmit){
		var cancel = cancellableNextTick(function(){
			self._emit();
		});
		self.once('url', cancel);
	}
};
ObsRouter.prototype = create(EventEmitter.prototype);
ObsRouter.prototype._update = function(url, emit){
	var self = this;
	if (url == self.url){return;}
	self.old_url = self.url;
	self.old_name = self.name;
	self.old_params = self.params;
	self.url = url;
	self.name = self.urlToRoute(self.url, self.params = {});
	if (self.old_name){
		self.routes[self.old_name] = null;
	}
	if (self.name){
		self.routes[self.name] = self.params;
	}
	if (emit){
		self._emit();
	}
};
ObsRouter.prototype._emit = function(){
	var self = this;
	self.emit('url', self.url, self.old_url);
	self.emit('route', self.name, self.params, self.old_name, self.old_params);
	if (self.old_name && (self.old_name !== self.name)){
		self.emit(self.old_name, null);
	}
	if (self.name){
		self.emit(self.name, self.params);
	}
};
/**
 * Uses History.replaceState to change url to new url and updates route name + params + routes
 * Replacing rather than pushing means the browser's user can not get to the previous state with the back button.
 * @param {string} url The new url
 */
ObsRouter.prototype.replaceUrl = function(url){
	var self = this;
	if (support.dom && self._bindToWindow){
		History.replaceState({}, window.document.title, url);
	} else {
		self._update(url, true);
	}
};
/**
 * Uses History.pushState to change url to new url and updates route name + params + routes
 * Pushing rather than replacing means the browser's user can get to the previous state with the back button.
 * @param {string} url The new url
 */
ObsRouter.prototype.pushUrl = function(url){
	var self = this;
	if (support.dom && self._bindToWindow){
		History.pushState({}, window.document.title, url);
	} else {
		self._update(url, true);
	}
};
/**
 * Uses History.replaceState to change the url to new url and updates route name + params + routes
 * Replacing rather than pushing means the browser's user can not get to the previous state with the back button.
 * @param {string} [name=this.name] The new route name
 * @param {Object} [params={}] The new parameters
 * @param {Boolean} [extend_params=false] Extend parameters rather than replacing them.
 */
ObsRouter.prototype.replaceRoute = function(name, params, extend_params){
	var self = this;
	self.replaceUrl(self.routeToUrl(name, params, extend_params));
};
/**
 * Uses History.pushState to change the route name + params to new route name + params and updates url + routes
 * Pushing rather than replacing means the browser's user can get to the previous state with the back button.
 * @param {string} [name=this.name] The new route name
 * @param {Object} [params={}] The new parameters
 * @param {Boolean} [extend_params=false] Extend parameters rather than replacing them.
 */
ObsRouter.prototype.pushRoute = function(name, params, extend_params){
	var self = this;
	self.pushUrl(self.routeToUrl(name, params, extend_params));
};
/** 
 * Converts a route (name & params) to a url
 * @example
 * // simple example
 *
 * var url = router.routeToUrl('blog', {slug: 'Why_I_love_Russian_girls', page: 82});
 * console.log(url); // -> /blog/Why_I_love_Russian_girls?page=82
 *
 * // cool example using extend_params=true
 *
 * console.log(router.params); // -> {tags: 'sexy'}
 * var url = router.routeToUrl('blog', {filter: 'graphic'}, true);
 * console.log(url); // -> '/blog/tags/sexy?filter=graphic'
 * @param {string} [name=this.name] Route name
 * @param {Object} [params={}] Route parameters
 * @param {Boolean} [extend_params=false] Extend parameters rather than replacing them.
 * @returns {string} Url
 */
ObsRouter.prototype.routeToUrl = function(name, params, extend_params){
	var self = this;
	var _name = name || self.name;
	var _params = assign({}, extend_params ? self.params : {}, params || {});
	return ObsRouter.routeToUrl(self.patterns, _name, _params);
};
/** 
 * Converts a url to a name & params.
 * The optional params argument is used to pass back the arguments, and only the name is `return`ed.
 * @example
 * var route_params = {};
 * var route_name = router.urlToRoute('/blog', route_params);
 * console.log(route_name, route_params);
 * // -> blog {tag: undefined, slug: undefined}
 * @param {string} url Url to convert.
 * @param {Object} [params] Parameters object to populate.
 * @returns {string|null} Route name or null if no route matched
 */
ObsRouter.prototype.urlToRoute = function(url, params){
	return ObsRouter.urlToRoute(this.patterns, url, params);
};
/**
 * Cleanup method to be called when you're done with your ObsRouter instance.
 */
ObsRouter.prototype.destroy = function(){
	var self = this;
	self.removeAllListeners();
	if (support.dom && self._bindToWindow){
		routers = without(routers, self);
	};
};
/** 
 * Converts a route (name & params) to a url
 * @param {Object} patterns Object containing pathname patterns keyed by route names
 * @param {string} name Route name
 * @param {Object} [params={}] Route parameters
 * @returns {string} Url
 */
ObsRouter.routeToUrl = function(patterns, name, params){
	params = params || {};
	var route_parser = getRouteParser(patterns[name]);
	var path = route_parser.reverse(params);
	if (path===false){
		throw new Error('Missing required parameter')
	}
	for (var _name in patterns){
		if (_name == name){break;}
		if (getRouteParser(patterns[_name]).match(path)){
			throw new Error('Found unreachable route. Path ' + path + ' for route ' + name
				+ ' (params: '  + JSON.stringify(params) + ') also matches route ' + _name
				+ '! Maybe you need to change the order of the patterns?');
		}
	}
	var pathname_params = route_parser.match(path);
	var query_params = {};
	forEach(params, function(value, key){
		if (!(key in pathname_params)){
			query_params[key] = value;
		}
	});
	return path + (JSON.stringify(query_params)=='{}' ? '' : '?' + querystring.encode(query_params));
};
/** 
 * Converts a url to a name & params
 * The optional params argument is used to pass back the arguments, and only the name is `return`ed.
 * @param {Object} patterns Object containing pathname patterns keyed by route names
 * @param {string} url Url to convert.
 * @param {Object} [params] Parameters object to populate.
 * @returns {string|null} Route name or null if no route matched
 */
ObsRouter.urlToRoute = function(patterns, url, params){
	var self = this;
	var name = null;
	find(patterns, function(pattern, _name){
		var pathname_params = getRouteParser(pattern).match(url);
		if (pathname_params){
			if (typeof params=='object'){
				var index = url.indexOf('?');
				var query_params = index == -1 ? {} : querystring.decode(url.slice(index+1));
				assign(params, query_params, pathname_params);
			}
			name = _name;
			return true;
		}
	});
	return name;
};
module.exports = ObsRouter;