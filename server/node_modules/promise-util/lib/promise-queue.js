/* jshint node:true */
/* jshint -W014 */ // Bad line breaking
"use strict";

/**
 *	Create a queue of promises that can be reused
 */
var events = require('events');
var util = require('util');
var Promise = require('require-promise');

/**
 *	Queue a series of promises that can be reused.
 */
function Queue() {
	if ( !(this instanceof Queue) ) {
		return new Queue();
	}

	events.EventEmitter.call(this);
	this._queue = [];
}

util.inherits( Queue, events.EventEmitter );

/**
 *	Adds an action to the queue
 */
Queue.prototype.then = function( successFn, rejectFn ) {
	this._queue.push( [ successFn, rejectFn ] );
	return this;
};

/**
 *	Adds a catch action to the queue (sugar)
 */
Queue.prototype.catch = function( rejectFn ) {
	return this.then( undefined, rejectFn );
};

/**
 *	Run the queue
 */
Queue.prototype.run = function(value) {
	
	// Shallow copy
	var activeQueue = this._queue.slice();
	var ret = Promise.resolve(value);
	var self = this;

	self.emit( 'start', value );

	// Recursive function adds promise actions
	function next() {
	
		var fns = activeQueue.shift();

		if ( !fns ) {
			return;
		}

		ret = ret.then(
			typeof fns[0] === 'function' ? fns[0].bind(self) : fns[0],
			typeof fns[1] === 'function' ? fns[1].bind(self) : fns[1]
		);

		next();
	}

	next();

	ret.then( 
		function(result) {
			self.emit( 'resolved', result, value );
		},
		function(e) {
			self.emit( 'rejected', e, value );
			throw e;
		}
	);

	return ret;
};

/**
 *	Run the queue against a series of items
 *
 *	@param [Array] collection Warning, the function will modify the collection
 *		This allows additional elements to be added to the queue during processing
 *		If the collection needs to be kept intact call collection.slice() to shallow clone it.
 *
 *	@param {Object} [options]
 *	@param {Boolean} [options.collect=true] If false suppresses collecting the results in an array.
 *	@param {Integer} [options.parallel=1] Allows the series to be processed by multiple queues in parallel
 *	@param {Boolean} [options.infinite] Don't stop when the collection runs out.
 *		This will default collect to false, and monkey patch the collection push function
 */
Queue.prototype.runSeries = function( collection, options ) {

	options = options || {};
	var self = this;
	var parallelCount = options.parallel || 1;
	var infinite = !!options.infinite || false;
	var collect = infinite
		? !!options.collect
		: options.collect !== false;
	var result;
	var active = 0;
	var abort = false;
	var resume = [];

	if ( infinite ) {
		// Monkey patch the collection object to allow resuming
		var _push = collection.push;
		collection.push = function() {
			// Unpause paused threads
			while( resume.length ) {
				resume.shift()();
			}
			return _push.apply(this,arguments);
		};
	}

	if ( collect ) {
		result = [];
	}

	function resumePaused() {
		while( resume.length ) {
			resume.shift()();
		}
	}

	function runTask( resolve, reject ) {

		// Use setImmediate to "break the chain" and stop us running out of memory for
		// huge queues of items

		if ( abort ) {
			resume = null;
			reject(abort);
			return;
		}

		if ( collection.length === 0 ) {

			// If parallel threads are still processing
			// then pause this thread rather than ending
			if ( active || infinite ) {	
				new Promise( function(resolve) {
						resume.push(resolve);
					} )
					.then( setImmediate.bind( null, runTask, resolve, reject) );

				return;
			}

			// End any paused threads
			resumePaused();

			resolve();
			return;
		}

		var item = collection.shift();

		// Records how many active threads there are
		++active;

		// Unpause paused threads
		resumePaused();

		self.run(item)
			.catch( function(e) {
				// Will cause all threads to abort
				abort = true;
				reject(e);
				throw e;
			})
			.then( function(value) {
				if ( collect ) {
					result.push(value);
				}
				--active;
			} )
			.then( setImmediate.bind( null, runTask, resolve, reject) );
			

	}

	function startQueue() {
		return new Promise( function( resolve, reject ) {
			runTask( resolve, reject );
		} );
	}

	// The number of parallel queues is limited to the call stack
	// which seems to default to between 100000 and 1000000
	var ret = Promise.all( Array.apply(null, new Array( parallelCount) ).map(startQueue) )
		.then( function() {
			return result;
		} )
		.catch( function(e) {
			abort = true;
			throw e;
		} );

	ret.abort = function(e) {
		if ( !e ) {
			e = new Error('Aborted');
		}
		abort = e;
	};

	if ( infinite ) {
		ret.finish = function(value) {
			infinite = false;
			result = value || result;
			resumePaused();
		};
	}

	return ret;

};

module.exports = Queue;

