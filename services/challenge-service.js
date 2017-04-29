const http = require('http'),
	SYSTEM = require('../server/systemConstants');

const SEARCH_REQUEST = {
	//"uri": "https://www.googleapis.com/customsearch/v1?key="+SYSTEM.GOOGLE.SEARCH_API_KEY+"&cx="+SYSTEM.GOOGLE.CUSTOM_SEARCH_ENGINE_ID+"&q="+SYSTEM.GOOGLE.SEARCH_TOPIC,
	"host": "www.googleapis.com",
	"path": "/customsearch/v1?key="+SYSTEM.GOOGLE.SEARCH_API_KEY+"&cx="+SYSTEM.GOOGLE.CUSTOM_SEARCH_ENGINE_ID+"&q="+SYSTEM.GOOGLE.SEARCH_TOPIC,
	"method": "GET",
	"headers": {
		"Content-Type": SYSTEM.CONTENT_JSON
	}
};

const getSmallText = () => {
	
}

module.exports = (request, response) => {
	console.log("It started");
	
	let req = http.request(SEARCH_REQUEST);
	req.end();
	req.on("response", (incomingMessage) => incomingMessage.pipe(response));
}