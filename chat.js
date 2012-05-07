// http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/
"use strict";

var webServerPort = 3000;

/**
 * Webserver
 */

var express = require('express'), routes = require('./routes'), http = require('http'), webSocketServer = require('websocket').server, lessMiddleware = require('less-middleware'), MongoStore = require('connect-mongodb'), flash = require('connect-flash');

var chat = express();

// Data providers
var UserProvider = require('./userprovider-memory').UserProvider;
var userProvider = new UserProvider('localhost', 27017);
var MessageProvider = require('./messageprovider-memory').MessageProvider;
var messageProvider = new MessageProvider('localhost', 27017);
var SessionProvider = require('./sessionprovider-memory').SessionProvider;
var sessionProvider = new SessionProvider('localhost', 27017);

chat.configure(function() {
	chat.set('views', __dirname + '/views');
	chat.set('view engine', 'jade');
	chat.use(express.favicon());
	chat.use(express.logger('dev'));
	chat.use(express.static(__dirname + '/public'));
	chat.use(express.bodyParser());
	chat.use(express.cookieParser("narwhal"));
	chat.use(express.session({
		secret : "narwhal",
		store : new MongoStore({
			url : "mongodb://localhost/chat"
		})
	}));
	chat.use(express.methodOverride());
	chat.use(flash());

	//TODO: Later mongoDB store (https://github.com/kcbanner/connect-mongo)
	chat.use(chat.router);
	chat.use(lessMiddleware({
		src : __dirname + '/public',
		compress : true
	}));
});

chat.configure('development', function() {
	chat.use(express.errorHandler({
		dumpExceptions : true,
		showStack : true
	}));
});

chat.configure('production', function() {
	chat.use(express.errorHandler());
});
//TODO: Verification here

function loadUser(req, res, next) {
	console.log("loadUser: " + req.session.id);
	if(req.session.userId) {//Session is set
		userProvider.findById(req.session.userId, function(error, user) {
			console.log("User: " + user)
			if(user) {// If user to the user_id exists
				req.currentUser = user;
				next();
			} else {
				res.redirect('/sessions/new');
			}
		});
	} else {
		res.redirect('/sessions/new');
	}
}

//TODO: Export routes to routes directory
chat.get('/', loadUser, function(req, res) {
	console.log("redirectmain id: " + req.currentUser._id);
	userProvider.findContacts(req.currentUser._id.toString(), function(error, contacts) {
		console.log('Contacts: ' + contacts);
		res.render('index.jade', {
			title : 'Chat',
			user : req.currentUser,
			contacts : contacts
		});
	});
});
// Sessions
chat.get('/sessions/new', function(req, res) {
	userProvider.newUser(function(error, user) {
		res.render('sessions/new.jade', {
			title : 'Login',
			user : user
		});
	});
});

chat.post('/sessions', function(req, res) {
	// Find the user and set the currentUser session variable
	userProvider.findByUsername(req.body.user.username, function(error, user) {
		if(user && user.password == req.body.user.password) {
			req.session.userId = user._id;
			req.session.userName = user.username;
			console.log("remember: " + req.body.rememberMe);
			// Remember me
			if(req.body.rememberMe) {
				var loginToken = new LoginToken({
					userId : user._id,
					username : user.username
				});
				loginToken.save(function() {
					res.cookie('logintoken', loginToken.cookieValue, {
						expires : new Date(Date.now() + 2 * 604800000),
						path : '/'
					});
					res.redirect('/');
				});
			} else {
				res.redirect('/');
			}
		} else {
			req.flash('error', 'Incorrect credentials');
			res.redirect('/sessions/new');
		}
	});
});

chat.del('/sessions', loadUser, function(req, res) {
	// Remove the session
	if(req.session) {
		req.session.destroy(function() {
		});
	}
	res.redirect('/sessions/new');
});
/**** Webserver ****/
var clients = new Array();

var webserver = http.createServer(chat).listen(webServerPort, function() {
	console.log("Webserver is listening on port " + webServerPort);
});
// Port where we'll run the websocket server
var webSocketsServerPort = 8000;

// Helper function for escaping input strings
function htmlEntities(str) {
	return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// HTTP server
var websocketHTTPserver = http.createServer().listen(webSocketsServerPort, function() {
	console.log("WebSocketsServer is listening on port " + webSocketsServerPort);
});
// Websocket server bound to HTTP server
var wsServer = new webSocketServer({
	httpServer : websocketHTTPserver
});

// This callback function is called every time someone
// tries to connect to the WebSocket server
wsServer.on('request', function(req) {
	console.log((new Date()) + ' Connection from origin ' + req.origin + '.');

	var userId = null;
	var userId = "4fa3a73fdb3071d1db173fe1";
	/*var cookie = connect.utils.parseCookie(req.headers['cookie']);
	console.log("cookies: "+cookie);*/

	var connection = req.accept(null, req.origin);
	clients[userId] = connection;

	if(false) {
		var sessionId = req.cookies.value;
		sessionProvider.findById(sessionId, function(error, session) {
			if(error)
				connection.close()
			else
				userId = session.userId;
			clients[session.userId] = connection;
		})
		var connection = req.accept(null, req.origin);

		console.log((new Date()) + ' Connection accepted.');

	}
	// TODO Get all unread messages

	// user sent some message
	connection.on('message', function(message) {

		if(message.type === 'utf8') {// accept only text

			try {
				var incoming = JSON.parse(message.utf8Data);
			} catch (e) {
				console.log('This doesn\'t look like a valid JSON: ', message.utf8Data);
				return;
			}

			if(incoming.type == 'message') {
				console.log((new Date()) + ' Received Message from ' + userId + ' to ' + incoming.receiver + ': ' + htmlEntities(incoming.text));

				var delivered = false;
				// send the message to the other client, if online
				if(false) {//TODO Session exists
					// broadcast message to all connected clients
					var outgoing = {
						type : 'message',
						data : obj
					};
					clients[incoming.receiver].sendUTF(JSON.stringify(outgoing));
					// Send data to receiver
					delivered = true;
				}

				// store message
				var obj = {
					time : (new Date()).getTime(),
					text : htmlEntities(incoming.text),
					sender : userId,
					receiver : incoming.receiver,
					delivered : delivered
				};
				messageProvider.save(obj, function(error, messages) {
				});
			} else if(incoming.type == 'historyrequest') {
				// send back chat history
				messageProvider.getConversation(userId, incoming.contactId, function(error, history) {
					if(error)
						console.log(error);
					else {
						var outgoing = {
							type : 'history',
							contact : incoming.contactId,
							data : history
						}
						console.log("Send history: " + JSON.stringify(outgoing))
						connection.sendUTF(JSON.stringify(outgoing));
					}
				});
			}
		}
	});
	// user disconnected
	connection.on('close', function(connection) {
		console.log((new Date()) + " Peer " + connection.remoteAddress + " disconnected.");
		// remove user from the list of connected clients
		clients.splice(userId, 1);
	});
});
