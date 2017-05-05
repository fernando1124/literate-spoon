/* jshint node:true */
'use strict';

/**
 *	Utilities to help with working with promises
 */

var Promise = require('require-promise');
var Queue = require('./lib/promise-queue.js');

var NOOP = function(){};

/**
 *	A wrapper for setTimeout
 */
exports.wait = function( time, value ) {
	return new Promise( function(resolve) {
		setTimeout( 
			function() {
				resolve(value);
			}, 
			time 
		);
	} );
};

/**
 *	Creates a closure so you don't have to
 */
exports.defer = function() {
	var resolveProxy, rejectProxy;
	var promise = new Promise( function( resolve, reject ) {
		resolveProxy = resolve;
		rejectProxy = reject;
	} );
	promise.resolve = resolveProxy;
	promise.reject = rejectProxy;

	return promise;
};

/**
 *	Call a function using a node style callback as a Promise
 *	@param {Object} context The context to call it in
 *	@param {Function|String} fn The function, or name of the function to call
 */
exports.callback = function( context, fn /* args...*/ ) {
	var deferred = exports.defer();
	var args = Array.prototype.slice.call(arguments,2);
	args.push( function( e, value) {
		if ( e ) {
			deferred.reject(e);
		} else if ( arguments.length > 2 ) {
			deferred.resolve(Array.prototype.slice.call(arguments,1));
		} else {
			deferred.resolve(value);
		}
	} );

	if ( context && typeof fn === 'string') {
		context[fn].apply( context, args );
	} else {
		fn.apply( context, args );
	}
	return deferred;
};

exports.Queue = Queue;

/**
 *	Creates a first in first out queue
 *	@param {Object} [options]
 *	@param {Number} [options.parallel] How many operations to run in parallel
 *	@returns {Function} A function that queues new items to be processed
 */
exports.fifo = function( options ) {

	options = options || {};
	var queue = [];
	new Queue()
		.then( function(fn) {
			return fn();
		} )
		.catch( NOOP )
		.runSeries( queue, { parallel: options.parallel, infinite: true } );


	return function(fn) {
		var promise = exports.defer();

		function run() {
			
			var ret;
			if ( typeof fn === 'function' ) {

				ret = new Promise( function(resolve) {
					resolve(fn());
				} ) ;

			} else {
				ret = Promise.resolve(fn);
			}

			return ret
				.then( promise.resolve, promise.reject );
		}

		queue.push( run );

		return promise;
	};

};


/**
 *	Given a generator, run it to its conclusion
 *	Basically from http://www.html5rocks.com/en/tutorials/es6/promises/
 */
exports.spawn = function spawn(gen){
  
	function next( value ) { 
		var result;
		try {
			result = it.next(value); 
		} catch(e) {
			return Promise.reject(e);
		}

		if (result.done) {
			return result.value;
		}

		return Promise.resolve(result.value)
			.then(next,error);
	}

	function error( value ) { 
		var result;
		try {
			result = it.throw(value);
		} catch(e) {
			return Promise.reject(e);
		}

		if (result.done) {
			return result.value;
		}

		return Promise.resolve(result.value)
			.then(next,error);
	}

	var it = gen();
	return next();
};
