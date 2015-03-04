boxAdaptor = {
	// Ractive uses the `filter` function to determine whether something
	// needs to be wrapped or not. For example 'boxes' doesn't need to be
	// wrapped because it's an array, but 'boxes.0' - which is the same as
	// our `littleBox` variable - does.
	filter: function ( object ) {
		return object instanceof Box;
	},

	// If an object passes the filter, we wrap it.
	wrap: function ( ractive, box, keypath, prefixer ) {
		// We can simply overwrite the prototype methods with ones that
		// do the same thing, but also notify Ractive about the changes
		box.setWidth = function ( width ) {

			this.width = width;

			// Very often, inside adaptors, we need to turn _relative keypaths_
			// into _absolute keypaths_. For example if this box's keypath is
			// 'boxes.0', we need to turn 'width' and 'area' into 'boxes.0.width'
			// and 'boxes.0.area'.
			//
			// This is such a common requirement that a helper function -
			// `prefixer` - is automatically generated for each wrapper.
			ractive.set( prefixer({
				width: width,
				area: box.getArea()
			}));
		};

		box.setHeight = function ( height ) {
			this.height = height;

			ractive.set( prefixer({
				height: height,
				area: box.getArea()
			}));
		};

		// The wrapper we return is used by Ractive to interact with each box.
		// It must have a `teardown` method and a `get` method.
		//
		// If you want to be able to interact with the object via Ractive (e.g.
		// `ractive.set( 'boxes[0].width', 10 )` as well as the other way round,
		// then you should also provide `set` and `reset` methods.
		return {
			// When a given Box instance is no longer relevant to Ractive, we
			// revert it to its normal state
			teardown: function () {
				// we just remove the setWidth and setHeight methods,
				// so that the prototype methods get used instead
				delete box.setWidth;
				delete box.setHeight;
			},

			// The `get()` method returns an object representing how Ractive should
			// 'see' each Box instance
			get: function () {
				return {
					width: box.width,
					height: box.height,
					area: box.getArea()
				};
			},

			// The `set()` method is called when you do `ractive.set()`, if the keypath
			// is _downstream_ of the wrapped object. So if, for example, you do
			// `ractive.set( 'boxes[0].width', 10 )`, this `set()` method will be called
			// with 'width' and 10 as arguments.
			set: function ( property, value ) {
				if ( property === 'width' || property === 'height' ) {
					box[ property ] = value;
					ractive.set( keypath + '.area', box.getArea() );
				}
			},

			// The `reset()` method is called when you do `ractive.set()`, if the keypath
			// is _identical_ to the keypath of the wrapped object. Two things could happen
			// - the wrapped object could modify itself to reflect the new data, or (if it
			// doesn't know what to do with the new data) it could return `false`, in which
			// case it will be torn down.
			reset: function ( data ) {
				// if `data` is a new Box instance, or if it isn't an object at all,
				// we should get rid of this one
				if ( typeof data !== 'object' || data instanceof Box ) {
					return false;
				}

				if ( data.width !== undefined ) {
					box.width = width;
				}

				if ( data.height !== undefined ) {
					box.height = width;
				}

			}
		};
	}
};