const SERVICES = require('./serviceIndex');

module.exports = (server) => {
	server.get(SERVICES.CHALLENGE.PATH, SERVICES.CHALLENGE.HANDLER);
}