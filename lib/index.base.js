var _ = require('lodash');
var querystring = require('querystring');
var RouteParser = require('route-parser');
var EventEmitter = require('events').EventEmitter;

var route_parser_cache = {};
var getRouteParser = function(pattern){
	return route_parser_cache[pattern] = route_parser_cache[pattern] || new RouteParser(pattern);
};

var ObsRouter = function(opts) {
	var self = this;
	EventEmitter.call(self);
	self._routes = opts.routes || {};
	self.routes = {};
	_.forEach(_.keys(self._routes), function(route){
		self.routes[route] = null;
	});
	self.route = null;
	self.params = {};
	self._update(opts.url || '', false);
};
ObsRouter.prototype = Object.create(EventEmitter.prototype);
ObsRouter.prototype._update = function(url, emit){
	var self = this;
	if (self.url === url){return;}
	var old_url = self.url;
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
ObsRouter.prototype.setRoute = function(route, params){
	this._update(this.toUrl(route, params), true);
};
ObsRouter.prototype.destroy = function(){
	this.removeAllListeners();
};
ObsRouter.prototype.toUrl = function(route, params){
	return ObsRouter.toUrl(this._routes, route, params);
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