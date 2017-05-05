# Version 1.0.0 2015-02-01

* Added `Queue`
* Use Mocha for tests
* Removed spawn, until generators are supported

# Version 1.0.1 2015-06-15

* Updated test dependencies

# Version 1.1.0 2015-06-20

* Promise is now polyfilled using `require-promise`.  This means users of node 0.12 get the native Promise!

# Version 1.2.0 2015-07-12

* Adding promiseUtil.fifo