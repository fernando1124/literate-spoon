const SYSTEM = require('./systemConstants');

const APP = {
	"init": () => {
		const express = require('express'),
			  server = express(),
			  routes = require('./routes');

		routes(server);

		server.use(APP.jsonResponseHandler);
		server.listen(SYSTEM.MODERATOR_LISTENING_PORT, APP.serverInitializationHandler);
	},

	"serverInitializationHandler": () => {
		console.log('Server listening on port ' + SYSTEM.MODERATOR_LISTENING_PORT);
	},

	"jsonResponseHandler": (request, response, next) => {
		response.setHeader('Content-Type', 'application/json');
		return next();
	}
}

APP.init();