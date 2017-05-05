/* jshint node:true, mocha: true */
"use strict";

var Promise = require('require-promise');
var Queue = require('../../').Queue;
var memwatch = require('memwatch-next');
var util = require('util');


// This is a runs a very long queue to checks if it leaks memory
// The memory output needs to be manually inspected
( function() {

	console.log( 'This takes a long time to run' );

	var maxLength = 100000;
	var started = false;
	var collection = [0];
	var hd;
	var leaks = [];

	var queue = new Queue()
		.then( function(value) {
			
			if ( !started ) {
				hd = new memwatch.HeapDiff();
				started = true;
			} else if ( maxLength === 0 ) {
				console.log( util.inspect( hd.end(), {depth:null} ) );
			}

			if ( maxLength > 0 ) {
				--maxLength;
				collection.push(maxLength);
			}
		});

	queue.runSeries( collection, {collect:false} );

}() );