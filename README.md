# obs-router

## Mutable observable abstraction of url as route with parameters

[![build status](https://travis-ci.org/zenflow/obs-router.svg?branch=master)](https://travis-ci.org/zenflow/obs-router?branch=master)
[![dependencies](https://david-dm.org/zenflow/obs-router.svg)](https://david-dm.org/zenflow/obs-router)
[![dev-dependencies](https://david-dm.org/zenflow/obs-router/dev-status.svg)](https://david-dm.org/zenflow/obs-router#info=devDependencies)

### description

ObsRouter provides a two-way mapping between urls (rather pathname + query) and named routes with parameters, given a named set of pathname patterns. 

Use static methods, `routeToUrl` or `urlToRoute`, or instances, which optionally (& by default) bind to document location in the browser, using [html5-history](https://www.npmjs.com/package/html5-history) polyfill.

Uses [route-parser](http://npmjs.org/package/route-parser) to match and obtain parameters from pathnames, and node native 'querystring' for query parameters.

### links

- [npm](https://npmjs.org/package/obs-router)
- [github repo](https://github.com/zenflow/obs-router)
- [docs on gh-pages](https://zenflow.github.io/obs-router)


### example

```js
var ObsRouter = require('obs-router');
var presenter = require('./presenter');
var api = require('./api');

var router = new ObsRouter({
    home: '/',
    blog: '/blog(/tag/:tag)(/:slug)',
    contact: '/contact'
}, {
    initialEmit: true // emit events even though nothing has changed
});

router.on('route', function(route, params, old_route, old_params){
    presenter.updatePage(route, params);
});

router.on('blog', function(params){
    if (params){
        if (params.tag){
            api.getBlogsByTag(params.tag).then(function(blogs){
                presenter.updateBlogQuery(blogs);
            });
        } else if (params.slug){
            api.getBlogBySlug(params.slug).then(function(blog){
                presenter.updateBlog(blog);
            });
        }
    }
});
```