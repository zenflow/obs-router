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
	_.forEach(_.keys(self._routes), function(route){
		self[route] = null;
	});
	self._update(opts.url || '', false);
};
ObsRouter.prototype = Object.create(EventEmitter.prototype);
ObsRouter.prototype._update = function(url, emit){
	var self = this;
	if (self.url === url){return;}
	var old_route = self.route;
	var old_params = self.params;
	self.url = url;
	self.route = self.fromUrl(self.url, self.params = {});
	if (old_route){
		self[old_route] = null;
	}
	if (self.route){
		self[self.route] = self.params;
	}
	if (emit){
		self.emit('url', self.url);
		if (self.route === old_route){
			if (self.route){
				if (JSON.stringify(old_params) !== JSON.stringify(self.params)) {
					self.emit('params', self.params);
					self.emit(self.route, self.params);
				}
			}
		} else {
			if (old_route){
				self.emit(old_route, null);
			}
			self.emit('route', self.route, self.params);
			if (self.route){
				if (JSON.stringify(old_params) !== JSON.stringify(self.params)){
					self.emit('params', self.params);
				}
				self.emit(self.route, self.params);
			}
		}
	}
};
ObsRouter.prototype.setUrl = function(url){
	this._update(url, true);
};
ObsRouter.prototype.setRoute = function(route, params){
	this._update(this.toUrl(route, params), true);
};
ObsRouter.prototype.toUrl = function(route_name, params){
	var route_parser = getRouteParser(this._routes[route_name]);
	var path = route_parser.reverse(params);
	if (path===false){
		throw new Error('Missing required parameter')
	}
	var query_exclude = _.keys(route_parser.match(path));
	var query_params = false;
	for (var key in params){
		if (!_.includes(query_exclude, key)){
			query_params = query_params || {};
			query_params[key] = params[key]
		}
	}
	return path + (query_params ? '?' + querystring.encode(query_params) : '');
};
ObsRouter.prototype.fromUrl = function(url, params){
	var self = this;
	var routes = _.keys(self._routes);
	for (var i = 0; i < routes.length; i++){
		var route_params = getRouteParser(this._routes[routes[i]]).match(url);
		if (route_params){
			var index = url.indexOf('?');
			var query_params = index == -1 ? {} : querystring.decode(url.slice(index+1));
			_.assign(params, query_params, route_params);
			return routes[i];
		}
	}
	return null;
};
ObsRouter.prototype.destroy = function(){
	var self = this;
	self.removeAllListeners();
};
module.exports = ObsRouter;