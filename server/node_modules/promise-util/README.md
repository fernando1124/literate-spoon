# Promise utilities

[![npm version](https://badge.fury.io/js/promise-util.svg)](http://badge.fury.io/js/promise-util)

Some utility functions for working with Promises in node.

```bash
npm install promise-util
```

## `wait( milliseconds, value )`

`setTimeout` wrapped in a promise.

* `milliseconds` Integer, time to wait
* `value` value to return

```js
var promiseUtil = require('promise-util');

promiseUtil.wait( 1000, value )
	.then( function(value) {
		// Do something 1 second later
	} );
```

## `defer()`

Creates a closure so you don't have to.  Returns a promise with `resolve()` and `reject()` methods.  

Useful for converting callbacks to promises.

```js
var promiseUtil = require('promise-util');

var defer = promiseUtil.defer();
fs.readFile( filename, function( e, contents ) {
	if (e) {
		defer.reject(e);
	}
	defer.resolve(contents);
} );
```

## `callback( context, fn, ...args )`

Calls a function using the node callback pattern as a promise.

* `context` is the context to call the function in.
* `fn` can be the function name as a string, or the function itself.
* `...args` arguments to pass to the function

If the callback returns more than one argument, they will be returned as an array.

```js
var promiseUtil = require('promise-util');

promiseUtil.callback( fs, 'readFile', filename )
	.then( /* do stuff */ );

// Is equivalent to
promiseUtil.callback( fs, fs.readFile, filename )
	.then( /* do stuff */ );

// Is equivalent to (but in this case only because fs functions require no context)
promiseUtil.callback( null, fs.readFile, filename )
	.then( /* do stuff */ ); 
```

If you want to transform a callback function into a function that generates
promises then do this. 

```js
var readFile = promiseUtil.callback.bind( null, fs, 'readFile' );
```

## `Queue()`

Creates a reusable promise.  This can be used to create a queue of tasks with an adjustable concurrency.

```js
var Queue = require('promise-util').Queue;

// Create a new queue. new is optional.
var queue = new Queue();

// Add some tasks.
queue
	.then( function() {
		// do stuff
	})
	.then( function() {
		// do more stuff
	})
	.catch( function() {
		// catch an error
	})
	.then( 
		function() { /* do stuff */ },
		function() { /* catch an error */ }
	);

// Run the queue of tasks
queue.run()
	.then( function(value) {
		// Result of running the queue
	} );

// Run the queue in series against a collection
var queue = new Queue()
	.then( function(value) {
		return value*value;
	} )
	.runSeries( [1,2,3,4,5] )
		.then( function(value) {
			// value = [1,4,9,16,25];
		} );

// See below for concurrency options
```

### Instance methods

#### `Queue.prototype.then( resolveFn, rejectFn )`

Add a task to the queue.  Tasks will be run in the context of the queue.

* `resolveFn` _optional_ function to resolve with
* `rejectFn` _optional_ function to reject with

Returns the `Queue` instance for chaining.

#### `Queue.prototype.catch( rejectFn )`

Add a catch task to the queue

* `rejectFn` function to reject with

Returns the `Queue` instance for chaining.

#### `Queue.prototype.run()`

Run the set of tasks.

Returns a `Promise`.

#### `Queue.prototype.runSeries( collection, options )`

Run the set of tasks against a collection in series and return the result of all tasks as a promise.

* `collection` An array of values to run the queue against.
* `options.collect` Boolean, default=true, Collect the results of each run in an array
* `options.parallel` Integer, default=1, How many queues to run at once
* `options.infinite` Boolean, default=false, Keep running until `finish` is called.

Returns a `Promise`, with the additional methods `abort` and `finish`.

* `abort()` will abort running the series.
* `finish()` will end the series if the `infinite` option is used.

This will `shift()` the first value from the `collection` and then `run()` it.  It will continue to do this until `collection` is empty.  It then resolves the promise with an array of the results of each run.

`parallel` controls how many queues are allowed to `run()` at once.

If `collect` is false than `undefined` rather than an array of results will be returned in the resolved promise.  This is useful if collection is very large.

Items can be added to `collection` while it runs.  If `infinite` is true, the returned `Promise` will not resolve until `finish` is called.  If `infinite` is true, `collect` defaults to false.

### Events

The `Queue` instance is an event emitter and will emit the following events:

* *start* when a queue starts
* *resolved* when a queue resolves, with the result as the first argument
* *rejected* when a queue rejects, with the error as the fitst argument

## `fifo( options )`

A first in first out queue.  Runs tasks in the order they are given ensuring tasks complete before the next one starts.

* `options.parallel` Integer, the number of tasks to run in parallel.  Defaults to `1`.

Returns a `Function` that adds additional items to the queue.
The function will return a Promise resolving when the item finishes.  Items an be functions, values or promises.

```js
// Create a fifo queue
var fifo = require('promise-util').fifo();

// Add a task
fifo( function() {	
		return someLongProcessReturningAPromise();
	} )
	.then( function() {
		// Do something else
	} );


