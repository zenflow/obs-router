# obs-router

##Mutable observable url / route with parameters

[![build status](https://travis-ci.org/zenflow/obs-router.svg?branch=master)](https://travis-ci.org/zenflow/obs-router?branch=master)
[![dependencies](https://david-dm.org/zenflow/obs-router.svg)](https://david-dm.org/zenflow/obs-router)

ObsRouter provides a two-way mapping between urls (rather pathname + query) and named routes with parameters, given a named set of pathname patterns. 

Use static methods, `routeToUrl` or `urlToRoute`, or instances, which optionally (& by default) bind to document location in the browser, using [html5-history](https://www.npmjs.com/package/html5-history) polyfill.

Uses [route-parser](http://npmjs.org/package/route-parser) to match and obtain parameters from pathnames, and node native 'querystring' for query parameters.

### client-side example

```js
var ObsRouter = require('obs-router');
var presenter = require('./presenter');
var api = require('./api');

var router = new ObsRouter({
    patterns: {
        home: '/',
        blog: '/blog(/:slug)(/tag/:tag)',
        contact: '/contact'
    }
});
router.on('route', function(route, params, old_route, old_params){
    presenter.updatePage(route, params);
});
router.on('blog', function(params){
    if (params){
        if (params.slug){
            api.getBlogBySlug(params.slug).then(function(blog){
                presenter.updateBlog(blog);
            });
        } else if (params.tag){
            api.getBlogsByTag(params.tag).then(function(blogs){
                presenter.updateBlogQuery(blogs);
            });
        }
    }
});
```