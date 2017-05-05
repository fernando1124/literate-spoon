const ChallengeService = (request, response) => {
	
	const SYSTEM = require('../server/systemConstants'),
		  HTTPS = require('https'),
		  HTTP = require('http'),
		  COLLECTOR = require('../server/node_modules/stream-collect');	

	const getSearchRequest = () => {
		const randomPageNumber = Math.floor(Math.random() * SYSTEM.GOOGLE.MAX_SEARCH_RESULTS);
		
		return {
			"host": "www.googleapis.com",
			"path": "/customsearch/v1?key="+SYSTEM.GOOGLE.SEARCH_API_KEY+"&cx="+SYSTEM.GOOGLE.CUSTOM_SEARCH_ENGINE_ID+"&q="+SYSTEM.GOOGLE.SEARCH_TOPIC+"&p="+randomPageNumber,
			"method": "GET",
			"headers": {
				"Content-Type": SYSTEM.CONTENT_JSON
			}
		}
	};

	const getRequestObject = (link) => (link.startsWith('http') ? HTTP.request(link) : HTTPS.request(link));

	const parseGoogleResponse = (jsonString) => JSON.parse(jsonString);

	const processGoogleResponse = (jsonObject) => { 
		const randomResultNumber = Math.floor(Math.random() * SYSTEM.GOOGLE.MAX_NUMBER_OF_RESULTS_PER_PAGE);		
		
		return { 
			"longMessage": "",
			"shortMessage": jsonObject.items[randomResultNumber].snippet,
			"link": jsonObject.items[randomResultNumber].link
		} 
	};

	const respondWithChallenge = (processedResponse) => {			
		const pageRequest = getRequestObject(processedResponse.link);		

		pageRequest.on("response", (incomingMessage) => { 
			incomingMessage.pipe(COLLECTOR.stream())
				.then((pageResult) => { 
					processedResponse.longMessage = pageResult;
					return processedResponse;
				})
				.then((completeMessage) => response.send(completeMessage));
		}).end();		
	};	

	const handleGoogleResponse = (incomingMessage) => incomingMessage.pipe(COLLECTOR.stream())
																	.then(parseGoogleResponse)																	
																	.then(processGoogleResponse)																	
																	.then(respondWithChallenge);

	this.serve = () => {
		const googleSearchRequest = HTTPS.request(getSearchRequest());
	
		googleSearchRequest.on("response", handleGoogleResponse).end();
	};

	this.serve();
}

module.exports = ChallengeService;













/*const collector = require('../server/node_modules/stream-collect'),
	  https = require('https'),
	  stream = require('stream'),	  
	SYSTEM = require('../server/systemConstants'),
	R = require('../server/node_modules/ramda'),
	RF = require('../server/node_modules/ramda-fantasy'),
	Maybe = RF.Maybe;

const SEARCH_REQUEST = {
	"host": "www.googleapis.com",
	"path": "/customsearch/v1?key="+SYSTEM.GOOGLE.SEARCH_API_KEY+"&cx="+SYSTEM.GOOGLE.CUSTOM_SEARCH_ENGINE_ID+"&q="+SYSTEM.GOOGLE.SEARCH_TOPIC,
	"method": "GET",
	"headers": {
		"Content-Type": SYSTEM.CONTENT_JSON
	}
};

const getSmallText = () => {
	
}

const sendSearchRequest = (response) => {
	https.request(SEARCH_REQUEST)
			.on("response", (incomingMessage) => incomingMessage.pipe(collector.stream())
							   									.then((jsonString) => JSON.parse(jsonString))
							   									.then(processResponse)
																.then((processedMessage) => response.send(processedMessage)))

			.end();
}

const processResponse = (jsonObject) => {
	return { "shortMessage": jsonObject.items[0].snippet };
}


module.exports = (request, response) => {
	console.log("REQUEST: ", sendSearchRequest(response));	
}*/