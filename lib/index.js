var _ = require('lodash');
var querystring = require('querystring');
var RouteParser = require('route-parser');
var EventEmitter = require('events').EventEmitter;

if (_.support.dom){
	var History = require('html5-history');
	var routers = [];
	History.Adapter.bind(window, 'statechange', function(){
		_.forEach(routers, function(router){
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

var ObsRouter = function(opts) {
	var self = this;

	// inherit event emitter
	EventEmitter.call(self);

	// initialize routes
	self._routes = opts.routes || {};
	self.routes = {};
	_.forEach(_.keys(self._routes), function(route){
		self.routes[route] = null;
	});

	// initialise route
	self.route = null;
	self.params = {};

	if (_.support.dom){
		//bind to window by default
		self._bindToWindow = 'bindToWindow' in opts ? opts.bindToWindow : true;
		if (self._bindToWindow){
			// add to module-scoped list of routers
			routers.push(self);
			// override any url input with window location
			opts.url = window.document.location.pathname + window.document.location.search;
		}
	}

	// update routine to initialise url
	self._update(opts.url || '', false);
};
ObsRouter.prototype = _.create(EventEmitter.prototype);
ObsRouter.prototype._update = function(url, emit){
	var self = this;
	var old_url = self.url;
	if (url == old_url){return;}
	var old_route = self.route;
	var old_params = self.params;
	self.url = url;
	self.route = self.urlToRoute(self.url, self.params = {});
	if (old_route){
		self.routes[old_route] = null;
	}
	if (self.route){
		self.routes[self.route] = self.params;
	}
	if (emit){
		self.emit('url', self.url, old_url);
		self.emit('route', self.route, self.params, old_route, old_params);
		if (old_route && (old_route !== self.route)){
			self.emit(old_route, null);
		}
		if (self.route && ((self.route !== old_route) || (JSON.stringify(old_params) !== JSON.stringify(self.params)))){
			self.emit(self.route, self.params);
		}
	}
};
ObsRouter.prototype.replaceUrl = function(url){
	var self = this;
	if (_.support.dom && self._bindToWindow){
		History.replaceState({}, window.document.title, url);
	} else {
		self._update(url, true);
	}
};
ObsRouter.prototype.pushUrl = function(url){
	var self = this;
	if (_.support.dom && self._bindToWindow){
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
	if (_.support.dom && self._bindToWindow){
		routers = _.without(routers, self);
	};
};
ObsRouter.prototype.routeToUrl = function(route, params, extend_params){
	var self = this;
	var _route = route || self.route;
	var _params = _.assign({}, extend_params ? self.params : {}, params || {});
	return ObsRouter.routeToUrl(self._routes, _route, _params);
};
ObsRouter.prototype.urlToRoute = function(url, params){
	return ObsRouter.urlToRoute(this._routes, url, params);
};
ObsRouter.routeToUrl = function(routes, route_name, params){
	params = params || {};
	var route_parser = getRouteParser(routes[route_name]);
	var path = route_parser.reverse(params);
	if (path===false){
		throw new Error('Missing required parameter')
	}
	for (var _route_name in routes){
		if (_route_name == route_name){break;}
		if (getRouteParser(routes[_route_name]).match(path)){
			throw new Error('Found unreachable route. Path ' + path + ' for route ' + route_name
				+ ' (params: '  + JSON.stringify(params) + ') also matches route ' + _route_name
				+ '! Maybe you need to change the order of the routes?');
		}
	}
	var parsed = route_parser.match(path);
	var query_params = {};
	_.forEach(params, function(value, key){
		if (!(key in parsed)){
			query_params[key] = value;
		}
	});
	return path + (JSON.stringify(query_params)=='{}' ? '' : '?' + querystring.encode(query_params));
};
ObsRouter.urlToRoute = function(routes, url, params){
	var self = this;
	var route_name = null;
	_.find(routes, function(route, _route_name){
		var route_params = getRouteParser(route).match(url);
		if (route_params){
			var index = url.indexOf('?');
			var query_params = index == -1 ? {} : querystring.decode(url.slice(index+1));
			_.assign(params, query_params, route_params);
			route_name = _route_name;
			return true;
		}
	});
	return route_name;
};
module.exports = ObsRouter;