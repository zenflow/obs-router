# obs-router

## Mutable observable abstraction of url as route with parameters

[![build status](https://travis-ci.org/zenflow/obs-router.svg?branch=master)](https://travis-ci.org/zenflow/obs-router?branch=master)
[![dependencies](https://david-dm.org/zenflow/obs-router.svg)](https://david-dm.org/zenflow/obs-router)
[![dev-dependencies](https://david-dm.org/zenflow/obs-router/dev-status.svg)](https://david-dm.org/zenflow/obs-router#info=devDependencies)

[![npm](https://nodei.co/npm/obs-router.svg?downloads=true&downloadRank=true&stars=true)](https://www.npmjs.com/package/obs-router)

### description

ObsRouter provides a two-way mapping between urls (rather pathname + query) and named routes with parameters, given a named set of pathname patterns. 

Instances are EventEmitters & optionally (& by default) bind to document location in the browser, using [html5-history](https://www.npmjs.com/package/html5-history) polyfill.

Also exposes static methods, `routeToUrl` and `urlToRoute`, which both take the patterns as their first argument.

Uses [route-parser](http://npmjs.org/package/route-parser) to match and obtain parameters from pathnames, and node native 'querystring' for query parameters.

Check out the [documentation](https://zenflow.github.io/obs-router).

### links

- [npm](https://npmjs.org/package/obs-router)
- [github](https://github.com/zenflow/obs-router)
- [documentation](https://zenflow.github.io/obs-router)

### installation

```
npm install --save obs-router
```

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
    //bindToWindow: false, // would prevent binding to document location on the browser
    initialEmit: true // cause to emit events after nextTick even though nothing has changed
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

### changelog

#### 2.0.3

* Added commit task to docs gulpfile using [gh-pages-commit](https://npmjs.org/package/gh-pages-commit)

#### 2.0.2

* Improved documentation
* fixed google analytics for docs

#### 2.0.1

* Improved documentation
* fixed package.json scripts.test command for unix