# obs-router
Two-way mapping between urls (rather pathname + querystring) and named routes with parameters. Optionally (& by default) binds to document location in the browser. Exposes EventEmitter interface for changes.

Tagling says it all.

## example usage

```js
var ObsRouter = require('obs-router');
var presenter = require('./presenter');
var api = require('./api');

var router = new ObsRouter({
    routes: {
        home: '/',
        blog: '/blog(/:slug)(/tag/:tag),
        contact: '/contact'
    }
});
router.on('route', function(route_name, params, old_route_name, old_params){
    if (route=='home'){
        presenter.growNav();
    } else { 
        presenter.shrinkNav();
    }
    presenter.switchPage(route_name);
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