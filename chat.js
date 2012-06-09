// http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/
"use strict";

var webServerPort = 3000;

/**
 * Webserver
 */

var express = require('express'), /*routes = require('./routes'),*/ http = require('http'), webSocketServer = require('websocket').server, lessMiddleware = require('less-middleware'), MongoStore = require('connect-mongodb'), async = require('async'), flash = require('connect-flash');

var chat = express();

// Data providers
var UserProvider = require('./data_providers/userprovider-memory').UserProvider;
var userProvider = new UserProvider('localhost', 27017);
var MessageProvider = require('./data_providers/messageprovider-memory').MessageProvider;
var messageProvider = new MessageProvider('localhost', 27017);
var SessionProvider = require('./data_providers/sessionprovider-memory').SessionProvider;
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
	if(req.session.userId) {//Session is set
		userProvider.findById(req.session.userId, function(error, user) {
			if(user) {// If user to the user_id exists
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
	userProvider.findContacts(req.session.userId, function(error, contacts) {
		console.log(contacts.length + ' contacts');
		res.render('index.jade', {
			title : 'Chat',
			userId : req.session.userId,
			username : req.session.userName,
			contacts : contacts
		});
	});
});
// Sessions
chat.get('/sessions/new', function(req, res) {
	console.log(req.flash('error').toString());
	res.render('sessions/new.jade', {
		title : 'Login',
		flashMessage : req.flash('error').toString()
	});
});

chat.post('/sessions', function(req, res) {
	// Find the user and set the currentUser session variable
	userProvider.findByUsername(req.body.username, function(error, user) {
		if(user && user.password == req.body.password) {
			console.log("UserId: " + user._id + " UserId: " + user.username);
			req.session.userId = user._id;
			req.session.userName = user.username;
			res.redirect('/');
		} else {
			console.log("Wrong credentials");
			req.flash('error', 'Incorrect credentials');
			res.redirect('/sessions/new');
		}
	});
});

chat.get('/logout', loadUser, function(req, res) {
	// Remove the session
	if(req.session) {
		req.session.destroy(function() {
		});
	}
	res.redirect('/sessions/new');
});
// Helpers
flash.dynamicHelpers = {
	flashMessages : function(req, res) {
		var html = '';
		['error', 'info'].forEach(function(type) {
			var messages = req.flash(type);
			if(messages.length > 0) {
				html += new FlashMessage(type, messages).toHTML();
				html += '<div class"flash ' + type + '"><p>' + messages.join(',') + '</p></div>'
			}
		});
		return html;
	}
};

// WebSocket server
// Partly: http://gist.github.com/2031681

var webserver = http.createServer(chat).listen(webServerPort, function() {
	console.log("Webserver is listening on port " + webServerPort);
});
// Port of the WebSocket server
var webSocketsServerPort = 8000;

// Helper function for escaping input strings
function htmlEntities(str) {
	return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// HTTP server
var websocketHTTPserver = http.createServer().listen(webSocketsServerPort, function() {
	console.log("WebSocketsServer is listening on port " + webSocketsServerPort);
});
// The WebSocket server is bound to HTTP server
var wsServer = new webSocketServer({
	httpServer : websocketHTTPserver
});

// Extracts the sid from the cookies
function getSidFromCookies(cookies) {
	var filtered = cookies.filter(function(obj) {
		return obj.name == 'connect.sid';
	});
	return filtered.length > 0 ? unescape(filtered[0].value).substr(0, 24) : null;
}

// Keeps all open WebSocket connections
var connections = {};

// This callback function is called every time someone
// tries to connect to the WebSocket server
wsServer.on('request', function(req) {
	console.log((new Date()) + ' Connection from origin ' + req.origin + '.');

	var userId = null;

	if(req.origin == "http://localhost:3000") {
		var connection = req.accept(null, req.origin);
		console.log((new Date()) + ' Connection accepted.');
	} else {
		console.log("Connection from " + req.origin + " not accepted");
		return;
	}

	console.log("sessionId: " + getSidFromCookies(req.cookies));
	sessionProvider.findById(getSidFromCookies(req.cookies), function(error, session) {
		if(error || session == null) {
			connection.close();
			console.log((new Date()) + ' Connection dropped.');
		} else {

			var session_parsed = JSON.parse(session.session);
			userId = session_parsed.userId;
			connection.id = userId;
			connections[userId] = connection;

			// Send online status of contacts
			userProvider.findContacts(userId, function(error, contacts) {
				async.forEach(contacts, function(contact, callbackFE) {
					if(connections[contact._id] != undefined) {
						// Get availability of other contacts
						var outgoing = {
							type : 'availability',
							contactId : contact._id,
							available : true
						};
						console.log("Send availability: " + JSON.stringify(outgoing));
						connection.sendUTF(JSON.stringify(outgoing));

						// Send own availability to other contacts
						var outgoing2 = {
							type : 'availability',
							contactId : userId,
							available : true
						};
						console.log("Broadcast availability: " + JSON.stringify(outgoing2));
						connections[contact._id].sendUTF(JSON.stringify(outgoing2));
					}

					// Get unread messages
					messageProvider.getUnreadMessages(userId, contact._id, function(error, unreadMessages) {
						if(error) {
							console.log("Error");
							callbackFE(error);
						} else {
							async.forEach(unreadMessages, function(message, callbackFE2) {

								var obj = {
									time : (new Date(message.time)).getTime(),
									text : htmlEntities(message.text),
									sender : contact._id,
									receiver : userId
								};

								// Online, send message
								var outgoing = {
									type : 'message',
									data : obj
								};
								connection.sendUTF(JSON.stringify(outgoing));

								callbackFE2();
							}, function() {
								callbackFE();
							})
						}
					});
				})
			});
		}
	})
	// User sent some message
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

				// send the message to the other client, if available
				if(connections[incoming.receiver] != undefined) {
					console.log("User online, redirected");

					var obj = {
						time : (new Date()).getTime(),
						text : htmlEntities(incoming.text),
						sender : userId,
						receiver : incoming.receiver,
						delivered : true
					};

					// Online, send message
					var outgoing = {
						type : 'message',
						data : obj
					};
					connections[incoming.receiver].sendUTF(JSON.stringify(outgoing));

					// store message
					messageProvider.save(obj, function(error, messages) {
					});
				} else {
					console.log("User offline, not redirected");
					// Offline, only store message
					var obj = {
						time : (new Date()).getTime(),
						text : htmlEntities(incoming.text),
						sender : userId,
						receiver : incoming.receiver,
						delivered : false
					};
					messageProvider.save(obj, function(error, messages) {
					});
				}

			} else if(incoming.type == 'historyRequest') {
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
						console.log("Send history to " + userId);
						connection.sendUTF(JSON.stringify(outgoing));
					}
				});
			} else if(incoming.type == 'searchUsers') {
				userProvider.findUsers(incoming.username, function(error, users) {
					if(error)
						console.log(error);
					else {
						var outgoing = {
							type : 'searchResult',
							username : incoming.username,
							data : users
						}
						console.log("Send searchresult to " + userId);
						connection.sendUTF(JSON.stringify(outgoing));
					}
				})
			} else if(incoming.type == 'addContact') {
				// Add user to contactlist
				messageProvider.addContact(incoming.contactId, function(error, contact) {
					if(error)
						console.log(error);
					else {
						var outgoing = {
							type : 'newContact',
							contact : incoming.contactId
						}
						console.log("Send new contact to " + userId);
						connection.sendUTF(JSON.stringify(outgoing));
					}
				});
			} else {
				console.log('Unknown JSON message type: ' + JSON.stringify(incoming));
			}
		}
	});
	// User disconnected
	connection.on('close', function(connection) {
		console.log((new Date()) + " Peer " + userId + " disconnected.");
		delete connections[userId];
		// Send online status of contacts
		userProvider.findContacts(userId, function(error, contacts) {
			async.forEach(contacts, function(contact, callbackFE) {
				if(connections[contact._id] != undefined) {
					// Send own availability to other contacts
					var outgoing = {
						type : 'availability',
						contactId : userId,
						available : false
					};
					console.log("Broadcast availability: " + JSON.stringify(outgoing));
					connections[contact._id].sendUTF(JSON.stringify(outgoing));
					callbackFE(error);
				}
			})
		});
	});
});
