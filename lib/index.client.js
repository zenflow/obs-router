var _ = require('lodash');
var History = require('html5-history');
var ObsRouterBase = require('./index.base');
var routers = [];
History.Adapter.bind(window, 'statechange', function(){
	_.forEach(routers, function(router){
		router._update(document.location.pathname + document.location.search, true);
	});
});
var ObsRouter = function(opts){
	var self = this;
	self._bindToWindow = opts.bindToWindow || false;
	if (self._bindToWindow){
		routers.push(self);
		opts.url = document.location.pathname + document.location.search
	}
	ObsRouterBase.apply(self, arguments);
};
ObsRouter.prototype = Object.create(ObsRouterBase.prototype);
ObsRouter.prototype._update = function(url, emit){
	var self = this;
	if (self._bindToWindow && (url !== (document.location.pathname + document.location.search))){
		History.replaceState({}, window.document.title, url);
	} else {
		ObsRouterBase.prototype._update.apply(self, arguments);
	}
};
ObsRouter.prototype.pushUrl = function(url){
	var self = this;
	if (self._bindToWindow){
		History.pushState({}, window.document.title, url);
	} else {
		throw new Error('method not available without \'bindToWindow\' option');
	}
};
ObsRouter.prototype.pushRoute = function(route, params){
	var self = this;
	if (self._bindToWindow){
		History.pushState({}, window.document.title, self.toUrl(route, params));
	} else {
		throw new Error('method not available without \'bindToWindow\' option');
	}
};
ObsRouter.prototype.destroy = function(){
	var self = this;
	if (self._bindToWindow){
		routers = _.without(routers, self);
	}
	ObsRouterBase.prototype.destroy.call(self);
};
module.exports = ObsRouter;