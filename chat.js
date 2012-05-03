// http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/
"use strict";

var webServerPort = 3000;
var uid = "4fa265d5e71fece1609a555c";

/**
 * Webserver
 */

var express = require('express'), routes = require('./routes'), http = require('http'), webSocketServer = require('websocket').server, lessMiddleware = require('less-middleware');

var chat = express();
var MemStore = express.session.MemoryStore;
// TODO: Delete me later

chat.configure(function() {
	chat.set('views', __dirname + '/views');
	chat.set('view engine', 'jade');
	chat.use(express.favicon());
	chat.use(express.logger('dev'));
	chat.use(express.static(__dirname + '/public'));
	chat.use(express.bodyParser());
	chat.use(express.methodOverride());
	chat.use(express.cookieParser("keyboardcat"));
	chat.use(express.session({
		secret : "keyboardcat",
		store : MemStore({
			reapInterval : 60000 * 10
		})
	}));
	//TODO: Later mongoDB store (https://github.com/kcbanner/connect-mongo)
	chat.use(chat.router);
	chat.use(lessMiddleware({
		src : __dirname + '/public',
		compress : true
	}));
});

chat.configure('development', function(){
  chat.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

chat.configure('production', function(){
  chat.use(express.errorHandler()); 
});

// Data providers
var UserProvider = require('./userprovider-memory').UserProvider;
var userProvider = new UserProvider('localhost', 27017);

var MessageProvider = require('./messageprovider-memory').MessageProvider;
var messageProvider = new MessageProvider('localhost', 27017);

//TODO: Export routes to routes directory
chat.get('/', function(req, res) {
	userProvider.findContacts(uid,function(error, contacts) {
		console.log('contacts:'+contacts);
		var messages = messageProvider.findAll(function(error, messages) {
			console.log(contacts);
			res.render('index.jade', {
				title : 'Chat',
				user_id : uid,
				contacts : contacts,
				messages : messages
			});
		});
	});
});

chat.post('/', function(req, res) {
	userProvider.findAll(function(error, users) {
		var messages = messageProvider.findAll(function(error, messages) {
			res.render('index.jade', {
				title : 'Chat',
				user_id : uid,
				users : users,
				messages : messages
			});
		});
	});
});


http.createServer(chat).listen(webServerPort, function() {
	console.log("Webserver is listening on port " + webServerPort);
});
// Port where we'll run the websocket server
var webSocketsServerPort = 8000;

// Helper function for escaping input strings
function htmlEntities(str) {
	return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// HTTP server
var server = http.createServer().listen(webSocketsServerPort, function() {
	console.log("WebSocketsServer is listening on port " + webSocketsServerPort);
});
// Websocket server
var wsServer = new webSocketServer({
	httpServer : server
});
// WebSocket server is tied to a HTTP server

// This callback function is called every time someone
// tries to connect to the WebSocket server
wsServer.on('request', function(request) {
	console.log((new Date()) + ' Connection from origin ' + request.origin + '.');

	//TODO: Verification here

	// accept connection - you should check 'request.origin' to make sure that
	// client is connecting from your website
	// (http://en.wikipedia.org/wiki/Same_origin_policy)
	var connection = request.accept(null, request.origin);
	clients[uid] = connection;

	console.log((new Date()) + ' Connection accepted.');

	// send back chat history
	/*if (history.length > 0) {
	connection.sendUTF(JSON.stringify( { type: 'history', data: history} ));
	}*/

	// user sent some message
	connection.on('message', function(message) {

		if(message.type === 'utf8') { // accept only text

			try {
				var incoming = JSON.parse(message.utf8Data);
			} catch (e) {
				console.log('This doesn\'t look like a valid JSON: ', message.utf8Data);
				return;
			}

			console.log((new Date()) + ' Received Message from ' + uid + ' to ' + incoming.receiver + ': ' + htmlEntities(incoming.text));

			// we want to keep history of all sent messages
			var obj = {
				time : (new Date()).getTime(),
				text : htmlEntities(incoming.text),
				sender : uid,
				receiver : incoming.receiver
			};
			messageProvider.save(obj, function(error, messages){});

			// broadcast message to all connected clients
			var outgoing = JSON.stringify({
				type : 'message',
				data : obj
			});
			clients[incoming.receiver].sendUTF(outgoing);	// Send data to receiver
		}
	});
	// user disconnected
	connection.on('close', function(connection) {
		console.log((new Date()) + " Peer " + connection.remoteAddress + " disconnected.");
		// remove user from the list of connected clients
		clients.splice(uid, 1);
	});
});
