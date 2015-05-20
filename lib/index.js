var querystring = require('querystring');
var RouteParser = require('route-parser');
var EventEmitter = require('events').EventEmitter;
var nextTick = require('next-tick');
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
/** @constructor ObsRouter **/
var ObsRouter = function(patterns, opts) {
	var self = this;
	var opts = opts || {};

	// save patterns
	if (!(typeof patterns=='object')){throw new Error('ObsRouter constructor expects patterns object as first argument')}
	self.patterns = patterns;

	// inherit event emitter
	EventEmitter.call(self);

	if (support.dom){
		//bind to window by default
		self._bindToWindow = 'bindToWindow' in opts ? opts.bindToWindow : true;
		if (self._bindToWindow){
			// add to module-scoped list of routers
			routers.push(self);
			// override any url input with window location
			opts.url = window.document.location.pathname + window.document.location.search;
		}
	}

	// initialise state
	self.route = null;
	self.params = {};
	self.routes = {};
	forEach(keys(self.patterns), function(route){
		self.routes[route] = null;
	});

	// normalise state
	self._update(opts.url || '', false);

	if (opts.initialEmit){
		var cancel = nextTick(function(){
			self._emit();
		});
		self.once('route', cancel);
	}
};
ObsRouter.prototype = create(EventEmitter.prototype);
ObsRouter.prototype._update = function(url, emit){
	var self = this;
	if (url == self.url){return;}
	self.old_url = self.url;
	self.old_route = self.route;
	self.old_params = self.params;
	self.url = url;
	self.route = self.urlToRoute(self.url, self.params = {});
	if (self.old_route){
		self.routes[self.old_route] = null;
	}
	if (self.route){
		self.routes[self.route] = self.params;
	}
	if (emit){
		self._emit();
	}
};
ObsRouter.prototype._emit = function(){
	var self = this;
	self.emit('url', self.url, self.old_url);
	self.emit('route', self.route, self.params, self.old_route, self.old_params);
	if (self.old_route && (self.old_route !== self.route)){
		self.emit(self.old_route, null);
	}
	if (self.route){
		self.emit(self.route, self.params);
	}
};
ObsRouter.prototype.replaceUrl = function(url){
	var self = this;
	if (support.dom && self._bindToWindow){
		History.replaceState({}, window.document.title, url);
	} else {
		self._update(url, true);
	}
};
ObsRouter.prototype.pushUrl = function(url){
	var self = this;
	if (support.dom && self._bindToWindow){
		History.pushState({}, window.document.title, url);
	} else {
		self._update(url, true);
	}
};
ObsRouter.prototype.replaceRoute = function(route, params, extend_params){
	var self = this;
	self.replaceUrl(self.routeToUrl(route, params, extend_params));
};
ObsRouter.prototype.pushRoute = function(route, params, extend_params){
	var self = this;
	self.pushUrl(self.routeToUrl(route, params, extend_params));
};
ObsRouter.prototype.destroy = function(){
	var self = this;
	self.removeAllListeners();
	if (support.dom && self._bindToWindow){
		routers = without(routers, self);
	};
};
ObsRouter.prototype.routeToUrl = function(route, params, extend_params){
	var self = this;
	var _route = route || self.route;
	var _params = assign({}, extend_params ? self.params : {}, params || {});
	return ObsRouter.routeToUrl(self.patterns, _route, _params);
};
ObsRouter.prototype.urlToRoute = function(url, params){
	return ObsRouter.urlToRoute(this.patterns, url, params);
};
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
ObsRouter.urlToRoute = function(patterns, url, params){
	var self = this;
	var name = null;
	find(patterns, function(pattern, _name){
		var pathname_params = getRouteParser(pattern).match(url);
		if (pathname_params){
			var index = url.indexOf('?');
			var query_params = index == -1 ? {} : querystring.decode(url.slice(index+1));
			assign(params, query_params, pathname_params);
			name = _name;
			return true;
		}
	});
	return name;
};
module.exports = ObsRouter;