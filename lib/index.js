var _ = require('lodash');
var querystring = require('querystring');
var RouteParser = require('route-parser');
var EventEmitter = require('events').EventEmitter;

if (_.support.dom){
	var History = require('html5-history');
	var routers = [];
	History.Adapter.bind(window, 'statechange', function(){
		_.forEach(routers, function(router){
			router._update(document.location.pathname + document.location.search, true);
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
	if (_.support.dom && self._bindToWindow && (url !== (window.document.location.pathname + window.document.location.search))){
		History.replaceState({}, window.document.title, url);
		return;
	}
	var old_url = self.url;
	if (url == old_url){return;}
	var old_route = self.route;
	var old_params = self.params;
	self.url = url;
	self.route = self.fromUrl(self.url, self.params = {});
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
ObsRouter.prototype.setUrl = function(url){
	this._update(url, true);
};
ObsRouter.prototype.pushUrl = function(url){
	var self = this;
	if (_.support.dom && self._bindToWindow){
		History.pushState({}, window.document.title, url);
	} else {
		self._update(url, true);
	}
};
ObsRouter.prototype.setRoute = function(route, params, fresh_params){
	this._update(this.toUrl(route, params, fresh_params), true);
};
ObsRouter.prototype.pushRoute = function(route, params, fresh_params){
	var self = this;
	self.pushUrl(self.toUrl(route, params, fresh_params));
};
ObsRouter.prototype.destroy = function(){
	var self = this;
	self.removeAllListeners();
	if (_.support.dom && self._bindToWindow){
		routers = _.without(routers, self);
	};
};
ObsRouter.prototype.toUrl = function(route, params, fresh_params){
	var self = this;
	var _fresh_params = fresh_params==undefined ? true : fresh_params;
	var _route = route || self.route;
	var _params = _.assign({}, _fresh_params ? {} : self.params, params || {});
	return ObsRouter.toUrl(self._routes, _route, _params);
};
ObsRouter.prototype.fromUrl = function(url, params){
	return ObsRouter.fromUrl(this._routes, url, params);
};
ObsRouter.toUrl = function(routes, route_name, params){
	params = params || {};
	var route_parser = getRouteParser(routes[route_name]);
	var path = route_parser.reverse(params);
	if (path===false){
		throw new Error('Missing required parameter')
	}
	var query_exclude = _.keys(route_parser.match(path));
	var query_params = false;
	_.forEach(params, function(value, key){
		if (!_.includes(query_exclude, key)){
			query_params = query_params || {};
			query_params[key] = value;
		}
	});
	return path + (query_params ? '?' + querystring.encode(query_params) : '');
};
ObsRouter.fromUrl = function(routes, url, params){
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