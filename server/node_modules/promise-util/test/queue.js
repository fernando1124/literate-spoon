/* jshint node:true, mocha: true */
"use strict";

var expect = require('expect');
var Promise = require('require-promise');
var promiseUtil = require('../');
var Queue = promiseUtil.Queue;

describe( 'Queue', function() {

	it( 'is an event emitter', function() {
		expect( new Queue() ).toBeA( require('events').EventEmitter );
	} );

	it( 'can be initiated without the new keyword', function() {

		/* jshint -W064 */
		var queue = Queue();
		expect(queue).toBeA(Queue);

	} );

	describe( 'then', function() {

		it( 'accepts a function as an argument', function() {
			new Queue().then( function(){} );
		} );

		it( 'accepts two functions as arguments', function() {
			new Queue().then( function(){}, function(){} );
		} );

		it( 'accepts undefined and a function as arguments', function() {
			new Queue().then( undefined, function(){} );
		} );

		it( 'returns the queue object for chaining', function() {

			var queue = new Queue();
			var ret = queue.then( function(){} );
			expect( ret ).toBe( queue );

		} );

	} );

	describe( 'catch', function() {

		it( 'accepts a function as an argument', function() {
			new Queue().catch( function(){} );
		} );

		it( 'returns the queue object for chaining', function() {

			var queue = new Queue();
			var ret = queue.catch( function(){} );
			expect( ret ).toBe( queue );

		} );

	} );

	describe( 'run', function() {

		it( 'returns a promise', function() {

			var ret = new Queue().run();
			expect( ret ).toBeA( Promise );

		} );

		it( 'returns the native promise when available', function() {

			if ( global.Promise && global.Promise.toString() === 'function Promise() { [native code] }' ) {
				var ret = new Queue().run();
				expect( ret ).toBeA( global.Promise );
			}
			
		} );

		it( 'resolves the supplied chain of promises', function() {

			return new Queue()
				.then( function(value) {
					return ++value;	
				} )
				.then( function(value) {
					return ++value;	
				} )
				.then( function(value) {
					throw value;
				} )
				.catch( function(value) {
					return value;
				} )
				.then( function(value) {
					return ++value;	
				} )
				.run(0)
					.then( function(value) {
						expect( value ).toBe( 3 );
					} );

		} );

		it( 'rejects the supplied chain of promises', function() {

			return new Queue()
				.then( function() {
					throw new Error('error');
				} )
				.run()
					.then( function() {
						throw new Error( 'should not have been called' );
					} )
					.catch( function(value) {
						expect( value ).toBeA( Error );
						expect( value.message ).toBe( 'error' );
					} );

		} );

		it( 'allows a resolving chain to be reused', function() {

			var queue = new Queue()
				.then( function(value) {
					return ++value;	
				} )
				.then( function(value) {
					return ++value;	
				} );


			return queue.run(0)
				.then( function(value) {
					return queue.run(value);
				})
				.then( function(value) {
					expect(value).toBe(4);
				});

		} );

		it( 'allows a rejecting chain to be reused', function() {

			var queue = new Queue()
				.then( function(value) {
					throw new Error(value);
				} );


			return queue.run(0)
				.catch( function(value) {
					return queue.run(++value.message);
				})
				.then( function() {
					throw new Error( 'should not have been called' );
				} )
				.catch( function(value) {
					expect( value ).toBeA( Error );
					expect( value.message ).toBe( "1" );
				});

		} );

		it( 'runs tasks in the queue\'s context', function() {

			var queue = new Queue()
				.then( function() {
					expect(this).toBe(queue);
					throw new Error('error');
				} )
				.catch( function() {
					expect(this).toBe(queue);
				} );

			return queue.run();

		} );

		it( 'emits a start event when starting', function() {

			var queue = new Queue();
			var started = 0;
			queue.on( 'start', function() {
				++started;
			} );

			queue.run()
				.then( function() {
					expect(started).toBe(1);
					return queue.run();
				} )
				.then( function() {
					expect(started).toBe(2);
				} );

		} );

		it( 'emits a resolved event on a resolved chain', function() {

			var queue = new Queue();
			var resolved = null;
			queue
				.on( 'resolved', function(value) {
					resolved = value;
				} )
				.then( function(value) {
					return ++value;
				} )
				.then( function(value) {
					return ++value;
				} );

			queue.run(0)
				.then( function(value) {
					expect(value).toBe(resolved);
					expect(resolved).toBe(2);
					return queue.run(value);
				} )
				.then( function(value) {
					expect(value).toBe(resolved);
					expect(resolved).toBe(4);
				} );


		} );
		it( 'emits a rejected event on a rejected chain', function() {

			var queue = new Queue();
			var rejected = null;
			queue
				.on( 'rejected', function(value) {
					rejected = value;
				} )
				.then( function(value) {
					throw ++value;
				} );

			queue.run(0)
				.then( function() {
					throw new Error( 'should not have been called' );
				} )
				.catch( function(value) {
					expect(value).toBe(rejected);
					expect(rejected).toBe(1);
					return queue.run(value);
				} )
				.then( function() {
					throw new Error( 'should not have been called' );
				} )
				.then( function(value) {
					expect(value).toBe(rejected);
					expect(rejected).toBe(2);
					return queue.run(value);
				} );

		} );

	} );

	describe( 'runSeries', function() {

		var queue;

		beforeEach( function() {

			queue = new Queue()
				.then( function(value) {
					return ++value;	
				} )
				.then( function(value) {
					return ++value;	
				} )
				.then( function(value) {
					return ++value;	
				} );

		} );

		it( 'runs the promise queue in a series and collects the results', function() {

			return queue.runSeries([0,1,2,3,4,5])	
				.then( function(results) {
					expect(results).toEqual( [3,4,5,6,7,8] );
				} );

		} );
		
		describe( 'when the parallel argument is used', function() {
			
			it( 'runs the queues in parallel', function() {

				return queue.runSeries( [0,1,2,3,4,5], {parallel: 2} )	
					.then( function(results) {
						expect(results).toEqual( [3,4,5,6,7,8] );
					} );

			} );

			it( 'still runs if there are more "threads" than items to process', function() {

				return queue.runSeries([0,1,2,3,4,5], {parallel: 100})
					.then( function(results) {
						expect(results).toEqual( [3,4,5,6,7,8] );
					} );

			} );

			it( '"threads" start in the expected order', function() {

				var testValue = 0;

				var queue = new Queue()
					.then( function() {
						++testValue;
						return testValue;
					} )
					//.then( promiseUtil.wait.bind(null,50) )
					.then( function(value) {
						++testValue;
						return value;
					} );

				return queue.runSeries( [1,2,3], { parallel: 2 } )
					.then( function(results) {

						// The returned number is the value when
						// the item in the queue started processing plus 1
						// Starting adds 1, and finishing adds 1
						// So two should start at once 0->1, 1->2, then they finish 2->3 and 3->4
						// then one threads picks up the last time 4->5  
						expect(results).toEqual( [1,2,5] );

					})
					.then( function() {
						expect(testValue).toBe(6);
					} );

			} );

		} );

		describe( 'when the collection option is false', function() {
			
			it( 'runs the queue without collecting', function() {

				var results = [];
				queue.then( function(value) {
					results.push(value);
				} );

				return queue.runSeries( [0,1,2,3,4,5], { collect: false } )
					.then( function(value) {
						expect(value).toBe( undefined );
						expect(results).toEqual( [3,4,5,6,7,8] );
					} );

			} );

			it( 'runs the queue in parallel without collecting', function() {

				var results = [];
				queue.then( function(value) {
					results.push(value);
				} );

				return queue.runSeries( [0,1,2,3,4,5], { collect: false, parallel: 2 } )
					.then( function(value) {
						expect(value).toBe( undefined );
						expect(results).toEqual( [3,4,5,6,7,8] );
					} );

			} );
		} );

		describe( 'dynamic collection', function() {
			
			it( 'allows items to be added in series', function() {

				var collection = [5];

				var queue = new Queue()
					.then( function(value) {
						if ( value > 0 ) {
							collection.push( value - 1 );
						}
						return value;
					});

				return queue.runSeries( collection  )
					.then( function(results) {
						expect(results).toEqual( [5,4,3,2,1,0] );
					} );
			} );
					
			it( 'allows items to be added in parallel', function() {

				var collection = [5];

				var queue = new Queue()
					.then( function(value) {
						if ( value > 0 ) {
							collection.push( value - 1 );
						}
						return value;
					});

				return queue.runSeries( collection, {parallel: 2} )
					.then( function(results) {
						expect(results).toEqual( [5,4,3,2,1,0] );
					} );

			} );

		} );

		it( 'rejects on an error', function() {

			var queue = new Queue()
				.then( function() {
					throw new Error('error');
				} );

			return queue.runSeries( [1,2,3] )
				.then( function() {
					throw new Error( 'should not have been called' );
				} )
				.catch( function(value) {
					expect(value).toBeA(Error);
					expect(value.message).toBe('error');
				} );

		} );

		describe( 'abort', function() {
			
			it( 'causes the series to reject', function() {
				
				var count = 0;
				var queue = new Queue()
					.then( function() {
						++count;
						if ( count === 2 ) {
							series.abort();
							return;
						}
					} );

				var series = queue.runSeries( [1,2,3,4], { parallel: 3 } );

				return series
					.then( function() {
						throw new Error( 'should not have been called' );
					} )
					.catch( function(e) {
						expect( e ).toBeA( Error );
						expect( e.message ).toBe( 'Aborted' );
						// the third "thread" will already have run, abort was called on a then
						expect( count ).toBe( 3 );
					} )
					// Give time for it to keep running
					.then( promiseUtil.wait.bind(null, 100 ) );
			} );
			
			it( 'rejects with the supplied argument', function() {

				var count = 0;
				var queue = new Queue()
					.then( function() {
						++count;
						if ( count === 2 ) {
							series.abort( new Error('error') );
							return;
						}
					} );

				var series = queue.runSeries( [1,2,3,4], { parallel: 3 } );

				return series
					.then( function() {
						throw new Error( 'should not have been called' );
					} )
					.catch( function(e) {
						expect( e ).toBeA( Error );
						expect( e.message ).toBe( 'error' );
						// the third "thread" will already have run, abort was called on a then
						expect( count ).toBe( 3 );
					} )
					// Give time for it to keep running
					.then( promiseUtil.wait.bind(null, 100 ) );

			} );
		} );

		describe( 'the infinite option', function() {

			var count, collection, queue;

			beforeEach( function() {

				count = 0;
				collection = [1,2,3,4];

				queue = new Queue()
					.then( function() {
						return ++count;
					} );

			} );

			it( 'does not resolve until finish is called', function() {

				var series = queue.runSeries( collection, { parallel: 3, infinite: true } );

				var ret = series
					.then( function(value) {
						// Check the returned values are as expected
						expect( value ).toBe( undefined );
						expect( count ).toBe( 4 );
					} );

				// Wait enougth time for all items to finish	
				promiseUtil.wait(100)
					.then( function() {						
						series.finish();
					} );

				return ret;

			} );

			it( 'resolves with the finish argument', function() {

				var series = queue.runSeries( collection, { parallel: 3, infinite: true } );

				var ret = series
					.then( function(value) {
						// Check the returned values are as expected
						expect( value ).toBe( 'foo' );
						expect( count ).toBe( 4 );
					} );

				// Wait enougth time for all items to finish	
				promiseUtil.wait(100)
					.then( function() {						
						series.finish( 'foo' );
					} );

				return ret;

			} );

			it( 'collects when collect=true', function() {

				var series = queue.runSeries( collection, { parallel: 3, infinite: true, collect: true } );

				var ret = series
					.then( function(value) {
						// Check the returned values are as expected
						expect( value ).toEqual( [1,2,3,4] );
						expect( count ).toBe( 4 );
					} );

				// Wait enougth time for all items to finish	
				promiseUtil.wait(100)
					.then( function() {						
						series.finish();
					} );

				return ret;

			} );

		} );

	} );

} );

